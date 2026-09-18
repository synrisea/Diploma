import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useVisitIntents } from '../../hooks/useVisitIntents';
import { useSetVisitIntent } from '../../hooks/useSetVisitIntent';
import { useDeleteVisitIntent } from '../../hooks/useDeleteVisitIntent';
import { usePublicProfilesByIds } from '../../hooks/usePublicProfilesByIds';

const TIME_BUCKETS: { value: string; label: string }[] = [
  { value: 'Today', label: 'Today' },
  { value: 'Tomorrow', label: 'Tomorrow' },
  { value: 'ThisWeekend', label: 'This weekend' },
];
const QUICK_TAGS = ['coffee', 'remote work', 'sightseeing', 'drinks'];

const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';
const primaryButtonClass =
  'self-start rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const dangerLinkButtonClass =
  'text-sm font-medium text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

function IntentRow({ intentId, userId, timeBucket, intentTag, displayName, avatarUrl }: {
  intentId: string;
  userId: string;
  timeBucket: string;
  intentTag: string | null;
  displayName: string;
  avatarUrl: string | null;
}) {
  const initial = displayName.charAt(0).toUpperCase();
  const bucketLabel = TIME_BUCKETS.find((b) => b.value === timeBucket)?.label ?? timeBucket;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3">
      <Link to={`/users/${userId}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
          {avatarUrl ? <img src={avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" /> : initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
          <p className="font-mono text-[11px] text-stone-500">
            {bucketLabel}
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
  const deleteIntentMutation = useDeleteVisitIntent(placeId);

  const [timeBucket, setTimeBucket] = useState('Today');
  const [intentTag, setIntentTag] = useState('');

  const otherIntents = intents.filter((i) => i.userId !== userId);
  const ownIntent = intents.find((i) => i.userId === userId);
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
    setIntent.mutate({ timeBucket, intentTag: intentTag.trim() || undefined });
  };

  return (
    <div className="mt-5 border-t border-stone-900/10 pt-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">Want to go?</h3>

      {isLoading ? (
        <p className="mt-2 text-sm text-stone-500">Loading…</p>
      ) : ownIntent ? (
        <div className="mt-2 flex items-center gap-3">
          <p className="text-sm text-stone-700">
            You're going{' '}
            <span className="font-medium text-stone-900">
              {TIME_BUCKETS.find((b) => b.value === ownIntent.timeBucket)?.label ?? ownIntent.timeBucket}
            </span>
            {ownIntent.intentTag ? ` · ${ownIntent.intentTag}` : ''}
          </p>
          <button
            type="button"
            onClick={() => deleteIntentMutation.mutate(ownIntent.id)}
            disabled={deleteIntentMutation.isPending}
            className={dangerLinkButtonClass}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5">
          <div className="flex gap-1.5">
            {TIME_BUCKETS.map((bucket) => (
              <button
                key={bucket.value}
                type="button"
                onClick={() => setTimeBucket(bucket.value)}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                  timeBucket === bucket.value ? 'bg-brand-500 text-brand-ink' : 'bg-stone-900/[0.05] text-stone-500 hover:text-stone-900'
                }`}
              >
                {bucket.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setIntentTag(tag)}
                className="rounded-full bg-stone-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-stone-500 hover:text-stone-900"
              >
                {tag}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={intentTag}
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

          <button type="button" onClick={handleSubmit} disabled={setIntent.isPending} className={primaryButtonClass}>
            {setIntent.isPending ? 'Saving…' : "I'm going"}
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
                timeBucket={intent.timeBucket}
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
