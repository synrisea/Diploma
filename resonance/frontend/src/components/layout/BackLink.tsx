import { Link } from 'react-router-dom';

export function BackLink({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="fixed left-6 top-20 z-30 inline-flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-panel/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
        <path d="M7.5 2.5L3 6l4.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </Link>
  );
}
