import { useState, useEffect, useMemo } from 'react';import { fetchLineCapacities, fetchRouteHeadways } from '../../data/api';
import HeadwayChart from './HeadwayChart';
import './HeadwayEditor.css';

const LINE_ORDER = ['R', 'BL', 'G', 'O', 'BR', 'Y'];
const LINE_CODE_TO_ID = { R: 1, BL: 2, G: 3, O: 4, BR: 5, Y: 6 };
const CHART_HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6–24

function timeToDecimalHour(t) {
  const [hStr, mStr = '0'] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return h === 0 && m === 0 ? 24 : h + m / 60;
}

function expandToHours(periods) {
  return CHART_HOURS.map(h => {
    const slot = periods.find(p => {
      const s = timeToDecimalHour(p.start_time);
      const e = timeToDecimalHour(p.end_time);
      return s <= h && h < e;
    });
    return slot ? parseFloat(slot.min_headway_min) : 10;
  });
}

function detectServiceDay(dateStr) {
  if (!dateStr) return '平日';
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay();
  return dow === 0 || dow === 6 ? '假日' : '平日';
}

export default function HeadwayEditor({ lines, onSettingsChange, referenceDate }) {
  // null = auto (from referenceDate); non-null = manual override by user
  const [serviceDayOverride, setServiceDayOverride] = useState(null);
  const serviceDay = serviceDayOverride ?? detectServiceDay(referenceDate);

  // Reset manual override when the reference date changes so auto-detect kicks in
  const [prevReferenceDate, setPrevReferenceDate] = useState(referenceDate);
  if (referenceDate !== prevReferenceDate) {
    setPrevReferenceDate(referenceDate);
    setServiceDayOverride(null);
  }
  const [capacities, setCapacities] = useState(null);
  const [headways, setHeadways] = useState(null);
  const [capOverrides, setCapOverrides] = useState({});
  const [hwOverrides, setHwOverrides] = useState({});

  useEffect(() => {
    fetchLineCapacities().then(setCapacities).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRouteHeadways(serviceDay)
      .then(data => { if (!cancelled) { setHeadways(data); setHwOverrides({}); } })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [serviceDay]);

  const colorMap = useMemo(() => {
    if (!lines) return {};
    const m = {};
    lines.forEach(l => { m[l.id] = l.color; });
    return m;
  }, [lines]);

  const lineGroups = useMemo(() => {
    if (!capacities || !headways) return [];

    // Group headways by line_code → route_id → periods
    const hwByLine = {};
    headways.forEach(h => {
      if (!hwByLine[h.line_code]) hwByLine[h.line_code] = {};
      if (!hwByLine[h.line_code][h.route_id]) hwByLine[h.line_code][h.route_id] = [];
      hwByLine[h.line_code][h.route_id].push(h);
    });

    return LINE_ORDER
      .filter(code => capacities.some(c => c.line_code === code))
      .map(code => {
        const cap = capacities.find(c => c.line_code === code);
        const lineId = LINE_CODE_TO_ID[code];
        const color = colorMap[lineId] || '#888';
        const lineName = cap?.line_name || `${code} 線`;

        const ov = capOverrides[code] || {};
        const defaultCarCap = (cap?.seated_per_car ?? 0) + (cap?.standing_per_car ?? 0);
        const defaultCarsPerTrain = cap?.cars ?? 1;
        const carCap = ov.carCap ?? defaultCarCap;
        const carsPer = ov.carsPer ?? defaultCarsPerTrain;

        // All sub-routes for this line, sorted (R-1, R-2, R-3, …)
        const routes = Object.keys(hwByLine[code] || {}).sort().map(routeId => {
          const periods = hwByLine[code][routeId];
          const defaults = expandToHours(periods);
          const hourlyValues = defaults.map((v, i) => {
            const key = `${routeId}|${CHART_HOURS[i]}`;
            return hwOverrides[key] ?? v;
          });
          return { routeId, hourlyValues };
        });

        return { code, lineName, color, carCap, carsPer, routes };
      });
  }, [capacities, headways, colorMap, capOverrides, hwOverrides]);

  // Notify parent whenever settings change
  useEffect(() => {
    if (onSettingsChange && lineGroups.length > 0) {
      onSettingsChange(lineGroups);
    }
  }, [lineGroups, onSettingsChange]);

  function setCapacity(code, field, val) {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return;
    setCapOverrides(prev => ({ ...prev, [code]: { ...(prev[code] || {}), [field]: num } }));
  }

  function setHourlyHeadway(routeId, hourIdx, val) {
    setHwOverrides(prev => ({ ...prev, [`${routeId}|${CHART_HOURS[hourIdx]}`]: val }));
  }

  if (!capacities || !headways) return <div className="hw-editor__loading">載入班距資料…</div>;

  return (
    <div className="hw-editor">
      <div className="hw-editor__header">
        <span className="hw-editor__title">班距 / 運能調整</span>
        <div className="hw-editor__day-toggle">
          {['平日', '假日'].map(d => (
            <button
              key={d}
              className={`hw-editor__day-btn${serviceDay === d ? ' hw-editor__day-btn--active' : ''}`}
              onClick={() => setServiceDayOverride(d)}
            >{d}</button>
          ))}
        </div>
      </div>

      <div className="hw-editor__lines">
        {lineGroups.map(({ code, lineName, color, carCap, carsPer, routes }) => (
          <div key={code} className="hw-editor__line">
            <div className="hw-editor__line-hd">
              <span className="hw-editor__line-dot" style={{ background: color }} />
              <span className="hw-editor__line-name">{lineName}</span>
            </div>
            <div className="hw-editor__cap-row">
              <span className="hw-editor__cap-label">每輛</span>
              <input
                type="number"
                className="hw-editor__cap-input"
                value={carCap}
                min={1}
                onChange={e => setCapacity(code, 'carCap', e.target.value)}
              />
              <span className="hw-editor__cap-label">人 ×</span>
              <input
                type="number"
                className="hw-editor__cap-input"
                value={carsPer}
                min={1}
                onChange={e => setCapacity(code, 'carsPer', e.target.value)}
              />
              <span className="hw-editor__cap-label">輛/列 =</span>
              <span className="hw-editor__cap-total">{(carCap * carsPer).toLocaleString()} 人/列</span>
            </div>

            {routes.map(({ routeId, hourlyValues }) => (
              <div key={routeId} className="hw-editor__route-block">
                <div className="hw-editor__route-id">{routeId}</div>
                <div className="hw-editor__chart-wrap">
                  <div className="hw-editor__chart-label">班距（分）</div>
                  <HeadwayChart
                    values={hourlyValues}
                    color={color}
                    onChange={(idx, val) => setHourlyHeadway(routeId, idx, val)}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
