import { CircleMarker, Tooltip } from 'react-leaflet';

function getStationColor(code) {
  if (code.startsWith('R'))  return '#e3001b';
  if (code.startsWith('BL')) return '#0070bd';
  if (code.startsWith('G'))  return '#008659';
  if (code.startsWith('O') || code.startsWith('LK')) return '#f5a623';
  if (code.startsWith('BR')) return '#c48c31';
  return '#888';
}

function getAdjacentDistances(stationCode, lines, distanceMap) {
  const results = [];
  for (const line of lines) {
    for (const { from: fromCode, to: toCode } of line.segments) {
      if (stationCode !== fromCode && stationCode !== toCode) continue;
      const neighborCode = stationCode === fromCode ? toCode : fromCode;
      const dist = distanceMap.get(`${fromCode}|${toCode}`);
      if (dist != null) {
        results.push({ neighborCode, dist, lineName: line.name, lineColor: line.color });
      }
    }
  }
  return results;
}

export default function StationMarker({ station, lines, distanceMap, transferMap = null, onClick = null, dim = false, selected = false }) {
  const isInterchange = lines.filter(line =>
    line.parent_line_id === null &&
    line.segments.some(s => s.from === station.code || s.to === station.code)
  ).length > 1;

  const color = getStationColor(station.code);
  const adjacent = (dim && !selected) ? [] : getAdjacentDistances(station.code, lines, distanceMap);

  const radius = selected ? 11 : (dim ? 3 : (isInterchange ? 8 : 5));
  const pathOptions = selected
    ? { color: '#fff', fillColor: color, fillOpacity: 1, weight: 3, opacity: 1 }
    : {
        color: dim ? color : (isInterchange ? '#333' : color),
        fillColor: '#fff',
        fillOpacity: dim ? 0.5 : 1,
        weight: dim ? 1 : (isInterchange ? 3 : 2),
        opacity: dim ? 0.4 : 1,
      };

  return (
    <CircleMarker
      center={[station.lat, station.lng]}
      radius={radius}
      pathOptions={pathOptions}
      eventHandlers={onClick ? { click: () => onClick({ id: station.id, code: station.code, name: station.name }) } : undefined}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        <strong style={{ fontSize: 13 }}>{station.name}</strong>
        <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>{station.code}</span>
        {transferMap && transferMap.get(station.code) != null && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#e07b00' }}>
            換乘步行：{Number(transferMap.get(station.code)).toFixed(1)} 分
          </div>
        )}
        {adjacent.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {adjacent.map(({ neighborCode, dist, lineColor }) => (
              <div key={neighborCode} style={{ fontSize: 11, margin: '1px 0' }}>
                <span style={{ color: lineColor, fontWeight: 600 }}>●</span>
                {' '}{neighborCode}：{dist.toFixed(2)} km
              </div>
            ))}
          </div>
        )}
      </Tooltip>
    </CircleMarker>
  );
}
