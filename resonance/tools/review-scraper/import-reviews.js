const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MAX_COMMENT_LENGTH = 2000;

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'resonance',
    password: 'dev123',
    database: 'resonance_feedback',
  });
  await client.connect();

  const { rows: userRows } = await client.query('SELECT DISTINCT "UserId" FROM "QuickFeedbacks"');
  const userIds = userRows.map((r) => r.UserId);
  if (userIds.length === 0) throw new Error('No existing UserIds found to reuse.');

  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json') && f !== 'progress.json');

  let placesReplaced = 0;
  let commentsDeleted = 0;
  let commentsInserted = 0;
  let truncated = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
    if (!data.matched || !data.reviews || data.reviews.length === 0) continue;

    const placeId = data.place.id;

    await client.query('BEGIN');
    try {
      const del = await client.query('DELETE FROM "QuickFeedbacks" WHERE "PlaceId" = $1', [placeId]);
      commentsDeleted += del.rowCount;

      const now = Date.now();
      for (const review of data.reviews) {
        let text = review.text.trim();
        if (!text) continue;
        if (text.length > MAX_COMMENT_LENGTH) {
          text = text.slice(0, MAX_COMMENT_LENGTH);
          truncated++;
        }
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
       
        const daysAgo = Math.floor(Math.random() * 120);
        const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        await client.query(
          'INSERT INTO "QuickFeedbacks" ("Id", "PlaceId", "UserId", "Comment", "CreatedAt") VALUES ($1, $2, $3, $4, $5)',
          [crypto.randomUUID(), placeId, userId, text, createdAt],
        );
        commentsInserted++;
      }
      await client.query('COMMIT');
      placesReplaced++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed for place ${placeId}: ${err.message}`);
    }
  }

  console.log(`Places replaced: ${placesReplaced}`);
  console.log(`Synthetic comments deleted: ${commentsDeleted}`);
  console.log(`Real comments inserted: ${commentsInserted} (${truncated} truncated to ${MAX_COMMENT_LENGTH} chars)`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
