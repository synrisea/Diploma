import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useHeatmap } from '../../heatmap/HeatmapContext';
import { useDimensions } from '../../hooks/useDimensions';
import { HeatmapControl } from '../map/HeatmapControl';
import { RouteSearchBar } from '../route/RouteSearchBar';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { HeaderDropdown } from './HeaderDropdown';

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
      <circle cx="6" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Header() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const { mode, setMode } = useHeatmap();
  const { data: dimensions = [] } = useDimensions();

  const onMapRoute = pathname === '/';
  const activeDimension = mode?.kind === 'dimension' ? dimensions.find((d) => d.id === mode.dimensionId) : null;
  const heatmapStatus = mode === null ? 'Off' : mode.kind === 'overall' ? 'Overall' : (activeDimension?.label ?? '…');

  return (
    <header className="relative z-[1200] flex w-full items-center gap-2 border-b border-stone-900/10 bg-panel/90 px-5 py-3 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md sm:gap-4">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="relative flex items-center justify-center text-brand-500">
          <Logo className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_1px_rgba(255,106,57,0.8)]" />
        </span>
        <span className="font-display text-base uppercase tracking-[0.03em] text-stone-900">Resonance</span>
      </Link>

      {onMapRoute && (
        <>
          <div className="h-4 w-px bg-stone-900/10" />
          <HeaderDropdown
            label="Heatmap"
            align="left"
            triggerClassName="flex items-center gap-2 rounded-full px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-3"
            trigger={(open) => (
              <>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${mode === null ? 'bg-stone-500' : 'bg-brand-500 shadow-[0_0_6px_1px_rgba(255,106,57,0.6)]'}`}
                />
                <span className="hidden sm:inline">Heatmap · {heatmapStatus}</span>
                <ChevronDownIcon open={open} />
              </>
            )}
          >
            <HeatmapControl mode={mode} onModeChange={setMode} dimensions={dimensions} />
          </HeaderDropdown>

          <div className="h-4 w-px bg-stone-900/10" />
          <RouteSearchBar />
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {isAuthenticated && (
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <SettingsIcon />
          </Link>
        )}

        {isAuthenticated && <div className="h-4 w-px bg-stone-900/10" />}

        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Link
            to="/login"
            className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-brand-500 py-1 pl-4 pr-1 text-sm font-medium text-brand-ink transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-600 active:scale-[0.98]"
          >
            Log in
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
              ↗
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
