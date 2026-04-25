import { Knex } from 'knex';

export interface OdHourRow {
  origin_id: number;
  destination_id: number;
  passengers: number;
  hour: number;
}

export interface RouteMinTimeRow {
  from_station_id: number;
  to_station_id: number;
  min_travel_time: number;
  transfer_ids: string;
}

export interface SegmentTimeRow {
  line_code: string;
  from_station_code: string;
  to_station_code: string;
  travel_time_min: number;
}

export interface TransferOverheadRow {
  transfer_station_sid: number;
  station_codes: string;
  avg_transfer_time_min: number;
}

export interface StationRow {
  id: number;
  code: string;
  name: string;
  line_id: number | null;
  alias: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ICongestionRepository {
  findRidershipByDateHours(date: string, hours: number[]): Promise<OdHourRow[]>;
  findAllRouteMinTimes(): Promise<RouteMinTimeRow[]>;
  findAllSegmentTimes(): Promise<SegmentTimeRow[]>;
  findAllTransferOverheads(): Promise<TransferOverheadRow[]>;
  findAllStations(): Promise<StationRow[]>;
}

export class CongestionRepository implements ICongestionRepository {
  constructor(private readonly db: Knex) {}

  findRidershipByDateHours(date: string, hours: number[]): Promise<OdHourRow[]> {
    return this.db('ridership')
      .select('origin_id', 'destination_id', 'passengers', 'hour')
      .where('date', date)
      .whereIn('hour', hours);
  }

  findAllRouteMinTimes(): Promise<RouteMinTimeRow[]> {
    return this.db('route_min_time')
      .select('from_station_id', 'to_station_id', 'min_travel_time', 'transfer_ids');
  }

  findAllSegmentTimes(): Promise<SegmentTimeRow[]> {
    return this.db('station_segment_times')
      .select('line_code', 'from_station_code', 'to_station_code', 'travel_time_min');
  }

  findAllTransferOverheads(): Promise<TransferOverheadRow[]> {
    return this.db('transfer_overheads')
      .select('transfer_station_sid', 'station_codes', 'avg_transfer_time_min');
  }

  findAllStations(): Promise<StationRow[]> {
    return this.db('stations')
      .select('id', 'code', 'name', 'line_id', 'alias', 'lat', 'lng');
  }
}

