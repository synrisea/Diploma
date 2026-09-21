import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useVisitIntents } from '../../hooks/useVisitIntents';
import { useSetVisitIntent } from '../../hooks/useSetVisitIntent';
import { usePublicProfilesByIds } from '../../hooks/usePublicProfilesByIds';
import { formatVisitDate, todayIso } from '../../lib/formatVisitDate';

const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';
const primaryButtonClass =
  'self-start rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';

function IntentRow({ intentId, userId, visitDate, intentTag, displayName, avatarUrl }: {
  intentId: string;
  userId: string;
  visitDate: string;
  intentTag: string | null;
  displayName: string;
  avatarUrl: string | null;
}) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3">
      <Link to={`/users/${userId}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
          {avatarUrl ? <img src={avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" /> : initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
          <p className="font-mono text-[11px] text-stone-500">
            {formatVisitDate(visitDate)}
            {intentTag ? ` · ${intentTag}` : ''}
          </p>
        </div>
      </Link>
      <Link
        to={`/messages/new?with=${userId}&intentId=${intentId}`}
        className="shrink-0 rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500 transition-colors hover:text-stone-900"
      >
        Message
      </Link>
    </div>
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
      <div className="mt-5 border-t border-stone-900/10 pt-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">Want to go?</h3>
        <p className="mt-2 text-sm text-stone-500">Log in to see who's planning to visit and share your own plans.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    setIntent.mutate({ visitDate: dateValue, intentTag: tagValue.trim() || undefined });
  };

  return (
    <div className="mt-5 border-t border-stone-900/10 pt-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">Want to go?</h3>

      {isLoading ? (
        <p className="mt-2 text-sm text-stone-500">Loading…</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          <input
            type="date"
            value={dateValue}
            min={todayIso()}
            onChange={(e) => setVisitDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
          />

          <input
            type="text"
            value={tagValue}
            onChange={(e) => setIntentTag(e.target.value)}
            placeholder="What's the plan? (optional)"
            maxLength={60}
            className={inputClass}
          />

          {setIntent.isError && (
            <p className="text-sm text-sentiment-negative">
              {setIntent.error instanceof Error ? setIntent.error.message : 'Something went wrong.'}
            </p>
          )}

          <button type="button" onClick={handleSubmit} disabled={setIntent.isPending || !dateValue} className={primaryButtonClass}>
            {setIntent.isPending ? 'Saving…' : ownIntent ? 'Update my plan' : "I'm going"}
          </button>
        </div>
      )}

      {otherIntents.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">
            {otherIntents.length} {otherIntents.length === 1 ? 'person' : 'people'} going
          </p>
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
        </div>
      )}
    </div>
  );
}
