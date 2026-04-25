import { Knex } from 'knex';
import { Station } from '../models/Station';

export interface StationWithLine extends Station {
  // line detail intentionally omitted; use line_id to look up /lines/:code
}

export interface IStationRepository {
  findAll(): Promise<Station[]>;
  findByCode(code: string): Promise<Station | null>;
}

export class StationRepository implements IStationRepository {
  constructor(private readonly db: Knex) {}

  private baseQuery() {
    return this.db('stations as s')
      .select('s.id', 's.code', 's.name', 's.alias', 's.line_id', 's.lat', 's.lng');
  }

  async findAll(): Promise<Station[]> {
    return this.baseQuery().orderBy('s.id');
  }

  async findByCode(code: string): Promise<Station | null> {
    const row = await this.baseQuery().where('s.code', code).first();
    return row ?? null;
  }
}
