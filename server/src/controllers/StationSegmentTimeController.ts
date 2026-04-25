import { Request, Response, NextFunction } from 'express';
import { IStationSegmentTimeService } from '../services/StationSegmentTimeService';

export class StationSegmentTimeController {
  constructor(private readonly service: IStationSegmentTimeService) {
    this.getAll = this.getAll.bind(this);
    this.getBySegment = this.getBySegment.bind(this);
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const lineCode = req.query.line as string | undefined;
      const data = await this.service.getAll(lineCode);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getBySegment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to } = req.params;
      const data = await this.service.getBySegment(from.toUpperCase(), to.toUpperCase());
      if (!data) {
        res.status(404).json({ error: `Segment ${from}–${to} not found` });
        return;
      }
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

