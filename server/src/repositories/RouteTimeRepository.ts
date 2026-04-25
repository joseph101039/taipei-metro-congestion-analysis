import { Knex } from 'knex';

export interface PrecomputedRouteTime {
  from_station_id: number;
  to_station_id: number;
  min_travel_time: number;
  transfer_ids: string;
}

export interface IRouteTimeRepository {
  findRouteTime(fromId: number, toId: number): Promise<PrecomputedRouteTime | null>;
  findAllTransferIds(): Promise<{ from_station_id: number; to_station_id: number; transfer_ids: string }[]>;
}

export class RouteTimeRepository implements IRouteTimeRepository {
  constructor(private readonly db: Knex) {}

  async findRouteTime(fromId: number, toId: number): Promise<PrecomputedRouteTime | null> {
    const row = await this.db('route_min_time')
      .select<PrecomputedRouteTime>('from_station_id', 'to_station_id', 'min_travel_time', 'transfer_ids')
      .where({ from_station_id: fromId, to_station_id: toId })
      .first();
    return row ?? null;
  }

  async findAllTransferIds(): Promise<{ from_station_id: number; to_station_id: number; transfer_ids: string }[]> {
    return this.db('route_min_time')
      .select<{ from_station_id: number; to_station_id: number; transfer_ids: string }[]>(
        'from_station_id',
        'to_station_id',
        'transfer_ids',
      )
      .whereNotNull('transfer_ids')
      .where('transfer_ids', '!=', '');
  }
}

