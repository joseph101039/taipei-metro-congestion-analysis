import fs from 'fs';
import path from 'path';
import readline from 'readline';
import db from '../src/config/database';

const BATCH_SIZE = 1000;

interface RidershipRecord {
  date: string;
  hour: number;
  origin_id: number;
  destination_id: number;
  passengers: number;
}

async function loadStationMap(): Promise<Map<string, number>> {
  const rows = await db('stations').select<{ id: number; name: string; alias: string | null }[]>('id', 'name', 'alias');
  const map = new Map<string, number>();
  // alias is lower priority — insert first so name wins on collision
  for (const r of rows) {
    if (r.alias) map.set(r.alias, r.id);
  }
  for (const r of rows) {
    map.set(r.name, r.id);
  }
  return map;
}

function resolveStation(map: Map<string, number>, raw: string): number | undefined {
  const name = raw.endsWith('站') ? raw.slice(0, -1) : raw;
  return map.get(name) ?? map.get(raw);
}

async function insertBatch(batch: RidershipRecord[], retries = 5): Promise<void> {
  const placeholders = batch.map(() => '(?,?,?,?,?)').join(',');
  const bindings = batch.flatMap((r) => [r.date, r.hour, r.origin_id, r.destination_id, r.passengers]);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.raw(
        `INSERT IGNORE INTO ridership (date, hour, origin_id, destination_id, passengers) VALUES ${placeholders}`,
        bindings,
      );
      return;
    } catch (err: any) {
      if (err.code === 'ER_LOCK_DEADLOCK' && attempt < retries) {
        const delay = 200 * attempt;
        console.warn(`Deadlock on attempt ${attempt}, retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

async function importCsv(csvPath: string): Promise<void> {
  const stationMap = await loadStationMap();
  console.log(`Loaded ${stationMap.size} stations`);

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  const records: RidershipRecord[] = [];
  let lineNum = 0;
  let skippedZero = 0;
  let skippedUnknown = 0;

  await new Promise<void>((resolve, reject) => {
    rl.on('line', (line) => {
      lineNum++;
      if (lineNum === 1) return; // header

      const parts = line.split(',');
      if (parts.length < 5) return;

      const [date, hourStr, originName, destName, passStr] = parts;
      const passengers = parseInt(passStr.trim(), 10);

      if (passengers === 0) {
        skippedZero++;
        return;
      }

      const origin_id = resolveStation(stationMap, originName.trim());
      const destination_id = resolveStation(stationMap, destName.trim());

      if (origin_id === undefined || destination_id === undefined) {
        if (origin_id === undefined) console.warn(`Unknown origin station: "${originName.trim()}" (line ${lineNum})`);
        if (destination_id === undefined) console.warn(`Unknown destination station: "${destName.trim()}" (line ${lineNum})`);
        skippedUnknown++;
        return;
      }

      records.push({ date: date.trim(), hour: parseInt(hourStr.trim(), 10), origin_id, destination_id, passengers });
    });

    rl.on('close', resolve);
    rl.on('error', reject);
  });

  // Insert sequentially to avoid deadlocks
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted} / ${records.length} rows...`);
  }

  console.log(`\nDone. Inserted: ${inserted}, skipped (zero): ${skippedZero}, skipped (unknown station): ${skippedUnknown}`);
}

const csvPath = process.argv[2] ?? path.resolve(__dirname, '../doc/station_hourly_ridership/data/202603.csv');

importCsv(csvPath)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());
