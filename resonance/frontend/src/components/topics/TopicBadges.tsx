import { usePlaceTopics } from '../../hooks/usePlaceTopics';
import type { TopicSentiment } from '../../types/topics';

const SENTIMENT_STYLES: Record<TopicSentiment, string> = {
  positive: 'border-sentiment-positive/25 bg-sentiment-positive/10 text-sentiment-positive',
  negative: 'border-sentiment-negative/25 bg-sentiment-negative/10 text-sentiment-negative',
  mixed: 'border-sentiment-mixed/25 bg-sentiment-mixed/10 text-sentiment-mixed',
};

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

export function TopicBadges({ placeId }: { placeId: string }) {
  const { data: topics = [], isLoading, isError } = usePlaceTopics(placeId);

  if (isLoading || isError || topics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => (
        <span
          key={topic.id}
          title={`${topic.localCommentCount} of this place's comments · ${topic.keywords.join(', ')}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
            SENTIMENT_STYLES[topic.sentiment] ?? SENTIMENT_STYLES.mixed
          }`}
        >
          <SignalIcon />
          {capitalize(topic.label)}
          <span className="font-mono tabular-nums opacity-60">· {topic.localCommentCount}</span>
        </span>
      ))}
    </div>
  );
}
