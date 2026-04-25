import { Request, Response, NextFunction } from 'express';
import { ILineRouteService } from '../services/LineRouteService';

export class LineRouteController {
  constructor(private readonly service: ILineRouteService) {
    this.getAllRoutes = this.getAllRoutes.bind(this);
    this.getRoutesByLineCode = this.getRoutesByLineCode.bind(this);
  }

  async getAllRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routes = await this.service.getAllRoutes();
      res.json(routes);
    } catch (err) {
      next(err);
    }
  }

  async getRoutesByLineCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const routes = await this.service.getRoutesByLineCode(code);
      if (routes.length === 0) {
        res.status(404).json({ error: `No routes found for line: ${code}` });
        return;
      }
      res.json(routes);
    } catch (err) {
      next(err);
    }
  }
}
