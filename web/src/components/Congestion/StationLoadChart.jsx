import { useMemo } from 'react';
import './StationLoadChart.css';

const W = 480, H = 240, PAD = { top: 20, right: 20, bottom: 72, left: 55 };
const CR_H = 220, CR_PAD = { top: 16, right: 20, bottom: 60, left: 55 };
const SERIES_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
/** Visual gap slots inserted between days (keeps break small regardless of actual time gap) */
const DAY_GAP_SLOTS = 10;

function pad(n) { return String(n).padStart(2, '0'); }

/** Absolute minute → { displayHour, displayMin, dayOffset } */
function minuteInfo(absMin) {
  const totalH = Math.floor(absMin / 60);
  const dayOffset = Math.floor(totalH / 24);
  const displayHour = totalH % 24;
  const displayMin = absMin % 60;
  return { displayHour, displayMin, dayOffset };
}

/** Compute calendar date string "M/D" from startDate + dayOffset */
function dayLabel(startDate, dayOffset) {
  if (!startDate) return dayOffset === 0 ? '' : `+${dayOffset}日`;
  const [y, mo, d] = startDate.split('-').map(Number);
  const date = new Date(y, mo - 1, d + dayOffset);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function StationLoadChart({ stationName, minutes, series, onClose, startDate, congestionSeries, capacitySeries }) {
  const data = useMemo(() => {
    if (!minutes || !series || !series.length) return null;
    return minutes.map((m, i) => {
      const point = { minute: m };
      for (const s of series) point[s.code] = s.loads[i] ?? 0;
      return point;
    });
  }, [minutes, series]);

  // ── Group data points by day (must be before any early return) ───────────
  const dayGroups = useMemo(() => {
    if (!data) return new Map();
    const groups = new Map();
    for (const d of data) {
      const { dayOffset } = minuteInfo(d.minute);
      if (!groups.has(dayOffset)) groups.set(dayOffset, []);
      groups.get(dayOffset).push(d);
    }
    return groups;
  }, [data]);

  if (!data || !data.length) return null;

  const maxLoad = Math.max(1, ...data.flatMap(d => series.map(s => d[s.code] || 0)));

  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // ── Sequential slot layout: each day's points are packed together,
  //    separated by a small fixed gap rather than proportional time gap ──────
  const dayOffsets = Array.from(dayGroups.keys()).sort((a, b) => a - b);
  const numDays = dayOffsets.length;
  // Total slots = sum of each day's point count + (numDays-1) gaps
  const daySizes = dayOffsets.map(d => dayGroups.get(d).length);
  const totalSlots = daySizes.reduce((s, n) => s + n, 0) + Math.max(0, numDays - 1) * DAY_GAP_SLOTS;


  const toX = slotIdx => PAD.left + (slotIdx / Math.max(1, totalSlots - 1)) * iW;
  const toY = v => PAD.top + iH - (v / maxLoad) * iH;

  // ── Day boundary X positions (midpoint of the gap) ────────────────────────
  // dayBoundaries[i] = X between day i and day i+1
  let runningSlot = 0;
  const dayStartSlots = [];
  const dayEndSlots = [];
  for (let di = 0; di < numDays; di++) {
    if (di > 0) runningSlot += DAY_GAP_SLOTS;
    dayStartSlots.push(runningSlot);
    runningSlot += daySizes[di];
    dayEndSlots.push(runningSlot - 1);
  }
  const dayBoundaryXs = [];
  for (let di = 0; di + 1 < numDays; di++) {
    const xMid = (toX(dayEndSlots[di]) + toX(dayStartSlots[di + 1])) / 2;
    dayBoundaryXs.push(xMid);
  }

  // ── Per-day polylines (breaks between days) ───────────────────────────────
  const seriesDayLines = series.map((s, si) => {
    const color = SERIES_COLORS[si % SERIES_COLORS.length];
    const segments = dayOffsets.map((dayOff, di) => {
      const pts = dayGroups.get(dayOff);
      const points = pts.map((d, pi) => {
        const sl = dayStartSlots[di] + pi;
        return `${toX(sl)},${toY(d[s.code] || 0)}`;
      }).join(' ');
      return { points, color };
    });
    return { code: s.code, name: s.name, color, segments };
  });

  // ── Per-day area fills (single series only) ───────────────────────────────
  const areaSegments = series.length === 1
    ? dayOffsets.map((dayOff, di) => {
        const pts = dayGroups.get(dayOff);
        const inner = pts.map((d, pi) => {
          const sl = dayStartSlots[di] + pi;
          return `${toX(sl)},${toY(d[series[0].code] || 0)}`;
        }).join(' ');
        const x0 = toX(dayStartSlots[di]);
        const x1 = toX(dayEndSlots[di]);
        return `${x0},${PAD.top + iH} ${inner} ${x1},${PAD.top + iH}`;
      })
    : [];

  // ── X-axis: start & end tick per day (hour only) + one date label per day ─
  const xTicks = [];
  const xDateLabels = [];
  for (let di = 0; di < numDays; di++) {
    const dayOff = dayOffsets[di];
    const pts = dayGroups.get(dayOff);
    const firstM = pts[0].minute;
    const lastM = pts[pts.length - 1].minute;
    const { displayHour: fh } = minuteInfo(firstM);
    const { displayHour: lh } = minuteInfo(lastM);
    // End tick shows the next full hour (e.g. 09:59 → "10")
    const endHourLabel = pad((lh + 1) % 24);
    xTicks.push({ x: toX(dayStartSlots[di]), hourStr: pad(fh) });
    if (dayEndSlots[di] !== dayStartSlots[di]) {
      xTicks.push({ x: toX(dayEndSlots[di]), hourStr: endHourLabel });
    }
    // Date label: centered under the day's segment
    const xCenter = (toX(dayStartSlots[di]) + toX(dayEndSlots[di])) / 2;
    xDateLabels.push({ x: xCenter, label: dayLabel(startDate, dayOff) });
  }

  // ── Day-boundary vertical lines ───────────────────────────────────────────
  const dayBoundaries = dayBoundaryXs;

  // ── Y-axis labels ─────────────────────────────────────────────────────────
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = (maxLoad / ySteps) * i;
    return { y: toY(val), label: Math.round(val).toLocaleString() };
  });

  return (
    <div className="slc-overlay" onMouseDown={onClose}>
      <div className="slc-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="slc-header">
          <span className="slc-title">{stationName} — 在車人數變化</span>
          <button className="slc-close" onMouseDown={e => { e.stopPropagation(); onClose(); }}>✕</button>
        </div>
        <div className="slc-body">
        {series.length > 1 && (
          <div className="slc-legend">
            {seriesDayLines.map(sl => (
              <span key={sl.code} className="slc-legend-item">
                <span className="slc-legend-dot" style={{ background: sl.color }} />
                {sl.code}
              </span>
            ))}
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="slc-svg">
          {/* grid lines */}
          {yLabels.map((yl, i) => (
            <line key={i} x1={PAD.left} x2={W - PAD.right} y1={yl.y} y2={yl.y} stroke="#e5e7eb" strokeWidth={0.5} />
          ))}
          {/* day boundary dashed verticals */}
          {dayBoundaries.map((x, i) => (
            <line key={`db${i}`} x1={x} x2={x} y1={PAD.top} y2={PAD.top + iH} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
          ))}
          {/* area fills per day */}
          {areaSegments.map((pts, i) => (
            <polygon key={`a${i}`} points={pts} fill="rgba(59,130,246,0.13)" />
          ))}
          {/* per-day polylines (line breaks between days) */}
          {seriesDayLines.map(sl =>
            sl.segments.map((seg, di) => (
              <polyline key={`${sl.code}-${di}`} points={seg.points} fill="none" stroke={seg.color} strokeWidth={1.5} />
            ))
          )}
          {/* Y labels */}
          {yLabels.map((yl, i) => (
            <text key={i} x={PAD.left - 6} y={yl.y + 3} textAnchor="end" fontSize={10} fill="#666">{yl.label}</text>
          ))}
          {/* X tick marks */}
          {xTicks.map((xt, i) => (
            <line key={`xt${i}`} x1={xt.x} x2={xt.x} y1={PAD.top + iH} y2={PAD.top + iH + 4} stroke="#aaa" strokeWidth={1} />
          ))}
          {/* X hour labels */}
          {xTicks.map((xt, i) => (
            <text key={`xh${i}`} x={xt.x} y={PAD.top + iH + 16} textAnchor="middle" fontSize={10} fill="#555">{xt.hourStr}</text>
          ))}
          {/* X date labels — one per day, centered under the segment */}
          {xDateLabels.map((xl, i) => (
            <text key={`xd${i}`} x={xl.x} y={PAD.top + iH + 30} textAnchor="middle" fontSize={9} fill="#999">{xl.label}</text>
          ))}
          {/* axis title */}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#888">時間</text>
          <text x={12} y={PAD.top + iH / 2} textAnchor="middle" fontSize={11} fill="#888" transform={`rotate(-90, 12, ${PAD.top + iH / 2})`}>人數</text>
        </svg>

        {/* ── Congestion rate chart ── */}
        {congestionSeries && (() => {
          const crSeries = congestionSeries.series;
          const crMinutes = congestionSeries.minutes;
          if (!crSeries?.length || !crMinutes?.length) return null;

          const crIH = CR_H - CR_PAD.top - CR_PAD.bottom;

          const allRates = crSeries.flatMap(s => s.loads.filter(v => v != null));
          const crMax = Math.max(1.5, ...allRates);

          const toCrY = v => CR_PAD.top + crIH - ((v ?? 0) / crMax) * crIH;
          const threshold100Y = toCrY(1.0);

          // Y-axis labels for congestion rate
          const crYSteps = [0, 0.5, 1.0, 1.5].filter(v => v <= crMax + 0.1);
          const crYLabels = crYSteps.map(v => ({ y: toCrY(v), label: `${Math.round(v * 100)}%` }));

          // Re-use slot positions from outer scope (same minutes → same dayGroups)
          const crSeriesDayLines = crSeries.map((s, si) => {
            const color = crSeries.length === 1 ? '#f97316' : SERIES_COLORS[si % SERIES_COLORS.length];
            const segments = dayOffsets.map((dayOff, di) => {
              const pts = dayGroups.get(dayOff);
              const points = pts.map((d, pi) => {
                const sl = dayStartSlots[di] + pi;
                const minuteVal = d.minute;
                const mIdx = crMinutes.indexOf(minuteVal);
                const rate = mIdx >= 0 ? (s.loads[mIdx] ?? 0) : 0;
                return `${toX(sl)},${toCrY(rate)}`;
              }).join(' ');
              return { points, color };
            });
            return { code: s.code, name: s.name, color, segments };
          });

          // Area fill for single series
          const crAreaSegments = crSeries.length === 1
            ? dayOffsets.map((dayOff, di) => {
                const pts = dayGroups.get(dayOff);
                const inner = pts.map((d, pi) => {
                  const sl = dayStartSlots[di] + pi;
                  const mIdx = crMinutes.indexOf(d.minute);
                  const rate = mIdx >= 0 ? (crSeries[0].loads[mIdx] ?? 0) : 0;
                  return `${toX(sl)},${toCrY(rate)}`;
                }).join(' ');
                const x0 = toX(dayStartSlots[di]);
                const x1 = toX(dayEndSlots[di]);
                return `${x0},${CR_PAD.top + crIH} ${inner} ${x1},${CR_PAD.top + crIH}`;
              })
            : [];

          return (
            <>
              <div className="slc-chart-divider" />
              <div className="slc-section-title">混雜率</div>
              {crSeries.length > 1 && (
                <div className="slc-legend">
                  {crSeriesDayLines.map(sl => (
                    <span key={sl.code} className="slc-legend-item">
                      <span className="slc-legend-dot" style={{ background: sl.color }} />
                      {sl.code}
                    </span>
                  ))}
                </div>
              )}
              <svg viewBox={`0 0 ${W} ${CR_H}`} className="slc-svg">
                {/* grid lines */}
                {crYLabels.map((yl, i) => (
                  <line key={i} x1={CR_PAD.left} x2={W - CR_PAD.right} y1={yl.y} y2={yl.y}
                    stroke={Math.abs(yl.y - threshold100Y) < 0.5 ? '#fca5a5' : '#e5e7eb'}
                    strokeWidth={Math.abs(yl.y - threshold100Y) < 0.5 ? 1 : 0.5}
                    strokeDasharray={Math.abs(yl.y - threshold100Y) < 0.5 ? '5 3' : undefined} />
                ))}
                {/* 100% capacity threshold line */}
                <line x1={CR_PAD.left} x2={W - CR_PAD.right} y1={threshold100Y} y2={threshold100Y}
                  stroke="#ef4444" strokeWidth={1.2} strokeDasharray="5 3" opacity={0.7} />
                {/* day boundaries */}
                {dayBoundaryXs.map((x, i) => (
                  <line key={`db${i}`} x1={x} x2={x} y1={CR_PAD.top} y2={CR_PAD.top + crIH}
                    stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
                ))}
                {/* area fills */}
                {crAreaSegments.map((pts, i) => (
                  <polygon key={`cra${i}`} points={pts} fill="rgba(249,115,22,0.1)" />
                ))}
                {/* polylines */}
                {crSeriesDayLines.map(sl =>
                  sl.segments.map((seg, di) => (
                    <polyline key={`${sl.code}-${di}`} points={seg.points} fill="none" stroke={seg.color} strokeWidth={1.5} />
                  ))
                )}
                {/* Y labels */}
                {crYLabels.map((yl, i) => (
                  <text key={i} x={CR_PAD.left - 6} y={yl.y + 3} textAnchor="end" fontSize={10} fill="#666">{yl.label}</text>
                ))}
                {/* X ticks */}
                {xTicks.map((xt, i) => (
                  <line key={`xt${i}`} x1={xt.x} x2={xt.x} y1={CR_PAD.top + crIH} y2={CR_PAD.top + crIH + 4} stroke="#aaa" strokeWidth={1} />
                ))}
                {/* X hour labels */}
                {xTicks.map((xt, i) => (
                  <text key={`xh${i}`} x={xt.x} y={CR_PAD.top + crIH + 16} textAnchor="middle" fontSize={10} fill="#555">{xt.hourStr}</text>
                ))}
                {/* X date labels */}
                {xDateLabels.map((xl, i) => (
                  <text key={`xd${i}`} x={xl.x} y={CR_PAD.top + crIH + 30} textAnchor="middle" fontSize={9} fill="#999">{xl.label}</text>
                ))}
                <text x={W / 2} y={CR_H - 6} textAnchor="middle" fontSize={11} fill="#888">時間</text>
                <text x={12} y={CR_PAD.top + crIH / 2} textAnchor="middle" fontSize={11} fill="#888" transform={`rotate(-90, 12, ${CR_PAD.top + crIH / 2})`}>混雜率</text>
              </svg>
            </>
          );
        })()}

        {/* ── Capacity chart ── */}
        {capacitySeries && (() => {
          const capSeries = capacitySeries.series;
          const capMinutes = capacitySeries.minutes;
          if (!capSeries?.length || !capMinutes?.length) return null;

          const capIH = CR_H - CR_PAD.top - CR_PAD.bottom;

          const allCaps = capSeries.flatMap(s => s.loads.filter(v => v != null));
          const capMax = Math.max(1, ...allCaps);

          const toCapY = v => CR_PAD.top + capIH - ((v ?? 0) / capMax) * capIH;

          const capYSteps = 4;
          const capYLabels = Array.from({ length: capYSteps + 1 }, (_, i) => {
            const val = (capMax / capYSteps) * i;
            return { y: toCapY(val), label: Math.round(val).toLocaleString() };
          });

          const capSeriesDayLines = capSeries.map((s, si) => {
            const color = capSeries.length === 1 ? '#6366f1' : SERIES_COLORS[si % SERIES_COLORS.length];
            const segments = dayOffsets.map((dayOff, di) => {
              const pts = dayGroups.get(dayOff);
              const points = pts.map((d, pi) => {
                const sl = dayStartSlots[di] + pi;
                const mIdx = capMinutes.indexOf(d.minute);
                const cap = mIdx >= 0 ? (s.loads[mIdx] ?? 0) : 0;
                return `${toX(sl)},${toCapY(cap)}`;
              }).join(' ');
              return { points, color };
            });
            return { code: s.code, name: s.name, color, segments };
          });

          const capAreaSegments = capSeries.length === 1
            ? dayOffsets.map((dayOff, di) => {
                const pts = dayGroups.get(dayOff);
                const inner = pts.map((d, pi) => {
                  const sl = dayStartSlots[di] + pi;
                  const mIdx = capMinutes.indexOf(d.minute);
                  const cap = mIdx >= 0 ? (capSeries[0].loads[mIdx] ?? 0) : 0;
                  return `${toX(sl)},${toCapY(cap)}`;
                }).join(' ');
                const x0 = toX(dayStartSlots[di]);
                const x1 = toX(dayEndSlots[di]);
                return `${x0},${CR_PAD.top + capIH} ${inner} ${x1},${CR_PAD.top + capIH}`;
              })
            : [];

          return (
            <>
              <div className="slc-chart-divider" />
              <div className="slc-section-title">站點運能</div>
              {capSeries.length > 1 && (
                <div className="slc-legend">
                  {capSeriesDayLines.map(sl => (
                    <span key={sl.code} className="slc-legend-item">
                      <span className="slc-legend-dot" style={{ background: sl.color }} />
                      {sl.code}
                    </span>
                  ))}
                </div>
              )}
              <svg viewBox={`0 0 ${W} ${CR_H}`} className="slc-svg">
                {capYLabels.map((yl, i) => (
                  <line key={i} x1={CR_PAD.left} x2={W - CR_PAD.right} y1={yl.y} y2={yl.y} stroke="#e5e7eb" strokeWidth={0.5} />
                ))}
                {dayBoundaryXs.map((x, i) => (
                  <line key={`db${i}`} x1={x} x2={x} y1={CR_PAD.top} y2={CR_PAD.top + capIH} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />
                ))}
                {capAreaSegments.map((pts, i) => (
                  <polygon key={`capa${i}`} points={pts} fill="rgba(99,102,241,0.1)" />
                ))}
                {capSeriesDayLines.map(sl =>
                  sl.segments.map((seg, di) => (
                    <polyline key={`${sl.code}-${di}`} points={seg.points} fill="none" stroke={seg.color} strokeWidth={1.5} />
                  ))
                )}
                {capYLabels.map((yl, i) => (
                  <text key={i} x={CR_PAD.left - 6} y={yl.y + 3} textAnchor="end" fontSize={10} fill="#666">{yl.label}</text>
                ))}
                {xTicks.map((xt, i) => (
                  <line key={`xt${i}`} x1={xt.x} x2={xt.x} y1={CR_PAD.top + capIH} y2={CR_PAD.top + capIH + 4} stroke="#aaa" strokeWidth={1} />
                ))}
                {xTicks.map((xt, i) => (
                  <text key={`xh${i}`} x={xt.x} y={CR_PAD.top + capIH + 16} textAnchor="middle" fontSize={10} fill="#555">{xt.hourStr}</text>
                ))}
                {xDateLabels.map((xl, i) => (
                  <text key={`xd${i}`} x={xl.x} y={CR_PAD.top + capIH + 30} textAnchor="middle" fontSize={9} fill="#999">{xl.label}</text>
                ))}
                <text x={W / 2} y={CR_H - 6} textAnchor="middle" fontSize={11} fill="#888">時間</text>
                <text x={12} y={CR_PAD.top + capIH / 2} textAnchor="middle" fontSize={11} fill="#888" transform={`rotate(-90, 12, ${CR_PAD.top + capIH / 2})`}>人數</text>
              </svg>
            </>
          );
        })()}
        </div>
      </div>
    </div>
  );
}
