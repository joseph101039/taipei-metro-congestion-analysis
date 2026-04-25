import { Knex } from 'knex';

interface LineRouteRow {
  route_id: string;
  line_code: string;
  line_id: number | null;
  direction: number;
  route_name_zh: string | null;
  route_name_en: string | null;
}

interface LineRouteStopRow {
  route_id: string;
  station_code: string;
  station_name: string | null;
  stop_sequence: number;
  cumulative_distance: string;
}

export interface ILineRouteRepository {
  findAllRoutes(): Promise<LineRouteRow[]>;
  findRoutesByLineCode(lineCode: string): Promise<LineRouteRow[]>;
  findStopsByRouteIds(routeIds: string[]): Promise<LineRouteStopRow[]>;
}

export class LineRouteRepository implements ILineRouteRepository {
  constructor(private readonly db: Knex) {}

  findAllRoutes(): Promise<LineRouteRow[]> {
    return this.db('line_routes')
      .select<LineRouteRow[]>('route_id', 'line_code', 'line_id', 'direction', 'route_name_zh', 'route_name_en')
      .orderBy('route_id');
  }

  findRoutesByLineCode(lineCode: string): Promise<LineRouteRow[]> {
    return this.db('line_routes')
      .select<LineRouteRow[]>('route_id', 'line_code', 'line_id', 'direction', 'route_name_zh', 'route_name_en')
      .where('line_code', lineCode)
      .orderBy('route_id');
  }

  findStopsByRouteIds(routeIds: string[]): Promise<LineRouteStopRow[]> {
    return this.db('line_route_stops as rs')
      .leftJoin('stations as s', 's.code', 'rs.station_code')
      .select<LineRouteStopRow[]>(
        'rs.route_id',
        'rs.station_code',
        's.name as station_name',
        'rs.stop_sequence',
        'rs.cumulative_distance',
      )
      .whereIn('rs.route_id', routeIds)
      .orderBy(['rs.route_id', 'rs.stop_sequence']);
  }
}
