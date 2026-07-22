import { usePlaceTopics } from '../../hooks/usePlaceTopics';

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5c.2 0 .38.13.44.32L9.3 4.7l2.88.86c.19.06.32.24.32.44s-.13.38-.32.44L9.3 7.3l-.86 2.88a.46.46 0 0 1-.88 0L6.7 7.3l-2.88-.86A.46.46 0 0 1 3.5 6c0-.2.13-.38.32-.44L6.7 4.7l.86-2.88c.06-.19.24-.32.44-.32Z" />
      <path d="M13 9.5c.18 0 .34.12.4.29l.4 1.2 1.2.4a.42.42 0 0 1 0 .8l-1.2.4-.4 1.2a.42.42 0 0 1-.8 0l-.4-1.2-1.2-.4a.42.42 0 0 1 0-.8l1.2-.4.4-1.2c.06-.17.22-.29.4-.29Z" />
    </svg>
  );
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TopicBadges({ placeId }: { placeId: string }) {
  const { data, isLoading, isError } = usePlaceTopics(placeId);

  // Topics is enrichment, not core content — stay silent while loading or
  // on error/empty rather than showing an error state for a supplementary feature.
  if (isLoading || isError || !data || data.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {data.map((topic) => (
        <span
          key={topic.id}
          title={`Keywords: ${topic.keywords.join(', ')}`}
          className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
        >
          <SparkleIcon />
          {capitalize(topic.label)}
          <span className="text-brand-700/60">· {topic.commentCount}</span>
        </span>
      ))}
    </div>
  );
}
