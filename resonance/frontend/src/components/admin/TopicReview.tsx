import { useEffect, useMemo, useState } from 'react';
import { useAdminTopics, useApproveTopic, useRejectTopic } from '../../hooks/useAdmin';
import type { AdminTopic } from '../../types/admin';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';
const inputClass =
  'w-full rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';
const primaryButtonClass =
  'rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const mutedButtonClass =
  'rounded-full border border-stone-900/10 px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-50';
const dangerButtonClass =
  'rounded-full border border-stone-900/10 px-4 py-2 text-sm font-medium text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

function CandidateButton({ index, label, selected, onSelect }: {
  index: number;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
        selected
          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
          : 'border-stone-900/10 bg-stone-900/[0.025] text-stone-700 hover:text-stone-900'
      }`}
    >
      <span className="font-mono text-[10px] text-stone-500">{index}</span>
      {label}
    </button>
  );
}

export function TopicReview() {
  const { data: pending = [], isLoading } = useAdminTopics('pending');
  const approve = useApproveTopic();
  const reject = useRejectTopic();

  const [cursor, setCursor] = useState(0);
  const [customLabel, setCustomLabel] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const topic: AdminTopic | undefined = pending[cursor];
  const options = useMemo(() => {
    if (!topic) return [];
    return Array.from(new Set([...topic.candidates, topic.label])).slice(0, 3);
  }, [topic]);

  useEffect(() => {
    setSelected(options[0] ?? null);
    setCustomLabel('');
  }, [topic?.id]);

  const chosenLabel = customLabel.trim() || selected || '';
  const isBusy = approve.isPending || reject.isPending;

  const skip = () => setCursor((c) => Math.min(c + 1, pending.length));

  const submitApproval = () => {
    if (!topic || !chosenLabel) return;
    approve.mutate(
      { topicId: topic.id, label: chosenLabel, expectedComputedAt: topic.computedAt },
      { onSuccess: () => setCursor((c) => (c >= pending.length - 1 ? Math.max(c - 1, 0) : c)) },
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key >= '1' && event.key <= '3') {
        const option = options[Number(event.key) - 1];
        if (option) setSelected(option);
      }
      if (event.key.toLowerCase() === 's') skip();
      if (event.key === 'Enter') submitApproval();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, topic?.id, chosenLabel, pending.length]);

  if (isLoading) return <p className="text-sm text-stone-500">Loading queue…</p>;

  if (!topic) {
    return (
      <div className="rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-4 py-6">
        <p className="text-sm text-stone-700">Queue is empty — every topic has been reviewed.</p>
        <p className="mt-1 text-sm text-stone-500">New topics appear here after a retrain discovers them.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className={labelClass}>
          Topic {cursor + 1} of {pending.length} pending
        </p>
        <button type="button" onClick={skip} disabled={isBusy} className={mutedButtonClass}>
          Skip (s)
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] p-4">
        <div>
          <p className="font-mono text-[11px] text-stone-500">
            {topic.commentCount} comments · {topic.placeCount} places · {topic.sentiment}
          </p>
          <p className="mt-1 font-mono text-[11px] text-stone-500">keywords: {topic.keywords.join(', ')}</p>
        </div>

        {topic.samples.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-stone-900/10 pt-3">
            <p className={labelClass}>Representative comments</p>
            {topic.samples.map((sample, i) => (
              <p key={i} className="text-sm text-stone-700">
                “{sample.length > 180 ? `${sample.slice(0, 180)}…` : sample}”
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-stone-900/10 pt-3">
          <p className={labelClass}>Choose a label</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((option, i) => (
              <CandidateButton
                key={option}
                index={i + 1}
                label={option}
                selected={!customLabel.trim() && selected === option}
                onSelect={() => {
                  setSelected(option);
                  setCustomLabel('');
                }}
              />
            ))}
          </div>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="or type your own…"
            maxLength={40}
            className={inputClass}
          />
        </div>

        {(approve.error || reject.error) && (
          <p className="text-sm text-sentiment-negative">
            {(approve.error ?? reject.error) instanceof Error
              ? ((approve.error ?? reject.error) as Error).message
              : 'Something went wrong.'}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-900/10 pt-3">
          <button type="button" onClick={submitApproval} disabled={isBusy || !chosenLabel} className={primaryButtonClass}>
            {approve.isPending ? 'Approving…' : `Approve “${chosenLabel || '—'}” (enter)`}
          </button>
          <button
            type="button"
            onClick={() => reject.mutate(topic.id)}
            disabled={isBusy}
            className={dangerButtonClass}
          >
            Reject — never show this
          </button>
        </div>
      </div>
    </div>
  );
}
