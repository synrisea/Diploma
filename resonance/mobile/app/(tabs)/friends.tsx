import { useState } from 'react';
import { View } from 'react-native';
import { useSearchUsers } from '@/hooks/useSearchUsers';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { usePublicProfilesByIds } from '@/hooks/usePublicProfilesByIds';
import { useFriends } from '@/hooks/useFriends';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { FriendButton } from '@/components/connections/FriendButton';
import { UserRow } from '@/components/connections/UserRow';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Text } from '@/components/ui/Text';
import { Muted } from '@/components/ui/Feedback';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

export default function FriendsScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results = [], isLoading } = useSearchUsers(debouncedQuery);
  const { data: requests = [] } = useFriendRequests();
  const incomingRequests = requests.filter((r) => r.isIncoming);
  const outgoingRequests = requests.filter((r) => !r.isIncoming);
  const { data: friends = [] } = useFriends();
  const { data: knownProfiles } = usePublicProfilesByIds([
    ...incomingRequests.map((r) => r.otherUserId),
    ...outgoingRequests.map((r) => r.otherUserId),
    ...friends,
  ]);

  const isSearching = query.trim().length > 0 && (isLoading || query !== debouncedQuery);

  return (
    <Screen eyebrow="Connections" title="Find friends" back={false}>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name…"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search by name"
      />

      {incomingRequests.length > 0 && (
        <View className="gap-2">
          <Label>Friend requests</Label>
          {incomingRequests.map((request) => {
            const profile = knownProfiles?.[request.otherUserId];
            return (
              <UserRow
                key={request.id}
                userId={request.otherUserId}
                displayName={profile?.displayName ?? 'Someone'}
                avatarUrl={profile?.avatarUrl}
                subtitle="wants to be friends"
                action={<FriendButton targetUserId={request.otherUserId} />}
              />
            );
          })}
        </View>
      )}

      {friends.length > 0 && (
        <View className="gap-2">
          <Label>Your friends ({friends.length})</Label>
          {friends.map((friendId) => {
            const profile = knownProfiles?.[friendId];
            return (
              <UserRow
                key={friendId}
                userId={friendId}
                displayName={profile?.displayName ?? 'Someone'}
                avatarUrl={profile?.avatarUrl}
                action={<FriendButton targetUserId={friendId} />}
              />
            );
          })}
        </View>
      )}

      {outgoingRequests.length > 0 && (
        <View className="gap-2">
          <Label>Requests you sent</Label>
          {outgoingRequests.map((request) => {
            const profile = knownProfiles?.[request.otherUserId];
            return (
              <UserRow
                key={request.id}
                userId={request.otherUserId}
                displayName={profile?.displayName ?? 'Someone'}
                avatarUrl={null}
                showAvatar={false}
                action={<Text className="font-mono text-[11px] uppercase tracking-[0.7px] text-stone-500">waiting</Text>}
              />
            );
          })}
        </View>
      )}

      <View className="gap-2">
        {isSearching ? (
          <Muted>Searching…</Muted>
        ) : query.trim().length > 0 && results.length === 0 ? (
          <Muted>No one found with that name.</Muted>
        ) : (
          results.map((result) => (
            <UserRow
              key={result.id}
              userId={result.id}
              displayName={result.displayName}
              avatarUrl={result.avatarUrl}
              subtitle={`Member since ${formatRelativeTime(result.memberSince)}${result.bio ? ` · ${result.bio}` : ''}`}
              action={<FriendButton targetUserId={result.id} />}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
