import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useUploadAvatar } from '../hooks/useUploadAvatar';
import { useDeleteAvatar } from '../hooks/useDeleteAvatar';
import { useStartEmailChange } from '../hooks/useStartEmailChange';
import { useStartPasswordChange } from '../hooks/useStartPasswordChange';
import { useSessions } from '../hooks/useSessions';
import { useRevokeSession } from '../hooks/useRevokeSession';
import { useRevokeOtherSessions } from '../hooks/useRevokeOtherSessions';
import { useFriends } from '../hooks/useFriends';
import { usePublicProfilesByIds } from '../hooks/usePublicProfilesByIds';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { AvatarCropper } from '../components/settings/AvatarCropper';
import { BackLink } from '../components/layout/BackLink';
import { Link } from 'react-router-dom';
import { FriendButton } from '../components/connections/FriendButton';

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

interface ProfileDraft {
  displayName: string;
  bio: string;
  interests: string[];
  preferredLanguage: string;
}

function ProfileSection({ draft, onChange }: { draft: ProfileDraft; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const [interestInput, setInterestInput] = useState('');
  const { displayName, bio, interests, preferredLanguage } = draft;
  const setDisplayName = (v: string) => onChange({ displayName: v });
  const setBio = (v: string) => onChange({ bio: v });
  const setInterests = (v: string[]) => onChange({ interests: v });
  const setPreferredLanguage = (v: string) => onChange({ preferredLanguage: v });

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

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Profile</SectionHeading>
      <div className="flex flex-col gap-3">
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

      </div>
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

function PasswordSection() {
  const { data: profile } = useProfile();
  const startPasswordChange = useStartPasswordChange();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasPassword = profile?.hasPassword ?? true;

  const reset = () => {
    setIsEditing(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setValidationError(null);
    startPasswordChange.reset();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Those passwords do not match.');
      return;
    }

    startPasswordChange.mutate({
      currentPassword: hasPassword ? currentPassword : null,
      newPassword,
    });
  };

  return (
    <section className="flex flex-col gap-3 border-t border-stone-900/10 pt-4">
      <SectionHeading>Password</SectionHeading>

      {startPasswordChange.isSuccess ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-600">
            Check <span className="font-medium text-stone-900">{profile?.email}</span> — the{' '}
            {hasPassword ? 'change' : 'new password'} applies once you click the link in that email.
          </p>
          <button type="button" onClick={reset} className={linkButtonClass}>
            Done
          </button>
        </div>
      ) : isEditing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {hasPassword && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-700">Current password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <span className="font-mono text-[11px] text-stone-500">Minimum 8 characters</span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">Confirm new password</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {(validationError || startPasswordChange.isError) && (
            <p className={errorClass}>
              {validationError ??
                (startPasswordChange.error instanceof Error
                  ? startPasswordChange.error.message
                  : 'Something went wrong.')}
            </p>
          )}

          <div className="flex gap-4">
            <button type="submit" disabled={startPasswordChange.isPending} className={primaryButtonClass}>
              {startPasswordChange.isPending ? 'Sending…' : 'Send confirmation'}
            </button>
            <button type="button" onClick={reset} className={mutedLinkButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-stone-600">
            {hasPassword
              ? 'Your account has a password.'
              : "You signed up with Google, so there's no password on this account yet."}
          </p>
          <button type="button" onClick={() => setIsEditing(true)} className={linkButtonClass}>
            {hasPassword ? 'Change password' : 'Set a password'}
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
            <div
              key={friendId}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3"
            >
              <Link to={`/users/${friendId}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-display text-xs font-medium text-brand-ink">
                  {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                </div>
                <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
              </Link>
              <FriendButton targetUserId={friendId} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

const EMPTY_DRAFT: ProfileDraft = { displayName: '', bio: '', interests: [], preferredLanguage: '' };

function draftFromProfile(profile: { displayName: string; bio: string | null; interests: string[]; preferredLanguage: string | null } | undefined): ProfileDraft {
  if (!profile) return EMPTY_DRAFT;
  return {
    displayName: profile.displayName,
    bio: profile.bio ?? '',
    interests: profile.interests,
    preferredLanguage: profile.preferredLanguage ?? '',
  };
}

export function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);

  const saved = draftFromProfile(profile);

  useEffect(() => {
    if (profile) setDraft(draftFromProfile(profile));
  }, [profile]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = () => {
    const displayName = draft.displayName.trim();
    if (!displayName) return;
    updateProfile.mutate({
      displayName,
      bio: draft.bio.trim(),
      interests: draft.interests,
      preferredLanguage: draft.preferredLanguage,
    });
  };

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div>
          <p className={labelClass}>Account</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">Settings</h1>
        </div>

        <ProfileSection draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <AvatarSection />
        <EmailSection />
        <PasswordSection />
        <SessionsSection />
        <FriendsSection />
      </div>

      {isDirty && (
        <div className="sticky bottom-0 mt-6 border-t border-stone-900/10 bg-panel/95 py-3 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={updateProfile.isPending || !draft.displayName.trim()} className={primaryButtonClass}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setDraft(saved)} disabled={updateProfile.isPending} className={mutedLinkButtonClass}>
              Cancel
            </button>
            {updateProfile.isError && (
              <p className="text-sm text-sentiment-negative">
                {updateProfile.error instanceof Error ? updateProfile.error.message : 'That did not work.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
