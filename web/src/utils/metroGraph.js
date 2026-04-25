/**
 * Build a metro network graph from lines + stations data,
 * then provide BFS shortest-path lookups (by station code).
 *
 * The adjacency graph includes:
 * 1. Track edges from line segments
 * 2. Transfer edges between stations with the same alias (same physical station)
 */

function buildAdj(lines, stationsByCode) {
  const adj = new Map();
  function addEdge(a, b) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }

  // Track edges from line segments
  for (const line of lines) {
    for (const { from, to } of line.segments) addEdge(from, to);
  }

  // Transfer edges: same alias (or same lat/lng) = same physical station
  const byAlias = new Map();
  for (const [code, station] of stationsByCode) {
    const alias = station.alias || station.name;
    if (!byAlias.has(alias)) byAlias.set(alias, []);
    byAlias.get(alias).push(code);
  }
  for (const codes of byAlias.values()) {
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        addEdge(codes[i], codes[j]);
      }
    }
  }

  // Coordinate-based transfer edges (fallback for different aliases at same location)
  const byCoord = new Map();
  for (const [code, station] of stationsByCode) {
    if (station.lat == null || station.lng == null) continue;
    const key = `${station.lat},${station.lng}`;
    if (!byCoord.has(key)) byCoord.set(key, []);
    byCoord.get(key).push(code);
  }
  for (const codes of byCoord.values()) {
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        addEdge(codes[i], codes[j]);
      }
    }
  }

  return adj;
}

function bfs(adj, fromCode, toCode) {
  if (fromCode === toCode) return [fromCode];
  if (!adj.has(fromCode) || !adj.has(toCode)) return null;

  const visited = new Set([fromCode]);
  const prev = new Map();
  const queue = [fromCode];

  while (queue.length) {
    const node = queue.shift();
    for (const nb of adj.get(node) ?? []) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      prev.set(nb, node);
      if (nb === toCode) {
        const path = [];
        let cur = toCode;
        while (cur != null) { path.push(cur); cur = prev.get(cur); }
        return path.reverse();
      }
      queue.push(nb);
    }
  }
  return null;
}

/**
 * Create a cached pathfinder.
 * Returns (fromCode, toCode) => [code, code, ...] | null
 */
export function createPathfinder(transfers, stationsByCode, lines) {
  const adj = buildAdj(lines, stationsByCode);
  const cache = new Map();

  return function findPath(fromCode, toCode) {
    if (fromCode === toCode) return [fromCode];
    const key = `${fromCode}|${toCode}`;
    if (cache.has(key)) return cache.get(key);

    const path = bfs(adj, fromCode, toCode);
    cache.set(key, path);
    return path;
  };
}
