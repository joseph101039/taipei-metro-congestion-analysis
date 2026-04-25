import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URLSearchParams } from 'url';

const BASE_URL = 'https://web.metro.taipei/pages2026/WebRoutePlan';

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 16 });

// Same-physical-station pairs — website returns no result; travel time is 0
const SAME_STATION_PAIRS = new Set([
  'R07-O06','R08-G10','R10-BL12','R11-G14','R13-O11',
  'G04-Y07','G09-O05','G12-BL11','G15-O08','G16-BR11',
  'O02-Y11','O06-R07','O08-G15','O11-R13','O17-Y18',
  'BL07-Y16','BL08-Y17','BL11-G12','BL12-R10','BL14-O07',
  'BL15-BR10','BL23-BR24','BR09-R05','BR10-BL15','BR11-G16',
  'BR24-BL23','R05-BR09','Y07-G04','Y11-O02','Y16-BL07',
  'Y17-BL08','Y18-O17',
]);

const STATIONS: string[] = [
  // R 淡水信義線
  'R02','R03','R04','R05','R06','R07','R08','R09','R10','R11',
  'R12','R13','R14','R15','R16','R17','R18','R19','R20','R21',
  'R22','R22A','R23','R24','R25','R26','R27','R28',
  // BL 板南線
  'BL01','BL02','BL03','BL04','BL05','BL06','BL07','BL08','BL09','BL10',
  'BL11','BL12','BL13','BL14','BL15','BL16','BL17','BL18','BL19','BL20',
  'BL21','BL22','BL23',
  // G 松山新店線
  'G01','G02','G03','G03A','G04','G05','G06','G07','G08','G09',
  'G10','G11','G12','G13','G14','G15','G16','G17','G18','G19',
  // O 中和新蘆線
  'O01','O02','O03','O04','O05','O06','O07','O08','O09','O10',
  'O11','O12','O13','O14','O15','O16','O17','O18','O19','O20',
  'O21','O50','O51','O52','O53','O54',
  // BR 文湖線
  'BR01','BR02','BR03','BR04','BR05','BR06','BR07','BR08','BR09','BR10',
  'BR11','BR12','BR13','BR14','BR15','BR16','BR17','BR18','BR19','BR20',
  'BR21','BR22','BR23','BR24',
  // Y 環狀線
  'Y07','Y08','Y09','Y10','Y11','Y12','Y13','Y14','Y15','Y16','Y17','Y18','Y19','Y20',
];

interface ViewStateBundle {
  vs: string;
  vsg: string;
  ev: string;
}

interface RouteResult {
  from: string;
  to: string;
  time: number;
  transfers: string;
}

function fetchUrl(url: string, options: http.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getInitialViewState(): Promise<ViewStateBundle> {
  const html = await fetchUrl(BASE_URL, { method: 'GET' });
  return extractViewState(html);
}

function extractViewState(html: string): ViewStateBundle {
  const vs = html.match(/name="__VIEWSTATE"[^>]+value="([^"]*)"/)?.[1] ?? '';
  const vsg = html.match(/name="__VIEWSTATEGENERATOR"[^>]+value="([^"]*)"/)?.[1] ?? '';
  const ev = html.match(/name="__EVENTVALIDATION"[^>]+value="([^"]*)"/)?.[1] ?? '';
  return { vs, vsg, ev };
}

function parseRouteResult(html: string): { time: number; transfers: string[] } | null {
  // Find the first result block
  const resultStart = html.indexOf("id=\"PanelResultMultiAPI\"");
  if (resultStart === -1) return null;
  const resultHtml = html.slice(resultStart, resultStart + 20000);

  // Extract travel time from first <p>N分鐘｜
  const timeMatch = resultHtml.match(/<p>(\d+)分鐘[｜|]/);
  if (!timeMatch) return null;
  const time = parseInt(timeMatch[1]);

  // Extract transfer entry stations: after each 'transferline' row, the next transferinfo has the entry station
  const transfers: string[] = [];
  // Find first summarypath block only (first route suggestion)
  const firstTableStart = resultHtml.indexOf("<table class='routeplan__detail'>");
  const firstTableEnd = resultHtml.indexOf("</table>", firstTableStart);
  const tableHtml = firstTableStart !== -1 ? resultHtml.slice(firstTableStart, firstTableEnd + 8) : resultHtml;

  const transferLinePattern = /<tr class='transferline'>[\s\S]*?<\/tr>\s*<tr class='transferinfo'><td[^>]*><img[^>]+alt='([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = transferLinePattern.exec(tableHtml)) !== null) {
    transfers.push(match[1]);
  }

  return { time, transfers };
}

