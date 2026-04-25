export interface RouteTimeStation {
  id: number;
  code: string;
  name: string;
}

export interface RouteTimeLine {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface RouteTimeSegment {
  line: RouteTimeLine;
  from: RouteTimeStation;
  to: RouteTimeStation;
  travel_time_min: number;
}

export interface RouteTimeResponse {
  from: RouteTimeStation;
  to: RouteTimeStation;
  total_travel_time_min: number;
  transfers: number;
  segments: RouteTimeSegment[];
}

