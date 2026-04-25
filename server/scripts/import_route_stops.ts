import fs from 'fs';
import path from 'path';
import db from '../src/config/database';

const JSON_PATH = path.resolve(__dirname, '../doc/line_capacity/tdx_台北捷運營運路線.json');
const BATCH_SIZE = 200;

interface TdxStation {
  Sequence: number;
  StationID: string;
  StationName: { Zh_tw: string; En: string };
  CumulativeDistance: number;
}

interface TdxRoute {
  LineNo: string;
  RouteID: string;
  RouteName: { Zh_tw: string; En: string };
  Direction: number;
  Stations: TdxStation[];
}

// TDX LineNo (e.g. "R") → lines.code (e.g. "red")
const TDX_CODE_TO_LINE_CODE: Record<string, string> = {
  R: 'red',
  BL: 'blue',
  G: 'green',
  O: 'orange',
  BR: 'brown',
  Y: 'yellow',
};

async function loadLineIdMap(): Promise<Map<string, number>> {
  const rows = await db('lines').select<{ id: number; code: string }[]>('id', 'code');
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.code, r.id);
  return map;
}

async function importRoutes(records: TdxRoute[], lineIdMap: Map<string, number>): Promise<void> {
  for (const r of records) {
    let lineCode = TDX_CODE_TO_LINE_CODE[r.LineNo];

    // 特例
   if (r.RouteName.Zh_tw.includes('新北投')) {
     lineCode = 'red_xinbeitou';
   } else if (r.RouteName.Zh_tw.includes('小碧潭')) {
     lineCode = 'green_xiaobitan';
   }

    const lineId = lineCode ? (lineIdMap.get(lineCode) ?? null) : null;
    await db.raw(
      `INSERT INTO line_routes (route_id, line_code, line_id, direction, route_name_zh, route_name_en)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE line_id = VALUES(line_id), route_name_zh = VALUES(route_name_zh), route_name_en = VALUES(route_name_en)`,
      [r.RouteID, r.LineNo, lineId, r.Direction, r.RouteName.Zh_tw ?? null, r.RouteName.En ?? null],
    );
  }
}

async function importStops(records: TdxRoute[]): Promise<void> {
  const rows: { route_id: string; station_code: string; stop_sequence: number; cumulative_distance: number }[] = [];

  for (const r of records) {
    for (const s of r.Stations) {
      rows.push({
        route_id: r.RouteID,
        station_code: s.StationID,
        stop_sequence: s.Sequence,
        cumulative_distance: s.CumulativeDistance,
      });
    }
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '(?,?,?,?)').join(',');
    const bindings = batch.flatMap((r) => [r.route_id, r.station_code, r.stop_sequence, r.cumulative_distance]);
    await db.raw(
      `INSERT INTO line_route_stops (route_id, station_code, stop_sequence, cumulative_distance)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE stop_sequence = VALUES(stop_sequence), cumulative_distance = VALUES(cumulative_distance)`,
      bindings,
    );
    console.log(`  inserted stops ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)}`);
  }
}

async function main() {
  const raw = fs.readFileSync(JSON_PATH, 'utf-8');
  const records: TdxRoute[] = JSON.parse(raw);
  console.log(`Loaded ${records.length} route records`);

  const lineIdMap = await loadLineIdMap();
  await importRoutes(records, lineIdMap);
  console.log(`Upserted ${records.length} routes`);

  await importStops(records);
  console.log('Done');

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
