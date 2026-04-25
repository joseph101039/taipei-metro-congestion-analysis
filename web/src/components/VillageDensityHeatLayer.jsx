import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

function polygonCentroid(coordinates) {
  const ring = coordinates[0];
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLat / ring.length, sumLng / ring.length];
}

function featureCentroid(geometry) {
  if (geometry.type === 'Polygon') return polygonCentroid(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    const largest = geometry.coordinates.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
    return polygonCentroid(largest);
  }
  return null;
}

export default function VillageDensityHeatLayer({ geojson }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!geojson) return;

    const maxDensity = Math.max(...geojson.features.map((f) => f.properties.density_per_km2 ?? 0));

    const points = geojson.features
      .map((f) => {
        const c = featureCentroid(f.geometry);
        if (!c) return null;
        const density = f.properties.density_per_km2 ?? 0;
        return [...c, density / maxDensity];
      })
      .filter(Boolean);

    layerRef.current = L.heatLayer(points, {
      // radius: 55,
      // blur: 45,
      minOpacity: 0.05,
      radius: 30,
      blur: 25,
      maxZoom: 14,
      max: 1,
      gradient: {  0.2: '#ffffb2', 0.5: '#fd8d3c', 0.75: '#e31a1c', 1.0: '#800026' },
      // gradient: { 0.0: 'transparent', 0.25: '#ffffb2', 0.55: '#fd8d3c', 0.8: '#e31a1c', 1.0: '#800026' },
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [geojson, map]);

  return null;
}
