import { Knex } from 'knex';

export interface StationNode {
  id: number;
  code: string;
  name: string;
  alias: string | null;
  line_id: number | null;
  lat: number | null;
  lng: number | null;
}

export interface LineNode {
  id: number;
  code: string;
  name: string;
  color: string;
  parent_line_id: number | null;
}

export interface DistanceEdge {
  from_id: number;
  to_id: number;
  distance_km: number;
}

export interface PrecomputedRoute {
  from_station_id: number;
  to_station_id: number;
  total_distance_km: number;
  transfer_ids: string;
}

export interface IRouteRepository {
  findAllStations(): Promise<StationNode[]>;
  findAllLines(): Promise<LineNode[]>;
  findAllDistances(): Promise<DistanceEdge[]>;
  findPrecomputed(fromId: number, toId: number): Promise<PrecomputedRoute | null>;
}

export class RouteRepository implements IRouteRepository {
  constructor(private readonly db: Knex) {}

  findAllStations(): Promise<StationNode[]> {
    return this.db('stations').select<StationNode[]>('id', 'code', 'name', 'alias', 'line_id', 'lat', 'lng');
  }

  findAllLines(): Promise<LineNode[]> {
    return this.db('lines').select<LineNode[]>('id', 'code', 'name', 'color', 'parent_line_id');
  }

  async findPrecomputed(fromId: number, toId: number): Promise<PrecomputedRoute | null> {
    const row = await this.db('shortest_routes')
      .select<PrecomputedRoute>('from_station_id', 'to_station_id', 'total_distance_km', 'transfer_ids')
      .where({ from_station_id: fromId, to_station_id: toId })
      .first();
    if (!row) return null;
    return {
      ...row,
      total_distance_km: parseFloat(row.total_distance_km as unknown as string),
    };
  }

  async findAllDistances(): Promise<DistanceEdge[]> {
    const rows = await this.db('station_distances').select(
      'from_station_id as from_id',
      'to_station_id as to_id',
      'distance_km',
    );
    return rows.map((r: any) => ({
      from_id: r.from_id,
      to_id: r.to_id,
      distance_km: parseFloat(r.distance_km),
    }));
  }
}
