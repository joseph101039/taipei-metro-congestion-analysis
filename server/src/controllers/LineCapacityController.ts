import { Request, Response, NextFunction } from 'express';
import { ILineCapacityService } from '../services/LineCapacityService';

export class LineCapacityController {
  constructor(private readonly service: ILineCapacityService) {
    this.getAll = this.getAll.bind(this);
  }

  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.getAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

