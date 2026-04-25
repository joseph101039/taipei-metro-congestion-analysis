import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const BASE_URL = 'https://web.metro.taipei/apis/metrostationapi/';
const keepAlive = new https.Agent({ keepAlive: true, maxSockets: 20 });

// Chinese line name → line field code
const LINE_CN_TO_FIELD: Record<string, string> = {
  '文湖線': 'BR',
  '淡水信義線': 'R',
  '松山新店線': 'G',
  '中和新蘆線': 'O',
  '板南線': 'BL',
  '環狀線': 'Y',
};

interface StationInfo {
  code: string;       // e.g. "BR09"
  name: string;       // e.g. "大安"
  lineField: string;  // e.g. "BR"
  sid: string;        // e.g. "011"
}

function post(endpoint: string, params: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const url = new URL(endpoint, BASE_URL);
    const req = https.request(
      {
        agent: keepAlive,
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Mozilla/5.0 (compatible; MetroCrawler/2.0)',
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (c: Buffer) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`JSON parse error for ${endpoint}: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${endpoint}`)); });
    req.write(body);
    req.end();
  });
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === attempts - 1) throw e;
      process.stdout.write(`  retry ${i + 1} for ${label}\n`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// Parse transfer boarding station codes from a Path string.
// Handles:
//   "大安站轉乘淡水信義線（...）"         → R05
//   "台北車站轉乘淡水信義線（...）"        → R10  (station name includes 站)
//   "板南線板橋站轉乘板南線（...）"        → BL07 (line-prefix disambiguation)
//   "新埔站 => 站外轉乘 => 新埔民生站轉乘環狀線（...）" → Y17
function parseTransferCodes(
  pathStr: string,
  stationsByName: Map<string, StationInfo[]>,
): string[] {
  if (!pathStr) return [];
  const codes: string[] = [];
  const re = /([^（）\s=>，,]+)站轉乘([^（]+)（/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathStr)) !== null) {
    let stationName = m[1].trim();
    const lineCn = m[2].trim();
    const lineField = LINE_CN_TO_FIELD[lineCn];
    if (!lineField) {
      process.stdout.write(`  unknown line name: ${lineCn}\n`);
      continue;
    }
    // Strip line prefix when station name is disambiguated (e.g. "板南線板橋" → "板橋")
    for (const lineChinese of Object.keys(LINE_CN_TO_FIELD)) {
      if (stationName.startsWith(lineChinese)) {
        stationName = stationName.slice(lineChinese.length);
        break;
      }
    }
    // Some station names contain 站 (e.g. "台北車站"). The regex consumes the final 站 as
    // part of the "站轉乘" separator, leaving "台北車". Try appending 站 if lookup fails.
    let candidates = stationsByName.get(stationName);
    if (!candidates || candidates.length === 0) {
      candidates = stationsByName.get(stationName + '站');
    }
    const match = candidates?.find(s => s.lineField === lineField);
    if (match) {
      codes.push(match.code);
    } else {
      process.stdout.write(`  cannot map transfer: ${stationName} on ${lineField}\n`);
    }
  }
  return codes;
}

