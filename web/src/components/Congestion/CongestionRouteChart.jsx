import './CongestionRouteChart.css';

// Map lineCode to line_id for color lookup
const LINE_CODE_TO_ID = { R: 1, BL: 2, G: 3, O: 4, BR: 5, Y: 6 };

export default function CongestionRouteChart({ lineRoutes, lines }) {
  if (!lineRoutes || !lines) return <p className="crc__loading">載入路線資料中…</p>;

  const colorMap = {};
  lines.forEach(l => { colorMap[l.id] = l.color; });

  // Group routes by lineCode
  const grouped = {};
  lineRoutes.forEach(route => {
    if (route.direction !== 0) return; // only outbound
    const key = route.lineCode;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(route);
  });

  // Find global max distance for scaling
  const maxDist = Math.max(
    ...lineRoutes.filter(r => r.direction === 0).map(r => {
      const stops = r.stops || [];
      return stops.length ? stops[stops.length - 1].cumulativeDistanceKm : 0;
    })
  );

  return (
    <div className="crc">
      {Object.entries(grouped).map(([code, routes]) => {
        const lineId = routes[0].lineId ?? LINE_CODE_TO_ID[code];
        const color = colorMap[lineId] || '#888';
        // Sort by total distance descending so longest route first
        const sorted = [...routes].sort((a, b) => {
          const distA = a.stops?.length ? a.stops[a.stops.length - 1].cumulativeDistanceKm : 0;
          const distB = b.stops?.length ? b.stops[b.stops.length - 1].cumulativeDistanceKm : 0;
          return distB - distA;
        });

        return (
          <div key={code} className="crc__line-group">
            <div className="crc__line-title" style={{ color }}>{code} 線</div>
            {sorted.map(route => {
              const stops = route.stops || [];
              const totalDist = stops.length ? stops[stops.length - 1].cumulativeDistanceKm : 0;
              const widthPct = maxDist > 0 ? (totalDist / maxDist) * 100 : 0;
              const firstStop = stops[0]?.stationName || '?';
              const lastStop = stops[stops.length - 1]?.stationName || '?';

              return (
                <div key={route.routeId} className="crc__route">
                  <div className="crc__route-id">{route.routeId}</div>
                  <div className="crc__bar-track">
                    <div className="crc__bar" style={{ width: `${widthPct}%`, backgroundColor: color }} />
                  </div>
                  <span className="crc__bar-label">{firstStop} → {lastStop}</span>
                  <span className="crc__dist">{totalDist.toFixed(1)} km</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

