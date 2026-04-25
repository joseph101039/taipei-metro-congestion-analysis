import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { IVillagePopulationService } from '../services/VillagePopulationService';

const BOUNDARY_PATH = path.join(process.cwd(), 'public/data/twvillage-taipei.json');

interface RawFeature {
  type: string;
  geometry: unknown;
  properties: { county: string; town: string; village: string; shape_area: number };
}

let boundaryCache: { type: string; features: RawFeature[] } | null = null;

function loadBoundaries() {
  if (!boundaryCache) {
    boundaryCache = JSON.parse(fs.readFileSync(BOUNDARY_PATH, 'utf-8'));
  }
  return boundaryCache!;
}

export class VillagePopulationController {
  constructor(private readonly service: IVillagePopulationService) {
    this.getVillagePopulation = this.getVillagePopulation.bind(this);
    this.getVillageBoundaries = this.getVillageBoundaries.bind(this);
  }

  async getVillagePopulation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year_month, city } = req.query;

      if (year_month !== undefined) {
        const ym = parseInt(year_month as string, 10);
        if (isNaN(ym) || String(ym).length !== 6) {
          res.status(400).json({ error: "'year_month' must be a 6-digit integer (YYYYMM)" });
          return;
        }
        const result = await this.service.getByYearMonth(ym, city as string | undefined);
        res.json(result);
        return;
      }

      const result = await this.service.getLatest(city as string | undefined);
      if (!result) {
        res.status(404).json({ error: 'No population data found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  getVillageBoundaries(_req: Request, res: Response, next: NextFunction): void {
    try {
      if (!fs.existsSync(BOUNDARY_PATH)) {
        res.status(404).json({ error: 'Village boundary file not found' });
        return;
      }
      const { features } = loadBoundaries();
      const out = features.map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          county: f.properties.county,
          district: f.properties.town,
          village: f.properties.village,
          area_km2: Math.round((f.properties.shape_area / 1_000_000) * 10000) / 10000,
        },
      }));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.json({ type: 'FeatureCollection', features: out });
    } catch (err) {
      next(err);
    }
  }
}
