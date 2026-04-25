import fs from 'fs';
import path from 'path';
import readline from 'readline';
import db from '../src/config/database';

const BATCH_SIZE = 500;
const CSV_PATH = path.resolve(__dirname, '../doc/route_min_time_v2.csv');

interface RouteMinTimeRecord {
  from_station_id: number;
  to_station_id: number;
  min_travel_time: number;
  transfer_ids: string;
}

async function loadStationMap(): Promise<Map<string, number>> {
  const rows = await db('stations').select<{ id: number; code: string }[]>('id', 'code');
  return new Map(rows.map((r) => [r.code, r.id]));
}

/**
 * Parse a CSV row that may contain a quoted, comma-separated transfer field.
 * Format: from,to,time,"T1,T2,T3"   or   from,to,time,""   or   from,to,time,
 */
function parseLine(line: string): { from: string; to: string; time: number; transfers: string } | null {
  // Split on first 3 commas to get from, to, time — rest is the transfer field
  const match = line.match(/^([^,]+),([^,]+),([^,]+),(.*)$/);
  if (!match) return null;
  const [, from, to, timeStr, rest] = match;
  const time = parseInt(timeStr.trim(), 10);
  if (isNaN(time)) return null;
  // Strip surrounding quotes from the transfer field
  const transfers = rest.replace(/^"|"$/g, '').trim();
  return { from: from.trim(), to: to.trim(), time, transfers };
}

async function insertBatch(batch: RouteMinTimeRecord[], retries = 5): Promise<void> {
  const placeholders = batch.map(() => '(?,?,?,?)').join(',');
  const bindings = batch.flatMap((r) => [r.from_station_id, r.to_station_id, r.min_travel_time, r.transfer_ids]);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.raw(
        `INSERT IGNORE INTO route_min_time (from_station_id, to_station_id, min_travel_time, transfer_ids) VALUES ${placeholders}`,
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

async function main(): Promise<void> {
  const stationMap = await loadStationMap();
  console.log(`Loaded ${stationMap.size} stations`);

  // Read all lines first
  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  const records: RouteMinTimeRecord[] = [];
  let lineNum = 0;
  let skippedUnknown = 0;

  await new Promise<void>((resolve, reject) => {
    rl.on('line', (line) => {
      lineNum++;
      if (lineNum === 1) return; // header

      const parsed = parseLine(line);
      if (!parsed) return;

      const fromId = stationMap.get(parsed.from);
      const toId   = stationMap.get(parsed.to);

      if (fromId === undefined || toId === undefined) {
        if (fromId === undefined) console.warn(`Unknown from station: "${parsed.from}" (line ${lineNum})`);
        if (toId   === undefined) console.warn(`Unknown to station: "${parsed.to}" (line ${lineNum})`);
        skippedUnknown++;
        return;
      }

      // Resolve transfer codes → station IDs
      const transferIds = parsed.transfers
        ? parsed.transfers.split(',').map((code) => stationMap.get(code.trim())).filter((id): id is number => id !== undefined)
        : [];
      const transferIdsStr = transferIds.join(',');

      // Forward direction (as given in CSV)
      records.push({
        from_station_id: fromId,
        to_station_id: toId,
        min_travel_time: parsed.time,
        transfer_ids: transferIdsStr,
      });

      // Reverse direction — same time, transfer IDs in reverse order
      records.push({
        from_station_id: toId,
        to_station_id: fromId,
        min_travel_time: parsed.time,
        transfer_ids: [...transferIds].reverse().join(','),
      });
    });

    rl.on('close', resolve);
    rl.on('error', reject);
  });

  console.log(`Parsed ${records.length} records (${records.length / 2} pairs), skipped unknown: ${skippedUnknown}`);

  // Deduplicate — keep last occurrence per (from, to) pair
  const deduped = new Map<string, RouteMinTimeRecord>();
  for (const r of records) {
    deduped.set(`${r.from_station_id}|${r.to_station_id}`, r);
  }
  const finalRecords = [...deduped.values()];
  console.log(`After dedup: ${finalRecords.length} records`);

  // Insert sequentially in batches
  let inserted = 0;
  for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
    const batch = finalRecords.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted} / ${finalRecords.length} rows...`);
  }

  console.log(`\nDone. Inserted ${inserted} route_min_time records.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.destroy());

