import { Request, Response, NextFunction } from 'express';
import { CongestionService } from '../services/CongestionService';

export class CongestionController {
  constructor(private readonly service: CongestionService) {
    this.getStationLoad = this.getStationLoad.bind(this);
    this.getStationLoadRange = this.getStationLoadRange.bind(this);
  }

  async getStationLoad(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, hour, minute, stations } = req.query;

      if (!date || hour === undefined) {
        res.status(400).json({ error: "'date' (YYYY-MM-DD) and 'hour' (0-23) are required" });
        return;
      }

      const h = Number(hour);
      if (!Number.isInteger(h) || h < 0 || h > 23) {
        res.status(400).json({ error: "'hour' must be 0-23" });
        return;
      }

      const m = minute !== undefined ? Number(minute) : undefined;
      if (m !== undefined && (!Number.isInteger(m) || m < 0 || m > 59)) {
        res.status(400).json({ error: "'minute' must be 0-59" });
        return;
      }

      const results = await this.service.computeStationLoad(date as string, h, m);

      // Optional station filter
      if (stations) {
        const filterIds = new Set((stations as string).split(',').map(Number));
        for (const r of results) {
          r.stations = r.stations.filter(s => filterIds.has(s.station_id));
        }
      }

      // If single minute, return single object; otherwise array
      if (m !== undefined) {
        res.json(results[0]);
      } else {
        res.json(results);
      }
    } catch (err) {
      next(err);
    }
  }

  async getStationLoadRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, end_date, start_hour, end_hour, stations } = req.query;

      if (!date || start_hour === undefined || end_hour === undefined) {
        res.status(400).json({ error: "'date', 'start_hour', and 'end_hour' are required" });
        return;
      }

      const sh = Number(start_hour);
      const eh = Number(end_hour);
      if (!Number.isInteger(sh) || sh < 0 || sh > 23 || !Number.isInteger(eh) || eh < 0 || eh > 23) {
        res.status(400).json({ error: "'start_hour' and 'end_hour' must be 0-23" });
        return;
      }
      if (sh > eh) {
        res.status(400).json({ error: "'start_hour' must be <= 'end_hour'" });
        return;
      }

      const startDate = date as string;
      const endDate = end_date ? (end_date as string) : startDate;

      if (endDate < startDate) {
        res.status(400).json({ error: "'end_date' must be >= 'date'" });
        return;
      }

      const MAX_DAYS = 7;
      const msPerDay = 24 * 60 * 60 * 1000;
      const dayDiff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / msPerDay);
      if (dayDiff > MAX_DAYS) {
        res.status(400).json({ error: `date range must not exceed ${MAX_DAYS} days` });
        return;
      }

      const filterCodes = stations
        ? new Set((stations as string).split(','))
        : undefined;

      const result = await this.service.computeStationLoadRange(startDate, sh, eh, filterCodes, endDate);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
