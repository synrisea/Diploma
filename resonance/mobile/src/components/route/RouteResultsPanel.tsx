import { Pressable, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { useRoute } from '../../route/RouteContext';
import { PanelBackButton } from '../places/PlaceDetailPanel';
import { Text } from '../ui/Text';
import { Muted } from '../ui/Feedback';

interface RouteResultsPanelProps {
  onBack: () => void;
}

export function RouteResultsPanel({ onBack }: RouteResultsPanelProps) {
  const { routeStops, clearRoute } = useRoute();

  return (
    <View className="flex-1">
      <PanelBackButton onPress={onBack} />

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-xl text-stone-900">Route</Text>
          <Pressable
            onPress={() => {
              clearRoute();
              onBack();
            }}
            hitSlop={8}
            className="active:opacity-75"
          >
            <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">Clear route</Text>
          </Pressable>
        </View>

        {routeStops && routeStops.length > 0 ? (
          <View className="mt-4 gap-2">
            {routeStops.map((stop, i) => {
              const style = getCategoryStyle(stop.categoryName);
              return (
                <View key={stop.id} className="flex-row items-start gap-3">
                  <View className="mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10">
                    <Text className="font-mono-semibold text-[11px] text-brand-500">{i + 1}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-sans-medium text-stone-900">
                      {stop.name}
                    </Text>
                    <Text className="font-mono text-[11px] uppercase tracking-[0.7px] text-stone-500">{style.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Muted className="mt-4">Plan a route from the search bar above to see it here.</Muted>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
