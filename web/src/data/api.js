const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  const { data } = await res.json();
  return data;
}

export const fetchLines     = () => get('/lines');
export const fetchStations  = () => get('/stations');
export const fetchDistances = () => get('/station-distances');

export async function fetchRoute(fromStationId, toStationId) {
  const res = await fetch(`${BASE}/route?from_station_id=${fromStationId}&to_station_id=${toStationId}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export async function fetchRouteTime(fromStationId, toStationId) {
  const res = await fetch(`${BASE}/route-time?from_station_id=${fromStationId}&to_station_id=${toStationId}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export async function fetchRidership(date, hour) {
  const res = await fetch(`${BASE}/ridership?date=${date}&hour=${hour}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export async function fetchVillageDensity() {
  const [boundaryRes, popRes] = await Promise.all([
    fetch(`${BASE}/population/village-boundaries`),
    fetch(`${BASE}/population/village-density`),
  ]);
  if (!boundaryRes.ok) throw new Error(`boundary HTTP ${boundaryRes.status}`);
  if (!popRes.ok) throw new Error(`population HTTP ${popRes.status}`);

  const [boundary, popBody] = await Promise.all([boundaryRes.json(), popRes.json()]);

  const popMap = new Map();
  for (const row of popBody.data) {
    popMap.set(`${row.city}|${row.district}|${row.village}`, row);
  }

  const features = boundary.features.map((f) => {
    const { county, district, village, area_km2 } = f.properties;
    const pop = popMap.get(`${county}|${district}|${village}`);
    return {
      ...f,
      properties: {
        county,
        district,
        village,
        area_km2,
        population: pop?.population ?? 0,
        density_per_km2: pop && area_km2 > 0 ? Math.round(pop.population / area_km2) : 0,
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

export async function fetchSegmentTimes() {
  const res = await fetch(`${BASE}/segment-times`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /segment-times`);
  return res.json();
}

export async function fetchTransferOverheads() {
  const res = await fetch(`${BASE}/transfer-overheads`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /transfer-overheads`);
  return res.json();
}

export async function fetchAllLineRoutes() {
  const res = await fetch(`${BASE}/lines/routes`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /lines/routes`);
  return res.json();
}

export async function fetchRouteTimeTransfers() {
  const res = await fetch(`${BASE}/route-time/transfers`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.transfers;
}

export async function fetchLineCapacities() {
  const res = await fetch(`${BASE}/line-capacities`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /line-capacities`);
  return res.json();
}

export async function fetchRouteHeadways(serviceDay) {
  const params = serviceDay ? `?service_day=${encodeURIComponent(serviceDay)}` : '';
  const res = await fetch(`${BASE}/route-headways${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /route-headways`);
  return res.json();
}

export async function fetchStationLoadRange(startDate, startHour, endHour, endDate = startDate) {
  const q = new URLSearchParams({
    date: startDate,
    start_hour: String(startHour),
    end_hour: String(endHour),
    end_date: endDate,
  });
  const res = await fetch(`${BASE}/congestion/station-load-range?${q.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — /congestion/station-load-range`);
  return res.json();
}

