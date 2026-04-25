export interface RouteStation {
  id: number;
  code: string;
  name: string;
}

export interface RouteLine {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface RouteSegment {
  line: RouteLine;
  from: RouteStation;
  to: RouteStation;
  distance_km: number;
}

export interface RouteResponse {
  from: RouteStation;
  to: RouteStation;
  total_distance_km: number;
  transfers: number;
  segments: RouteSegment[];
}
