import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

export function Header() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="relative z-[1000] flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-5 shadow-sm">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-brand-500">
          <Logo className="h-6 w-6" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-stone-900">Resonance</span>
        <span className="hidden text-sm text-stone-400 sm:inline">· Baku, Torgovy</span>
      </Link>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Link
            to="/login"
            className="rounded-md bg-brand-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
