import { Knex } from 'knex';
import { StationSegmentTime } from '../models/StationSegmentTime';

export interface IStationSegmentTimeRepository {
  findAll(lineCode?: string): Promise<StationSegmentTime[]>;
  findBySegment(from: string, to: string): Promise<StationSegmentTime | undefined>;
}

export class StationSegmentTimeRepository implements IStationSegmentTimeRepository {
  constructor(private readonly db: Knex) {}

  findAll(lineCode?: string): Promise<StationSegmentTime[]> {
    const q = this.db('station_segment_times').select('*').orderBy(['line_code', 'from_station_code']);
    if (lineCode) q.where('line_code', lineCode.toUpperCase());
    return q;
  }

  async findBySegment(from: string, to: string): Promise<StationSegmentTime | undefined> {
    const row = await this.db('station_segment_times')
      .select('*')
      .where(function () {
        this.where({ from_station_code: from, to_station_code: to })
          .orWhere({ from_station_code: to, to_station_code: from });
      })
      .first();
    return row;
  }
}

