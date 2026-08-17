import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useSubmitComment } from '../../hooks/useSubmitComment';

export function CommentForm({ placeId }: { placeId: string }) {
  const { isAuthenticated } = useAuth();
  const submitComment = useSubmitComment(placeId);
  const [comment, setComment] = useState('');

  if (!isAuthenticated) {
    return <p className="text-sm text-stone-500">Log in to leave a comment for this place.</p>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;

    submitComment.mutate(trimmed, {
      onSuccess: () => setComment(''),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What's it like here?"
        rows={3}
        maxLength={2000}
        required
        className="rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3 py-2 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1"
      />

      {submitComment.isError && (
        <p className="rounded-xl border border-sentiment-negative/25 bg-sentiment-negative/10 px-3 py-2 text-sm text-sentiment-negative">
          {submitComment.error instanceof Error ? submitComment.error.message : 'Something went wrong.'}
        </p>
      )}

      <button
        type="submit"
        disabled={submitComment.isPending}
        className="self-start rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {submitComment.isPending ? 'Submitting…' : 'Submit comment'}
      </button>
    </form>
  );
}
