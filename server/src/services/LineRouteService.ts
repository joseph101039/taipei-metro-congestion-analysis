import { ILineRouteRepository } from '../repositories/LineRouteRepository';
import { LineRoute } from '../models/LineRoute';

export interface ILineRouteService {
  getAllRoutes(): Promise<LineRoute[]>;
  getRoutesByLineCode(lineCode: string): Promise<LineRoute[]>;
}

export class LineRouteService implements ILineRouteService {
  constructor(private readonly repo: ILineRouteRepository) {}

  private async buildRoutes(routes: Awaited<ReturnType<ILineRouteRepository['findAllRoutes']>>): Promise<LineRoute[]> {
    if (routes.length === 0) return [];
    const routeIds = routes.map((r) => r.route_id);
    const stops = await this.repo.findStopsByRouteIds(routeIds);

    const stopsByRoute = new Map<string, typeof stops>();
    for (const stop of stops) {
      const list = stopsByRoute.get(stop.route_id) ?? [];
      list.push(stop);
      stopsByRoute.set(stop.route_id, list);
    }

    return routes.map((r) => ({
      routeId: r.route_id,
      lineCode: r.line_code,
      lineId: r.line_id,
      direction: r.direction,
      routeNameZh: r.route_name_zh,
      routeNameEn: r.route_name_en,
      stops: (stopsByRoute.get(r.route_id) ?? []).map((s) => ({
        stationCode: s.station_code,
        stationName: s.station_name,
        sequence: s.stop_sequence,
        cumulativeDistanceKm: parseFloat(s.cumulative_distance),
      })),
    }));
  }

  async getAllRoutes(): Promise<LineRoute[]> {
    const routes = await this.repo.findAllRoutes();
    return this.buildRoutes(routes);
  }

  async getRoutesByLineCode(lineCode: string): Promise<LineRoute[]> {
    const routes = await this.repo.findRoutesByLineCode(lineCode.toUpperCase());
    return this.buildRoutes(routes);
  }
}
