const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'infra', '.env') });

const { Client } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

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

// Same brand-500/brand-ink colors as the app's initial-letter avatar fallback
// (UserMenu.tsx etc.) - a generic person glyph instead of a letter.
function standardAvatarSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
    <rect width="64" height="64" fill="#ff6a39"/>
    <circle cx="32" cy="24" r="11" fill="#1a0d05"/>
    <path d="M12 56c0-12 9-20 20-20s20 8 20 20" fill="#1a0d05"/>
  </svg>`;
}

async function uploadStandardAvatar(size) {
  const png = await sharp(Buffer.from(standardAvatarSvg(size))).png().toBuffer();
  const webp = await sharp(png).webp().toBuffer();
  const key = `avatars/default/${size}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: webp,
      ContentType: 'image/webp',
      ACL: 'public-read',
    }),
  );
}

async function main() {
  await Promise.all([uploadStandardAvatar(256), uploadStandardAvatar(64)]);
  const avatarUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/avatars/default/256.webp`;
  console.log(`Standard avatar uploaded: ${avatarUrl}`);

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'resonance',
    password: 'dev123',
    database: 'resonance_identity',
  });
  await client.connect();

  // Every current user is a throwaway test/dev account (verified manually before
  // running this) - safe to standardize them all rather than trying to guess which
  // ones already had a "real" upload vs a placeholder from an earlier run of this tool.
  const result = await client.query('UPDATE "Users" SET "AvatarUrl" = $1', [avatarUrl]);
  console.log(`${result.rowCount} users set to the standard avatar.`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
