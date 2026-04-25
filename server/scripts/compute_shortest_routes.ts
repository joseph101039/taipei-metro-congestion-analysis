import db from '../src/config/database';

const BATCH_SIZE = 500;

// ── Graph types ────────────────────────────────────────────────────────────────

interface StationNode {
  id: number;
  code: string;
  alias: string | null;
  line_id: number | null;
}

interface GraphEdge {
  to: number;
  distance_km: number;
  isTransfer: boolean;
  transferType?: 'alias' | 'branch'; // 'branch' = cross-line distance edge (支線分岐)
}

interface Graph {
  stations: StationNode[];
  stationById: Map<number, StationNode>;
  adjacency: Map<number, GraphEdge[]>;
}

// ── Graph builder (mirrors RouteService.getGraph) ──────────────────────────────

async function buildGraph(): Promise<Graph> {
  const [stations, distances] = await Promise.all([
    db('stations').select<StationNode[]>('id', 'code', 'alias', 'line_id'),
    db('station_distances')
      .select('from_station_id as from_id', 'to_station_id as to_id', 'distance_km')
      .then((rows: any[]) =>
        rows.map((r) => ({
          from_id: r.from_id as number,
          to_id: r.to_id as number,
          distance_km: parseFloat(r.distance_km),
        })),
      ),
  ]);

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const adjacency = new Map<number, GraphEdge[]>();

  const addEdge = (from: number, to: number, distance_km: number, isTransfer: boolean, transferType?: 'alias' | 'branch') => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ to, distance_km, isTransfer, transferType });
  };

  for (const { from_id, to_id, distance_km } of distances) {
    const fromLine = stationById.get(from_id)?.line_id;
    const toLine = stationById.get(to_id)?.line_id;
    const isCrossLine = fromLine !== undefined && toLine !== undefined && fromLine !== toLine;
    addEdge(from_id, to_id, distance_km, isCrossLine, isCrossLine ? 'branch' : undefined);
    addEdge(to_id, from_id, distance_km, isCrossLine, isCrossLine ? 'branch' : undefined);
  }

  // Zero-cost transfer edges between stations sharing the same alias
  const byAlias = new Map<string, StationNode[]>();
  for (const s of stations) {
    if (!s.alias) continue;
    if (!byAlias.has(s.alias)) byAlias.set(s.alias, []);
    byAlias.get(s.alias)!.push(s);
  }
  for (const group of byAlias.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[i].line_id !== group[j].line_id) {
          addEdge(group[i].id, group[j].id, 0, true, 'alias');
          addEdge(group[j].id, group[i].id, 0, true, 'alias');
        }
      }
    }
  }

  return { stations, stationById, adjacency };
}

// ── Single-source Dijkstra ─────────────────────────────────────────────────────

interface DijkstraResult {
  dist: Map<number, number>;
  prev: Map<number, { node: number; isTransfer: boolean; transferType?: 'alias' | 'branch' }>;
}

function dijkstra(graph: Graph, sourceId: number): DijkstraResult {
  const dist = new Map<number, number>();
  const prev = new Map<number, { node: number; isTransfer: boolean; transferType?: 'alias' | 'branch' }>();
  const visited = new Set<number>();
  const heap: [number, number][] = [[0, sourceId]];

  for (const id of graph.stationById.keys()) dist.set(id, Infinity);
  dist.set(sourceId, 0);

  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0]);
    const [d, u] = heap.shift()!;

    if (visited.has(u)) continue;
    visited.add(u);

    for (const edge of graph.adjacency.get(u) ?? []) {
      const newDist = d + edge.distance_km;
      if (newDist < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, { node: u, isTransfer: edge.isTransfer, transferType: edge.transferType });
        heap.push([newDist, edge.to]);
      }
    }
  }

  return { dist, prev };
}

// ── Path reconstruction → transfer_ids ────────────────────────────────────────

function extractTransferIds(
  sourceId: number,
  destId: number,
  prev: Map<number, { node: number; isTransfer: boolean; transferType?: 'alias' | 'branch' }>,
  stationById: Map<number, StationNode>,
): string {
  const transferIds: number[] = [];
  let cur: number | undefined = destId;

  while (cur !== undefined) {
    const p = prev.get(cur);
    if (p?.isTransfer) {
      if (p.transferType === 'branch') {
        // Branch crossing: record the main-line junction station (lower line_id side)
        const curLine  = stationById.get(cur)?.line_id  ?? Infinity;
        const prevLine = stationById.get(p.node)?.line_id ?? Infinity;
        const junction = curLine <= prevLine ? cur : p.node;
        // Skip if junction is origin or destination — avoids degenerate 0-distance segments
        if (junction !== destId && junction !== sourceId) {
          transferIds.unshift(junction);
        }
      } else {
        // Alias transfer: record the station on the NEW line (the one you board after transfer)
        // Skip if it's the destination — no need to "board" at the final station
        if (cur !== destId) {
          transferIds.unshift(cur);
        }
      }
    }
    cur = p?.node;
  }

  return transferIds.join(',');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Building graph...');
  const graph = await buildGraph();
  console.log(`  ${graph.stations.length} stations, ${
    [...graph.adjacency.values()].reduce((s, edges) => s + edges.length, 0)
  } directed edges`);

  const total = graph.stations.length * (graph.stations.length - 1);
  console.log(`Computing ${graph.stations.length} × ${graph.stations.length - 1} = ${total} pairs...\n`);

  let inserted = 0;
  let batch: object[] = [];

  for (let si = 0; si < graph.stations.length; si++) {
    const source = graph.stations[si];
    const { dist, prev } = dijkstra(graph, source.id);

    for (const dest of graph.stations) {
      if (dest.id === source.id) continue;
      const d = dist.get(dest.id) ?? Infinity;
      if (d === Infinity) continue; // unreachable (disconnected)

      batch.push({
        from_station_id: source.id,
        to_station_id: dest.id,
        total_distance_km: Math.round(d * 100) / 100,
        transfer_ids: extractTransferIds(source.id, dest.id, prev, graph.stationById),
      });

      if (batch.length >= BATCH_SIZE) {
        await db('shortest_routes').insert(batch).onConflict(['from_station_id', 'to_station_id']).ignore();
        inserted += batch.length;
        process.stdout.write(`\r  Inserted ${inserted}/${total}...`);
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await db('shortest_routes').insert(batch).onConflict(['from_station_id', 'to_station_id']).ignore();
    inserted += batch.length;
  }

  console.log(`\n\nDone. Inserted ${inserted} route records.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());
