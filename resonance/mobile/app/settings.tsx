import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUploadAvatar } from '@/hooks/useUploadAvatar';
import { useDeleteAvatar } from '@/hooks/useDeleteAvatar';
import { useStartEmailChange } from '@/hooks/useStartEmailChange';
import { useStartPasswordChange } from '@/hooks/useStartPasswordChange';
import { useSessions } from '@/hooks/useSessions';
import { useRevokeSession } from '@/hooks/useRevokeSession';
import { useRevokeOtherSessions } from '@/hooks/useRevokeOtherSessions';
import { useFriends } from '@/hooks/useFriends';
import { usePublicProfilesByIds } from '@/hooks/usePublicProfilesByIds';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { pickAvatar } from '@/components/settings/avatarPicker';
import { FriendButton } from '@/components/connections/FriendButton';
import { UserRow } from '@/components/connections/UserRow';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { LinkButton, PrimaryButton } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Text } from '@/components/ui/Text';
import { ErrorBanner, ErrorLine, errorMessage } from '@/components/ui/Feedback';
import { rowCardClass } from '@/components/ui/styles';

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not set' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'ru', label: 'Russian' },
  { value: 'en', label: 'English' },
];
const MAX_INTERESTS = 10;
const MAX_BIO_LENGTH = 500;

function Section({ title, first = false, children, right }: { title: string; first?: boolean; children: ReactNode; right?: ReactNode }) {
  return (
    <View className={`gap-3 ${first ? '' : 'border-t border-stone-900/10 pt-4'}`}>
      <View className="flex-row items-center justify-between">
        <Label>{title}</Label>
        {right}
      </View>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-sans-medium text-stone-700">{label}</Text>
      {children}
    </View>
  );
}

function InterestChips({ interests, onRemove }: { interests: string[]; onRemove: (interest: string) => void }) {
  if (interests.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {interests.map((interest) => (
        <View key={interest} className="flex-row items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1">
          <Text className="font-mono text-[11px] text-brand-500">{interest}</Text>
          <Pressable onPress={() => onRemove(interest)} accessibilityLabel={`Remove ${interest}`} hitSlop={6}>
            <Text className="text-brand-500">×</Text>
          </Pressable>
        </View>
      ))}
    </View>
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
  const setInterests = (v: string[]) => onChange({ interests: v });
  const atLimit = interests.length >= MAX_INTERESTS;

  const addInterest = (raw = interestInput) => {
    const trimmed = raw.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < MAX_INTERESTS) {
      setInterests([...interests, trimmed]);
    }
    setInterestInput('');
  };

  return (
    <Section title="Profile" first>
      <View className="gap-3">
        <Field label="Display name">
          <Input value={displayName} onChangeText={(v) => onChange({ displayName: v })} autoCapitalize="words" />
        </Field>

        <Field label="Bio">
          <Input
            value={bio}
            onChangeText={(v) => onChange({ bio: v })}
            placeholder="Tell people a bit about yourself"
            multiline
            numberOfLines={3}
            maxLength={MAX_BIO_LENGTH}
            textAlignVertical="top"
            className="min-h-[84px]"
          />
          <Text className="font-mono text-[11px] text-stone-500">
            {bio.length}/{MAX_BIO_LENGTH}
          </Text>
        </Field>

        <Field label="Interests">
          <InterestChips interests={interests} onRemove={(i) => setInterests(interests.filter((x) => x !== i))} />
          <Input
            value={interestInput}
            onChangeText={(text) => {
              if (text.includes(',')) addInterest(text.replace(',', ''));
              else setInterestInput(text);
            }}
            onSubmitEditing={() => addInterest()}
            onBlur={() => addInterest()}
            blurOnSubmit={false}
            returnKeyType="done"
            editable={!atLimit}
            placeholder={atLimit ? `Up to ${MAX_INTERESTS} interests` : 'Type and press Enter'}
          />
        </Field>

        <Field label="Preferred language">
          <View className="flex-row flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const active = option.value === preferredLanguage;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChange({ preferredLanguage: option.value })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  className={`rounded-full border px-3 py-2 active:opacity-75 ${
                    active ? 'border-brand-500 bg-brand-500' : 'border-stone-900/15 bg-stone-900/5'
                  }`}
                >
                  <Text className={`font-mono text-[11px] uppercase tracking-[0.7px] ${active ? 'text-brand-ink' : 'text-stone-500'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </View>
    </Section>
  );
}

