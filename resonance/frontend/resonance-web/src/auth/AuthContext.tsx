import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthResponse } from '../types/auth';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  setAuth: (response: AuthResponse) => void;
  logout: () => void;
}

const STORAGE_KEY = 'resonance.auth';
const EMPTY_STATE: AuthState = { token: null, userId: null, email: null, displayName: null };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredAuth(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (new Date(parsed.expiresAtUtc) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return EMPTY_STATE;
    }
    return { token: parsed.token, userId: parsed.userId, email: parsed.email, displayName: parsed.displayName };
  } catch {
    return EMPTY_STATE;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadStoredAuth);

  const setAuth = (response: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    setState({ token: response.token, userId: response.userId, email: response.email, displayName: response.displayName });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(EMPTY_STATE);
  };

  return (
    <AuthContext.Provider value={{ ...state, isAuthenticated: state.token !== null, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
