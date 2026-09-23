import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useUserComments } from '@/hooks/useUserComments';
import { usePlacesInBoundingBox } from '@/hooks/usePlacesInBoundingBox';
import { DISTRICT_BOUNDS } from '@/lib/mapConstants';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { PhotoLightbox } from '@/components/feedback/PhotoLightbox';
import { PhotoStrip } from '@/components/feedback/PhotoStrip';
import { FriendButton } from '@/components/connections/FriendButton';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { PillButton } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Text } from '@/components/ui/Text';
import { Muted } from '@/components/ui/Feedback';
import { cardClass } from '@/components/ui/styles';

const LANGUAGE_LABELS: Record<string, string> = {
  az: 'Azerbaijani',
  ru: 'Russian',
  en: 'English',
};

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-4 py-3">
      <Text className="font-display text-xl text-stone-900">{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = usePublicProfile(id);
  const { data: comments = [] } = useUserComments(id);
  const { data: places = [] } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const placeNameById = useMemo(() => new Map(places.map((p) => [p.id, p.name])), [places]);

  const stats = useMemo(
    () => ({
      commentCount: comments.length,
      distinctPlacesCount: new Set(comments.map((c) => c.placeId)).size,
      photosSharedCount: comments.reduce((sum, c) => sum + c.photoUrls.length, 0),
    }),
    [comments],
  );

  if (isProfileLoading) {
    return (
      <Screen>
        <Muted>Loading profile…</Muted>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <Muted>This profile couldn't be found.</Muted>
      </Screen>
    );
  }

  const language = profile.preferredLanguage ? LANGUAGE_LABELS[profile.preferredLanguage] : null;

  return (
    <Screen contentClassName="gap-8">
      <View className="flex-row items-center gap-4">
        <Avatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} size="2xl" shape="square" />
        <View className="min-w-0 flex-1">
          <Text className="font-display text-2xl text-stone-900">{profile.displayName}</Text>
          <Text className="mt-1 font-mono text-xs text-stone-500">
            Member since {formatRelativeTime(profile.memberSince)}
            {language ? ` · Speaks ${language}` : ''}
          </Text>
        </View>
      </View>

      {id && (
        <View className="flex-row items-center gap-1.5">
          <FriendButton targetUserId={id} showMessage={false} />
          <PillButton label="Message" onPress={() => router.push({ pathname: '/messages/new', params: { with: id } })} />
        </View>
      )}

      {profile.bio ? <Text className="text-sm text-stone-700">{profile.bio}</Text> : <Muted>No bio yet.</Muted>}

      {profile.interests.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {profile.interests.map((interest) => (
            <View key={interest} className="rounded-full bg-brand-500/15 px-2.5 py-1">
              <Text className="font-mono text-[11px] text-brand-500">{interest}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row gap-2">
        <StatTile value={stats.commentCount} label="Comments" />
        <StatTile value={stats.distinctPlacesCount} label="Places" />
        <StatTile value={stats.photosSharedCount} label="Photos" />
      </View>

      <View className="gap-3 border-t border-stone-900/10 pt-4">
        <Label>Comment history</Label>

        {comments.length === 0 ? (
          <Muted>No comments yet.</Muted>
        ) : (
          <View className="gap-2.5">
            {comments.map((comment) => (
              <View key={comment.id} className={`${cardClass} p-3`}>
                <Text className="text-sm font-sans-medium text-stone-900">
                  {placeNameById.get(comment.placeId) ?? 'Unknown place'}
                </Text>
                <Text className="mt-2 text-sm text-stone-700">{comment.comment}</Text>
                <PhotoStrip urls={comment.photoUrls} onExpand={setExpandedUrl} />
                <Text className="mt-1.5 font-mono text-[10px] text-stone-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {expandedUrl && <PhotoLightbox url={expandedUrl} onClose={() => setExpandedUrl(null)} />}
    </Screen>
  );
}
