import { Request, Response, NextFunction } from 'express';
import { IRouteTimeService } from '../services/RouteTimeService';

export class RouteTimeController {
  constructor(private readonly service: IRouteTimeService) {
    this.getRouteTime = this.getRouteTime.bind(this);
    this.getTransferStations = this.getTransferStations.bind(this);
  }

  async getRouteTime(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const result = await this.service.findRouteTime(fromId, toId);
      if (!result) {
        res.status(404).json({ error: 'No route found between the given stations' });
        return;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTransferStations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transfers = await this.service.findAllTransferIds();
      res.json({ transfers });
    } catch (err) {
      next(err);
    }
  }
}

