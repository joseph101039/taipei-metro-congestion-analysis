import { useState, useEffect, useMemo } from 'react';
import FlowCanvas from './FlowCanvas';
import TimelineBar from './TimelineBar';
import useRidership from '../../hooks/useRidership';
import { fetchRouteTimeTransfers } from '../../data/api';
import { createPathfinder } from '../../utils/metroGraph';
import './PassengerFlow.css';

/** Last day of previous month as YYYY-MM-DD */
function lastDayPrevMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 0);
  return d.toISOString().slice(0, 10);
}

/** Convert (date, hour) pair to a linear slot index from a base date */
function toSlot(date, hour, baseDate) {
  const d = Math.round((new Date(date) - new Date(baseDate)) / 86400000);
  return d * 24 + hour;
}

/** Reduce bidirectional pairs to net flow only */
function toNetFlows(pairs) {
  const fwd = new Map();
  for (const { originId, destId, count } of pairs) {
    const k = `${originId}|${destId}`;
    fwd.set(k, (fwd.get(k) ?? 0) + count);
  }
  const seen = new Set();
  const result = [];
  for (const { originId, destId } of pairs) {
    const canon = `${Math.min(originId, destId)}|${Math.max(originId, destId)}`;
    if (seen.has(canon)) continue;
    seen.add(canon);
    const ab = fwd.get(`${originId}|${destId}`) ?? 0;
    const ba = fwd.get(`${destId}|${originId}`) ?? 0;
    const net = ab - ba;
    if (net > 0) result.push({ originId, destId, count: net });
    else if (net < 0) result.push({ originId: destId, destId: originId, count: -net });
  }
  return result.sort((a, b) => b.count - a.count);
}

/** Convert slot index back to { date, hour } */
function fromSlot(slot, baseDate) {
  const base = new Date(baseDate);
  const dayOffset = Math.floor(slot / 24);
  const hour = slot % 24;
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  return { date: d.toISOString().slice(0, 10), hour };
}

export default function PassengerFlow({ mapInstance, stations, lines, selectedStationId = null }) {
  const maxDate = useMemo(() => lastDayPrevMonth(), []);
  const [transfers, setTransfers] = useState(null);
  useEffect(() => { fetchRouteTimeTransfers().then(setTransfers).catch(console.error); }, []);

  const [startDate, setStartDate] = useState(maxDate);
  const [startHour, setStartHour] = useState(0);
  const [endDate, setEndDate] = useState(maxDate);
  const [endHour, setEndHour] = useState(23);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2);
  const [clearKey, setClearKey] = useState(0);
  const [netFlow, setNetFlow] = useState(false);

  // Hard-clear particles when station selection or time range changes
  useEffect(() => { setClearKey((k) => k + 1); }, [selectedStationId]);
  function bumpClear(setter) {
    return (v) => { setter(v); setClearKey((k) => k + 1); };
  }
  function handleToggleNetFlow() {
    setNetFlow((v) => !v);
    setClearKey((k) => k + 1);
  }

  // Total slots in the range
  const totalSlots = useMemo(
    () => toSlot(endDate, endHour, startDate) - toSlot(startDate, startHour, startDate) + 1,
    [startDate, startHour, endDate, endHour],
  );

  // Clamp currentSlot when range changes
  const clampedSlot = Math.min(currentSlot, Math.max(0, totalSlots - 1));

  // Current date/hour derived from slot
  const { date: currentDate, hour: currentHour } = useMemo(
    () => fromSlot(toSlot(startDate, startHour, startDate) + clampedSlot, startDate),
    [startDate, startHour, clampedSlot],
  );


  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentSlot((s) => {
        if (s >= totalSlots - 1) { setIsPlaying(false); return totalSlots - 1; }
        return s + 1;
      });
    }, playSpeed * 1000);
    return () => clearInterval(id);
  }, [isPlaying, playSpeed, totalSlots]);

  const { flowPairs, totalPassengers, loading, error } = useRidership(currentDate, currentHour);

  const visibleFlowPairs = useMemo(() => {
    if (!selectedStationId) return flowPairs;
    return flowPairs.filter((p) => p.originId === selectedStationId || p.destId === selectedStationId);
  }, [flowPairs, selectedStationId]);

  const displayPairs = useMemo(
    () => (netFlow ? toNetFlows(visibleFlowPairs) : visibleFlowPairs),
    [visibleFlowPairs, netFlow],
  );

  // Build stationsById
  const stationsById = useMemo(() => {
    if (!stations) return {};
    const map = {};
    for (const s of stations) map[s.id] = s;
    return map;
  }, [stations]);

  // Build stationsByCode
  const stationsByCode = useMemo(() => {
    if (!stations) return new Map();
    return new Map(stations.map((s) => [s.code, s]));
  }, [stations]);

  const pathfinder = useMemo(() => {
    if (!transfers || !lines || !stationsByCode.size) return null;
    return createPathfinder(transfers, stationsByCode, lines);
  }, [transfers, stationsByCode, lines]);

  return (
    <div className="passenger-flow-overlay">
      <FlowCanvas
        flowPairs={displayPairs}
        stationsById={stationsById}
        stationsByCode={stationsByCode}
        mapInstance={mapInstance}
        isPlaying={isPlaying}
        pathfinder={pathfinder}
        slotDurationMs={playSpeed * 1000}
        selectedStationId={selectedStationId}
        clearKey={clearKey}
      />
      <TimelineBar
        startDate={startDate}
        startHour={startHour}
        endDate={endDate}
        endHour={endHour}
        currentSlot={clampedSlot}
        totalSlots={totalSlots}
        currentDate={currentDate}
        currentHour={currentHour}
        isPlaying={isPlaying}
        speed={playSpeed}
        totalPassengers={totalPassengers}
        loading={loading}
        error={error}
        maxDate={maxDate}
        onStartDateChange={bumpClear(setStartDate)}
        onStartHourChange={bumpClear(setStartHour)}
        onEndDateChange={bumpClear(setEndDate)}
        onEndHourChange={bumpClear(setEndHour)}
        onSlotChange={bumpClear(setCurrentSlot)}
        netFlow={netFlow}
        onToggleNetFlow={handleToggleNetFlow}
        onPlayPause={() => {
          if (!isPlaying && clampedSlot >= totalSlots - 1) setCurrentSlot(0);
          setIsPlaying((v) => !v);
        }}
        onSpeedChange={setPlaySpeed}
      />
    </div>
  );
}
