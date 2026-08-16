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

const cases = [
  ['Street 9 bar', 'Street9Bar', true],
  ['KUDO KUDO', 'KuDoKuDo', true],
  ['Mangal', 'Manqal Old', true],
  ['Hacı Zeynal Abdin Tağıyevin ev muzeyi', 'Hacı Zeynalabdin Tağıyevin ev muzeyi', true],
  ['V Lounge Baku', 'Vasl Cafe Lounge', false],
  ['Kafe Gallery', 'Coffee Gallery', false],
  ['Kafe Gallery', 'The Gallery Lounge By Hollywood', false],
  ['BULVAR BISTRO', 'Ruin 2 By Hollywood', false],
  ['BULVAR BISTRO', 'Bulgur Gurme Tarqovu', false],
  ['Second Cup', 'Second Cup', true],
  ['Axundov Kitabxanası', 'Akhundov National Library', false],
  ['Green Coffee Bar', 'CoffeeBar 1', false],
  ['Il Futuro book cafe', 'Sahhafçı bookcafe', false],
  ['Rock House Pub', 'İrish Pub By Hollywood', false],
  ['Zatra', 'Zara', false],
];

let pass = 0;
for (const [source, displayed, expected] of cases) {
  const result = namesMatch(source, displayed);
  const ok = result === expected;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${source}" vs "${displayed}" -> ${result} (expected ${expected})`);
}
console.log(`\n${pass}/${cases.length} passed`);
