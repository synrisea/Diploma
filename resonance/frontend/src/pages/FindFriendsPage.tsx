import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchUsers } from '../hooks/useSearchUsers';
import { useFriendRequests } from '../hooks/useFriendRequests';
import { FriendButton } from '../components/connections/FriendButton';
import { BackLink } from '../components/layout/BackLink';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';
const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';

export function FindFriendsPage() {
  const [query, setQuery] = useState('');
  const { data: results = [], isLoading } = useSearchUsers(query);
  const { data: requests = [] } = useFriendRequests();
  const incomingRequests = requests.filter((r) => r.isIncoming);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <p className={labelClass}>Connections</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">Find friends</h1>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className={inputClass}
        />

        {incomingRequests.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className={labelClass}>Friend requests</p>
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3"
              >
                <Link to={`/users/${request.otherUserId}`} className="text-sm font-medium text-stone-900 hover:opacity-80">
                  Someone wants to be friends
                </Link>
                <FriendButton targetUserId={request.otherUserId} />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isLoading ? (
            <p className="text-sm text-stone-500">Searching…</p>
          ) : query.trim().length > 0 && results.length === 0 ? (
            <p className="text-sm text-stone-500">No one found with that name.</p>
          ) : (
            results.map((result) => {
              const initial = result.displayName.charAt(0).toUpperCase();
              return (
                <div
                  key={result.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3"
                >
                  <Link to={`/users/${result.id}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
                      {result.avatarUrl ? <img src={result.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                    </div>
                    <p className="truncate text-sm font-medium text-stone-900">{result.displayName}</p>
                  </Link>
                  <FriendButton targetUserId={result.id} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
