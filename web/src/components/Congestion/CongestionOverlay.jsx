import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchStationLoadRange, fetchSegmentTimes } from '../../data/api';
import StationLoadLayer from './StationLoadLayer';
import StationLoadLegend from './StationLoadLegend';
import StationLoadChart from './StationLoadChart';
import TimelineBar from '../PassengerFlow/TimelineBar';
import '../PassengerFlow/PassengerFlow.css';
import './CongestionOverlay.css';

function pad(n) { return String(n).padStart(2, '0'); }

/** Format a local Date to YYYY-MM-DD without timezone conversion */
function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function lastDayPrevMonth() {
  const now = new Date();
  return localDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

const MAX_RANGE_DAYS = 7;
const SPEED_OPTIONS = [0.1, 0.2, 0.5, 1, 2];
// Must match HeadwayEditor's CHART_HOURS = [6,7,...,24]
const CHART_HOURS_START = 6;
const CHART_HOURS_LEN = 19; // indices 0–18 → hours 6–24

/** Map absolute minute to HeadwayEditor hourlyValues index (0–18) */
function absMinuteToHourIdx(absMinute) {
  const h = Math.floor(absMinute / 60) % 24;
  const hEff = h === 0 ? 24 : h;       // midnight → 24
  const hClamped = Math.max(CHART_HOURS_START, Math.min(CHART_HOURS_START + CHART_HOURS_LEN - 1, hEff));
  return hClamped - CHART_HOURS_START;  // 0–18
}

export default function CongestionOverlay({ mapInstance, stations, mode = 'flow', onModeChange, lineRoutes, capacitySettings, onStartDateChange }) {
  const maxDate = useMemo(() => lastDayPrevMonth(), []);

  const [startDate, setStartDate] = useState(maxDate);

  // Notify parent of current startDate (for auto weekday/weekend detection in HeadwayEditor)
  useEffect(() => { onStartDateChange?.(startDate); }, [startDate, onStartDateChange]);
  const [startHour, setStartHour] = useState(7);
  const [endDate, setEndDate] = useState(maxDate);
  const [endHour, setEndHour] = useState(9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(0.2);
  const [isFlowTabHover, setIsFlowTabHover] = useState(false);
  const [isCongestionTabHover, setIsCongestionTabHover] = useState(false);

  // Station load data
  const [loadData, setLoadData] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'error' | 'done'
  const [currentMinuteIdx, setCurrentMinuteIdx] = useState(0);

  // Capacity computation data
  const [segmentTimesMap, setSegmentTimesMap] = useState({});

  const resetPlayback = useCallback(() => {
    setLoadStatus('loading');
    setCurrentMinuteIdx(0);
    setIsPlaying(false);
  }, []);


  // Selected station for chart
  const [selectedStation, setSelectedStation] = useState(null);

  // Fetch station load range
  useEffect(() => {
    let cancelled = false;
    fetchStationLoadRange(startDate, startHour, endHour, endDate)
      .then(body => {
        const normalized = body?.data ?? body;
        const isValid = Array.isArray(normalized?.minutes) && normalized?.loads && typeof normalized.loads === 'object';
        if (!cancelled) {
          if (isValid) { setLoadData(normalized); setLoadStatus('done'); }
          else { setLoadData({ minutes: [], loads: {} }); setLoadStatus('error'); }
        }
      })
      .catch(() => { if (!cancelled) setLoadStatus('error'); });
    return () => { cancelled = true; };
  }, [startDate, startHour, endDate, endHour]);

  // Fetch segment times once for congestion-rate computation
  useEffect(() => {
    fetchSegmentTimes()
      .then(body => {
        const rows = Array.isArray(body) ? body : (body?.data ?? []);
        const map = {};
        for (const row of rows) {
          const code = row.from_station_code;
          const t = parseFloat(row.travel_time_min);
          if (code && !isNaN(t) && (map[code] == null || t < map[code])) {
            map[code] = t;
          }
        }
        setSegmentTimesMap(map);
      })
      .catch(console.error);
  }, []);

  // Build stationCode → [routeId, ...] from lineRoutes
  const stationToRoutes = useMemo(() => {
    const routes = Array.isArray(lineRoutes) ? lineRoutes : (lineRoutes?.data ?? []);
    const map = {};
    for (const route of routes) {
      if (!route.routeId) continue;
      for (const stop of (route.stops || [])) {
        const code = stop.stationCode;
        if (!map[code]) map[code] = [];
        if (!map[code].includes(route.routeId)) map[code].push(route.routeId);
      }
    }
    return map;
  }, [lineRoutes]);

  const minutes = loadData?.minutes || [];
  const totalMinutes = minutes.length;

  // Auto-play
  useEffect(() => {
    if (!isPlaying || totalMinutes === 0) return;
    const id = setInterval(() => {
      setCurrentMinuteIdx(prev => {
        if (prev >= totalMinutes - 1) { setIsPlaying(false); return totalMinutes - 1; }
        return prev + 1;
      });
    }, playSpeed * 1000);
    return () => clearInterval(id);
  }, [isPlaying, playSpeed, totalMinutes]);

  const clampedIdx = Math.min(currentMinuteIdx, Math.max(0, totalMinutes - 1));
  const currentMinute = minutes[clampedIdx] ?? 0;
  const currentHourStr = `${pad(Math.floor(currentMinute / 60) % 24)}:${pad(currentMinute % 60)}`;
  const currentDateStr = useMemo(() => {
    // minutes[] stores absolute minutes since day-start (e.g. 420 = 07:00 on startDate)
    // Compute how many full days past startDate the current minute represents
    const dayOffset = Math.floor(currentMinute / (24 * 60));
    const d = new Date(`${startDate}T00:00:00`);
    d.setDate(d.getDate() + dayOffset);
    return localDateStr(d);
  }, [startDate, currentMinute]);

  const endDateMax = useMemo(() => {
    const limit = addDays(startDate, MAX_RANGE_DAYS);
    return limit < maxDate ? limit : maxDate;
  }, [startDate, maxDate]);

  const currentLoadByCode = useMemo(() => {
    if (!loadData?.loads) return {};
    const result = {};
    for (const [code, arr] of Object.entries(loadData.loads)) {
      const val = arr[clampedIdx];
      if (val != null) result[code] = val;
    }
    return result;
  }, [loadData, clampedIdx]);

  const globalMax = useMemo(() => {
    if (!loadData?.loads) return 5000;
    let max = 0;
    for (const arr of Object.values(loadData.loads)) {
      for (const v of arr) {
        if (v != null && v > max) max = v;
      }
    }
    return max || 5000;
  }, [loadData]);

  // Compute per-station congestion rate for current minute
  const congestionRateByCode = useMemo(() => {
    if (mode !== 'congestion-rate' || !capacitySettings?.length) return null;
    const hourIdx = absMinuteToHourIdx(currentMinute);
    const result = {};
    for (const [code, L] of Object.entries(currentLoadByCode)) {
      if (L <= 0) continue;
      const routeIds = stationToRoutes[code];
      if (!routeIds?.length) continue;

      let trainsPerHour = 0;
      let C = 0;
      for (const routeId of routeIds) {
        const lineCode = routeId.split('-')[0]; // 'R-1' → 'R'
        const lineGroup = capacitySettings.find(g => g.code === lineCode);
        if (!lineGroup) continue;
        const route = lineGroup.routes.find(r => r.routeId === routeId);
        if (!route) continue;
        const H = route.hourlyValues[Math.min(hourIdx, route.hourlyValues.length - 1)] || 10;
        trainsPerHour += 60 / H;
        C = lineGroup.carCap * lineGroup.carsPer;
      }
      if (trainsPerHour <= 0 || C <= 0) continue;

      const H_eff = 60 / trainsPerHour;
      const T_seg = segmentTimesMap[code] || 2; // default 2 min
      const Cap = 2 * (T_seg / H_eff) * C;     // ×2 bidirectional
      if (Cap > 0) result[code] = L / Cap;
    }
    return result;
  }, [mode, capacitySettings, currentLoadByCode, currentMinute, stationToRoutes, segmentTimesMap]);

  const handleStationClick = useCallback((codes, stationsAtLoc) => {
    setSelectedStation({ codes, stations: stationsAtLoc });
  }, []);

  const chartData = useMemo(() => {
    if (!selectedStation || !loadData) return null;
    const series = [];
    for (const s of selectedStation.stations) {
      const arr = loadData.loads[s.code];
      if (arr) series.push({ code: s.code, name: s.name || s.code, loads: arr });
    }
    if (!series.length) return null;
    return { minutes: loadData.minutes, series };
  }, [selectedStation, loadData]);

  // Capacity series for chart (per-minute capacity in persons for each selected station code)
  const capacityChartData = useMemo(() => {
    if (!selectedStation || !loadData || !capacitySettings?.length) return null;
    const series = [];
    for (const s of selectedStation.stations) {
      const routeIds = stationToRoutes[s.code];
      if (!routeIds?.length) continue;
      const capArr = loadData.minutes.map((absMinute) => {
        const hourIdx = absMinuteToHourIdx(absMinute);
        let trainsPerHour = 0, C = 0;
        for (const routeId of routeIds) {
          const lineCode = routeId.split('-')[0];
          const lineGroup = capacitySettings.find(g => g.code === lineCode);
          if (!lineGroup) continue;
          const route = lineGroup.routes.find(r => r.routeId === routeId);
          if (!route) continue;
          const H = route.hourlyValues[Math.min(hourIdx, route.hourlyValues.length - 1)] || 10;
          trainsPerHour += 60 / H;
          C = lineGroup.carCap * lineGroup.carsPer;
        }
        if (trainsPerHour <= 0 || C <= 0) return null;
        const H_eff = 60 / trainsPerHour;
        const T_seg = segmentTimesMap[s.code] || 2;
        return 2 * (T_seg / H_eff) * C;
      });
      series.push({ code: s.code, name: s.name || s.code, loads: capArr });
    }
    if (!series.length) return null;
    return { minutes: loadData.minutes, series };
  }, [selectedStation, loadData, capacitySettings, stationToRoutes, segmentTimesMap]);

  // Congestion rate series for chart (per-minute rates for each selected station code)
  const congestionChartData = useMemo(() => {
    if (!selectedStation || !loadData || !capacitySettings?.length) return null;
    const series = [];
    for (const s of selectedStation.stations) {
      const loadArr = loadData.loads[s.code];
      if (!loadArr) continue;
      const routeIds = stationToRoutes[s.code];
      const rateArr = loadData.minutes.map((absMinute, idx) => {
        const L = loadArr[idx] ?? 0;
        if (L <= 0) return 0;
        if (!routeIds?.length) return null;
        const hourIdx = absMinuteToHourIdx(absMinute);
        let trainsPerHour = 0, C = 0;
        for (const routeId of routeIds) {
          const lineCode = routeId.split('-')[0];
          const lineGroup = capacitySettings.find(g => g.code === lineCode);
          if (!lineGroup) continue;
          const route = lineGroup.routes.find(r => r.routeId === routeId);
          if (!route) continue;
          const H = route.hourlyValues[Math.min(hourIdx, route.hourlyValues.length - 1)] || 10;
          trainsPerHour += 60 / H;
          C = lineGroup.carCap * lineGroup.carsPer;
        }
        if (trainsPerHour <= 0 || C <= 0) return null;
        const H_eff = 60 / trainsPerHour;
        const T_seg = segmentTimesMap[s.code] || 2;
        const Cap = 2 * (T_seg / H_eff) * C;
        return Cap > 0 ? L / Cap : null;
      });
      series.push({ code: s.code, name: s.name || s.code, loads: rateArr });
    }
    if (!series.length) return null;
    return { minutes: loadData.minutes, series };
  }, [selectedStation, loadData, capacitySettings, stationToRoutes, segmentTimesMap]);

  const isCongestionMode = mode === 'congestion-rate';
  const activeLoadByCode = isCongestionMode ? (congestionRateByCode ?? {}) : currentLoadByCode;

  return (
    <div className="passenger-flow-overlay">
      {/* Current playback timestamp — top-center */}
      <div className="congestion-clock">
        <span className="congestion-clock__date">{currentDateStr}</span>
        <span className="congestion-clock__time">{currentHourStr}</span>
      </div>

      {/* Mode toggle */}
      <div className="congestion-mode-toggle">
        <button
          className={`congestion-mode-btn${mode === 'flow' ? ' congestion-mode-btn--active' : ''}`}
          onClick={() => onModeChange?.('flow')}
          onMouseEnter={() => setIsFlowTabHover(true)}
          onMouseLeave={() => setIsFlowTabHover(false)}
          onFocus={() => setIsFlowTabHover(true)}
          onBlur={() => setIsFlowTabHover(false)}
        >在車人數</button>
        <button className={`congestion-mode-btn${mode === 'congestion-rate' ? ' congestion-mode-btn--active' : ''}`}
          onClick={() => onModeChange?.('congestion-rate')}
          onMouseEnter={() => setIsCongestionTabHover(true)}
          onMouseLeave={() => setIsCongestionTabHover(false)}
          onFocus={() => setIsCongestionTabHover(true)}
          onBlur={() => setIsCongestionTabHover(false)}
        >混雜率</button>
      </div>

      {mode === 'flow' && isFlowTabHover && (
        <div className="congestion-flow-note">
          <div className="congestion-flow-note__title">模型假設</div>
          <ol className="congestion-flow-note__list">
            <li>假設每個小時內的旅客進出量均勻分布。</li>
            <li>依據最短乘車時間路徑選擇轉乘站</li>
            <li>在車人數表示正在通過該站的估計人數，根據估計行車時間回推旅客當下位置，並將區間中的旅客歸屬於前一站。</li>
          </ol>
        </div>
      )}

      {isCongestionTabHover && (
        <div className="congestion-flow-note congestion-rate-note">
          <div className="congestion-flow-note__title">模型假設</div>
          <ol className="congestion-flow-note__list">
            <li>混雜率 = 在車人數 ÷ 區間運能</li>
            <li>區間運能：<strong>Cap = 2 × (T ÷ H) × C</strong>
              <ul className="congestion-rate-note__sub">
                <li><em>T</em>：該站至下一站行駛時間（分鐘）</li>
                <li><em>H</em>：當前時段班距（分鐘），來自運能設置</li>
                <li><em>C</em>：每列車載客量（每輛人數 × 輛數）</li>
                <li>× 2：計入雙向行駛</li>
              </ul>
            </li>
            <li>混雜率 ≥ 100% 表示在車人數超過區間容量上限。</li>
          </ol>
        </div>
      )}

      {isCongestionMode && !capacitySettings && (
        <div className="congestion-rate-loading">運能設置載入中…</div>
      )}

      <StationLoadLayer
        mapInstance={mapInstance}
        stations={stations}
        loadByCode={activeLoadByCode}
        maxLoad={isCongestionMode ? undefined : globalMax}
        colorMode={isCongestionMode ? 'congestion' : 'flow'}
        onStationClick={handleStationClick}
      />

      <StationLoadLegend
        maxLoad={globalMax}
        colorMode={isCongestionMode ? 'congestion' : 'flow'}
      />

      {selectedStation && chartData && (
        <StationLoadChart
          stationName={selectedStation.stations[0]?.name || selectedStation.codes.join('/')}
          minutes={chartData.minutes}
          series={chartData.series}
          startDate={loadData?.date}
          congestionSeries={congestionChartData}
          capacitySeries={capacityChartData}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <TimelineBar
        startDate={startDate}
        startHour={startHour}
        endDate={endDate}
        endHour={endHour}
        currentSlot={clampedIdx}
        totalSlots={totalMinutes}
        currentDate={currentDateStr}
        currentHour={0}
        currentTimeStr={currentHourStr}
        isPlaying={isPlaying}
        speed={playSpeed}
        totalPassengers={Math.round(Object.values(currentLoadByCode).reduce((s, v) => s + v, 0))}
        loading={loadStatus === 'loading'}
        error={loadStatus === 'error' ? '資料錯誤' : null}
        maxDate={maxDate}
        endDateMax={endDateMax}
        speedOptions={SPEED_OPTIONS}
        showNetFlow={false}
        netFlow={false}
        onToggleNetFlow={() => {}}
        onStartDateChange={v => {
          resetPlayback();
          setStartDate(v);
          const max7 = addDays(v, MAX_RANGE_DAYS);
          const cap = max7 < maxDate ? max7 : maxDate;
          if (endDate < v) setEndDate(v);
          else if (endDate > cap) setEndDate(cap);
        }}
        onStartHourChange={v => { resetPlayback(); setStartHour(v); }}
        onEndDateChange={v => {
          resetPlayback();
          setEndDate(v);
          const min7 = addDays(v, -MAX_RANGE_DAYS);
          if (startDate > v) setStartDate(v);
          else if (startDate < min7) setStartDate(min7);
        }}
        onEndHourChange={v => { resetPlayback(); setEndHour(v); }}
        onSlotChange={setCurrentMinuteIdx}
        onPlayPause={() => {
          if (!isPlaying && clampedIdx >= totalMinutes - 1) setCurrentMinuteIdx(0);
          setIsPlaying(v => !v);
        }}
        onSpeedChange={setPlaySpeed}
      />
    </div>
  );
}
