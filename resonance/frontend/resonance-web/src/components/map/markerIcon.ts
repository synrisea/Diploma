import L from 'leaflet';

// Default Leaflet marker images don't resolve correctly through Vite's asset
// pipeline, so pins are built as small inline SVG divIcons instead. This also
// lets each pin carry its category color directly.
const iconCache = new Map<string, L.DivIcon>();

export function createPinIcon(color: string, selected: boolean): L.DivIcon {
  const cacheKey = `${color}-${selected}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const size = selected ? 34 : 26;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z"
            fill="${color}" stroke="white" stroke-width="1.2"/>
      <circle cx="12" cy="9" r="3.4" fill="white"/>
    </svg>
  `;

  const icon = L.divIcon({
    html: svg,
    className: 'resonance-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}
