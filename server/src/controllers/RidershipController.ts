import { Request, Response, NextFunction } from 'express';
import { IRidershipService } from '../services/RidershipService';

export class RidershipController {
  constructor(private readonly service: IRidershipService) {
    this.getSnapshot = this.getSnapshot.bind(this);
    this.getFlows = this.getFlows.bind(this);
  }

  async getSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, hour: hourStr } = req.query;

      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        res.status(400).json({ error: "'date' must be a valid date (YYYY-MM-DD)" });
        return;
      }

      const hour = Number(hourStr);
      if (hourStr === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23) {
        res.status(400).json({ error: "'hour' must be an integer between 0 and 23" });
        return;
      }

      const data = await this.service.getSnapshot(date, hour);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getFlows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, hour: hourStr, from_station_id, to_station_id } = req.query;

      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        res.status(400).json({ error: "'date' must be a valid date (YYYY-MM-DD)" });
        return;
      }

      const hour = Number(hourStr);
      if (hourStr === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23) {
        res.status(400).json({ error: "'hour' must be an integer between 0 and 23" });
        return;
      }

      let originId: number | undefined;
      if (from_station_id !== undefined) {
        originId = Number(from_station_id);
        if (!Number.isInteger(originId) || originId <= 0) {
          res.status(400).json({ error: "'from_station_id' must be a positive integer" });
          return;
        }
      }

      let destinationId: number | undefined;
      if (to_station_id !== undefined) {
        destinationId = Number(to_station_id);
        if (!Number.isInteger(destinationId) || destinationId <= 0) {
          res.status(400).json({ error: "'to_station_id' must be a positive integer" });
          return;
        }
      }

      const data = await this.service.getFlows(date, hour, originId, destinationId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}


