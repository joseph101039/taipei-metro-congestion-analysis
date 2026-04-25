import { IRouteHeadwayRepository } from '../repositories/RouteHeadwayRepository';
import { RouteHeadway } from '../models/RouteHeadway';

export interface IRouteHeadwayService {
  getAll(serviceDay?: string): Promise<RouteHeadway[]>;
  getByRouteId(routeId: string, serviceDay?: string): Promise<RouteHeadway[]>;
}

export class RouteHeadwayService implements IRouteHeadwayService {
  constructor(private readonly repo: IRouteHeadwayRepository) {}

  getAll(serviceDay?: string): Promise<RouteHeadway[]> {
    return this.repo.findAll(serviceDay);
  }

  getByRouteId(routeId: string, serviceDay?: string): Promise<RouteHeadway[]> {
    return this.repo.findByRouteId(routeId, serviceDay);
  }
}

