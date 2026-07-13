import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export function UserMenu() {
  const { displayName, email, logout } = useAuth();
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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Account menu"
      >
        {initial}
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
            className="absolute right-0 top-11 z-[1100] w-56 rounded-md border border-stone-200 bg-white py-1.5 shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-stone-900">{displayName}</p>
              <p className="truncate text-xs text-stone-500">{email}</p>
            </div>
            <div className="my-1 border-t border-stone-200" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
