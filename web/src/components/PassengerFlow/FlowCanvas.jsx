import { useRef } from 'react';
import useParticleEngine from '../../hooks/useParticleEngine';

export default function FlowCanvas({ flowPairs, stationsById, stationsByCode, mapInstance, isPlaying, pathfinder, slotDurationMs, selectedStationId, clearKey }) {
  const canvasRef = useRef(null);
  useParticleEngine({ canvasRef, flowPairs, stationsById, stationsByCode, mapInstance, isPlaying, pathfinder, slotDurationMs, selectedStationId, clearKey });

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 500 }}
    />
  );
}
