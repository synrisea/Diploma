type Unit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const UNITS: [Unit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
];

const NAMED: Partial<Record<Unit, { past: string; future: string }>> = {
  day: { past: 'yesterday', future: 'tomorrow' },
  month: { past: 'last month', future: 'next month' },
  year: { past: 'last year', future: 'next year' },
};

const intlFormatter =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

function formatFallback(value: number, unit: Unit): string {
  if (value === 0) return unit === 'second' ? 'now' : `this ${unit}`;
  const named = NAMED[unit];
  if (named && Math.abs(value) === 1) return value < 0 ? named.past : named.future;
  const magnitude = Math.abs(value);
  const label = `${magnitude} ${unit}${magnitude === 1 ? '' : 's'}`;
  return value < 0 ? `${label} ago` : `in ${label}`;
}

function format(value: number, unit: Unit): string {
  return intlFormatter ? intlFormatter.format(value, unit) : formatFallback(value, unit);
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = new Date(isoDate).getTime() - Date.now();

  for (const [unit, unitMs] of UNITS) {
    if (Math.abs(diffMs) >= unitMs) {
      return format(Math.round(diffMs / unitMs), unit);
    }
  }

  return format(Math.round(diffMs / 1000), 'second');
}
