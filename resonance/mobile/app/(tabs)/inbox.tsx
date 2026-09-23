import { Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@/hooks/useConversations';
import { usePublicProfilesByIds } from '@/hooks/usePublicProfilesByIds';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Muted } from '@/components/ui/Feedback';
import { colors } from '@/theme/tokens';

export default function InboxScreen() {
  const router = useRouter();
  const { data: conversations = [], isLoading, isRefetching, refetch } = useConversations();
  const { data: profiles } = usePublicProfilesByIds(conversations.map((c) => c.otherUserId));

  return (
    <Screen
      eyebrow="Messages"
      title="Inbox"
      back={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={() => void refetch()} tintColor={colors.brand[500]} />
      }
    >
      {isLoading ? (
        <Muted>Loading…</Muted>
      ) : conversations.length === 0 ? (
        <Muted>No conversations yet — message someone from a place's "Want to go?" list.</Muted>
      ) : (
        <View className="gap-2">
          {conversations.map((conversation) => {
            const profile = profiles?.[conversation.otherUserId];
            const displayName = profile?.displayName ?? 'Someone';
            const isUnread = conversation.unreadCount > 0;

            return (
              <Pressable
                key={conversation.conversationId}
                onPress={() =>
                  router.push({
                    pathname: '/messages/[conversationId]',
                    params: { conversationId: conversation.conversationId, with: conversation.otherUserId },
                  })
                }
                className="flex-row items-center gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3 active:bg-stone-900/[0.05]"
              >
                <Avatar displayName={displayName} avatarUrl={profile?.avatarUrl} size="lg" />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
                    {displayName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`text-sm ${isUnread ? 'font-sans-medium text-stone-900' : 'text-stone-500'}`}
                  >
                    {conversation.lastMessage ?? ''}
                  </Text>
                </View>
                <View className="shrink-0 flex-row items-center gap-2">
                  {conversation.lastMessageAt && (
                    <Text className="font-mono text-[11px] text-stone-500">{formatRelativeTime(conversation.lastMessageAt)}</Text>
                  )}
                  {isUnread && (
                    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5">
                      <Text className="font-mono-medium text-[10px] text-brand-ink">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
