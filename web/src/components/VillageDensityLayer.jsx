import { GeoJSON } from 'react-leaflet';
import { useMemo } from 'react';

const BUCKETS = 5;
const COLORS = ['#f7f7f7', '#fdd0a2', '#fdae6b', '#e6550d', '#a63603'];

function buildThresholds(features) {
  const vals = features
    .map(f => f.properties?.density_per_km2 ?? 0)
    .filter(v => v > 0)
    .sort((a, b) => a - b);
  return Array.from({ length: BUCKETS - 1 }, (_, i) =>
    vals[Math.floor(((i + 1) / BUCKETS) * vals.length)] ?? 0
  );
}

function colorFor(density, thresholds) {
  const i = thresholds.findIndex(t => density <= t);
  return COLORS[i === -1 ? BUCKETS - 1 : i];
}

export default function VillageDensityLayer({ geojson }) {
  const thresholds = useMemo(
    () => (geojson ? buildThresholds(geojson.features) : []),
    [geojson]
  );

  if (!geojson) return null;

  return (
    <GeoJSON
      key={thresholds.join(',')}
      data={geojson}
      style={(feature) => ({
        fillColor: colorFor(feature.properties?.density_per_km2 ?? 0, thresholds),
        fillOpacity: 0.55,
          color: '#999',
          weight: 0.5,
      })}
    />
  );
}
