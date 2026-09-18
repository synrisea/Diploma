import { Link } from 'react-router-dom';
import { useConversations } from '../hooks/useConversations';
import { usePublicProfilesByIds } from '../hooks/usePublicProfilesByIds';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { BackLink } from '../components/layout/BackLink';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';

export function InboxPage() {
  const { data: conversations = [], isLoading } = useConversations();
  const { data: profiles } = usePublicProfilesByIds(conversations.map((c) => c.otherUserId));

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <p className={labelClass}>Messages</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">Inbox</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-stone-500">No conversations yet — message someone from a place's "Want to go?" list.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversations.map((conversation) => {
              const profile = profiles?.[conversation.otherUserId];
              const displayName = profile?.displayName ?? 'Someone';
              const initial = displayName.charAt(0).toUpperCase();

              return (
                <li key={conversation.conversationId}>
                  <Link
                    to={`/messages/${conversation.conversationId}?with=${conversation.otherUserId}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3 transition-colors hover:bg-stone-900/[0.05]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-sm font-medium text-brand-ink">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
                      <p className="truncate text-sm text-stone-500">{conversation.lastMessage ?? ''}</p>
                    </div>
                    {conversation.lastMessageAt && (
                      <p className="shrink-0 font-mono text-[11px] text-stone-500">{formatRelativeTime(conversation.lastMessageAt)}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
