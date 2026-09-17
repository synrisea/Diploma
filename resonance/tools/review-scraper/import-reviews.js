const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'infra', '.env') });

const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MAX_COMMENT_LENGTH = 2000;
const MAX_PHOTOS_PER_REVIEW = 6;

const BUCKET = process.env.AWS_AVATARS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
if (!BUCKET || !REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Missing AWS_* env vars - expected them in infra/.env (same ones identity-service uses).');
}
const STANDARD_AVATAR_URL = `https://${BUCKET}.s3.${REGION}.amazonaws.com/avatars/default/256.webp`;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function upsizeGoogleUrl(url, width, height) {
  return url.replace(/=w\d+-h\d+/, `=w${width}-h${height}`);
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadWebp(key, webpBuffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read',
    }),
  );
}

async function uploadReviewerAvatar(userId, googleAvatarUrl) {
  if (!googleAvatarUrl) return STANDARD_AVATAR_URL;

  try {
    const raw = await downloadBuffer(upsizeGoogleUrl(googleAvatarUrl, 256, 256));
    const [webp256, webp64] = await Promise.all([
      sharp(raw).resize(256, 256).webp().toBuffer(),
      sharp(raw).resize(64, 64).webp().toBuffer(),
    ]);
    await Promise.all([
      uploadWebp(`avatars/${userId}/256.webp`, webp256),
      uploadWebp(`avatars/${userId}/64.webp`, webp64),
    ]);
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/avatars/${userId}/256.webp`;
  } catch (err) {
    console.error(`  [avatar fallback] ${userId}: ${err.message}`);
    return STANDARD_AVATAR_URL;
  }
}

async function uploadReviewPhoto(placeId, feedbackId, index, googlePhotoUrl) {
  const raw = await downloadBuffer(upsizeGoogleUrl(googlePhotoUrl, 800, 600));
  const webp = await sharp(raw).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp().toBuffer();
  const key = `review-photos/${placeId}/${feedbackId}/${index}.webp`;
  await uploadWebp(key, webp);
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function createReviewerUser(identityClient, displayName) {
  const userId = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
  const email = `scraped+${userId}@resonance.local`;

  await identityClient.query(
    'INSERT INTO "Users" ("Id", "Email", "PasswordHash", "PasswordHashAlgorithm", "DisplayName", "CreatedAt") VALUES ($1, $2, $3, 0, $4, now())',
    [userId, email, passwordHash, displayName],
  );

  return userId;
}

async function main() {
  const feedback = new Client({ host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_feedback' });
  await feedback.connect();
  const identity = new Client({ host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_identity' });
  await identity.connect();

  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json') && f !== 'progress.json');

  let placesReplaced = 0;
  let commentsDeleted = 0;
  let commentsInserted = 0;
  let photosUploaded = 0;
  let truncated = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
    if (!data.matched || !data.reviews || data.reviews.length === 0) continue;

    const placeId = data.place.id;

    await feedback.query('BEGIN');
    try {
      const del = await feedback.query('DELETE FROM "QuickFeedbacks" WHERE "PlaceId" = $1', [placeId]);
      commentsDeleted += del.rowCount;

      const now = Date.now();
      for (const review of data.reviews) {
        let text = review.text.trim();
        if (!text) continue;
        if (text.length > MAX_COMMENT_LENGTH) {
          text = text.slice(0, MAX_COMMENT_LENGTH);
          truncated++;
        }

        const displayName = (review.reviewerName || 'Guest').trim().slice(0, 100) || 'Guest';
        const userId = await createReviewerUser(identity, displayName);
        const avatarUrl = await uploadReviewerAvatar(userId, review.avatarUrl);
        await identity.query('UPDATE "Users" SET "AvatarUrl" = $1 WHERE "Id" = $2', [avatarUrl, userId]);

        const feedbackId = crypto.randomUUID();
        const daysAgo = Math.floor(Math.random() * 120);
        const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        await feedback.query(
          'INSERT INTO "QuickFeedbacks" ("Id", "PlaceId", "UserId", "Comment", "CreatedAt") VALUES ($1, $2, $3, $4, $5)',
          [feedbackId, placeId, userId, text, createdAt],
        );
        commentsInserted++;

        const photoUrls = (review.photoUrls || []).slice(0, MAX_PHOTOS_PER_REVIEW);
        for (let i = 0; i < photoUrls.length; i++) {
          try {
            const hostedUrl = await uploadReviewPhoto(placeId, feedbackId, i, photoUrls[i]);
            await feedback.query(
              'INSERT INTO "QuickFeedbackPhotos" ("Id", "QuickFeedbackId", "Url", "SortOrder", "CreatedAt") VALUES ($1, $2, $3, $4, now())',
              [crypto.randomUUID(), feedbackId, hostedUrl, i],
            );
            photosUploaded++;
          } catch (err) {
            console.error(`  [photo skipped] ${placeId}/${feedbackId}/${i}: ${err.message}`);
          }
        }
      }
      await feedback.query('COMMIT');
      placesReplaced++;
    } catch (err) {
      await feedback.query('ROLLBACK');
      console.error(`Failed for place ${placeId}: ${err.message}`);
    }
  }

  console.log(`Places replaced: ${placesReplaced}`);
  console.log(`Synthetic comments deleted: ${commentsDeleted}`);
  console.log(`Real comments inserted: ${commentsInserted} (${truncated} truncated to ${MAX_COMMENT_LENGTH} chars)`);
  console.log(`Review photos uploaded: ${photosUploaded}`);

  await feedback.end();
  await identity.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
