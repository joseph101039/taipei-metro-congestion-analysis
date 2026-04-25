import { Request, Response, NextFunction } from 'express';
import { IRouteHeadwayService } from '../services/RouteHeadwayService';

export class RouteHeadwayController {
  constructor(private readonly service: IRouteHeadwayService) {
    this.getAll = this.getAll.bind(this);
    this.getByRouteId = this.getByRouteId.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceDay = req.query.service_day as string | undefined;
      const data = await this.service.getAll(serviceDay);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getByRouteId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { routeId } = req.params;
      const serviceDay = req.query.service_day as string | undefined;
      const data = await this.service.getByRouteId(routeId, serviceDay);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

