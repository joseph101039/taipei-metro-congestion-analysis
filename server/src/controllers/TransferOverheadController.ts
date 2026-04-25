import { Request, Response, NextFunction } from 'express';
import { ITransferOverheadService } from '../services/TransferOverheadService';

export class TransferOverheadController {
  constructor(private readonly service: ITransferOverheadService) {
    this.getAll = this.getAll.bind(this);
    this.getBySid = this.getBySid.bind(this);
  }

  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.getAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getBySid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sid = Number(req.params.sid);
      if (!Number.isInteger(sid) || sid <= 0) {
        res.status(400).json({ error: "'sid' must be a positive integer" });
        return;
      }
      const data = await this.service.getBySid(sid);
      if (!data) {
        res.status(404).json({ error: `Transfer station SID ${sid} not found` });
        return;
      }
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

