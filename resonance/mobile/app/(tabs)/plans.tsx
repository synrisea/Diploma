import { useMemo } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { useMyVisitIntents } from '@/hooks/useMyVisitIntents';
import { useDeleteVisitIntent } from '@/hooks/useDeleteVisitIntent';
import { usePlacesInBoundingBox } from '@/hooks/usePlacesInBoundingBox';
import { DISTRICT_BOUNDS } from '@/lib/mapConstants';
import { formatVisitDate } from '@/lib/formatVisitDate';
import { Screen } from '@/components/layout/Screen';
import { LinkButton } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Muted } from '@/components/ui/Feedback';
import { rowCardClass } from '@/components/ui/styles';

export default function PlansScreen() {
  const { isAuthenticated } = useAuth();
  const { data: intents = [], isLoading } = useMyVisitIntents();
  const { data: places = [] } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const cancelIntent = useDeleteVisitIntent();

  const placeNameById = useMemo(() => new Map(places.map((p) => [p.id, p.name])), [places]);

  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Screen eyebrow="Visits" title="My plans" back={false}>
      {isLoading ? (
        <Muted>Loading…</Muted>
      ) : intents.length === 0 ? (
        <Muted>No plans yet. Pick a place on the map and say when you're going.</Muted>
      ) : (
        <View className="gap-2">
          {intents.map((intent) => (
            <View key={intent.id} className={rowCardClass}>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
                  {placeNameById.get(intent.placeId) ?? 'Somewhere'}
                </Text>
                <Text className="font-mono text-[11px] text-stone-500">
                  {formatVisitDate(intent.visitDate)}
                  {intent.intentTag ? ` · ${intent.intentTag}` : ''}
                </Text>
              </View>
              <LinkButton
                label="Cancel"
                tone="danger"
                onPress={() => cancelIntent.mutate(intent.id)}
                disabled={cancelIntent.isPending}
                className="shrink-0"
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
