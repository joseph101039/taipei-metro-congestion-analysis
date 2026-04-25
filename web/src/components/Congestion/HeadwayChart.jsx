import { useRef, useState } from 'react';

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6–24
const Y_MAX = 20;
const Y_MIN = 1;

const W = 300;
const H = 85;
const PAD = { l: 18, r: 4, t: 6, b: 16 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;

function xAt(i) {
  return PAD.l + (i / (HOURS.length - 1)) * CW;
}
function yAt(v) {
  const c = Math.max(Y_MIN, Math.min(v, Y_MAX));
  return PAD.t + CH - ((c - Y_MIN) / (Y_MAX - Y_MIN)) * CH;
}
function valFromSvgY(svgY) {
  const frac = 1 - (svgY - PAD.t) / CH;
  const raw = frac * (Y_MAX - Y_MIN) + Y_MIN;
  return Math.max(Y_MIN, Math.min(Y_MAX, Math.round(raw * 2) / 2));
}

function catmullPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)},${cp2x.toFixed(1)},${cp2y.toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function HeadwayChart({ values, color, onChange }) {
  const svgRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const pts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const pathD = catmullPath(pts);
  const activeIdx = dragIdx ?? hoveredIdx;

  function getSvgY(e) {
    const rect = svgRef.current.getBoundingClientRect();
    return ((e.clientY - rect.top) / rect.height) * H;
  }

  function handleMouseMove(e) {
    if (dragIdx === null) return;
    onChange(dragIdx, valFromSvgY(getSvgY(e)));
  }

  function stopDrag() { setDragIdx(null); }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/* Y grid + labels */}
      {[5, 10, 15, 20].map(v => {
        const y = yAt(v);
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#2e2e2e" strokeWidth={0.5} />
            <text x={PAD.l - 2} y={y + 2} textAnchor="end" fontSize={5.5} fill="#555">{v}</text>
          </g>
        );
      })}

      {/* X axis */}
      <line x1={PAD.l} y1={PAD.t + CH} x2={W - PAD.r} y2={PAD.t + CH} stroke="#444" strokeWidth={0.5} />

      {/* X labels every 2 hours */}
      {HOURS.map((h, i) => i % 2 === 0 && (
        <text key={h} x={xAt(i)} y={H - 3} textAnchor="middle" fontSize={5.5} fill="#555">{h}</text>
      ))}

      {/* Smooth curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" style={{ pointerEvents: 'none' }} />

      {/* Nodes */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === activeIdx ? 4 : 2.5}
          fill={i === activeIdx ? color : '#1a1a1a'}
          stroke={color}
          strokeWidth={1}
          style={{ cursor: 'ns-resize' }}
          onMouseDown={e => { e.preventDefault(); setDragIdx(i); setHoveredIdx(i); }}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => { if (dragIdx === null) setHoveredIdx(null); }}
        />
      ))}

      {/* Tooltip */}
      {activeIdx !== null && pts[activeIdx] && (() => {
        const tx = Math.min(Math.max(pts[activeIdx].x, PAD.l + 19), W - PAD.r - 19);
        const ty = pts[activeIdx].y;
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx - 19} y={ty - 15} width={38} height={11} rx={2} fill="rgba(10,10,10,0.9)" />
            <text x={tx} y={ty - 7} textAnchor="middle" fontSize={5.5} fill="#fff">
              {HOURS[activeIdx]}:00 · {values[activeIdx]}m
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
