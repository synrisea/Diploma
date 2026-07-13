export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="9.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
    </svg>
  );
}
