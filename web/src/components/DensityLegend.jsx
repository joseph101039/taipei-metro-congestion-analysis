import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const BUCKETS = 5;
const COLORS = ['#f7f7f7', '#fdd0a2', '#fdae6b', '#e6550d', '#a63603'];
const LABELS = ['極低', '低', '中', '高', '極高'];
const ICONS  = ['○', '◔', '◑', '◕', '●'];

function buildThresholds(features) {
  const vals = features
    .map((f) => f.properties?.density_per_km2 ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  return Array.from({ length: BUCKETS - 1 }, (_, i) =>
    vals[Math.floor(((i + 1) / BUCKETS) * vals.length)] ?? 0,
  );
}

function formatDensity(n) {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
}

export default function DensityLegend({ geojson }) {
  const map = useMap();
  const controlRef = useRef(null);

  useEffect(() => {
    if (!geojson) return;

    const thresholds = buildThresholds(geojson.features);
    const ranges = COLORS.map((color, i) => {
      const lo = i === 0 ? 0 : thresholds[i - 1] + 1;
      const hi = i < thresholds.length ? thresholds[i] : null;
      const rangeStr = hi == null
        ? `> ${formatDensity(lo)}`
        : i === 0
          ? `≤ ${formatDensity(hi)}`
          : `${formatDensity(lo)} – ${formatDensity(hi)}`;
      return { color, label: LABELS[i], icon: ICONS[i], range: rangeStr };
    });

    const LegendControl = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'density-legend');
        div.innerHTML = `
          <div class="density-legend__title">人口密度（人/km²）</div>
          ${ranges.map((r) => `
            <div class="density-legend__row">
              <span class="density-legend__swatch" style="background:${r.color}"></span>
              <span class="density-legend__icon">${r.icon}</span>
              <span class="density-legend__label">${r.label}</span>
              <span class="density-legend__range">${r.range}</span>
            </div>
          `).join('')}
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
      onRemove() {},
    });

    controlRef.current = new LegendControl({ position: 'bottomleft' });
    controlRef.current.addTo(map);

    return () => {
      if (controlRef.current) {
        controlRef.current.remove();
        controlRef.current = null;
      }
    };
  }, [geojson, map]);

  return null;
}
