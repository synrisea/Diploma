import { useEffect, useState, type ReactNode } from 'react';

interface HeaderDropdownProps {
  label: string;
  triggerClassName: string;
  trigger: (isOpen: boolean) => ReactNode;
  panelClassName?: string;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function HeaderDropdown({ label, triggerClassName, trigger, panelClassName, children, align = 'right' }: HeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        className={triggerClassName}
      >
        {trigger(isOpen)}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1090] cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label={`Close ${label}`}
            tabIndex={-1}
          />
          <div
            role="menu"
            className={`absolute top-12 z-[1100] ${align === 'left' ? 'left-0' : 'right-0'} rounded-2xl border border-stone-900/10 bg-panel/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl ${panelClassName ?? ''}`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
