import L from 'leaflet';

const iconCache = new Map<string, L.DivIcon>();

export function createRouteStopIcon(index: number, total: number): L.DivIcon {
  const cacheKey = `${index}-${total}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const size = 26;
  const html = `
    <span style="
      position:relative; display:flex; align-items:center; justify-content:center;
      width:${size}px; height:${size}px; border-radius:9999px;
      background: var(--color-brand-500);
      box-shadow: 0 0 0 2px rgba(11,10,7,0.92), 0 0 14px 3px rgba(255,106,57,0.5);
      color: var(--color-brand-ink);
      font-family: 'IBM Plex Mono', ui-monospace, monospace;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      font-size: 12px;
    ">${index + 1}</span>
  `;

  const icon = L.divIcon({
    html,
    className: 'resonance-route-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}
