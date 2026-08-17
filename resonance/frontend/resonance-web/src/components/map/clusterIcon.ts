import L from 'leaflet';
import 'leaflet.markercluster';


function tierFor(count: number) {
  if (count < 10) return { size: 34, background: 'var(--color-brand-500)', text: 'var(--color-brand-ink)' };
  if (count < 50) return { size: 42, background: 'var(--color-brand-600)', text: 'var(--color-brand-ink)' };
  return { size: 50, background: 'var(--color-brand-700)', text: 'var(--color-stone-900)' };
}

export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const { size, background, text } = tierFor(count);

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${background};
        border: 2px solid var(--color-ground);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${text};
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: ${count < 100 ? 13 : 12}px;
      ">${count}</div>
    `,
    className: 'resonance-cluster',
    iconSize: [size, size],
  });
}
