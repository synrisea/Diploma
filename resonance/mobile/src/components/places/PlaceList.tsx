import { useCallback } from 'react';
import { View } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { PlaceDto } from '../../types/place';
import { PlaceCard } from './PlaceCard';
import { Text } from '../ui/Text';
import { Muted } from '../ui/Feedback';

interface PlaceListProps {
  places: PlaceDto[];
  isLoading: boolean;
  isError: boolean;
  selectedPlaceId: string | null;
  onSelect: (id: string) => void;
}

export function PlaceList({ places, isLoading, isError, selectedPlaceId, onSelect }: PlaceListProps) {
  const renderItem = useCallback(
    ({ item }: { item: PlaceDto }) => (
      <PlaceCard place={item} isSelected={item.id === selectedPlaceId} onSelect={onSelect} />
    ),
    [selectedPlaceId, onSelect],
  );

  return (
    <View className="flex-1">
      <View className="border-b border-stone-900/10 px-4 py-3.5">
        <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-stone-500">
          {isLoading ? 'Reading signal…' : `${places.length} place${places.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      <BottomSheetFlatList
        data={places}
        keyExtractor={(place: PlaceDto) => place.id}
        renderItem={renderItem}
        extraData={selectedPlaceId}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <>
            {isError && (
              <Text className="p-4 text-sm text-sentiment-negative">
                Couldn't reach the Resonance API. Confirm the backend is running on port 5112.
              </Text>
            )}
            {!isError && !isLoading && places.length === 0 && (
              <Muted className="p-4">No places in this area yet. Pan or zoom out to explore more of the map.</Muted>
            )}
          </>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
