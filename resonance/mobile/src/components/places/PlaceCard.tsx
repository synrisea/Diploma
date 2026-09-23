import { memo } from 'react';
import { Pressable, View } from 'react-native';
import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { Text } from '../ui/Text';

interface PlaceCardProps {
  place: PlaceDto;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const PlaceCard = memo(function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const style = getCategoryStyle(place.categoryName);

  return (
    <Pressable
      onPress={() => onSelect(place.id)}
      accessibilityRole="button"
      className={`border-b border-stone-900/10 px-4 py-3 ${isSelected ? 'bg-brand-500/10' : 'active:bg-stone-900/5'}`}
    >
      <View className="flex-row items-start gap-3">
        <View className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.color }} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-sans-medium text-stone-900">
            {place.name}
          </Text>
          <Text className="font-mono text-[11px] uppercase tracking-[0.7px] text-stone-500">{style.label}</Text>
          {place.address && (
            <Text numberOfLines={1} className="mt-0.5 text-sm text-stone-500">
              {place.address}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});
