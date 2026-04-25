import { useEffect, useRef, useCallback } from 'react';

const SCALE_FACTOR = 30;      // lower = more particles per passenger
const MAX_PER_PAIR = 30;
const MAX_TOTAL = 1200;
const SPEED_PX_PER_MS = 0.15; // constant pixel speed for all particles
const OFFSET_PX = 4;

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Interpolate along waypoints at progress t (0–1),
 * offset perpendicular to the right of travel direction.
 */
function interpolateWaypoints(waypoints, cumDists, totalLen, t) {
  if (waypoints.length < 2) return waypoints[0];
  const target = t * totalLen;

  let i = 1;
  while (i < waypoints.length - 1 && cumDists[i] < target) i++;

  const segLen = cumDists[i] - cumDists[i - 1];
  const frac = segLen > 0 ? (target - cumDists[i - 1]) / segLen : 0;
  const x = waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * frac;
  const y = waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * frac;

  const dx = waypoints[i].x - waypoints[i - 1].x;
  const dy = waypoints[i].y - waypoints[i - 1].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return { x, y };

  // Right-perpendicular: rotate 90° clockwise
  const nx = dy / len;
  const ny = -dx / len;

  return { x: x + nx * OFFSET_PX, y: y + ny * OFFSET_PX };
}

function getLineColor(code) {
  if (code.startsWith('R'))  return '#e3001b';
  if (code.startsWith('BL')) return '#0070bd';
  if (code.startsWith('G'))  return '#008659';
  if (code.startsWith('O') || code.startsWith('LK')) return '#f5a623';
  if (code.startsWith('BR')) return '#c48c31';
  return '#888';
}

function densityParams(count) {
  if (count >= 500) return { n: Math.min(Math.ceil(count / 20), MAX_PER_PAIR), radius: 1.5 };
  if (count >= 200) return { n: Math.min(Math.ceil(count / 30), MAX_PER_PAIR), radius: 2 };
  if (count >= 50)  return { n: Math.min(Math.ceil(count / 40), 15), radius: 2.5 };
  return { n: Math.max(1, Math.ceil(count / SCALE_FACTOR)), radius: 3 };
}

export default function useParticleEngine({ canvasRef, flowPairs, stationsById, stationsByCode, mapInstance, isPlaying, pathfinder, slotDurationMs = 2000, selectedStationId = null, clearKey = 0 }) {
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const slotDurationRef = useRef(slotDurationMs);
  const clearKeyRef = useRef(clearKey);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { slotDurationRef.current = slotDurationMs; }, [slotDurationMs]);

  const projectCode = useCallback((code) => {
    if (!mapInstance || !stationsByCode) return null;
    const s = stationsByCode.get(code);
    if (!s?.lat || !s?.lng) return null;
    return mapInstance.latLngToContainerPoint([s.lat, s.lng]);
  }, [mapInstance, stationsByCode]);

  const buildWaypoints = useCallback((pathCodes) => {
    if (!pathCodes || pathCodes.length === 0) return null;
    const waypoints = [];
    for (const code of pathCodes) {
      const pt = projectCode(code);
      if (!pt) return null;
      waypoints.push({ x: pt.x, y: pt.y });
    }
    const cumDists = [0];
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      cumDists.push(cumDists[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumDists[cumDists.length - 1];
    return { waypoints, cumDists, totalLen };
  }, [projectCode]);

  /**
   * Build particles — stagger departure across the full slot duration
   * so dots spread evenly within the hour instead of bursting at once.
   */
  const buildParticles = useCallback((pairs) => {
    if (!mapInstance || !stationsById || !pathfinder) return [];
    const slotMs = slotDurationRef.current;
    const particles = [];
    for (const { originId, destId, count } of pairs) {
      if (particles.length >= MAX_TOTAL) break;
      const origin = stationsById[originId];
      const dest = stationsById[destId];
      if (!origin?.code || !dest?.code) continue;

      const pathCodes = pathfinder(origin.code, dest.code);
      if (!pathCodes || pathCodes.length < 2) continue;

      const wpData = buildWaypoints(pathCodes);
      if (!wpData || wpData.totalLen < 1) continue;

      const { n, radius } = densityParams(count);
      const travelMs = wpData.totalLen / SPEED_PX_PER_MS;
      const pairOffset = Math.random() * slotMs; // randomize start within slot per OD pair
      for (let i = 0; i < n && particles.length < MAX_TOTAL; i++) {
        const departDelay = ((i / n) * slotMs + pairOffset) % slotMs;
        particles.push({
          pathCodes,
          ...wpData,
          travelMs,
          progress: -(departDelay / travelMs),
          radius,
          color: selectedStationId
            ? (String(originId) === String(selectedStationId) ? '#f97316' : '#38bdf8')
            : '#369abc',
        });
      }
    }
    return particles;
  }, [mapInstance, stationsById, pathfinder, buildWaypoints, selectedStationId]);

  // Build particles; hard-clear when clearKey changes, blend otherwise (seamless auto-play)
  useEffect(() => {
    const fresh = buildParticles(flowPairs);
    const hardClear = clearKey !== clearKeyRef.current;
    clearKeyRef.current = clearKey;
    if (hardClear) {
      particlesRef.current = fresh;
    } else {
      particlesRef.current = [
        ...particlesRef.current.filter((p) => p.progress <= 1),
        ...fresh,
      ].slice(0, MAX_TOTAL * 2);
    }
  }, [flowPairs, buildParticles, clearKey]);

  // Reproject on map move/zoom
  useEffect(() => {
    if (!mapInstance) return;
    function reproject() {
      for (const p of particlesRef.current) {
        const wpData = buildWaypoints(p.pathCodes);
        if (wpData) {
          p.waypoints = wpData.waypoints;
          p.cumDists = wpData.cumDists;
          p.totalLen = wpData.totalLen;
        }
      }
    }
    mapInstance.on('zoom move', reproject);
    return () => mapInstance.off('zoom move', reproject);
  }, [mapInstance, buildWaypoints]);

  // Resize canvas
  useEffect(() => {
    if (!mapInstance || !canvasRef.current) return;
    const container = mapInstance.getContainer();
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [mapInstance, canvasRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function animate(ts) {
      const rawDt = lastTsRef.current ? ts - lastTsRef.current : 16;
      lastTsRef.current = ts;
      const dt = isPlayingRef.current ? rawDt : 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const alive = [];
      for (const p of particlesRef.current) {
        p.progress += dt / p.travelMs;
        if (p.progress < 0) { alive.push(p); continue; }
        if (p.progress > 1) continue; // one-shot
        alive.push(p);

        const t = Math.min(p.progress, 1);
        const pos = interpolateWaypoints(p.waypoints, p.cumDists, p.totalLen, easeInOut(t));

        let alpha;
        if (t < 0.1) alpha = t / 0.1;
        else if (t > 0.9) alpha = (1 - t) / 0.1;
        else alpha = 1;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.color, alpha * 0.7);
        ctx.fill();
      }
      particlesRef.current = alive;

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [canvasRef]);
}
