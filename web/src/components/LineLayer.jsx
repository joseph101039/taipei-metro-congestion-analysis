import { Polyline, Tooltip } from 'react-leaflet';

export default function LineLayer({ line, stationsByCode, distanceMap, timeMap, opacity = 0.85, weight = 5 }) {
  return line.segments.map(({ from: fromCode, to: toCode }) => {
    const from = stationsByCode.get(fromCode);
    const to = stationsByCode.get(toCode);
    if (!from || !to) return null;

    const positions = [[from.lat, from.lng], [to.lat, to.lng]];
    const dist = distanceMap?.get(`${fromCode}|${toCode}`);
    const time = timeMap?.get(`${fromCode}|${toCode}`);
    const label = time != null ? String(time) : dist != null ? dist.toFixed(2) : null;

    return (
      <Polyline
        key={`${fromCode}-${toCode}`}
        positions={positions}
        pathOptions={{ color: line.color, weight, opacity }}
      >
        {label != null && (
          <Tooltip permanent direction="center" className="distance-label" offset={[0, 0]}>
            {label}
          </Tooltip>
        )}
      </Polyline>
    );
  });
}
