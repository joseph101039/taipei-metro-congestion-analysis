import { Knex } from 'knex';
import { VillagePopulationRecord } from '../models/VillagePopulation';

export interface IVillagePopulationRepository {
  findByYearMonth(yearMonth: number, city?: string): Promise<VillagePopulationRecord[]>;
  findLatest(city?: string): Promise<VillagePopulationRecord[]>;
}

export class VillagePopulationRepository implements IVillagePopulationRepository {
  constructor(private readonly db: Knex) {}

  async findByYearMonth(yearMonth: number, city?: string): Promise<VillagePopulationRecord[]> {
    const query = this.db('village_population')
      .select<VillagePopulationRecord[]>('year_month', 'city', 'district', 'village', 'households', 'population', 'male', 'female')
      .where({ year_month: yearMonth })
      .orderBy(['city', 'district', 'village']);

    if (city) query.andWhere({ city });

    return query;
  }

  async findLatest(city?: string): Promise<VillagePopulationRecord[]> {
    const sub = this.db('village_population')
      .select('city', 'district', 'village')
      .max('year_month as max_ym')
      .groupBy('city', 'district', 'village')
      .as('latest');

    const query = this.db('village_population as v')
      .select<VillagePopulationRecord[]>(
        'v.year_month', 'v.city', 'v.district', 'v.village',
        'v.households', 'v.population', 'v.male', 'v.female',
      )
      .join(sub, function () {
        this.on('v.city', 'latest.city')
          .andOn('v.district', 'latest.district')
          .andOn('v.village', 'latest.village')
          .andOn('v.year_month', 'latest.max_ym');
      })
      .orderBy(['v.city', 'v.district', 'v.village']);

    if (city) query.andWhere('v.city', city);

    return query;
  }
}
