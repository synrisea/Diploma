import L from 'leaflet';

const iconCache = new Map<string, L.DivIcon>();

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function createPinIcon(color: string, selected: boolean): L.DivIcon {
  const cacheKey = `${color}-${selected}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const size = selected ? 16 : 11;
  const glow = hexToRgb(color);

  const html = `
    <span style="position:relative; display:block; width:${size}px; height:${size}px;">
      ${
        selected
          ? `<span class="resonance-pin-ring" style="--pulse-color: rgb(${glow}); position:absolute; inset:-7px; border-radius:9999px;"></span>`
          : ''
      }
      <span style="
        position:absolute; inset:0; border-radius:9999px; background:${color};
        box-shadow: 0 0 0 2px rgba(11,10,7,0.92)${selected ? `, 0 0 14px 3px rgba(${glow}, 0.55)` : ''};
      "></span>
    </span>
  `;

  const icon = L.divIcon({
    html,
    className: 'resonance-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}
