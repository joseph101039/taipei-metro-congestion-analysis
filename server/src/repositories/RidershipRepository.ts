import { Knex } from 'knex';

export interface OdRow {
  origin_id: number;
  destination_id: number;
  passengers: number;
}

export interface IRidershipRepository {
  findByDateHour(date: string, hour: number): Promise<OdRow[]>;
  findFlows(date: string, hour: number, originId?: number, destinationId?: number): Promise<OdRow[]>;
}

export class RidershipRepository implements IRidershipRepository {
  constructor(private readonly db: Knex) {}

  findByDateHour(date: string, hour: number): Promise<OdRow[]> {
    return this.db('ridership')
      .select<OdRow[]>('origin_id', 'destination_id', 'passengers')
      .where({ date, hour });
  }

  findFlows(date: string, hour: number, originId?: number, destinationId?: number): Promise<OdRow[]> {
    const q = this.db('ridership')
      .select<OdRow[]>('origin_id', 'destination_id', 'passengers')
      .where({ date, hour });
    if (originId !== undefined) q.andWhere('origin_id', originId);
    if (destinationId !== undefined) q.andWhere('destination_id', destinationId);
    return q;
  }
}
