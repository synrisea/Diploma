import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useUploadAvatar } from '../hooks/useUploadAvatar';
import { useDeleteAvatar } from '../hooks/useDeleteAvatar';
import { useStartEmailChange } from '../hooks/useStartEmailChange';
import { useSessions } from '../hooks/useSessions';
import { useRevokeSession } from '../hooks/useRevokeSession';
import { useRevokeOtherSessions } from '../hooks/useRevokeOtherSessions';
import { useFriends } from '../hooks/useFriends';
import { usePublicProfilesByIds } from '../hooks/usePublicProfilesByIds';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { AvatarCropper } from '../components/settings/AvatarCropper';
import { BackLink } from '../components/layout/BackLink';
import { Link } from 'react-router-dom';

const inputClass =
  'rounded-xl border border-stone-900/10 bg-stone-900/[0.03] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-500 focus:border-brand-500 focus:outline-2 focus:outline-brand-500 focus:-outline-offset-1';
const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';
const errorClass =
  'rounded-xl border border-sentiment-negative/25 bg-sentiment-negative/10 px-3 py-2 text-sm text-sentiment-negative';

const primaryButtonClass =
  'self-start rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50';
const linkButtonClass =
  'text-sm font-medium text-brand-600 transition-colors hover:text-brand-500 disabled:opacity-50';
const mutedLinkButtonClass =
  'text-sm font-medium text-stone-500 transition-colors hover:text-stone-900 disabled:opacity-50';
const dangerLinkButtonClass =
  'text-sm font-medium text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

function SectionHeading({ children }: { children: string }) {
  return <p className={labelClass}>{children}</p>;
}

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'ru', label: 'Russian' },
  { value: 'en', label: 'English' },
];
const MAX_INTERESTS = 10;
const MAX_BIO_LENGTH = 500;

