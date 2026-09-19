const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'infra', '.env') });

const fs = require('fs');
const sharp = require('sharp');
const { Client } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MAX_COMMENT_LENGTH = 2000;

const BUCKET = process.env.AWS_AVATARS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
if (!BUCKET || !REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Missing AWS_* env vars - expected them in infra/.env (same ones identity-service uses).');
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function upsizeGoogleUrl(url, width, height) {
  return url.replace(/=w\d+-h\d+.*$/, `=w${width}-h${height}`);
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadWebp(key, webpBuffer) {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: webpBuffer, ContentType: 'image/webp', ACL: 'public-read' }),
  );
}

function loadReviewsByPlace() {
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json') && f !== 'progress.json');
  const byPlace = new Map();

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
    if (!data.matched || !data.reviews || data.reviews.length === 0) continue;

    const placeId = data.place.id;
    const byText = new Map();
    for (const review of data.reviews) {
      let text = (review.text || '').trim();
      if (!text) continue;
      if (text.length > MAX_COMMENT_LENGTH) text = text.slice(0, MAX_COMMENT_LENGTH);
      if (!byText.has(text)) byText.set(text, review);
    }
    byPlace.set(placeId, byText);
  }

  return byPlace;
}

async function main() {
  const reviewsByPlace = loadReviewsByPlace();

  const feedback = new Client({ host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_feedback' });
  await feedback.connect();
  const identity = new Client({ host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_identity' });
  await identity.connect();

  const { rows: feedbackRows } = await feedback.query('SELECT "Id", "PlaceId", "UserId", "Comment" FROM "QuickFeedbacks"');
  const { rows: userRows } = await identity.query('SELECT "Id", "AvatarUrl" FROM "Users"');

  const scrapedAvatarByUserId = new Map();
  for (const u of userRows) {
    if (u.AvatarUrl && u.AvatarUrl.includes(`/avatars/${u.Id}/`)) {
      scrapedAvatarByUserId.set(u.Id, u.AvatarUrl);
    }
  }

  let fixed = 0;
  let noMatch = 0;
  let noAvatar = 0;
  let failed = 0;
  let i = 0;

  for (const fb of feedbackRows) {
    i++;
    const currentAvatarUrl = scrapedAvatarByUserId.get(fb.UserId);
    if (!currentAvatarUrl) continue;

    const byText = reviewsByPlace.get(fb.PlaceId);
    const review = byText && byText.get(fb.Comment.trim());
    if (!review || !review.avatarUrl) {
      noMatch++;
      continue;
    }

    try {
      const raw = await downloadBuffer(upsizeGoogleUrl(review.avatarUrl, 256, 256));
      const [webp256, webp64] = await Promise.all([
        sharp(raw).resize(256, 256).webp().toBuffer(),
        sharp(raw).resize(64, 64).webp().toBuffer(),
      ]);
      await Promise.all([
        uploadWebp(`avatars/${fb.UserId}/256.webp`, webp256),
        uploadWebp(`avatars/${fb.UserId}/64.webp`, webp64),
      ]);
      fixed++;
    } catch (err) {
      failed++;
      console.error(`  [failed] user ${fb.UserId}: ${err.message}`);
    }

    if (i % 100 === 0) console.log(`...${i}/${feedbackRows.length} processed (fixed=${fixed}, noMatch=${noMatch}, failed=${failed})`);
  }

  console.log(`Done. fixed=${fixed} noMatch=${noMatch} noAvatar=${noAvatar} failed=${failed} totalComments=${feedbackRows.length}`);

  await feedback.end();
  await identity.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
