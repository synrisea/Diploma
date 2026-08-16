const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');
const PLACES_API = process.env.PLACES_API_BASE_URL || 'http://localhost:5112';

const BBOX = { minLat: 40.30, minLng: 49.78, maxLat: 40.42, maxLng: 49.90 };

const GENERIC_NAMES = new Set([
  'restaurant', 'cafe', 'café', 'bar', 'park', 'fast food', 'bakery',
  'bank', 'pharmacy', 'supermarket', 'hotel', 'shop', 'store', 'club',
]);

function isGenericName(place) {
  const name = (place.name || '').trim().toLowerCase();
  const category = (place.categoryName || '').trim().toLowerCase();
  return !name || name === category || GENERIC_NAMES.has(name);
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { done: [], blocked: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function randomDelay(minMs, maxMs) {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));
}

async function fetchPlaces() {
  const url = `${PLACES_API}/api/places?minLat=${BBOX.minLat}&minLng=${BBOX.minLng}&maxLat=${BBOX.maxLat}&maxLng=${BBOX.maxLng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API returned ${res.status}`);
  return res.json();
}

async function acceptCookiesIfPresent(page) {
  try {
    const button = page.getByRole('button', { name: /Accept all|I agree|Reject all/i }).first();
    if (await button.isVisible({ timeout: 3000 })) {
      await button.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // no consent dialog, fine
  }
}

async function dismissSignInPromptIfPresent(page) {
  // Google periodically shows an interstitial nagging anonymous users to
  // sign in ("Sign-in to get the best of Google Maps"). It's a modal
  // overlay that intercepts clicks on everything underneath it (review
  // cards, "See more" buttons), so if left up it silently breaks whatever
  // interaction was attempted next.
  try {
    // Google's own markup for this doesn't reliably expose "Dismiss" as an
    // accessible role (link/button) - match on visible text instead.
    const dismiss = page.getByText('Dismiss', { exact: true }).first();
    if (await dismiss.isVisible({ timeout: 500 })) {
      await dismiss.click({ timeout: 1000 });
      await page.waitForTimeout(300);
    }
  } catch {
    // no sign-in prompt, fine
  }
}

async function isBlocked(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  return /unusual traffic|automated queries|detected unusual/i.test(text);
}

function normalizeName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function wordsEqual(w1, w2) {
  if (w1 === w2) return true;
  return w1.length >= 4 && w2.length >= 4 && levenshtein(w1, w2) <= 1;
}


function namesMatch(sourceName, displayedName) {
  const a = normalizeName(sourceName);
  const b = normalizeName(displayedName);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const aJoined = a.replace(/\s/g, '');
  const bJoined = b.replace(/\s/g, '');
  if (aJoined === bJoined || aJoined.includes(bJoined) || bJoined.includes(aJoined)) return true;

  const LOCATION_WORDS = new Set(['baku', 'azerbaijan']);
  const wordsA = a.split(' ').filter((w) => w.length > 2 && !LOCATION_WORDS.has(w));
  const wordsB = b.split(' ').filter((w) => w.length > 2 && !LOCATION_WORDS.has(w));
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];

  const GENERIC_VENUE_WORDS = new Set([
    'cafe', 'kafe', 'coffee', 'restaurant', 'restoran', 'bar', 'lounge', 'house', 'home',
    'club', 'pub', 'kitchen', 'bistro', 'grill', 'shop', 'market', 'hotel', 'park', 'garden',
  ]);
  if (shorter.length === 1 && GENERIC_VENUE_WORDS.has(shorter[0])) return false;

  if (shorter.length === 1 && longer.length === 1) {
    return shorter[0] === longer[0];
  }

  return shorter.every((w) => longer.some((lw) => wordsEqual(w, lw)));
}

