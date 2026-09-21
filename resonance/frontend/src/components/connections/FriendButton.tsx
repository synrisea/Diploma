import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { useFriendRequests } from '../../hooks/useFriendRequests';
import { useSendFriendRequest } from '../../hooks/useSendFriendRequest';
import { useRespondToFriendRequest } from '../../hooks/useRespondToFriendRequest';
import { useRemoveFriend } from '../../hooks/useRemoveFriend';

const pillClass =
  'rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500';
const primaryPillClass =
  'rounded-full bg-brand-500 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const dangerPillClass =
  'rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';
const iconButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full border border-stone-900/10 text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-50';

function MessageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.5 10c0 .8-.7 1.5-1.5 1.5H6l-3 2.5v-2.5H4c-.8 0-1.5-.7-1.5-1.5V4c0-.8.7-1.5 1.5-1.5h8c.8 0 1.5.7 1.5 1.5z" />
    </svg>
  );
}

function RemoveFriendIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6.5" cy="5" r="2.5" />
      <path d="M2 13.5c0-2.3 2-4 4.5-4s4.5 1.7 4.5 4" />
      <path d="M11.5 5.5h3.5" />
    </svg>
  );
}

export function FriendButton({ targetUserId, showMessage = true }: { targetUserId: string; showMessage?: boolean }) {
  const { userId: myUserId } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const respond = useRespondToFriendRequest();
  const removeFriend = useRemoveFriend();

  if (!myUserId || targetUserId === myUserId) return null;

  if (friends.includes(targetUserId)) {
    return (
      <div className="flex items-center gap-1.5">
        {showMessage && (
          <Link to={`/messages/new?with=${targetUserId}`} aria-label="Send a message" title="Message" className={iconButtonClass}>
            <MessageIcon />
          </Link>
        )}
        <button
          type="button"
          onClick={() => removeFriend.mutate(targetUserId)}
          disabled={removeFriend.isPending}
          aria-label="Remove friend"
          title="Remove friend"
          className={`${iconButtonClass} hover:text-sentiment-negative`}
        >
          <RemoveFriendIcon />
        </button>
      </div>
    );
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
