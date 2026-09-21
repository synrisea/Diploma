export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function formatVisitDate(iso: string): string {
  if (iso === todayIso()) return 'today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === tomorrow.toLocaleDateString('en-CA')) return 'tomorrow';

  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
}