async function scrapeReviewsForPlace(page, place) {
  const query = encodeURIComponent(`${place.name} ${place.address || ''} Baku Azerbaijan`);
  
  await page.goto(`https://www.google.com/maps/search/${query}/@${place.latitude},${place.longitude},17z?hl=en`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await acceptCookiesIfPresent(page);
  await dismissSignInPromptIfPresent(page);

  if (await isBlocked(page)) {
    throw new Error('BLOCKED');
  }

  await page.waitForTimeout(2000);

  const firstResult = page.locator('a.hfpxzc').first();
  if ((await firstResult.count()) > 0) {
    await firstResult.click();
    await page.waitForTimeout(2000);
  }

  const displayedName = await page.locator('h1.DUwDvf').first().textContent().catch(() => null);
  if (!displayedName || !namesMatch(place.name, displayedName)) {
    return { matched: false, reviews: [], reason: `name mismatch: got "${displayedName}"` };
  }

  const reviewsTab = page.getByRole('tab', { name: /Reviews/i });
  if ((await reviewsTab.count()) === 0) {
    return { matched: false, reviews: [] };
  }
  await reviewsTab.click();
  await page.waitForTimeout(1500);
  await dismissSignInPromptIfPresent(page);

  const scrollable = page.locator('div[role="main"]').last();
  for (let i = 0; i < 6; i++) {
    await scrollable.evaluate((el) => el.scrollBy(0, 1200)).catch(() => {});
    await page.waitForTimeout(700);
    await dismissSignInPromptIfPresent(page);
  }

  // Clicking a "See more" button removes it from the DOM (the text expands
  // in place), which shifts every subsequent index in a live-queried list -
  // an indexed `for` loop over `.nth(i)` skips roughly half the buttons as a
  // result. Always re-querying and clicking whichever is currently first
  // is self-correcting regardless of how the DOM shifts after each click.
  const moreButtons = page.locator('button[aria-label="See more"]');
  for (let guard = 0; guard < 500; guard++) {
    await dismissSignInPromptIfPresent(page);
    if ((await moreButtons.count()) === 0) break;
    await moreButtons.first().click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(150);
  }

  const reviews = await page.evaluate(() => {

    const cards = Array.from(document.querySelectorAll('div[data-review-id]'));
    const seenIds = new Set();
    const result = [];
    for (const card of cards) {
      const id = card.getAttribute('data-review-id');
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const ratingEl = card.querySelector('span[role="img"][aria-label*="star"]');
      const ratingMatch = ratingEl?.getAttribute('aria-label')?.match(/(\d+(\.\d+)?)/);
      const textEl = card.querySelector('span.wiI7pd');
      const text = textEl?.textContent?.trim() || '';
      if (text && text.length > 1) {
        result.push({ rating: ratingMatch ? parseFloat(ratingMatch[1]) : null, text });
      }
    }
    return result;
  });

  return { matched: true, reviews };
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
  const idsArg = args.find((a) => a.startsWith('--ids='));
  const explicitIds = idsArg ? new Set(idsArg.split('=')[1].split(',')) : null;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allPlaces = await fetchPlaces();
  const candidates = allPlaces.filter((p) => !isGenericName(p));
  console.log(
    `${allPlaces.length} places total, ${candidates.length} with real names, ` +
      `${allPlaces.length - candidates.length} skipped (generic name).`,
  );

  const progress = loadProgress();
  let places;
  if (explicitIds) {
    // --ids= re-scrapes regardless of prior progress, for targeted re-checks.
    places = candidates.filter((p) => explicitIds.has(p.id));
  } else {
    const doneIds = new Set(progress.done);
    places = candidates.filter((p) => !doneIds.has(p.id)).slice(0, limit);
  }
  console.log(`${places.length} places to scrape this run.`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  for (const place of places) {
    try {
      const result = await scrapeReviewsForPlace(page, place);
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `${place.id}.json`),
        JSON.stringify({ place, ...result }, null, 2),
      );
      console.log(`[OK] ${place.name}: ${result.matched ? result.reviews.length : 'no match'} reviews`);
      if (!progress.done.includes(place.id)) progress.done.push(place.id);
      saveProgress(progress);
    } catch (err) {
      if (err.message === 'BLOCKED') {
        console.error('Blocked by Google - stopping. Re-run later to resume from here.');
        break;
      }
      console.error(`[FAIL] ${place.name}: ${err.message}`);
    }

    await randomDelay(4000, 8000);
  }

  await browser.close();
  console.log('Done for this run.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
