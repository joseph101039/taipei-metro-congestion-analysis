import { Request, Response, NextFunction } from 'express';
import { IStationService } from '../services/StationService';

export class StationController {
  constructor(private readonly service: IStationService) {
    this.getStations = this.getStations.bind(this);
    this.getStationByCode = this.getStationByCode.bind(this);
  }

  async getStations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.getAll();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getStationByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await this.service.getByCode(req.params.code);
      if (!station) {
        res.status(404).json({ error: 'Station not found' });
        return;
      }
      res.json({ data: station });
    } catch (err) {
      next(err);
    }
  }
}