async function main() {
  const outputPath = path.resolve(__dirname, '../doc/route_min_time_v2.csv');
  const overheadPath = path.resolve(__dirname, '../doc/transfer_overhead.csv');

  // ── Phase 1: build SID ↔ station mappings ───────────────────────────────────
  console.log('Fetching station list...');
  const menuData = await post('menuline', { Lang: 'tw' }) as Array<{
    LineField: string;
    LineStations: Array<{ StationLabel: string; StationName: string; SID: string }>;
  }>;

  const sidToStations = new Map<string, StationInfo[]>();
  const codeToStation = new Map<string, StationInfo>();
  const stationsByName = new Map<string, StationInfo[]>();

  for (const line of menuData) {
    for (const s of line.LineStations) {
      const info: StationInfo = {
        code: s.StationLabel,
        name: s.StationName,
        lineField: line.LineField,
        sid: s.SID,
      };
      codeToStation.set(s.StationLabel, info);
      if (!sidToStations.has(s.SID)) sidToStations.set(s.SID, []);
      sidToStations.get(s.SID)!.push(info);
      if (!stationsByName.has(s.StationName)) stationsByName.set(s.StationName, []);
      stationsByName.get(s.StationName)!.push(info);
    }
  }

  const uniqueSIDs = [...sidToStations.keys()];
  console.log(`Unique SIDs: ${uniqueSIDs.length}, station codes: ${codeToStation.size}`);

  // ── Phase 2: fetch all travel times ─────────────────────────────────────────
  // Load already-done SIDs (for resuming)
  const doneTimeSIDs = new Set<string>();
  // timeMatrix[fromSID][toSID] = minutes
  const timeMatrix = new Map<string, Map<string, number>>();

  const timeCachePath = path.resolve(__dirname, '../doc/.time_cache_v2.json');
  if (fs.existsSync(timeCachePath)) {
    const cached = JSON.parse(fs.readFileSync(timeCachePath, 'utf8')) as Record<string, Record<string, number>>;
    for (const [sid, row] of Object.entries(cached)) {
      timeMatrix.set(sid, new Map(Object.entries(row)));
      doneTimeSIDs.add(sid);
    }
    console.log(`Loaded time cache: ${doneTimeSIDs.size} SIDs`);
  }

  const sidsTodo = uniqueSIDs.filter(s => !doneTimeSIDs.has(s));
  if (sidsTodo.length > 0) {
    console.log(`Fetching times for ${sidsTodo.length} SIDs...`);
    let done = 0;
    const tasks = sidsTodo.map(sid => async () => {
      const results = await withRetry(
        () => post('ticketroutetimesinglestationinfo', { StartSID: sid, Lang: 'tw' }),
        `times SID=${sid}`,
      ) as Array<{ EndSID: string; TravelTime: string }>;
      const row = new Map<string, number>();
      row.set(sid, 0);
      for (const r of results) row.set(r.EndSID, parseInt(r.TravelTime));
      timeMatrix.set(sid, row);
      done++;
      if (done % 10 === 0) process.stdout.write(`  ${done}/${sidsTodo.length} SIDs fetched\n`);
    });
    await pLimit(tasks, 8);

    // Save cache
    const cacheObj: Record<string, Record<string, number>> = {};
    for (const [sid, row] of timeMatrix) {
      cacheObj[sid] = Object.fromEntries(row);
    }
    fs.writeFileSync(timeCachePath, JSON.stringify(cacheObj));
    console.log('Time cache saved.');
  }

  // ── Phase 3: fetch route paths for all unique (fromSID, toSID) pairs ────────
  // rawPathCache[fromSID-toSID] = raw Path string from API
  const rawPathCache = new Map<string, string>();
  const pathCachePath = path.resolve(__dirname, '../doc/.path_cache_v2.json');

  if (fs.existsSync(pathCachePath)) {
    const cached = JSON.parse(fs.readFileSync(pathCachePath, 'utf8')) as Record<string, string>;
    for (const [key, val] of Object.entries(cached)) rawPathCache.set(key, val);
    console.log(`Loaded path cache: ${rawPathCache.size} pairs`);
  }

  // Build list of pairs that need path fetching (cross-SID pairs, SID_A < SID_B numerically)
  const allSIDsSorted = uniqueSIDs.slice().sort((a, b) => parseInt(a) - parseInt(b));
  const pathPairs: [string, string][] = [];
  for (let i = 0; i < allSIDsSorted.length; i++) {
    for (let j = i + 1; j < allSIDsSorted.length; j++) {
      const key = `${allSIDsSorted[i]}-${allSIDsSorted[j]}`;
      if (!rawPathCache.has(key)) pathPairs.push([allSIDsSorted[i], allSIDsSorted[j]]);
    }
  }

  if (pathPairs.length > 0) {
    console.log(`Fetching paths for ${pathPairs.length} SID pairs...`);
    let done = 0;
    const tasks = pathPairs.map(([a, b]) => async () => {
      const key = `${a}-${b}`;
      const result = await withRetry(
        () => post('routetimepathinfo', { StartSID: a, EndSID: b, Lang: 'tw' }),
        `path ${a}-${b}`,
      ) as { Path?: string };
      rawPathCache.set(key, result.Path ?? '');
      done++;
      if (done % 500 === 0) {
        process.stdout.write(`  ${done}/${pathPairs.length} paths fetched\n`);
        const cacheObj: Record<string, string> = {};
        for (const [k, v] of rawPathCache) cacheObj[k] = v;
        fs.writeFileSync(pathCachePath, JSON.stringify(cacheObj));
      }
    });
    await pLimit(tasks, 16);

    const cacheObj: Record<string, string> = {};
    for (const [k, v] of rawPathCache) cacheObj[k] = v;
    fs.writeFileSync(pathCachePath, JSON.stringify(cacheObj));
    console.log('Path cache saved.');
  }

  // Parse transfer codes from raw paths
  const pathMatrix = new Map<string, string[]>();
  for (const [key, rawPath] of rawPathCache) {
    pathMatrix.set(key, parseTransferCodes(rawPath, stationsByName));
  }

  // ── Phase 4: build & write CSV ───────────────────────────────────────────────
  console.log('Writing CSV...');
  const rows: string[] = ['起站,迄站,乘車時間,轉運站'];

  for (let i = 0; i < allSIDsSorted.length; i++) {
    const sidA = allSIDsSorted[i];
    const codesA = sidToStations.get(sidA) ?? [];

    for (let j = i + 1; j < allSIDsSorted.length; j++) {
      const sidB = allSIDsSorted[j];
      const codesB = sidToStations.get(sidB) ?? [];

      const time = timeMatrix.get(sidA)?.get(sidB) ?? timeMatrix.get(sidB)?.get(sidA) ?? -1;
      const pathKey = `${sidA}-${sidB}`;
      const transfers = pathMatrix.get(pathKey) ?? [];

      // Write one row per (codeA × codeB) combination
      for (const a of codesA) {
        for (const b of codesB) {
          rows.push(`${a.code},${b.code},${time},"${transfers.join(',')}"`);
        }
      }
    }

    // Same-SID combinations (multiple codes at same physical station) → time = 0
    if (codesA.length > 1) {
      for (let p = 0; p < codesA.length; p++) {
        for (let q = p + 1; q < codesA.length; q++) {
          rows.push(`${codesA[p].code},${codesA[q].code},0,""`);
        }
      }
    }
  }

  fs.writeFileSync(outputPath, rows.join('\n') + '\n');
  console.log(`Wrote ${rows.length - 1} pairs to ${outputPath}`);

  // ── Phase 5: infer transfer overhead ────────────────────────────────────────
  console.log('Computing transfer overhead...');

  // Collect single-transfer pairs for each intermediate SID
  // overhead(T) = time(A→B) - time(A→T) - time(T→B)
  const overheadSamples = new Map<string, number[]>(); // SID → [overhead values]

  for (let i = 0; i < allSIDsSorted.length; i++) {
    const sidA = allSIDsSorted[i];
    for (let j = i + 1; j < allSIDsSorted.length; j++) {
      const sidB = allSIDsSorted[j];
      const key = `${sidA}-${sidB}`;
      const transfers = pathMatrix.get(key) ?? [];
      if (transfers.length !== 1) continue; // only use single-transfer routes

      const timeAB = timeMatrix.get(sidA)?.get(sidB);
      if (timeAB === undefined || timeAB < 0) continue;

      // The transfer station code → find its SID
      const transferCode = transfers[0];
      const transferStation = codeToStation.get(transferCode);
      if (!transferStation) continue;
      const sidT = transferStation.sid;

      const timeAT = timeMatrix.get(sidA)?.get(sidT);
      const timeTB = timeMatrix.get(sidT)?.get(sidB) ?? timeMatrix.get(sidB)?.get(sidT);
      if (timeAT === undefined || timeTB === undefined) continue;

      const overhead = timeAB - timeAT - timeTB;
      if (overhead < 0 || overhead > 15) continue; // sanity filter

      if (!overheadSamples.has(sidT)) overheadSamples.set(sidT, []);
      overheadSamples.get(sidT)!.push(overhead);
    }
  }

  const overheadRows: string[] = ['轉運站SID,代表站碼,站名,樣本數,平均轉乘時間(分)'];
  for (const [sidT, samples] of [...overheadSamples].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    if (samples.length < 3) continue;
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    const stations = sidToStations.get(sidT) ?? [];
    const codes = stations.map(s => s.code).join('/');
    const name = stations[0]?.name ?? '';
    overheadRows.push(`${sidT},${codes},${name},${samples.length},${avg.toFixed(1)}`);
  }

  fs.writeFileSync(overheadPath, overheadRows.join('\n') + '\n');
  console.log(`Wrote ${overheadRows.length - 1} interchange stations to ${overheadPath}`);
  console.log('Done!');
}

main().catch(console.error);
