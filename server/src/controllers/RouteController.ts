import { Request, Response, NextFunction } from 'express';
import { IRouteService } from '../services/RouteService';

export class RouteController {
  constructor(private readonly service: IRouteService) {
    this.getRoute = this.getRoute.bind(this);
  }

  async getRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fromId = parseInt(req.query.from_station_id as string, 10);
      const toId = parseInt(req.query.to_station_id as string, 10);

      if (!Number.isInteger(fromId) || fromId <= 0) {
        res.status(400).json({ error: "'from_station_id' must be a positive integer" });
        return;
      }
      if (!Number.isInteger(toId) || toId <= 0) {
        res.status(400).json({ error: "'to_station_id' must be a positive integer" });
        return;
      }

      const [fromStation, toStation] = await Promise.all([
        this.service.findStationById(fromId),
        this.service.findStationById(toId),
      ]);

      if (!fromStation) {
        res.status(404).json({ error: `Station not found: ${fromId}` });
        return;
      }
      if (!toStation) {
        res.status(404).json({ error: `Station not found: ${toId}` });
        return;
      }

      const route = await this.service.findRoute(fromId, toId);
      if (!route) {
        res.status(404).json({ error: 'No route found between the given stations' });
        return;
      }

      res.json(route);
    } catch (err) {
      next(err);
    }
  }
}
