import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function Header() {
  const { isAuthenticated, displayName, logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5">
      <Link to="/" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-stone-900">Resonance</span>
        <span className="text-sm text-stone-400">Baku · Torgovy</span>
      </Link>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-stone-500">{displayName}</span>
            <button type="button" onClick={logout} className="text-sm font-medium text-stone-500 hover:text-stone-900">
              Log out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="rounded bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
