import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  useAdminComments,
  useAdminDimensions,
  useAdminTopics,
  useAuditLog,
  useForceRetrain,
  useIsAdmin,
  useHideDimension,
  useMergeTopics,
  usePipelineStatus,
  useRenameDimension,
  useReopenTopic,
  useRestoreDimension,
  useSetCommentHidden,
  useUnmergeTopic,
} from '../hooks/useAdmin';
import { ConfirmButton } from '../components/admin/ConfirmButton';
import { TopicReview } from '../components/admin/TopicReview';
import { BackLink } from '../components/layout/BackLink';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import type { AdminDimension, AdminTopic } from '../types/admin';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';
const cardClass = 'rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3';
const mutedButtonClass =
  'rounded-full border border-stone-900/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-50';

const TABS = ['review', 'topics', 'dimensions', 'content', 'pipeline', 'audit'] as const;
type Tab = (typeof TABS)[number];

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-4 py-3">
      <p className="font-display text-xl text-stone-900">{value}</p>
      <p className={labelClass}>{label}</p>
    </div>
  );
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

function TopicsTab() {
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const { data: topics = [], isLoading } = useAdminTopics(filter === 'all' ? undefined : filter);
  const reopen = useReopenTopic();
  const merge = useMergeTopics();
  const unmerge = useUnmergeTopic();
  const [mergeSource, setMergeSource] = useState<AdminTopic | null>(null);

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFilter(name)}
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
              filter === name ? 'bg-stone-900/10 text-stone-900' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {mergeSource && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3.5 py-3">
          <p className="text-sm text-stone-900">
            Now pick the tag that <span className="font-medium">{mergeSource.approvedLabel ?? mergeSource.label}</span> should
            join.
          </p>
          <button type="button" onClick={() => setMergeSource(null)} className={mutedButtonClass}>
            Cancel
          </button>
        </div>
      )}

      {merge.isError && (
        <p className="text-sm text-sentiment-negative">
          {merge.error instanceof Error ? merge.error.message : 'That did not work.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {topics.map((topic) => (
          <div key={topic.id} className={`flex items-center justify-between gap-3 ${cardClass}`}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">
                {topic.approvedLabel ?? topic.label}
                {topic.approvedLabel && topic.approvedLabel !== topic.label && (
                  <span className="ml-2 font-mono text-[11px] text-stone-500">auto: {topic.label}</span>
                )}
              </p>
              <p className="font-mono text-[11px] text-stone-500">
                #{topic.id} · {topic.mergedInto ? `joined to #${topic.mergedInto}` : topic.status} ·{' '}
                {topic.commentCount} comments · {topic.placeCount} places
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {mergeSource ? (
                mergeSource.id !== topic.id && !topic.mergedInto && (
                  <ConfirmButton
                    label="Join this"
                    confirmLabel="Click again"
                    disabled={merge.isPending}
                    className={mutedButtonClass}
                    onConfirm={() =>
                      merge.mutate(
                        { sourceId: mergeSource.id, targetId: topic.id },
                        { onSuccess: () => setMergeSource(null) },
                      )
                    }
                  />
                )
              ) : topic.mergedInto ? (
                <button
                  type="button"
                  onClick={() => unmerge.mutate(topic.id)}
                  disabled={unmerge.isPending}
                  className={mutedButtonClass}
                >
                  Undo join
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setMergeSource(topic)} className={mutedButtonClass}>
                    Join
                  </button>
                  {topic.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => reopen.mutate(topic.id)}
                      disabled={reopen.isPending}
                      className={mutedButtonClass}
                    >
                      Reopen
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DimensionRow({ dimension }: { dimension: AdminDimension }) {
  const rename = useRenameDimension();
  const hide = useHideDimension();
  const restore = useRestoreDimension();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dimension.label);

  const save = () => {
    const label = draft.trim();
    if (!label || label === dimension.label) {
      setEditing(false);
      return;
    }
    rename.mutate({ dimensionId: dimension.id, label }, { onSuccess: () => setEditing(false) });
  };

  return (
    <div className={`flex items-center justify-between gap-3 ${cardClass}`}>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            maxLength={40}
            className="w-full rounded-lg border border-stone-900/10 bg-stone-900/[0.03] px-2.5 py-1.5 text-sm text-stone-900 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1"
          />
        ) : (
          <p className="truncate text-sm font-medium text-stone-900">{dimension.label}</p>
        )}
        <p className="mt-0.5 font-mono text-[11px] text-stone-500">
          {dimension.hidden ? 'hidden · ' : ''}{dimension.comment_count} comments · {dimension.sentiment}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <button type="button" onClick={save} disabled={rename.isPending} className={mutedButtonClass}>
              {rename.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={mutedButtonClass}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(dimension.label);
                setEditing(true);
              }}
              className={mutedButtonClass}
            >
              Rename
            </button>
            {dimension.hidden ? (
              <button
                type="button"
                onClick={() => restore.mutate(dimension.id)}
                disabled={restore.isPending}
                className={mutedButtonClass}
              >
                Show again
              </button>
            ) : (
              <ConfirmButton
                label="Hide"
                confirmLabel="Click again to hide"
                disabled={hide.isPending}
                className={mutedButtonClass}
                onConfirm={() => hide.mutate(dimension.id)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DimensionsTab() {
  const { data: dimensions = [], isLoading } = useAdminDimensions();

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-stone-500">
        These are the options in the heatmap menu. Renaming one changes what people see. Hiding one takes it
        off the menu, and you can put it back.
      </p>
      {dimensions.map((dimension) => (
        <DimensionRow key={dimension.id} dimension={dimension} />
      ))}
    </div>
  );
}

function ContentTab() {
  const [text, setText] = useState('');
  const [includeHidden, setIncludeHidden] = useState(true);
  const { data: comments = [], isLoading } = useAdminComments(text, includeHidden);
  const setHidden = useSetCommentHidden();

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search comments…"
        className="rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1"
      />
      <label className="flex items-center gap-2 text-sm text-stone-500">
        <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
        Show hidden ones too
      </label>

      {isLoading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-500">No comments match that.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => (
            <div key={comment.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm ${comment.isHidden ? 'text-stone-500 line-through' : 'text-stone-700'}`}>
                  {comment.comment.length > 240 ? `${comment.comment.slice(0, 240)}…` : comment.comment}
                </p>
                {comment.isHidden ? (
                  <button
                    type="button"
                    onClick={() => setHidden.mutate({ commentId: comment.id, hidden: false })}
                    disabled={setHidden.isPending}
                    className={mutedButtonClass}
                  >
                    Show
                  </button>
                ) : (
                  <ConfirmButton
                    label="Hide"
                    confirmLabel="Click again to hide"
                    disabled={setHidden.isPending}
                    className={mutedButtonClass}
                    onConfirm={() => setHidden.mutate({ commentId: comment.id, hidden: true })}
                  />
                )}
              </div>
              {comment.photoUrls.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {comment.photoUrls.map((url) => (
                    <img key={url} src={url} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-stone-900/10 object-cover" />
                  ))}
                </div>
              )}
              <p className="mt-1.5 font-mono text-[11px] text-stone-500">
                {comment.isHidden ? 'hidden · ' : ''}{formatRelativeTime(comment.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  const { data: status, isLoading } = usePipelineStatus();
  const retrain = useForceRetrain();

  if (isLoading || !status) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={status.totalComments} label="Comments" />
        <Stat value={status.commentsSinceLastRun} label="New comments" />
        <Stat value={status.topicCount} label="Tags" />
        <Stat value={status.pendingReview} label="To review" />
      </div>

      <div className={cardClass}>
        <p className="font-mono text-[11px] text-stone-500">
          last rebuilt {status.lastReclusteredAt ? formatRelativeTime(status.lastReclusteredAt) : 'never'}
          {status.unclassifiedSentiment > 0 ? ` · ${status.unclassifiedSentiment} comments not scored yet` : ''}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => retrain.mutate()}
          disabled={retrain.isPending}
          className="self-start rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {retrain.isPending ? 'Rebuilding, this takes a minute…' : 'Rebuild tags'}
        </button>
        <p className="text-sm text-stone-500">
          Looks at every comment again and works out the tags from scratch. New ones go to the review list.
        </p>
        {retrain.isError && (
          <p className="text-sm text-sentiment-negative">
            {retrain.error instanceof Error ? retrain.error.message : 'That did not work.'}
          </p>
        )}
      </div>
    </div>
  );
}

function AuditTab() {
  const { data: entries = [], isLoading } = useAuditLog();

  if (isLoading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (entries.length === 0) return <p className="text-sm text-stone-500">No admin actions recorded yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <div key={i} className={cardClass}>
          <p className="text-sm text-stone-900">
            {entry.action} {entry.targetType} #{entry.targetId}
          </p>
          <p className="font-mono text-[11px] text-stone-500">
            {formatRelativeTime(entry.createdAt)}
            {entry.after?.approvedLabel ? ` · "${String(entry.after.approvedLabel)}"` : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, overview, isLoading } = useIsAdmin();
  const [tab, setTab] = useState<Tab>('review');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <BackLink />
        <p className="mx-auto max-w-3xl text-sm text-stone-500">One moment…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <BackLink />
        <p className="mx-auto max-w-3xl text-sm text-stone-500">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <p className={labelClass}>Admin</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">Admin</h1>
        </div>

        {overview && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat value={overview.totalComments} label="Comments" />
            <Stat value={overview.placesWithComments} label="Places" />
            <Stat value={overview.topicsByStatus.pending ?? 0} label="To review" />
            <Stat value={overview.placesWithApprovedTopics} label="Places with tags" />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-b border-stone-900/10 pb-3">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                tab === name ? 'bg-brand-500 text-brand-ink' : 'bg-stone-900/[0.05] text-stone-500 hover:text-stone-900'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {tab === 'review' && <TopicReview />}
        {tab === 'topics' && <TopicsTab />}
        {tab === 'dimensions' && <DimensionsTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
