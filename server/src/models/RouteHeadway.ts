export interface RouteHeadway {
  id: number;
  line_code: string;
  route_id: string;
  service_day: string;
  peak_flag: number;
  start_time: string;
  end_time: string;
  min_headway_min: number;
  max_headway_min: number;
}

