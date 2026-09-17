import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Rendered via a portal straight onto document.body: the sidebar (aside) uses
  // backdrop-blur, and a backdrop-filter ancestor creates a new containing block for
  // position:fixed descendants, which clipped this overlay to the sidebar's bounds
  // instead of the viewport when it was rendered inline.
  return createPortal(
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-stone-900 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <img
        src={url}
        alt=""
        className="max-h-full max-w-full rounded-2xl object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
