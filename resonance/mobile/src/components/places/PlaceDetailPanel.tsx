import { Pressable, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { CommentList } from '../feedback/CommentList';
import { CommentForm } from '../feedback/CommentForm';
import { TopicBadges } from '../topics/TopicBadges';
import { VisitIntentSection } from './VisitIntentSection';
import { PlaceSummary } from './PlaceSummary';
import { Text } from '../ui/Text';
import { SectionLabel } from '../ui/Label';
import { ChevronLeftIcon } from '../ui/icons';

interface PlaceDetailPanelProps {
  place: PlaceDto;
  onBack: () => void;
}

export function PanelBackButton({ onPress, label = 'Back to list' }: { onPress: () => void; label?: string }) {
  return (
    <View className="border-b border-stone-900/10 px-4 py-3">
      <Pressable onPress={onPress} hitSlop={8} className="flex-row items-center gap-1 self-start active:opacity-75">
        <ChevronLeftIcon size={14} />
        <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">{label}</Text>
      </Pressable>
    </View>
  );
}

export function PlaceDetailPanel({ place, onBack }: PlaceDetailPanelProps) {
  const style = getCategoryStyle(place.categoryName);

  return (
    <View className="flex-1">
      <PanelBackButton onPress={onBack} />

      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: style.color }}>
          <Text className="font-mono text-[10px] uppercase tracking-[1px] text-white">{style.label}</Text>
        </View>

        <Text className="mt-3 font-display text-xl text-stone-900">{place.name}</Text>

        {place.address && <Text className="mt-1 text-sm text-stone-500">{place.address}</Text>}

        <View className="mt-3">
          <TopicBadges placeId={place.id} />
        </View>

        <PlaceSummary placeId={place.id} placeName={place.name} />

        <VisitIntentSection placeId={place.id} />

        <View className="mt-6 border-t border-stone-900/10 pt-4">
          <SectionLabel>Comments</SectionLabel>
          <View className="mt-3">
            <CommentList placeId={place.id} />
          </View>
        </View>

        <View className="mt-5 border-t border-stone-900/10 pt-4">
          <CommentForm placeId={place.id} />
        </View>
      </BottomSheetScrollView>
    </View>
  );
}