function AvatarSection() {
  const { displayName } = useAuth();
  const { data: profile } = useProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const [pickError, setPickError] = useState<string | null>(null);

  const handlePick = async () => {
    setPickError(null);
    try {
      const file = await pickAvatar();
      if (file) uploadAvatar.mutate(file);
    } catch (err) {
      setPickError(errorMessage(err));
    }
  };

  const error = pickError ?? (uploadAvatar.isError ? errorMessage(uploadAvatar.error) : null) ?? (deleteAvatar.isError ? errorMessage(deleteAvatar.error) : null);

  return (
    <Section title="Avatar">
      <View className="flex-row items-center gap-4">
        <Avatar displayName={profile?.displayName ?? displayName ?? '?'} avatarUrl={profile?.avatarUrl} size="xl" shape="square" />
        <View className="flex-row items-center gap-4">
          <PrimaryButton
            label={uploadAvatar.isPending ? 'Uploading…' : profile?.avatarUrl ? 'Change' : 'Upload'}
            onPress={handlePick}
            disabled={uploadAvatar.isPending}
          />
          {profile?.avatarUrl && (
            <LinkButton
              label={deleteAvatar.isPending ? 'Removing…' : 'Remove'}
              tone="danger"
              onPress={() => deleteAvatar.mutate()}
              disabled={deleteAvatar.isPending}
            />
          )}
        </View>
      </View>
      {error && <ErrorBanner message={error} />}
    </Section>
  );
}

function EmailSection() {
  const { email } = useAuth();
  const startEmailChange = useStartEmailChange();
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleSubmit = () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    startEmailChange.mutate(trimmed);
  };

  return (
    <Section title="Email">
      {startEmailChange.isSuccess ? (
        <Text className="text-sm text-stone-600">
          Check both <Text className="text-sm font-sans-medium text-stone-900">{email}</Text> and{' '}
          <Text className="text-sm font-sans-medium text-stone-900">{newEmail}</Text> — the change applies once you click the
          link in each.
        </Text>
      ) : isEditing ? (
        <View className="gap-3">
          <Field label="New email">
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onSubmitEditing={handleSubmit}
            />
          </Field>

          {startEmailChange.isError && <ErrorBanner message={errorMessage(startEmailChange.error)} />}

          <View className="flex-row items-center gap-4">
            <PrimaryButton
              label={startEmailChange.isPending ? 'Sending…' : 'Send confirmation'}
              onPress={handleSubmit}
              disabled={startEmailChange.isPending || !newEmail.trim()}
            />
            <LinkButton label="Cancel" tone="muted" onPress={() => setIsEditing(false)} />
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          <Text className="text-sm text-stone-600">{email}</Text>
          <LinkButton label="Change email" onPress={() => setIsEditing(true)} />
        </View>
      )}
    </Section>
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

  const handleSubmit = () => {
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
    <Section title="Password">
      {startPasswordChange.isSuccess ? (
        <View className="gap-2">
          <Text className="text-sm text-stone-600">
            Check <Text className="text-sm font-sans-medium text-stone-900">{profile?.email}</Text> — the{' '}
            {hasPassword ? 'change' : 'new password'} applies once you tap the link in that email.
          </Text>
          <LinkButton label="Done" onPress={reset} className="self-start" />
        </View>
      ) : isEditing ? (
        <View className="gap-3">
          {hasPassword && (
            <Field label="Current password">
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                textContentType="password"
                autoCapitalize="none"
              />
            </Field>
          )}

          <Field label="New password">
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
            />
            <Text className="font-mono text-[11px] text-stone-500">Minimum 8 characters</Text>
          </Field>

          <Field label="Confirm new password">
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
            />
          </Field>

          {(validationError || startPasswordChange.isError) && (
            <ErrorBanner message={validationError ?? errorMessage(startPasswordChange.error)} />
          )}

          <View className="flex-row items-center gap-4">
            <PrimaryButton
              label={startPasswordChange.isPending ? 'Sending…' : 'Send confirmation'}
              onPress={handleSubmit}
              disabled={startPasswordChange.isPending}
            />
            <LinkButton label="Cancel" tone="muted" onPress={reset} />
          </View>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-sm text-stone-600">
            {hasPassword
              ? 'Your account has a password.'
              : "You signed up with Google, so there's no password on this account yet."}
          </Text>
          <LinkButton
            label={hasPassword ? 'Change password' : 'Set a password'}
            onPress={() => setIsEditing(true)}
            className="self-start"
          />
        </View>
      )}
    </Section>
  );
}