async function queryRoute(
  bundle: ViewStateBundle,
  from: string,
  to: string,
  cookies: string,
): Promise<{ result: { time: number; transfers: string[] } | null; newBundle: ViewStateBundle; newCookies: string }> {
  const params = new URLSearchParams({
    __VIEWSTATE: bundle.vs,
    __VIEWSTATEGENERATOR: bundle.vsg,
    __EVENTVALIDATION: bundle.ev,
    __EVENTTARGET: 'query',
    __EVENTARGUMENT: `${from}-${to}`,
    HiddenFieldDeparture: from,
    HiddenFieldArrival: to,
    stationlist: from,
    btnQuery: '查詢',
  });
  const body = params.toString();

  const urlObj = new URL(BASE_URL);
  let newCookies = cookies;

  const html = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        agent: keepAliveAgent,
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (compatible; MetroCrawler/1.0)',
          'Referer': BASE_URL,
        },
        timeout: 30000,
      },
      (res) => {
        // Collect Set-Cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const cookieMap = new Map<string, string>();
          // parse existing
          cookies.split(';').forEach(c => {
            const [k, v] = c.trim().split('=');
            if (k) cookieMap.set(k.trim(), v ?? '');
          });
          setCookie.forEach(c => {
            const [kv] = c.split(';');
            const [k, v] = kv.split('=');
            if (k) cookieMap.set(k.trim(), v ?? '');
          });
          newCookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
        }
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk));
        res.on('end', () => resolve(data));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });

  const newBundle = extractViewState(html);
  const result = parseRouteResult(html);
  return { result, newBundle, newCookies };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initSession(): Promise<{ bundle: ViewStateBundle; cookies: string }> {
  const urlObj = new URL(BASE_URL);
  return new Promise((resolve, reject) => {
    const req = https.request(
      { agent: keepAliveAgent, hostname: urlObj.hostname, path: urlObj.pathname, method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetroCrawler/1.0)' }, timeout: 30000 },
      (res) => {
        const rawCookies: string[] = [];
        const setCookie = res.headers['set-cookie'];
        if (setCookie) rawCookies.push(...setCookie.map(c => c.split(';')[0]));
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk));
        res.on('end', () => {
          resolve({ bundle: extractViewState(data), cookies: rawCookies.join('; ') });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Init timeout')); });
    req.end();
  });
}

async function worker(
  id: number,
  pairs: [string, string][],
  outputPath: string,
  progressPath: string,
  doneSet: Set<string>,
): Promise<void> {
  let session = await initSession();

  for (const [from, to] of pairs) {
    const key = `${from}-${to}`;
    if (doneSet.has(key)) continue;

    // Same physical station — no train needed
    if (SAME_STATION_PAIRS.has(key)) {
      fs.appendFileSync(outputPath, `${from},${to},0,""\n`);
      doneSet.add(key);
      process.stdout.write(`[W${id}] ${from}→${to}: same station (0分)\n`);
      continue;
    }

    let attempts = 0;
    let success = false;
    while (attempts < 3 && !success) {
      try {
        const { result, newBundle, newCookies } = await queryRoute(session.bundle, from, to, session.cookies);
        session.bundle = newBundle.vs ? newBundle : session.bundle;
        session.cookies = newCookies;

        if (result) {
          const line = `${from},${to},${result.time},"${result.transfers.join(',')}"\n`;
          fs.appendFileSync(outputPath, line);
          doneSet.add(key);
          process.stdout.write(`[W${id}] ${from}→${to}: ${result.time}分 転 ${result.transfers.join(',') || '-'}\n`);
          success = true;
        } else {
          process.stdout.write(`[W${id}] ${from}→${to}: no result (attempt ${attempts + 1}), reinit...\n`);
          session = await initSession();
          await sleep(1000 * (attempts + 1));
          attempts++;
        }
      } catch (err) {
        process.stdout.write(`[W${id}] ${from}→${to}: error ${err}, reinit...\n`);
        try { session = await initSession(); } catch {}
        await sleep(2000);
        attempts++;
      }
    }

    if (!success) {
      fs.appendFileSync(outputPath, `${from},${to},-1,"ERROR"\n`);
      doneSet.add(key);
      process.stdout.write(`[W${id}] ${from}→${to}: FAILED after 3 attempts\n`);
    }

    await sleep(100);
  }
}

async function main() {
  const outputPath = path.resolve(__dirname, '../doc/route_min_time.csv');
  const progressPath = path.resolve(__dirname, '../doc/routes_progress.txt');

  // Load already-done pairs (skip header and ERROR entries so they get retried)
  const doneSet = new Set<string>();
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf8');
    for (const line of existing.split('\n')) {
      if (line.startsWith('起站') || line.includes('ERROR') || line.includes('-1')) continue;
      const [from, to] = line.split(',');
      if (from && to && from.trim() && to.trim()) doneSet.add(`${from.trim()}-${to.trim()}`);
    }
    console.log(`Resuming: ${doneSet.size} valid pairs done`);
  } else {
    fs.writeFileSync(outputPath, '起站,迄站,乘車時間,轉運站\n');
  }

  // Re-write file without ERROR lines (they will be re-queried)
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf8');
    const cleaned = existing.split('\n').filter(l => !l.includes('ERROR') && !l.match(/,-1,/)).join('\n');
    fs.writeFileSync(outputPath, cleaned.endsWith('\n') ? cleaned : cleaned + '\n');
  }

  // Generate all unique pairs (A < B by index)
  const allPairs: [string, string][] = [];
  for (let i = 0; i < STATIONS.length; i++) {
    for (let j = i + 1; j < STATIONS.length; j++) {
      allPairs.push([STATIONS[i], STATIONS[j]]);
    }
  }

  const remaining = allPairs.filter(([a, b]) => !doneSet.has(`${a}-${b}`));
  console.log(`Total pairs: ${allPairs.length}, remaining: ${remaining.length}`);

  const CONCURRENCY = 8;
  const chunkSize = Math.ceil(remaining.length / CONCURRENCY);
  const chunks: [string, string][][] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    chunks.push(remaining.slice(i * chunkSize, (i + 1) * chunkSize));
  }

  await Promise.all(
    chunks.map((chunk, i) => worker(i + 1, chunk, outputPath, progressPath, doneSet)),
  );

  console.log(`\nDone! Results saved to ${outputPath}`);
}

main().catch(console.error);
