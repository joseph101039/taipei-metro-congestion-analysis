import { Knex } from 'knex';
import { RouteHeadway } from '../models/RouteHeadway';

export interface IRouteHeadwayRepository {
  findAll(serviceDay?: string): Promise<RouteHeadway[]>;
  findByRouteId(routeId: string, serviceDay?: string): Promise<RouteHeadway[]>;
}

export class RouteHeadwayRepository implements IRouteHeadwayRepository {
  constructor(private readonly db: Knex) {}

  findAll(serviceDay?: string): Promise<RouteHeadway[]> {
    const q = this.db('route_headways').select('*').orderBy(['line_code', 'route_id', 'start_time']);
    if (serviceDay) q.where('service_day', serviceDay);
    return q;
  }

  findByRouteId(routeId: string, serviceDay?: string): Promise<RouteHeadway[]> {
    const q = this.db('route_headways').select('*').where('route_id', routeId).orderBy('start_time');
    if (serviceDay) q.andWhere('service_day', serviceDay);
    return q;
  }
}

