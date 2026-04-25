import { IRouteService } from './RouteService';
import { IRouteTimeRepository, PrecomputedRouteTime } from '../repositories/RouteTimeRepository';
import { RouteTimeResponse, RouteTimeSegment, RouteTimeStation } from '../models/RouteTime';
import { IRouteRepository, LineNode, StationNode } from '../repositories/RouteRepository';

interface Graph {
  stationById: Map<number, StationNode>;
  lineById: Map<number, LineNode>;
  byAlias: Map<string, StationNode[]>;
  byCoord: Map<string, StationNode[]>;
}

export interface IRouteTimeService {
  findRouteTime(fromId: number, toId: number): Promise<RouteTimeResponse | null>;
  findAllTransferIds(): Promise<Record<number, Record<number, number[]>>>;
  findStationById(id: number): Promise<StationNode | undefined>;
}

export class RouteTimeService implements IRouteTimeService {
  private graph: Graph | null = null;

  constructor(
    private readonly routeTimeRepo: IRouteTimeRepository,
    private readonly routeRepo: IRouteRepository,
  ) {}

  private async getGraph(): Promise<Graph> {
    if (this.graph) return this.graph;

    const [stations, lines] = await Promise.all([
      this.routeRepo.findAllStations(),
      this.routeRepo.findAllLines(),
    ]);

    const stationById = new Map(stations.map((s) => [s.id, s]));
    const lineById = new Map(lines.map((l) => [l.id, l]));

    const byAlias = new Map<string, StationNode[]>();
    for (const s of stations) {
      if (!s.alias) continue;
      if (!byAlias.has(s.alias)) byAlias.set(s.alias, []);
      byAlias.get(s.alias)!.push(s);
    }

    const byCoord = new Map<string, StationNode[]>();
    for (const s of stations) {
      if (s.lat == null || s.lng == null) continue;
      const key = `${s.lat},${s.lng}`;
      if (!byCoord.has(key)) byCoord.set(key, []);
      byCoord.get(key)!.push(s);
    }

    this.graph = { stationById, lineById, byAlias, byCoord };
    return this.graph;
  }

  async findAllTransferIds(): Promise<Record<number, Record<number, number[]>>> {
    const rows = await this.routeTimeRepo.findAllTransferIds();
    const result: Record<number, Record<number, number[]>> = {};
    for (const row of rows) {
      const ids = row.transfer_ids.split(',').map(Number).filter(Boolean);
      if (!result[row.from_station_id]) result[row.from_station_id] = {};
      result[row.from_station_id][row.to_station_id] = ids;
    }
    return result;
  }

  async findStationById(id: number): Promise<StationNode | undefined> {
    const graph = await this.getGraph();
    return graph.stationById.get(id);
  }

  async findRouteTime(fromId: number, toId: number): Promise<RouteTimeResponse | null> {
    const graph = await this.getGraph();
    const origin = graph.stationById.get(fromId);
    const destination = graph.stationById.get(toId);
    if (!origin || !destination) return null;

    const precomputed = await this.routeTimeRepo.findRouteTime(fromId, toId);
    if (!precomputed) return null;

    return this.buildResponse(graph, origin, destination, precomputed);
  }

  private async buildResponse(
    graph: Graph,
    origin: StationNode,
    destination: StationNode,
    precomputed: PrecomputedRouteTime,
  ): Promise<RouteTimeResponse> {
    const transferIds = precomputed.transfer_ids
      ? precomputed.transfer_ids.split(',').map(Number).filter(Boolean)
      : [];

    // Build segment endpoints: each segment has a board station and alight station.
    // transfer_ids are the stations where you alight before transferring.
    // After alighting at a transfer station, you board the partner station on the next line.
    interface SegmentEndpoints { board: StationNode; alight: StationNode }
    const segEndpoints: SegmentEndpoints[] = [];

    const transferStations = transferIds
      .map((id) => graph.stationById.get(id))
      .filter((s): s is StationNode => !!s);

    let currentBoard = origin;
    for (let i = 0; i < transferStations.length; i++) {
      const transferStation = transferStations[i];
      // Alight at the partner on the same line as currentBoard
      const alightPartner = this.findPartnerOnLine(graph, transferStation, currentBoard.line_id!);
      segEndpoints.push({ board: currentBoard, alight: alightPartner });

      // Board the partner on the NEXT line — determine next line from next transfer or destination
      const nextTarget = i + 1 < transferStations.length ? transferStations[i + 1] : destination;
      currentBoard = this.findPartnerOnLine(graph, transferStation, nextTarget.line_id!);
    }

    // Final segment: currentBoard → destination (or partner on same line)
    const finalAlight = this.findPartnerOnLine(graph, destination, currentBoard.line_id!);
    segEndpoints.push({ board: currentBoard, alight: finalAlight });

    const segments: RouteTimeSegment[] = [];

    for (const { board, alight } of segEndpoints) {
      const line = graph.lineById.get(board.line_id!)!;

      // Look up per-segment travel time from route_min_time table
      let segTime = 0;
      if (board.id !== alight.id) {
        const segRoute = await this.routeTimeRepo.findRouteTime(board.id, alight.id);
        segTime = segRoute?.min_travel_time ?? 0;
      }

      segments.push({
        line: { id: line.id, code: line.code, name: line.name, color: line.color },
        from: toStation(board),
        to: toStation(alight),
        travel_time_min: segTime,
      });
    }

    return {
      from: toStation(origin),
      to: toStation(destination),
      total_travel_time_min: precomputed.min_travel_time,
      transfers: segments.length - 1,
      segments,
    };
  }

  private findPartnerOnLine(graph: Graph, station: StationNode, lineId: number): StationNode {
    if (station.line_id === lineId) return station;
    // Try alias-based lookup
    const alias = station.alias ?? '';
    const aliasPartner = (graph.byAlias.get(alias) ?? []).find((s) => s.line_id === lineId);
    if (aliasPartner) return aliasPartner;
    // Fallback: coordinate-based lookup (same physical location, different alias)
    if (station.lat != null && station.lng != null) {
      const key = `${station.lat},${station.lng}`;
      const coordPartner = (graph.byCoord.get(key) ?? []).find((s) => s.line_id === lineId);
      if (coordPartner) return coordPartner;
    }
    return station;
  }
}

function toStation(s: StationNode): RouteTimeStation {
  return { id: s.id, code: s.code, name: s.name };
}

