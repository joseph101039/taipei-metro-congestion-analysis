import { IRouteRepository, LineNode, StationNode } from '../repositories/RouteRepository';
import { RouteResponse, RouteSegment, RouteStation } from '../models/Route';

interface GraphEdge {
  to: number;
  distance_km: number;
  isTransfer: boolean;
}

interface Graph {
  stationById: Map<number, StationNode>;
  lineById: Map<number, LineNode>;
  // alias → stations sharing that alias
  byAlias: Map<string, StationNode[]>;
  adjacency: Map<number, GraphEdge[]>;
}

export interface IRouteService {
  findRoute(fromId: number, toId: number): Promise<RouteResponse | null>;
  findStationById(id: number): Promise<StationNode | undefined>;
}

export class RouteService implements IRouteService {
  private graph: Graph | null = null;

  constructor(private readonly repo: IRouteRepository) {}

  // ── Graph ──────────────────────────────────────────────────────────────────

  private async getGraph(): Promise<Graph> {
    if (this.graph) return this.graph;

    const [stations, lines, distances] = await Promise.all([
      this.repo.findAllStations(),
      this.repo.findAllLines(),
      this.repo.findAllDistances(),
    ]);

    const stationById = new Map(stations.map((s) => [s.id, s]));
    const lineById = new Map(lines.map((l) => [l.id, l]));

    const adjacency = new Map<number, GraphEdge[]>();
    const addEdge = (from: number, to: number, distance_km: number, isTransfer: boolean) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push({ to, distance_km, isTransfer });
    };