function InterestChips({
  interests,
  onRemove,
}: {
  interests: string[];
  onRemove: (interest: string) => void;
}) {
  if (interests.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {interests.map((interest) => (
        <span
          key={interest}
          className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 font-mono text-[11px] text-brand-500"
        >
          {interest}
          <button
            type="button"
            onClick={() => onRemove(interest)}
            aria-label={`Remove ${interest}`}
            className="text-brand-500 hover:text-brand-600"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function ProfileSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio ?? '');
      setInterests(profile.interests);
      setPreferredLanguage(profile.preferredLanguage ?? '');
    }
  }, [profile]);

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < MAX_INTERESTS) {
      setInterests([...interests, trimmed]);
    }
    setInterestInput('');
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;
    updateProfile.mutate({
      displayName: trimmed,
      bio: bio.trim(),
      interests,
      preferredLanguage,
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Profile</SectionHeading>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">Display name</span>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a bit about yourself"
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            className={inputClass}
          />
          <span className="font-mono text-[11px] text-stone-500">
            {bio.length}/{MAX_BIO_LENGTH}
          </span>
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">Interests</span>
          <InterestChips interests={interests} onRemove={(i) => setInterests(interests.filter((x) => x !== i))} />
          <input
            type="text"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={handleInterestKeyDown}
            onBlur={addInterest}
            disabled={interests.length >= MAX_INTERESTS}
            placeholder={interests.length >= MAX_INTERESTS ? `Up to ${MAX_INTERESTS} interests` : 'Type and press Enter'}
            className={inputClass}
          />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">Preferred language</span>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className={inputClass}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-panel text-stone-900">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {updateProfile.isError && (
          <p className={errorClass}>
            {updateProfile.error instanceof Error ? updateProfile.error.message : 'Something went wrong.'}
          </p>
        )}
        {updateProfile.isSuccess && <p className="text-sm text-sentiment-positive">Saved.</p>}

        <button type="submit" disabled={updateProfile.isPending} className={primaryButtonClass}>
          {updateProfile.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </section>
  );
}

function AvatarSection() {
  const { displayName } = useAuth();
  const { data: profile } = useProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const initial = (profile?.displayName ?? displayName ?? '?').charAt(0).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  };

  const handleCropConfirm = (blob: Blob) => {
    setPendingFile(null);
    uploadAvatar.mutate(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
  };

  return (
    <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
      <SectionHeading>Avatar</SectionHeading>

      {pendingFile ? (
        <AvatarCropper file={pendingFile} onConfirm={handleCropConfirm} onCancel={() => setPendingFile(null)} />
      ) : (
        <div className="flex items-center gap-4">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 font-display text-xl font-medium text-brand-ink">
              {initial}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className={primaryButtonClass}
            >
              {uploadAvatar.isPending ? 'Uploading…' : profile?.avatarUrl ? 'Change' : 'Upload'}
            </button>
            {profile?.avatarUrl && (
              <button
                type="button"
                onClick={() => deleteAvatar.mutate()}
                disabled={deleteAvatar.isPending}
                className={dangerLinkButtonClass}
              >
                {deleteAvatar.isPending ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {(uploadAvatar.isError || deleteAvatar.isError) && (
        <p className={errorClass}>
          {(uploadAvatar.error ?? deleteAvatar.error) instanceof Error
            ? ((uploadAvatar.error ?? deleteAvatar.error) as Error).message
            : 'Something went wrong.'}
        </p>
      )}
    </section>
  );
}

function EmailSection() {
  const { email } = useAuth();
  const startEmailChange = useStartEmailChange();
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    startEmailChange.mutate(trimmed);
  };

  return (
    <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
      <SectionHeading>Email</SectionHeading>

      {startEmailChange.isSuccess ? (
        <p className="text-sm text-stone-600">
          Check both <span className="font-medium text-stone-900">{email}</span> and{' '}
          <span className="font-medium text-stone-900">{newEmail}</span> — the change applies once you click the
          link in each.
        </p>
      ) : isEditing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">New email</span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          {startEmailChange.isError && (
            <p className={errorClass}>
              {startEmailChange.error instanceof Error ? startEmailChange.error.message : 'Something went wrong.'}
            </p>
          )}

          <div className="flex gap-4">
            <button type="submit" disabled={startEmailChange.isPending} className={primaryButtonClass}>
              {startEmailChange.isPending ? 'Sending…' : 'Send confirmation'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className={mutedLinkButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-stone-600">{email}</p>
          <button type="button" onClick={() => setIsEditing(true)} className={linkButtonClass}>
            Change email
          </button>
        </div>
      )}
    </section>
  );
}

function SessionsSection() {
  const { data: sessions = [] } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOtherSessions = useRevokeOtherSessions();

  return (
    <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
      <div className="flex items-center justify-between">
        <SectionHeading>Sessions</SectionHeading>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={() => revokeOtherSessions.mutate()}
            disabled={revokeOtherSessions.isPending}
            className={dangerLinkButtonClass}
          >
            {revokeOtherSessions.isPending ? 'Logging out…' : 'Log out other devices'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-stone-900" title={session.deviceLabel ?? undefined}>
                {session.deviceLabel ?? 'Unknown device'}
              </p>
              <p className="font-mono text-xs text-stone-500">
                {session.ipAddress ? `${session.ipAddress} · ` : ''}signed in {formatRelativeTime(session.createdAt)}
              </p>
            </div>

            {session.isCurrent ? (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-brand-500">
                This device
              </span>
            ) : (
              <button
                type="button"
                onClick={() => revokeSession.mutate(session.id)}
                disabled={revokeSession.isPending}
                className={`shrink-0 ${dangerLinkButtonClass}`}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FriendsSection() {
  const { data: friendIds = [] } = useFriends();
  const { data: profiles } = usePublicProfilesByIds(friendIds);

  if (friendIds.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
      <SectionHeading>Friends</SectionHeading>

      <div className="flex flex-col gap-2">
        {friendIds.map((friendId) => {
          const profile = profiles?.[friendId];
          const displayName = profile?.displayName ?? 'Someone';
          const initial = displayName.charAt(0).toUpperCase();

          return (
            <Link
              key={friendId}
              to={`/users/${friendId}`}
              className="flex items-center gap-2.5 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3 transition-colors hover:bg-stone-900/[0.05]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
                {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
              </div>
              <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <p className={labelClass}>Account</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">Settings</h1>
        </div>

        <ProfileSection />
        <AvatarSection />
        <EmailSection />
        <SessionsSection />
        <FriendsSection />
      </div>
    </div>
  );
}
