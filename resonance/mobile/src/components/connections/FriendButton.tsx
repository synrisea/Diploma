import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { useFriendRequests } from '../../hooks/useFriendRequests';
import { useSendFriendRequest } from '../../hooks/useSendFriendRequest';
import { useRespondToFriendRequest } from '../../hooks/useRespondToFriendRequest';
import { useRemoveFriend } from '../../hooks/useRemoveFriend';
import { IconButton, PillButton } from '../ui/Button';
import { Text } from '../ui/Text';
import { MessageIcon, RemoveFriendIcon } from '../ui/icons';
import { pillTextClass } from '../ui/styles';

export function FriendButton({ targetUserId, showMessage = true }: { targetUserId: string; showMessage?: boolean }) {
  const router = useRouter();
  const { userId: myUserId } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const respond = useRespondToFriendRequest();
  const removeFriend = useRemoveFriend();

  if (!myUserId || targetUserId === myUserId) return null;

  if (friends.includes(targetUserId)) {
    return (
      <View className="flex-row items-center gap-1.5">
        {showMessage && (
          <IconButton
            accessibilityLabel="Send a message"
            onPress={() => router.push({ pathname: '/messages/new', params: { with: targetUserId } })}
          >
            <MessageIcon />
          </IconButton>
        )}
        <IconButton
          accessibilityLabel="Remove friend"
          onPress={() => removeFriend.mutate(targetUserId)}
          disabled={removeFriend.isPending}
        >
          <RemoveFriendIcon />
        </IconButton>
      </View>
    );
  }

  const incoming = requests.find((r) => r.otherUserId === targetUserId && r.isIncoming);
  if (incoming) {
    return (
      <View className="flex-row items-center gap-1.5">
        <PillButton
          label="Accept"
          tone="primary"
          onPress={() => respond.mutate({ requestId: incoming.id, accept: true })}
          disabled={respond.isPending}
        />
        <PillButton
          label="Decline"
          tone="danger"
          onPress={() => respond.mutate({ requestId: incoming.id, accept: false })}
          disabled={respond.isPending}
        />
      </View>
    );
  }

  const outgoing = requests.find((r) => r.otherUserId === targetUserId && !r.isIncoming);
  if (outgoing) {
    return (
      <View className="rounded-full border border-stone-900/10 px-3 py-1.5">
        <Text className={`${pillTextClass} text-stone-500`}>Request sent</Text>
      </View>
    );
  }

  return (
    <PillButton
      label={sendRequest.isPending ? 'Sending…' : 'Add friend'}
      tone="primary"
      onPress={() => sendRequest.mutate(targetUserId)}
      disabled={sendRequest.isPending}
    />
  );
}
