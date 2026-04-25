import { Request, Response, NextFunction } from 'express';
import { register } from '../metrics';

export class MetricsController {
  constructor() {
    this.getMetrics = this.getMetrics.bind(this);
  }

  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await register.metrics();
      res.set('Content-Type', register.contentType);
      res.end(metrics);
    } catch (err) {
      next(err);
    }
  }
}
