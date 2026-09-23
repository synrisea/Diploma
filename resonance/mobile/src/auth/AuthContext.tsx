import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
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
  isHydrated: boolean;
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

async function loadStoredAuth(): Promise<AuthState> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (new Date(parsed.refreshTokenExpiresAtUtc) <= new Date()) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      return EMPTY_STATE;
    }
    return toState(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

const logoutListeners = new Set<() => void | Promise<void>>();

export function onBeforeLogout(listener: () => void | Promise<void>): () => void {
  logoutListeners.add(listener);
  return () => logoutListeners.delete(listener);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const refreshInFlight = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStoredAuth().then((stored) => {
      if (cancelled) return;
      setState(stored);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAuth = (response: AuthResponse) => {
    setState(toState(response));
    void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(response));
  };

  const logout = () => {
    const pending = [...logoutListeners].map((listener) => Promise.resolve(listener()).catch(() => undefined));
    void Promise.all(pending).finally(() => {
      setState(EMPTY_STATE);
      void SecureStore.deleteItemAsync(STORAGE_KEY);
    });
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
      value={{
        ...state,
        isAuthenticated: state.refreshToken !== null,
        isHydrated,
        setAuth,
        logout,
        getValidAccessToken,
      }}
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
