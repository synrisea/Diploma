import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { useUserComments } from '../hooks/useUserComments';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { DISTRICT_BOUNDS } from '../lib/mapConstants';
import { PhotoLightbox } from '../components/feedback/PhotoLightbox';
import { BackLink } from '../components/layout/BackLink';
import { formatRelativeTime } from '../lib/formatRelativeTime';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';

const LANGUAGE_LABELS: Record<string, string> = {
  az: 'Azerbaijani',
  ru: 'Russian',
  en: 'English',
};

function ProfileAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-500 font-display text-2xl font-medium text-brand-ink">
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-4 py-3">
      <p className="font-display text-xl text-stone-900">{value}</p>
      <p className={labelClass}>{label}</p>
    </div>
  );
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading: isProfileLoading } = usePublicProfile(id);
  const { data: comments = [] } = useUserComments(id);
  const { data: places = [] } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  const placeNameById = useMemo(() => new Map(places.map((p) => [p.id, p.name])), [places]);

  const stats = useMemo(
    () => ({
      commentCount: comments.length,
      distinctPlacesCount: new Set(comments.map((c) => c.placeId)).size,
      photosSharedCount: comments.reduce((sum, c) => sum + c.photoUrls.length, 0),
    }),
    [comments],
  );

  if (isProfileLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <BackLink />
        <p className="mx-auto max-w-2xl text-sm text-stone-500">Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <BackLink />
        <p className="mx-auto max-w-2xl text-sm text-stone-500">This profile couldn't be found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex items-center gap-4">
          <ProfileAvatar displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
          <div>
            <h1 className="font-display text-2xl text-stone-900">{profile.displayName}</h1>
            <p className="mt-1 font-mono text-xs text-stone-500">
              Member since {formatRelativeTime(profile.memberSince)}
              {profile.preferredLanguage && LANGUAGE_LABELS[profile.preferredLanguage]
                ? ` · Speaks ${LANGUAGE_LABELS[profile.preferredLanguage]}`
                : ''}
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-700">
          {profile.bio || <span className="text-stone-500">No bio yet.</span>}
        </p>

        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-brand-500/15 px-2.5 py-1 font-mono text-[11px] text-brand-500"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <StatTile value={stats.commentCount} label="Comments" />
          <StatTile value={stats.distinctPlacesCount} label="Places" />
          <StatTile value={stats.photosSharedCount} label="Photos" />
        </div>

        <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
          <p className={labelClass}>Comment history</p>

          {comments.length === 0 ? (
            <p className="text-sm text-stone-500">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl border border-stone-900/10 bg-stone-900/[0.025] p-3 text-sm text-stone-700"
                >
                  <p className="font-medium text-stone-900">
                    {placeNameById.get(comment.placeId) ?? 'Unknown place'}
                  </p>
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
              ))}
            </ul>
          )}
        </section>
      </div>

      {expandedUrl && <PhotoLightbox url={expandedUrl} onClose={() => setExpandedUrl(null)} />}
    </div>
  );
}
