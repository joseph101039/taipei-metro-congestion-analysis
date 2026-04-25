import fs from 'fs';
import path from 'path';
import readline from 'readline';
import db from '../src/config/database';

const BATCH_SIZE = 500;
const DATA_DIR = path.resolve(__dirname, '../doc/taipei_village_population');

interface VillageRecord {
  year_month: number;
  city: string;
  district: string;
  village: string;
  households: number;
  population: number;
  male: number;
  female: number;
}

function toInt(s: string): number {
  return parseInt(s.replace(/,/g, '').trim(), 10) || 0;
}

/** 民國年月 → 西元 YYYYMM，e.g. rocYear=115, month=1 → 202601 */
function rocToYearMonth(rocYear: number, month: number): number {
  return (rocYear + 1911) * 100 + month;
}

/**
 * 臺北市格式：
 *   第 1 列：標題（跳過）
 *   第 2 列：欄位名稱 行政區,里別,...,戶數,人口數-合計,人口數-男,人口數-女
 *   第 3 列：總計（跳過）
 *   其餘：行政區小計列（里別 === 行政區名）跳過，里列保留
 *
 * year_month 從檔名解析，格式如「台北市115年01月...」
 */
async function parseTaipeiCsv(filePath: string): Promise<VillageRecord[]> {
  const filename = path.basename(filePath);
  // 擷取民國年與月，如「115年01月」
  const m = filename.match(/(\d{3})年(\d{1,2})月/);
  if (!m) throw new Error(`Cannot parse year/month from filename: ${filename}`);
  const yearMonth = rocToYearMonth(parseInt(m[1], 10), parseInt(m[2], 10));

  const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: 'utf-8' }), crlfDelay: Infinity });
  const records: VillageRecord[] = [];
  let lineNum = 0;
  let districtCol = -1, villageCol = -1, householdsCol = -1, populationCol = -1, maleCol = -1, femaleCol = -1;

  await new Promise<void>((resolve, reject) => {
    rl.on('line', (raw) => {
      lineNum++;
      const cols = raw.split(',');

      if (lineNum === 1) return; // 標題列

      if (lineNum === 2) {
        districtCol   = cols.findIndex((c) => c.trim() === '行政區');
        villageCol    = cols.findIndex((c) => c.trim() === '里別');
        householdsCol = cols.findIndex((c) => c.trim() === '戶數');
        populationCol = cols.findIndex((c) => c.trim().startsWith('人口數-合計'));
        maleCol       = cols.findIndex((c) => c.trim().startsWith('人口數-男'));
        femaleCol     = cols.findIndex((c) => c.trim().startsWith('人口數-女'));
        return;
      }

      const district = cols[districtCol]?.trim();
      const village  = cols[villageCol]?.trim();
      if (!district || !village) return;
      if (village === '總計' || village === district) return; // 跳過合計與區小計

      records.push({
        year_month: yearMonth,
        city: '臺北市',
        district,
        village,
        households: toInt(cols[householdsCol] ?? ''),
        population: toInt(cols[populationCol] ?? ''),
        male:       toInt(cols[maleCol] ?? ''),
        female:     toInt(cols[femaleCol] ?? ''),
      });
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });

  return records;
}

/**
 * 新北市格式（排行榜 CSV）：
 *   第 1 列：欄位名稱 年,月,排名,隸屬區,里,鄰數,戶數,男,女,合計
 */
async function parseNewTaipeiCsv(filePath: string): Promise<VillageRecord[]> {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: 'utf-8' }), crlfDelay: Infinity });
  const records: VillageRecord[] = [];
  let lineNum = 0;
  let yearCol = -1, monthCol = -1, districtCol = -1, villageCol = -1;
  let householdsCol = -1, maleCol = -1, femaleCol = -1, populationCol = -1;

  await new Promise<void>((resolve, reject) => {
    rl.on('line', (raw) => {
      lineNum++;
      // strip BOM
      const line = raw.replace(/^\uFEFF/, '');
      const cols = line.split(',');

      if (lineNum === 1) {
        yearCol      = cols.findIndex((c) => c.trim() === '年');
        monthCol     = cols.findIndex((c) => c.trim() === '月');
        districtCol  = cols.findIndex((c) => c.trim() === '隸屬區');
        villageCol   = cols.findIndex((c) => c.trim() === '里');
        householdsCol = cols.findIndex((c) => c.trim() === '戶數');
        maleCol      = cols.findIndex((c) => c.trim() === '男');
        femaleCol    = cols.findIndex((c) => c.trim() === '女');
        populationCol = cols.findIndex((c) => c.trim() === '合計');
        return;
      }

      const rocYear = parseInt(cols[yearCol]?.trim() ?? '', 10);
      const month   = parseInt(cols[monthCol]?.trim() ?? '', 10);
      const district = cols[districtCol]?.trim();
      const village  = cols[villageCol]?.trim();
      if (!district || !village || isNaN(rocYear) || isNaN(month)) return;

      records.push({
        year_month: rocToYearMonth(rocYear, month),
        city: '新北市',
        district,
        village,
        households: toInt(cols[householdsCol] ?? ''),
        population: toInt(cols[populationCol] ?? ''),
        male:       toInt(cols[maleCol] ?? ''),
        female:     toInt(cols[femaleCol] ?? ''),
      });
    });
    rl.on('close', resolve);
    rl.on('error', reject);
  });

  return records;
}

async function insertBatch(batch: VillageRecord[]): Promise<void> {
  const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?)').join(',');
  const bindings = batch.flatMap((r) => [r.year_month, r.city, r.district, r.village, r.households, r.population, r.male, r.female]);
  await db.raw(
    `INSERT INTO village_population (\`year_month\`, city, district, village, households, population, male, female) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE households=VALUES(households), population=VALUES(population), male=VALUES(male), female=VALUES(female)`,
    bindings,
  );
}

async function main(): Promise<void> {
  const files = fs.readdirSync(DATA_DIR).filter((f: string) => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV file(s): ${files.join(', ')}`);

  let totalInserted = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    let records: VillageRecord[];

    // 依檔名判斷格式
    if (file.includes('新北') || file.includes('ntpc') || file.includes('排行')) {
      records = await parseNewTaipeiCsv(filePath);
    } else {
      records = await parseTaipeiCsv(filePath);
    }

    console.log(`${file}: parsed ${records.length} records`);

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      await insertBatch(records.slice(i, i + BATCH_SIZE));
      totalInserted += Math.min(BATCH_SIZE, records.length - i);
    }
  }

  console.log(`Done. Inserted ${totalInserted} village_population records.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => db.destroy());
