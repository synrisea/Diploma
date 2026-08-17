import { usePlaceComments } from '../../hooks/usePlaceComments';

export function CommentList({ placeId }: { placeId: string }) {
  const { data, isLoading, isError } = usePlaceComments(placeId);

  if (isLoading) return <p className="text-sm text-stone-500">Reading comments…</p>;
  if (isError) return <p className="text-sm text-sentiment-negative">Couldn't load comments.</p>;
  if (!data || data.length === 0) return <p className="text-sm text-stone-500">No comments yet — be the first to leave one.</p>;

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((comment) => (
        <li key={comment.id} className="rounded-xl border border-stone-900/10 bg-stone-900/[0.025] p-3 text-sm text-stone-700">
          <p>{comment.comment}</p>
          <p className="mt-1.5 font-mono text-[10px] tabular-nums text-stone-500">
            {new Date(comment.createdAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
