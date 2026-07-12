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
        placeholder="What's it like here? Quiet, crowded, good wifi..."
        rows={3}
        maxLength={2000}
        required
        className="rounded border border-stone-300 px-3 py-2 text-sm focus:outline-2 focus:outline-rose-700"
      />

      {submitComment.isError && (
        <p className="text-sm text-rose-700">
          {submitComment.error instanceof Error ? submitComment.error.message : 'Something went wrong.'}
        </p>
      )}

      <button
        type="submit"
        disabled={submitComment.isPending}
        className="self-start rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {submitComment.isPending ? 'Submitting…' : 'Submit comment'}
      </button>
    </form>
  );
}
