import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';
import { useVisitIntents } from '../../hooks/useVisitIntents';
import { useSetVisitIntent } from '../../hooks/useSetVisitIntent';
import { usePublicProfilesByIds } from '../../hooks/usePublicProfilesByIds';
import { formatVisitDate, todayIso } from '../../lib/formatVisitDate';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { DateField } from '../ui/DateField';
import { PillButton, PrimaryButton } from '../ui/Button';
import { Label, SectionLabel } from '../ui/Label';
import { Text } from '../ui/Text';
import { ErrorLine, Muted } from '../ui/Feedback';
import { rowCardClass } from '../ui/styles';

function IntentRow({
  intentId,
  userId,
  visitDate,
  intentTag,
  displayName,
  avatarUrl,
}: {
  intentId: string;
  userId: string;
  visitDate: string;
  intentTag: string | null;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  return (
    <View className={rowCardClass}>
      <Pressable
        onPress={() => router.push({ pathname: '/users/[id]', params: { id: userId } })}
        className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-80"
      >
        <Avatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
            {displayName}
          </Text>
          <Text className="font-mono text-[11px] text-stone-500">
            {formatVisitDate(visitDate)}
            {intentTag ? ` · ${intentTag}` : ''}
          </Text>
        </View>
      </Pressable>
      <PillButton
        label="Message"
        onPress={() => router.push({ pathname: '/messages/new', params: { with: userId, intentId } })}
      />
    </View>
  );
}

export function VisitIntentSection({ placeId }: { placeId: string }) {
  const { isAuthenticated, userId } = useAuth();
  const { data: intents = [], isLoading } = useVisitIntents(placeId);
  const setIntent = useSetVisitIntent(placeId);

  const otherIntents = intents.filter((i) => i.userId !== userId);
  const ownIntent = intents.find((i) => i.userId === userId);

  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [intentTag, setIntentTag] = useState<string | null>(null);

  const dateValue = visitDate ?? ownIntent?.visitDate ?? todayIso();
  const tagValue = intentTag ?? ownIntent?.intentTag ?? '';
  const { data: profiles } = usePublicProfilesByIds(otherIntents.map((i) => i.userId));

  if (!isAuthenticated) {
    return (
      <View className="mt-5 border-t border-stone-900/10 pt-4">
        <SectionLabel>Want to go?</SectionLabel>
        <Muted className="mt-2">Log in to see who's planning to visit and share your own plans.</Muted>
      </View>
    );
  }

  const handleSubmit = () => {
    setIntent.mutate({ visitDate: dateValue, intentTag: tagValue.trim() || undefined });
  };

  return (
    <View className="mt-5 border-t border-stone-900/10 pt-4">
      <SectionLabel>Want to go?</SectionLabel>

      {isLoading ? (
        <Muted className="mt-2">Loading…</Muted>
      ) : (
        <View className="mt-2 gap-2.5">
          <DateField value={dateValue} minimum={todayIso()} onChange={setVisitDate} />

          <Input
            value={tagValue}
            onChangeText={setIntentTag}
            placeholder="What's the plan? (optional)"
            maxLength={60}
          />

          {setIntent.isError && <ErrorLine error={setIntent.error} />}

          <PrimaryButton
            label={setIntent.isPending ? 'Saving…' : ownIntent ? 'Update my plan' : "I'm going"}
            onPress={handleSubmit}
            disabled={setIntent.isPending || !dateValue}
            className="self-start"
          />
        </View>
      )}

      {otherIntents.length > 0 && (
        <View className="mt-4 gap-2">
          <Label>
            {otherIntents.length} {otherIntents.length === 1 ? 'person' : 'people'} going
          </Label>
          {otherIntents.map((intent) => {
            const profile = profiles?.[intent.userId];
            return (
              <IntentRow
                key={intent.id}
                intentId={intent.id}
                userId={intent.userId}
                visitDate={intent.visitDate}
                intentTag={intent.intentTag}
                displayName={profile?.displayName ?? 'Someone'}
                avatarUrl={profile?.avatarUrl ?? null}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
