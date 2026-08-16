const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

async function main() {
  const matchedIds = new Set();
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (!file.endsWith('.json') || file === 'progress.json') continue;
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
    if (data.matched && data.reviews && data.reviews.length > 0) {
      matchedIds.add(data.place.id);
    }
  }
  console.log(`Keeping ${matchedIds.size} verified places.`);

  const placesClient = new Client({
    host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_places',
  });
  await placesClient.connect();

  const { rows: allPlaces } = await placesClient.query('SELECT "Id" FROM "Places"');
  const toDelete = allPlaces.map((r) => r.Id).filter((id) => !matchedIds.has(id));
  console.log(`Deleting ${toDelete.length} unmatched places.`);

  const feedbackClient = new Client({
    host: 'localhost', port: 5432, user: 'resonance', password: 'dev123', database: 'resonance_feedback',
  });
  await feedbackClient.connect();

  let commentsDeleted = 0;
  let placesDeleted = 0;

  for (const placeId of toDelete) {
    const del = await feedbackClient.query('DELETE FROM "QuickFeedbacks" WHERE "PlaceId" = $1', [placeId]);
    commentsDeleted += del.rowCount;
    const delPlace = await placesClient.query('DELETE FROM "Places" WHERE "Id" = $1', [placeId]);
    placesDeleted += delPlace.rowCount;
  }

  console.log(`Places deleted: ${placesDeleted}`);
  console.log(`Synthetic comments deleted: ${commentsDeleted}`);

  await placesClient.end();
  await feedbackClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
