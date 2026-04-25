import { NextFunction, Request, Response } from 'express';
import { StationDistanceFilter } from '../models/StationDistance';
import { IStationDistanceService } from '../services/StationDistanceService';

export class StationDistanceController {
  constructor(private readonly service: IStationDistanceService) {}

  getDistances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter: StationDistanceFilter = {
        from_code: req.query.from_code as string | undefined,
        from_name: req.query.from_name as string | undefined,
        to_code: req.query.to_code as string | undefined,
        to_name: req.query.to_name as string | undefined,
      };
      const data = await this.service.getDistances(filter);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}
