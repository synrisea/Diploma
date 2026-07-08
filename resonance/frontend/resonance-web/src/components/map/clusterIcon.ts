import L from 'leaflet';
import 'leaflet.markercluster';

// Size/color tiers so a cluster of 5 reads as "small" and a cluster of 200
// reads as unmistakably "large" at a glance, before the count is even read.
function tierFor(count: number) {
  if (count < 10) return { size: 34, background: '#E1552E' };
  if (count < 50) return { size: 42, background: '#C8401E' };
  return { size: 50, background: '#A8320F' };
}

export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const { size, background } = tierFor(count);

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${background};
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: system-ui, sans-serif;
        font-weight: 600;
        font-size: ${count < 100 ? 13 : 12}px;
      ">${count}</div>
    `,
    className: 'resonance-cluster',
    iconSize: [size, size],
  });
}
