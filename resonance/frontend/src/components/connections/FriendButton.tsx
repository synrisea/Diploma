import { useAuth } from '../../auth/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { useFriendRequests } from '../../hooks/useFriendRequests';
import { useSendFriendRequest } from '../../hooks/useSendFriendRequest';
import { useRespondToFriendRequest } from '../../hooks/useRespondToFriendRequest';

const pillClass =
  'rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500';
const primaryPillClass =
  'rounded-full bg-brand-500 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const dangerPillClass =
  'rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

export function FriendButton({ targetUserId }: { targetUserId: string }) {
  const { userId: myUserId } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const respond = useRespondToFriendRequest();

  if (!myUserId || targetUserId === myUserId) return null;

  if (friends.includes(targetUserId)) {
    return <span className={pillClass}>Friends</span>;
  }

  const incoming = requests.find((r) => r.otherUserId === targetUserId && r.isIncoming);
  if (incoming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => respond.mutate({ requestId: incoming.id, accept: true })}
          disabled={respond.isPending}
          className={primaryPillClass}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => respond.mutate({ requestId: incoming.id, accept: false })}
          disabled={respond.isPending}
          className={dangerPillClass}
        >
          Decline
        </button>
      </div>
    );
  }

  const outgoing = requests.find((r) => r.otherUserId === targetUserId && !r.isIncoming);
  if (outgoing) {
    return <span className={pillClass}>Request sent</span>;
  }

  return (
    <button
      type="button"
      onClick={() => sendRequest.mutate(targetUserId)}
      disabled={sendRequest.isPending}
      className={primaryPillClass}
    >
      {sendRequest.isPending ? 'Sending…' : 'Add friend'}
    </button>
  );
}
