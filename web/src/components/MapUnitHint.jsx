import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

export default function MapUnitHint({ unit }) {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control({ position: 'bottomright' });
    ctrl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-unit-hint');
      div.textContent = `單位：${unit}`;
      return div;
    };
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map, unit]);
  return null;
}
