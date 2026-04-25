import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';

function getSegmentCoords(lineSegments, fromCode, toCode, stationsByCode) {
  if (!lineSegments?.length) return [];
  const ordered = [lineSegments[0].from];
  for (const seg of lineSegments) ordered.push(seg.to);
  const si = ordered.indexOf(fromCode);
  const ei = ordered.indexOf(toCode);
  if (si === -1 || ei === -1) return [];
  const [a, b] = si <= ei ? [si, ei] : [ei, si];
  return ordered.slice(a, b + 1)
    .map(c => stationsByCode.get(c))
    .filter(Boolean)
    .map(s => [s.lat, s.lng]);
}

// BFS-based path finder across multiple lines (for merged parent+child segments)
function getSegmentCoordsGraph(allSegments, fromCode, toCode, stationsByCode) {
  if (!allSegments?.length) return [];
  const adj = new Map();
  for (const { from, to } of allSegments) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from).push(to);
    adj.get(to).push(from);
  }
  const visited = new Set([fromCode]);
  const parent = new Map();
  const queue = [fromCode];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === toCode) break;
    for (const neighbor of (adj.get(node) ?? [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, node);
        queue.push(neighbor);
      }
    }
  }
  if (!parent.has(toCode) && fromCode !== toCode) return [];
  const path = [];
  let cur = toCode;
  while (cur !== undefined) {
    const s = stationsByCode.get(cur);
    if (s) path.unshift([s.lat, s.lng]);
    cur = parent.get(cur);
  }
  return path;
}

export default function RouteLayer({ routeResult, stationsByCode, lines }) {
  if (!routeResult) return null;

  const lineByCode = new Map(lines.map(l => [l.code, l]));
  const fromSt = stationsByCode.get(routeResult.from.code);
  const toSt   = stationsByCode.get(routeResult.to.code);

  return (
    <>
      {routeResult.segments.map((seg, i) => {
        const lineData = lineByCode.get(seg.line.code);
        let coords = getSegmentCoords(
          lineData?.segments ?? [],
          seg.from.code,
          seg.to.code,
          stationsByCode,
        );
        // Fallback: merged parent+child segment — search across parent and its children
        if (coords.length === 0 && lineData) {
          const relatedLines = lines.filter(l =>
            l.id === lineData.id || l.parent_line_id === lineData.id || (lineData.parent_line_id != null && l.id === lineData.parent_line_id)
          );
          const allSegments = relatedLines.flatMap(l => l.segments);
          coords = getSegmentCoordsGraph(allSegments, seg.from.code, seg.to.code, stationsByCode);
        }
        if (coords.length === 0) return null;
        return (
          <Polyline
            key={i}
            positions={coords}
            pathOptions={{ color: seg.line.color, weight: 8, opacity: 0.85, interactive: false }}
          />
        );
      })}

      {fromSt && (
        <CircleMarker
          center={[fromSt.lat, fromSt.lng]}
          radius={9}
          pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2.5, interactive: false }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>起</Tooltip>
        </CircleMarker>
      )}
      {toSt && (
        <CircleMarker
          center={[toSt.lat, toSt.lng]}
          radius={9}
          pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2.5, interactive: false }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>終</Tooltip>
        </CircleMarker>
      )}
    </>
  );
}
