export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferencesJson: string | null;
  createdAt: string;
  bio: string | null;
  interests: string[];
  preferredLanguage: string | null;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PublicProfileDetail {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  interests: string[];
  preferredLanguage: string | null;
  memberSince: string;
}

export interface Session {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
