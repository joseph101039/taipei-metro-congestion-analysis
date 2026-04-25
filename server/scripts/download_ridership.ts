import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import readline from 'readline';

const CSV_INDEX = path.resolve(__dirname, '../doc/station_hourly_ridership/station_hourly_ridership.csv');
const OUT_DIR = path.resolve(__dirname, '../doc/station_hourly_ridership/data');

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmp = dest + '.tmp';
    const file = fs.createWriteStream(tmp);
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.destroy();
          fs.unlinkSync(tmp);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          fs.renameSync(tmp, dest);
          resolve();
        });
      })
      .on('error', (err) => {
        file.destroy();
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        reject(err);
      });
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_INDEX, { encoding: 'utf-8' }) });

  const entries: { year: string; month: string; url: string }[] = [];

  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const [, year, month, url] = parts;
    entries.push({ year: year.trim(), month: month.trim(), url: url.trim() });
  }

  // descending order (newest first)
  entries.sort((a, b) => {
    const ka = parseInt(a.year) * 100 + parseInt(a.month);
    const kb = parseInt(b.year) * 100 + parseInt(b.month);
    return kb - ka;
  });

  for (const { year, month, url } of entries) {
    const ym = `${year}${month.padStart(2, '0')}`;
    const dest = path.join(OUT_DIR, `${ym}.csv`);

    if (fs.existsSync(dest)) {
      console.log(`skip  ${ym}.csv`);
      continue;
    }

    process.stdout.write(`fetch ${ym}.csv ... `);
    const MAX_RETRIES = 3;
    let lastErr: Error | undefined;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await download(url, dest);
        lastErr = undefined;
        break;
      } catch (err) {
        lastErr = err as Error;
        if (attempt < MAX_RETRIES) {
          const delay = attempt * 2000;
          process.stdout.write(`retry ${attempt}/${MAX_RETRIES - 1} in ${delay / 1000}s ... `);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    if (lastErr) {
      console.log(`FAILED: ${lastErr.message}`);
    } else {
      console.log('done');
    }
  }

  console.log('All done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
