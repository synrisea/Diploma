export interface AuthResponse {
  userId: string;
  email: string;
  displayName: string;
  token: string;
  expiresAtUtc: string;
}
