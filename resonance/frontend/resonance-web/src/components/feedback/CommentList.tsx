import { usePlaceComments } from '../../hooks/usePlaceComments';

export function CommentList({ placeId }: { placeId: string }) {
  const { data, isLoading, isError } = usePlaceComments(placeId);

  if (isLoading) return <p className="text-sm text-stone-400">Loading comments…</p>;
  if (isError) return <p className="text-sm text-red-700">Couldn't load comments.</p>;
  if (!data || data.length === 0) return <p className="text-sm text-stone-400">No comments yet — be the first to leave one.</p>;

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((comment) => (
        <li key={comment.id} className="rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-700 shadow-sm">
          <p>{comment.comment}</p>
          <p className="mt-1.5 text-xs text-stone-400">{new Date(comment.createdAt).toLocaleDateString()}</p>
        </li>
      ))}
    </ul>
  );
}
