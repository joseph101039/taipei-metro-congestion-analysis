import { getLoadColor, getCongestionColor } from './loadColorUtils';
import './StationLoadLegend.css';

const STEPS = 6;

export default function StationLoadLegend({ maxLoad, colorMode = 'flow' }) {
  if (colorMode === 'congestion') {
    // Fixed scale: 0 → 50% → 100% → 150%+
    const items = Array.from({ length: STEPS + 1 }, (_, i) => {
      const rate = (i / STEPS) * 1.5; // 0 to 1.5
      return { color: getCongestionColor(rate) };
    });
    return (
      <div className="sl-legend">
        <div className="sl-legend__title">混雜率</div>
        <div className="sl-legend__bar">
          {items.map((item, i) => (
            <div key={i} className="sl-legend__cell" style={{ background: item.color }} />
          ))}
        </div>
        <div className="sl-legend__labels">
          <span>0%</span>
          <span>75%</span>
          <span>≥100%</span>
        </div>
      </div>
    );
  }

  const max = maxLoad || 5000;
  const items = Array.from({ length: STEPS + 1 }, (_, i) => {
    const ratio = i / STEPS;
    return { color: getLoadColor(ratio) };
  });

  return (
    <div className="sl-legend">
      <div className="sl-legend__title">在車人數</div>
      <div className="sl-legend__bar">
        {items.map((item, i) => (
          <div key={i} className="sl-legend__cell" style={{ background: item.color }} />
        ))}
      </div>
      <div className="sl-legend__labels">
        <span>0</span>
        <span>{Math.round(max / 2).toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

