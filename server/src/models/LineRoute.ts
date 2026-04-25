export interface LineRoute {
  routeId: string;
  lineCode: string;
  lineId: number | null;
  direction: number;
  routeNameZh: string | null;
  routeNameEn: string | null;
  stops: LineRouteStop[];
}

export interface LineRouteStop {
  stationCode: string;
  stationName: string | null;
  sequence: number;
  cumulativeDistanceKm: number;
}
