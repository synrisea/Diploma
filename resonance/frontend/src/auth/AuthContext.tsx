import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { AuthResponse } from '../types/auth';
import { refreshAuth } from '../api/auth';

interface AuthState {
  accessToken: string | null;
  accessTokenExpiresAtUtc: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAtUtc: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  setAuth: (response: AuthResponse) => void;
  logout: () => void;
  getValidAccessToken: () => Promise<string>;
}

const STORAGE_KEY = 'resonance.auth';
const EMPTY_STATE: AuthState = {
  accessToken: null,
  accessTokenExpiresAtUtc: null,
  refreshToken: null,
  refreshTokenExpiresAtUtc: null,
  userId: null,
  email: null,
  displayName: null,
};

const REFRESH_SKEW_MS = 30_000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toState(response: AuthResponse): AuthState {
  return {
    accessToken: response.accessToken,
    accessTokenExpiresAtUtc: response.accessTokenExpiresAtUtc,
    refreshToken: response.refreshToken,
    refreshTokenExpiresAtUtc: response.refreshTokenExpiresAtUtc,
    userId: response.userId,
    email: response.email,
    displayName: response.displayName,
  };
}

function loadStoredAuth(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (new Date(parsed.refreshTokenExpiresAtUtc) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return EMPTY_STATE;
    }
    return toState(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadStoredAuth);
  const stateRef = useRef(state);
  stateRef.current = state;
  const refreshInFlight = useRef<Promise<string> | null>(null);

  const setAuth = (response: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    setState(toState(response));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(EMPTY_STATE);
  };

  const getValidAccessToken = (): Promise<string> => {
    const current = stateRef.current;

    if (!current.refreshToken) {
      return Promise.reject(new Error('Not authenticated.'));
    }

    const stillFresh =
      current.accessToken !== null &&
      current.accessTokenExpiresAtUtc !== null &&
      new Date(current.accessTokenExpiresAtUtc).getTime() - Date.now() > REFRESH_SKEW_MS;

    if (stillFresh) {
      return Promise.resolve(current.accessToken!);
    }

    if (!refreshInFlight.current) {
      refreshInFlight.current = refreshAuth(current.refreshToken)
        .then((response) => {
          setAuth(response);
          return response.accessToken;
        })
        .catch((err) => {
          logout();
          throw err;
        })
        .finally(() => {
          refreshInFlight.current = null;
        });
    }

    return refreshInFlight.current;
  };

  return (
    <AuthContext.Provider
      value={{ ...state, isAuthenticated: state.refreshToken !== null, setAuth, logout, getValidAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
