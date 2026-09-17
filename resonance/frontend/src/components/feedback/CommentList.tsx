import { useState } from 'react';
import { usePlaceComments } from '../../hooks/usePlaceComments';
import { useCommentAuthors } from '../../hooks/useCommentAuthors';
import { PhotoLightbox } from './PhotoLightbox';

function CommentAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
      {avatarUrl ? (
        <img src={avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export function CommentList({ placeId }: { placeId: string }) {
  const { data, isLoading, isError } = usePlaceComments(placeId);
  const { data: authors } = useCommentAuthors(data);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-stone-500">Reading comments…</p>;
  if (isError) return <p className="text-sm text-sentiment-negative">Couldn't load comments.</p>;
  if (!data || data.length === 0) return <p className="text-sm text-stone-500">No comments yet — be the first to leave one.</p>;

  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {data.map((comment) => {
          const author = authors?.[comment.userId];
          const displayName = author?.displayName ?? 'Anonymous';

          return (
            <li key={comment.id} className="rounded-xl border border-stone-900/10 bg-stone-900/[0.025] p-3 text-sm text-stone-700">
              <div className="flex items-center gap-2">
                <CommentAvatar displayName={displayName} avatarUrl={author?.avatarUrl ?? null} />
                <p className="font-medium text-stone-900">{displayName}</p>
              </div>
              <p className="mt-2">{comment.comment}</p>
              {comment.photoUrls.length > 0 && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto">
                  {comment.photoUrls.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setExpandedUrl(url)}
                      className="shrink-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      <img src={url} alt="" className="h-16 w-16 rounded-lg border border-stone-900/10 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1.5 font-mono text-[10px] tabular-nums text-stone-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </li>
          );
        })}
      </ul>

      {expandedUrl && <PhotoLightbox url={expandedUrl} onClose={() => setExpandedUrl(null)} />}
    </>
  );
}
