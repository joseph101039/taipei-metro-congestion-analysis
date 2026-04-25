import { useState, useEffect, useRef } from 'react';
import CongestionRouteChart from './CongestionRouteChart';
import HeadwayEditor from './HeadwayEditor';
import './RouteChartPanel.css';

export default function RouteChartPanel({ lineRoutes, lines, onSettingsChange, referenceDate, hidden }) {
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  // Auto-open only the very first time the panel becomes visible
  useEffect(() => {
    if (!hidden && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [hidden]);

  return (
    <div className="route-chart-panel" style={hidden ? { display: 'none' } : undefined}>
      <button
        className="route-chart-panel__toggle"
        onClick={() => setOpen(v => !v)}
        title={open ? '收合運能設置' : '展開運能設置'}
      >
        {open ? '✕' : '運能設置'}
      </button>
      {open && (
        <div className="route-chart-panel__dropdown">
          <CongestionRouteChart lineRoutes={lineRoutes} lines={lines} />
          <HeadwayEditor lines={lines} onSettingsChange={onSettingsChange} referenceDate={referenceDate} />
        </div>
      )}
    </div>
  );
}

