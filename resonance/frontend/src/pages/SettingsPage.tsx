import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useUploadAvatar } from '../hooks/useUploadAvatar';
import { useDeleteAvatar } from '../hooks/useDeleteAvatar';
import { useStartEmailChange } from '../hooks/useStartEmailChange';
import { useSessions } from '../hooks/useSessions';
import { useRevokeSession } from '../hooks/useRevokeSession';
import { useRevokeOtherSessions } from '../hooks/useRevokeOtherSessions';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { AvatarCropper } from '../components/settings/AvatarCropper';

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

function ProfileSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName);
  }, [profile]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;
    updateProfile.mutate({ displayName: trimmed });
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

function BackLink() {
  return (
    <Link
      to="/"
      className="fixed left-6 top-20 z-30 inline-flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-panel/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
        <path d="M7.5 2.5L3 6l4.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </Link>
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
      </div>
    </div>
  );
}
