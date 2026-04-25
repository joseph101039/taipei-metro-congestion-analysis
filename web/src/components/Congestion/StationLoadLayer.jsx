import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getLoadColor, getCongestionColor } from './loadColorUtils';

function loadRadius(load, zoom) {
  const base = Math.max(4, Math.min(20, Math.sqrt(load) * 0.5));
  const zoomFactor = Math.max(0.5, (zoom - 10) * 0.4);
  return base * zoomFactor;
}

function congestionRadius(rate, zoom) {
  // rate 0→1.5+: radius scales from 4 to 18
  const base = Math.max(4, Math.min(18, Math.max(0.1, rate) * 14));
  const zoomFactor = Math.max(0.5, (zoom - 10) * 0.4);
  return base * zoomFactor;
}

/**
 * Group stations by lat/lng to detect transfer stations sharing a physical location.
 * Returns Map<"lat,lng", station[]>
 */
function groupByLocation(stations) {
  const map = new Map();
  for (const s of stations) {
    if (!s.lat || !s.lng) continue;
    const key = `${Number(s.lat).toFixed(5)},${Number(s.lng).toFixed(5)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return map;
}

export default function StationLoadLayer({
  mapInstance,
  stations,
  loadByCode,
  maxLoad,
  onStationClick,
  colorMode = 'flow', // 'flow' | 'congestion'
}) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!mapInstance || !stations || !loadByCode) return;

    if (layerRef.current) {
      mapInstance.removeLayer(layerRef.current);
    }

    const group = L.layerGroup();
    const effectiveMax = maxLoad || 1;
    const locationGroups = groupByLocation(stations);

    for (const [, stationsAtLoc] of locationGroups) {
      const codes = [];
      for (const s of stationsAtLoc) {
        const v = loadByCode[s.code];
        if (v != null && v > 0) codes.push(s.code);
      }
      if (!codes.length) continue;

      const primaryStation = stationsAtLoc[0];
      const lat = Number(primaryStation.lat);
      const lng = Number(primaryStation.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const zoom = mapInstance.getZoom();
      let color, radius, tooltipHtml;

      if (colorMode === 'congestion') {
        // Draw a separate circle per code, all at the same lat/lng (overlapping)
        // Tooltip shows all stations at this location
        const allTipLines = codes.map(code => {
          const s = stationsAtLoc.find(st => st.code === code) || primaryStation;
          const rate = loadByCode[code] || 0;
          return `<strong>${s.name || code}</strong> (${code}) 混雜率 ${(rate * 100).toFixed(1)}%`;
        });
        const sharedTip = allTipLines.join('<br/>');

        codes.forEach((code) => {
          const rate = loadByCode[code] || 0;
          const cColor = getCongestionColor(rate);
          const cRadius = congestionRadius(rate, zoom);

          const circle = L.circleMarker([lat, lng], {
            radius: cRadius, fillColor: cColor, fillOpacity: 0.75, color: '#fff', weight: 1,
          });
          circle.bindTooltip(sharedTip, { direction: 'top', offset: [0, -cRadius], className: 'station-load-tooltip' });
          circle.on('click', () => {
            if (onStationClick) onStationClick(codes, stationsAtLoc);
          });
          group.addLayer(circle);
        });
        continue; // skip the single-circle logic below
      } else {
        // flow mode — original logic
        let totalLoad = 0;
        for (const c of codes) totalLoad += loadByCode[c] || 0;
        const ratio = Math.min(1, totalLoad / effectiveMax);
        color = getLoadColor(ratio);
        radius = loadRadius(totalLoad, zoom);

        if (codes.length > 1) {
          const parts = codes.map(c => `${c} : ${Math.round(loadByCode[c]).toLocaleString()}`).join('<br/>');
          tooltipHtml = `<strong>${primaryStation.name || codes.join('/')}</strong><br/>${parts}<br/><em>合計 ${Math.round(totalLoad).toLocaleString()} 人</em>`;
        } else {
          tooltipHtml = `<strong>${primaryStation.name || codes[0]}</strong><br/>${Math.round(loadByCode[codes[0]]).toLocaleString()} 人`;
        }
      }

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.75,
        color: '#fff',
        weight: 1,
      });

      circle.bindTooltip(tooltipHtml, {
        direction: 'top', offset: [0, -radius], className: 'station-load-tooltip',
      });

      circle.on('click', () => {
        if (onStationClick) onStationClick(codes, stationsAtLoc);
      });

      group.addLayer(circle);
    }

    group.addTo(mapInstance);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        mapInstance.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [mapInstance, stations, loadByCode, maxLoad, onStationClick, colorMode]);

  return null;
}
