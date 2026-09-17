import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useProfile } from '../../hooks/useProfile';

export function UserMenu() {
  const { displayName, email, logout } = useAuth();
  const { data: profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!displayName) return null;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-500 font-display text-sm font-medium text-brand-ink transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
      >
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl.replace('256.webp', '64.webp')} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1090] cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close account menu"
            tabIndex={-1}
          />
          <div
            role="menu"
            className="absolute right-0 top-12 z-[1100] w-56 rounded-2xl border border-stone-900/10 bg-panel/95 py-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
          >
            <div className="px-3.5 py-2.5">
              <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
              <p className="truncate font-mono text-xs text-stone-500">{email}</p>
            </div>
            <div className="my-1 border-t border-stone-900/10" />
            <Link
              to="/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="block w-full px-3.5 py-2.5 text-left text-sm text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900"
            >
              Settings
            </Link>
            <div className="my-1 border-t border-stone-900/10" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="block w-full px-3.5 py-2.5 text-left text-sm text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
