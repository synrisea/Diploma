import { usePlaceTopics } from '../../hooks/usePlaceTopics';
import type { Topic } from '../../types/topics';

function SignalIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dedupeTopics(topics: Topic[]): Topic[] {
  const merged = new Map<string, Topic>();

  for (const topic of topics) {
    const key = topic.label.trim().toLowerCase();
    if (key === 'uncategorized' || key === '') continue;

    const existing = merged.get(key);
    if (existing) {
      existing.commentCount += topic.commentCount;
      existing.keywords = Array.from(new Set([...existing.keywords, ...topic.keywords]));
    } else {
      merged.set(key, { ...topic });
    }
  }

  return Array.from(merged.values());
}

export function TopicBadges({ placeId }: { placeId: string }) {
  const { data, isLoading, isError } = usePlaceTopics(placeId);
  const topics = data ? dedupeTopics(data) : [];


  if (isLoading || isError || topics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => (
        <span
          key={topic.id}
          title={`Keywords: ${topic.keywords.join(', ')}`}
          className="inline-flex items-center gap-1 rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-500"
        >
          <SignalIcon />
          {capitalize(topic.label)}
          <span className="font-mono text-brand-500/60 tabular-nums">· {topic.commentCount}</span>
        </span>
      ))}
    </div>
  );
}
