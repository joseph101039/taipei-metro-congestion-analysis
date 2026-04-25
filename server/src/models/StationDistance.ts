export interface StationSummary {
  id: number;
  code: string;
  name: string;
  alias: string | null;
}

export interface StationDistance {
  id: number;
  from_station_id: number;
  to_station_id: number;
  distance_km: number;
}

export interface NewStationDistance {
  from_station_id: number;
  to_station_id: number;
  distance_km: number;
}

export interface StationDistanceWithStations {
  id: number;
  from_station: StationSummary;
  to_station: StationSummary;
  distance_km: number;
}

export interface StationDistanceFilter {
  from_code?: string;
  from_name?: string;
  to_code?: string;
  to_name?: string;
}
