import { Request, Response, NextFunction } from 'express';
import { ILineService } from '../services/LineService';

export class LineController {
  constructor(private readonly service: ILineService) {
    this.getLines = this.getLines.bind(this);
    this.getLineByCode = this.getLineByCode.bind(this);
  }

  async getLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.getAll();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getLineByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const line = await this.service.getByCode(req.params.code);
      if (!line) {
        res.status(404).json({ error: 'Line not found' });
        return;
      }
      res.json({ data: line });
    } catch (err) {
      next(err);
    }
  }
}