    for (const { from_id, to_id, distance_km } of distances) {
      addEdge(from_id, to_id, distance_km, false);
      addEdge(to_id, from_id, distance_km, false);
    }

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
            addEdge(group[i].id, group[j].id, 0, true);
            addEdge(group[j].id, group[i].id, 0, true);
          }
        }
      }
    }

    this.graph = { stationById, lineById, byAlias, adjacency };
    return this.graph;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async findStationById(id: number): Promise<StationNode | undefined> {
    const graph = await this.getGraph();
    return graph.stationById.get(id);
  }

  async findRoute(fromId: number, toId: number): Promise<RouteResponse | null> {
    const graph = await this.getGraph();
    const origin = graph.stationById.get(fromId);
    const destination = graph.stationById.get(toId);
    if (!origin || !destination) return null;

    // 1. Try precomputed table
    const precomputed = await this.repo.findPrecomputed(fromId, toId);
    if (precomputed) {
      return this.buildResponseFromPrecomputed(graph, origin, destination, precomputed);
    }

    // 2. Fallback: Dijkstra
    return this.dijkstraRoute(graph, origin, destination);
  }

  // ── Reconstruct from shortest_routes row ───────────────────────────────────

  private buildResponseFromPrecomputed(
    graph: Graph,
    origin: StationNode,
    destination: StationNode,
    precomputed: { total_distance_km: number; transfer_ids: string },
  ): RouteResponse {
    const transferIds = precomputed.transfer_ids
      ? precomputed.transfer_ids.split(',').map(Number).filter(Boolean)
      : [];

    // Boarding stations: [origin, ...transferIds]
    const boardings: StationNode[] = [origin, ...transferIds.map((id) => graph.stationById.get(id)!).filter(Boolean)];

    const segments: RouteSegment[] = [];

    for (let i = 0; i < boardings.length; i++) {
      const boarding = boardings[i];
      const isLast = i === boardings.length - 1;

      let alighting: StationNode;
      if (isLast) {
        // Last segment: if destination is on a different line (alias transfer at dest),
        // alight at the alias partner on the current line instead
        if (destination.line_id !== boarding.line_id) {
          const alias = destination.alias ?? '';
          const partner = (graph.byAlias.get(alias) ?? []).find((s) => s.line_id === boarding.line_id);
          alighting = partner ?? destination;
        } else {
          alighting = destination;
        }
      } else {
        const nextBoarding = boardings[i + 1];
        const alias = nextBoarding.alias ?? graph.stationById.get(nextBoarding.id)?.alias;
        const partner = alias
          ? (graph.byAlias.get(alias) ?? []).find((s) => s.line_id === boarding.line_id)
          : undefined;
        // If no alias partner found (branch transfer — different aliases), use nextBoarding directly
        alighting = partner ?? nextBoarding;
      }

      // Determine line: for branch crossings (boarding and alighting on different lines),
      // use the higher line_id which is the branch line (7=新北投支線, 8=小碧潭支線, 9=蘆洲支線)
      // — the branch line's segment list includes the junction station code.
      let lineId = boarding.line_id!;
      if (alighting.line_id != null && alighting.line_id !== boarding.line_id) {
        lineId = Math.max(boarding.line_id!, alighting.line_id);
      }
      const line = graph.lineById.get(lineId)!;

      const distance_km = this.lineSegmentDistance(graph, boarding.id, alighting.id);

      segments.push({
        line: { id: line.id, code: line.code, name: line.name, color: line.color },
        from: toRouteStation(boarding),
        to: toRouteStation(alighting),
        distance_km,
      });
    }

    const finalSegments = this.mergeParentChildSegments(graph, segments);

    return {
      from: toRouteStation(origin),
      to: toRouteStation(destination),
      total_distance_km: precomputed.total_distance_km,
      transfers: finalSegments.length - 1,
      segments: finalSegments,
    };
  }

  // Merge consecutive segments on parent ↔ child lines (e.g. 中和新蘆線 + 蘆洲支線).
  // These share the same physical train — no real transfer.
  private mergeParentChildSegments(graph: Graph, segments: RouteSegment[]): RouteSegment[] {
    if (segments.length < 2) return segments;
    const merged: RouteSegment[] = [segments[0]];
    for (let i = 1; i < segments.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = segments[i];
      if (this.isThroughServiceLine(graph, prev.line.id, cur.line.id)) {
        // Merge: keep parent line info, extend from/to and sum distance
        const parentLine = this.getParentLine(graph, prev.line.id, cur.line.id);
        merged[merged.length - 1] = {
          line: parentLine,
          from: prev.from,
          to: cur.to,
          distance_km: round2(prev.distance_km + cur.distance_km),
        };
      } else {
        merged.push(cur);
      }
    }
    return merged;
  }

  // Only 蘆洲支線 (orange_luzhou) shares physical trains with its parent (中和新蘆線).
  // 新北投支線 and 小碧潭支線 are separate shuttles requiring a real transfer.
  private static readonly THROUGH_SERVICE_CODES = new Set(['orange_luzhou']);

  private isThroughServiceLine(graph: Graph, lineIdA: number, lineIdB: number): boolean {
    const a = graph.lineById.get(lineIdA);
    const b = graph.lineById.get(lineIdB);
    if (!a || !b) return false;
    const isParentChild = a.parent_line_id === lineIdB || b.parent_line_id === lineIdA;
    if (!isParentChild) return false;
    const child = a.parent_line_id !== null ? a : b;
    return RouteService.THROUGH_SERVICE_CODES.has(child.code);
  }

  private getParentLine(graph: Graph, lineIdA: number, lineIdB: number): { id: number; code: string; name: string; color: string } {
    const a = graph.lineById.get(lineIdA)!;
    const b = graph.lineById.get(lineIdB)!;
    const parent = a.parent_line_id === null ? a : b;
    return { id: parent.id, code: parent.code, name: parent.name, color: parent.color };
  }

  // Distance along line edges only (no transfers) from A to B
  private lineSegmentDistance(graph: Graph, fromId: number, toId: number): number {
    if (fromId === toId) return 0;
    const dist = new Map<number, number>();
    const heap: [number, number][] = [[0, fromId]];
    dist.set(fromId, 0);

    while (heap.length > 0) {
      heap.sort((a, b) => a[0] - b[0]);
      const [d, u] = heap.shift()!;
      if (u === toId) return round2(d);
      if (d > (dist.get(u) ?? Infinity)) continue;

      for (const edge of graph.adjacency.get(u) ?? []) {
        if (edge.isTransfer) continue;
        const nd = d + edge.distance_km;
        if (nd < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, nd);
          heap.push([nd, edge.to]);
        }
      }
    }
    return 0;
  }

  // ── Dijkstra fallback ──────────────────────────────────────────────────────

  private dijkstraRoute(graph: Graph, origin: StationNode, destination: StationNode): RouteResponse | null {
    const dist = new Map<number, number>();
    const prev = new Map<number, { node: number; isTransfer: boolean }>();
    const visited = new Set<number>();
    const heap: [number, number][] = [[0, origin.id]];

    for (const id of graph.stationById.keys()) dist.set(id, Infinity);
    dist.set(origin.id, 0);

    while (heap.length > 0) {
      heap.sort((a, b) => a[0] - b[0]);
      const [d, u] = heap.shift()!;

      if (visited.has(u)) continue;
      visited.add(u);
      if (u === destination.id) break;

      for (const edge of graph.adjacency.get(u) ?? []) {
        const newDist = d + edge.distance_km;
        if (newDist < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, newDist);
          prev.set(edge.to, { node: u, isTransfer: edge.isTransfer });
          heap.push([newDist, edge.to]);
        }
      }
    }

    if ((dist.get(destination.id) ?? Infinity) === Infinity) return null;

    const path: { id: number; isTransfer: boolean }[] = [];
    let cur: number | undefined = destination.id;
    while (cur !== undefined) {
      const p = prev.get(cur);
      path.unshift({ id: cur, isTransfer: p?.isTransfer ?? false });
      cur = p?.node;
    }

    const segments: RouteSegment[] = [];
    let segStart = path[0];
    let segDist = 0;

    for (let i = 1; i < path.length; i++) {
      const { id, isTransfer } = path[i];
      const edge = (graph.adjacency.get(path[i - 1].id) ?? []).find((e) => e.to === id);
      const edgeKm = edge?.distance_km ?? 0;

      // Also split on cross-line distance edges (branch lines like 新北投/小碧潭/蘆洲支線)
      const prevSt = graph.stationById.get(path[i - 1].id)!;
      const curSt  = graph.stationById.get(id)!;
      const isBranchSwitch = !isTransfer && prevSt.line_id !== curSt.line_id;

      if (isTransfer || isBranchSwitch) {
        const fromSt = graph.stationById.get(segStart.id)!;
        const toSt   = graph.stationById.get(path[i - 1].id)!;
        if (fromSt.id !== toSt.id) {
          const line = graph.lineById.get(fromSt.line_id!)!;
          segments.push({
            line: { id: line.id, code: line.code, name: line.name, color: line.color },
            from: toRouteStation(fromSt),
            to: toRouteStation(toSt),
            distance_km: round2(segDist),
          });
        }
        segStart = { id, isTransfer: false };
        segDist  = isBranchSwitch ? edgeKm : 0;  // branch edge distance belongs to new segment
      } else {
        segDist += edgeKm;
      }
    }

    const fromSt = graph.stationById.get(segStart.id)!;
    let lastLineId = fromSt.line_id!;
    if (destination.line_id != null && destination.line_id !== fromSt.line_id) {
      lastLineId = Math.max(fromSt.line_id!, destination.line_id);
    }
    const line = graph.lineById.get(lastLineId)!;
    segments.push({
      line: { id: line.id, code: line.code, name: line.name, color: line.color },
      from: toRouteStation(fromSt),
      to: toRouteStation(destination),
      distance_km: round2(segDist),
    });

    const finalSegments = this.mergeParentChildSegments(graph, segments);

    return {
      from: toRouteStation(origin),
      to: toRouteStation(destination),
      total_distance_km: round2(dist.get(destination.id)!),
      transfers: finalSegments.length - 1,
      segments: finalSegments,
    };
  }
}

function toRouteStation(s: StationNode): RouteStation {
  return { id: s.id, code: s.code, name: s.name };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
