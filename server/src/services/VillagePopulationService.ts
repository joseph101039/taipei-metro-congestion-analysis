import { IVillagePopulationRepository } from '../repositories/VillagePopulationRepository';
import { VillagePopulationResponse } from '../models/VillagePopulation';

export interface IVillagePopulationService {
  getByYearMonth(yearMonth: number, city?: string): Promise<VillagePopulationResponse>;
  getLatest(city?: string): Promise<VillagePopulationResponse | null>;
}

export class VillagePopulationService implements IVillagePopulationService {
  constructor(private readonly repo: IVillagePopulationRepository) {}

  async getByYearMonth(yearMonth: number, city?: string): Promise<VillagePopulationResponse> {
    const data = await this.repo.findByYearMonth(yearMonth, city);
    return { data };
  }

  async getLatest(city?: string): Promise<VillagePopulationResponse | null> {
    const data = await this.repo.findLatest(city);
    if (!data.length) return null;
    return { data };
  }
}