function SessionsSection() {
  const { data: sessions = [] } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOtherSessions = useRevokeOtherSessions();

  return (
    <Section
      title="Sessions"
      right={
        sessions.length > 1 ? (
          <LinkButton
            label={revokeOtherSessions.isPending ? 'Logging out…' : 'Log out other devices'}
            tone="danger"
            onPress={() => revokeOtherSessions.mutate()}
            disabled={revokeOtherSessions.isPending}
          />
        ) : undefined
      }
    >
      <View className="gap-2">
        {sessions.map((session) => (
          <View key={session.id} className={rowCardClass}>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text numberOfLines={1} className="text-sm font-sans-medium text-stone-900">
                {session.deviceLabel ?? 'Unknown device'}
              </Text>
              <Text className="font-mono text-xs text-stone-500">
                {session.ipAddress ? `${session.ipAddress} · ` : ''}signed in {formatRelativeTime(session.createdAt)}
              </Text>
            </View>

            {session.isCurrent ? (
              <View className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5">
                <Text className="font-mono text-[10px] uppercase tracking-[0.8px] text-brand-500">This device</Text>
              </View>
            ) : (
              <LinkButton
                label="Revoke"
                tone="danger"
                onPress={() => revokeSession.mutate(session.id)}
                disabled={revokeSession.isPending}
                className="shrink-0"
              />
            )}
          </View>
        ))}
      </View>
    </Section>
  );
}

function FriendsSection() {
  const { data: friendIds = [] } = useFriends();
  const { data: profiles } = usePublicProfilesByIds(friendIds);

  if (friendIds.length === 0) return null;

  return (
    <Section title="Friends">
      <View className="gap-2">
        {friendIds.map((friendId) => {
          const profile = profiles?.[friendId];
          return (
            <UserRow
              key={friendId}
              userId={friendId}
              displayName={profile?.displayName ?? 'Someone'}
              avatarUrl={profile?.avatarUrl}
              action={<FriendButton targetUserId={friendId} />}
            />
          );
        })}
      </View>
    </Section>
  );
}

const EMPTY_DRAFT: ProfileDraft = { displayName: '', bio: '', interests: [], preferredLanguage: '' };

function draftFromProfile(
  profile: { displayName: string; bio: string | null; interests: string[]; preferredLanguage: string | null } | undefined,
): ProfileDraft {
  if (!profile) return EMPTY_DRAFT;
  return {
    displayName: profile.displayName,
    bio: profile.bio ?? '',
    interests: profile.interests,
    preferredLanguage: profile.preferredLanguage ?? '',
  };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
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

  if (!isAuthenticated) return <Redirect href="/login" />;

  const footer = isDirty ? (
    <View
      className="border-t border-stone-900/10 bg-panel/95 px-6 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row flex-wrap items-center gap-3">
        <PrimaryButton
          label={updateProfile.isPending ? 'Saving…' : 'Save changes'}
          onPress={save}
          disabled={updateProfile.isPending || !draft.displayName.trim()}
        />
        <LinkButton label="Cancel" tone="muted" onPress={() => setDraft(saved)} disabled={updateProfile.isPending} />
        {updateProfile.isError && <ErrorLine error={updateProfile.error} fallback="That did not work." />}
      </View>
    </View>
  ) : null;

  return (
    <Screen eyebrow="Account" title="Settings" footer={footer} contentClassName="gap-8">
      <ProfileSection draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
      <AvatarSection />
      <EmailSection />
      <PasswordSection />
      <SessionsSection />
      <FriendsSection />
    </Screen>
  );
}
