import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';
import { useCreateConversation } from '../hooks/useCreateConversation';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useBlockUser } from '../hooks/useBlockUser';
import { useUnblockUser } from '../hooks/useUnblockUser';
import { useBlockStatus } from '../hooks/useBlockStatus';
import { useMarkConversationRead } from '../hooks/useMarkConversationRead';
import type { ConnectionMessage } from '../types/connections';
import { BackButton } from '../components/layout/BackButton';
import { Avatar } from '../components/ui/Avatar';
import { Input } from '../components/ui/Input';
import { LinkButton, PrimaryButton } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { Muted } from '../components/ui/Feedback';

function MessageBubble({ message, isMine }: { message: ConnectionMessage; isMine: boolean }) {
  return (
    <View className={`flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
          isMine ? 'bg-brand-500' : 'border border-stone-900/10 bg-stone-900/[0.025]'
        }`}
      >
        <Text className={`text-sm ${isMine ? 'text-brand-ink' : 'text-stone-700'}`}>{message.body}</Text>
      </View>
    </View>
  );
}

export function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId?: string; with?: string; intentId?: string }>();
  const conversationId = params.conversationId;
  const recipientId = params.with;
  const visitIntentId = params.intentId;
  const { userId: myUserId } = useAuth();

  const [draft, setDraft] = useState('');
  const { data: messages = [] } = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId ?? '');
  const createConversation = useCreateConversation();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: blockStatus } = useBlockStatus(recipientId);
  const markRead = useMarkConversationRead();
  const { data: profile } = usePublicProfile(recipientId);

  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    if (conversationId && messages.length > 0) markRead.mutate(conversationId);
  }, [conversationId, messages.length]);

  if (!recipientId) {
    return (
      <View className="flex-1 bg-ground px-6" style={{ paddingTop: insets.top + 16 }}>
        <BackButton fallback="/(tabs)/inbox" />
        <Muted className="mt-6">Couldn't find who to message.</Muted>
      </View>
    );
  }

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (conversationId) {
      sendMessage.mutate(trimmed, { onSuccess: () => setDraft('') });
    } else {
      createConversation.mutate(
        { recipientUserId: recipientId, initialMessage: trimmed, visitIntentId },
        {
          onSuccess: (result) => {
            setDraft('');
            router.replace({
              pathname: '/messages/[conversationId]',
              params: { conversationId: result.conversationId, with: recipientId },
            });
          },
        },
      );
    }
  };

  const isSending = sendMessage.isPending || createConversation.isPending;
  const errorMessage =
    sendMessage.error instanceof Error
      ? sendMessage.error.message
      : createConversation.error instanceof Error
        ? createConversation.error.message
        : null;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ground"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="px-6" style={{ paddingTop: insets.top + 16 }}>
        <BackButton fallback="/(tabs)/inbox" />
        <View className="mt-5 flex-row items-center justify-between gap-3 border-b border-stone-900/10 pb-4">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <Avatar displayName={profile?.displayName ?? '?'} avatarUrl={profile?.avatarUrl} size="md" />
            <Text numberOfLines={1} className="min-w-0 flex-1 font-display text-lg text-stone-900">
              {profile?.displayName ?? 'Loading…'}
            </Text>
          </View>
          {blockStatus?.blockedByMe ? (
            <LinkButton
              label={unblockUser.isPending ? 'Unblocking…' : 'Unblock'}
              tone="muted"
              onPress={() => unblockUser.mutate(recipientId)}
              disabled={unblockUser.isPending}
            />
          ) : (
            <LinkButton
              label={blockUser.isPending ? 'Blocking…' : 'Block'}
              tone="danger"
              onPress={() => blockUser.mutate(recipientId)}
              disabled={blockUser.isPending || !blockStatus?.canMessage}
            />
          )}
        </View>
      </View>

      <FlatList
        data={newestFirst}
        inverted
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <MessageBubble message={item} isMine={item.senderId === myUserId} />}
        contentContainerClassName="gap-2 px-6 py-4"
        keyboardShouldPersistTaps="handled"
        className="flex-1"
      />

      <View className="border-t border-stone-900/10 px-6 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {blockStatus?.blockedByMe ? (
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="flex-1 text-sm text-stone-500">You blocked this account, so you can't message each other.</Text>
            <PrimaryButton
              label={unblockUser.isPending ? 'Unblocking…' : 'Unblock'}
              onPress={() => unblockUser.mutate(recipientId)}
              disabled={unblockUser.isPending}
            />
          </View>
        ) : blockStatus && !blockStatus.canMessage ? (
          <Muted>You can't message this account.</Muted>
        ) : (
          <View className="gap-2">
            {errorMessage && <Text className="text-sm text-sentiment-negative">{errorMessage}</Text>}
            <View className="flex-row items-center gap-2">
              <Input
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit={false}
                placeholder="Type a message…"
                maxLength={2000}
                className="flex-1"
                accessibilityLabel="Message"
              />
              <PrimaryButton label={isSending ? 'Sending…' : 'Send'} onPress={handleSend} disabled={isSending || !draft.trim()} />
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
