import { View } from 'react-native';
import { usePlaceTopics } from '../../hooks/usePlaceTopics';
import type { TopicSentiment } from '../../types/topics';
import { Text } from '../ui/Text';
import { SignalIcon } from '../ui/icons';
import { colors } from '../../theme/tokens';

const SENTIMENT_STYLES: Record<TopicSentiment, { box: string; text: string; color: string }> = {
  positive: {
    box: 'border-sentiment-positive/25 bg-sentiment-positive/10',
    text: 'text-sentiment-positive',
    color: colors.sentiment.positive,
  },
  negative: {
    box: 'border-sentiment-negative/25 bg-sentiment-negative/10',
    text: 'text-sentiment-negative',
    color: colors.sentiment.negative,
  },
  mixed: {
    box: 'border-sentiment-mixed/25 bg-sentiment-mixed/10',
    text: 'text-sentiment-mixed',
    color: colors.sentiment.mixed,
  },
};

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TopicBadges({ placeId }: { placeId: string }) {
  const { data: topics = [], isLoading, isError } = usePlaceTopics(placeId);

  if (isLoading || isError || topics.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {topics.map((topic) => {
        const style = SENTIMENT_STYLES[topic.sentiment] ?? SENTIMENT_STYLES.mixed;
        return (
          <View
            key={topic.id}
            accessibilityLabel={`${capitalize(topic.label)}, ${topic.localCommentCount} of this place's comments, ${topic.keywords.join(', ')}`}
            className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${style.box}`}
          >
            <SignalIcon color={style.color} />
            <Text className={`text-xs font-sans-medium ${style.text}`}>{capitalize(topic.label)}</Text>
            <Text className={`font-mono text-xs opacity-60 ${style.text}`}>· {topic.localCommentCount}</Text>
          </View>
        );
      })}
    </View>
  );
}
