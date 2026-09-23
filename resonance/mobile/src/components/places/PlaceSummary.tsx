import { View } from 'react-native';
import { usePlaceSummary } from '../../hooks/usePlaceSummary';
import { SectionLabel } from '../ui/Label';
import { Text } from '../ui/Text';
import { cardClass } from '../ui/styles';

export function PlaceSummary({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { data, isLoading } = usePlaceSummary(placeId, placeName);

  if (isLoading || !data?.summary) return null;

  return (
    <View className={`mt-4 ${cardClass}`}>
      <SectionLabel>What people say</SectionLabel>
      <Text className="mt-1.5 text-sm text-stone-700">{data.summary}</Text>
    </View>
  );
}
