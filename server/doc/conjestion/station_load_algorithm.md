# 即時站內人數推估演算法

## 目標

根據 `ridership`（每日每小時 A→B 出站人次）和 `route_min_time`（A→B 最短乘車時間），
推估任意時刻 t 各站的**在站人數**（含在車廂內經過該站的乘客）。

---

## 資料來源

| 表 | 內容 | 規模 |
|----|------|------|
| `ridership` | date, hour, origin_id, destination_id, passengers | 每小時每 OD 一筆 (~8,000–9,000 OD/hour) |
| `route_min_time` | from_station_id, to_station_id, min_travel_time, **transfer_ids** | 9,045 筆 |
| `station_segment_times` | 相鄰站行駛時間 | 128 筆 |
| `transfer_overheads` | 轉運站平均轉乘時間 | 21 筆 |
| `route_stops` (line_routes) | 各路線站序 | 用於途經站展開 |

---

## 核心假設

1. **均勻出站（浮點小數計算）**：某小時 H 出站的 P 人均勻分布在 [H:00, H+1:00) 60 分鐘內
   - 出站率 = `P / 60` 人/分鐘
   - **P < 60 時使用浮點小數完全正確**（見「小數計算說明」）
2. **入站時刻 = 出站時刻 − travel_time**：由 `route_min_time` 查得
3. **途經站由 transfer_ids 推導**：利用換乘節點切分子段，展開完整途經站（見「途經站推導」）

---

## 小數計算說明

輸出是**統計期望值（Expected value）**，不是整數計數。

以 OD (A→B, P=1, T=10min) 為例：
```
contribution = (1 / 60) × overlap_minutes
```
若 overlap = 10（旅客在某站停留 10 分鐘的時間窗與查詢重疊）：
```
contribution = 1/60 × 10 = 0.167 人
```

這 0.167 累加上幾千個 OD pair 的貢獻後，得到合理的期望人數。
對視覺化色階來說，浮點精度完全足夠，不需要取整。

**實作上**：
```typescript
// 所有計算用 float (JavaScript number = IEEE 754 double)
const contribution = (passengers / 60) * overlapMinutes;  // 可以是 0.017
load[stationId] = (load[stationId] ?? 0) + contribution;

// 輸出時四捨五入到小數點後 1 位
output.estimated_load = Math.round(load[stationId] * 10) / 10;
```

---

## 途經站推導：利用 transfer_ids

### transfer_ids 的格式

`route_min_time` 的 `transfer_ids` 欄位存放換乘站代碼，逗號分隔。
每個代碼代表一個**物理換乘節點**。

```
BR13 → G03A,  travel=42,  transfer_ids="G16"
R28  → BL01,  travel=50,  transfer_ids="R10,BL12"
```

### 路徑解讀

**transfer_ids 為空**（同線直達）：
```
BR13 → BR12  transfer_ids=""
路徑：BR13 --(BR線)--> BR12
```

**transfer_ids 包含單一代碼**（一次換乘）：
```
BR13 → G03A  transfer_ids="G16"
```
- `G16` 是南京復興，對應 `transfer_overheads.station_codes = "BR11/G16"`
- 路徑：`BR13 --(BR線)--> BR11 → [換乘] → G16 --(G線)--> G03A`
- 由出發線（BR）找到 BR 端代碼 = BR11，另一端 G16 為入線代碼

**transfer_ids 包含兩個代碼**（一次換乘，兩端明確）：
```
R28 → BL01  transfer_ids="R10,BL12"
```
- R10 和 BL12 同為「台北車站」（`transfer_overheads.station_codes = "R10/BL12"`）
- 路徑：`R28 --(R線)--> R10 → [換乘] → BL12 --(BL線)--> BL01`

**transfer_ids 包含多個節點**（多次換乘）：
```
BR01 → O21  transfer_ids="BL15,G09"
```
- BL15 = 忠孝復興 (`BR10/BL15`)，G09 = 古亭 (`G09/O05`)
- 路徑：`BR01 --(BR線)--> BR10 → [換乘] → BL15 --(BL線)--> ... → [換乘] → G09 → O05 --(O線)--> O21`

### 路徑重建演算法

```typescript
function reconstructPath(originCode: string, destCode: string): PathNode[] {
  const { min_travel_time, transfer_ids } = routeMinTime[origin][dest];
  
  if (!transfer_ids) {
    // 同線段：找兩站之間的所有中間站
    return buildSameLinePath(originCode, destCode);
  }
  
  // 解析換乘節點
  const waypoints = transfer_ids.split(',').map(s => s.trim());
  
  // 將換乘節點配對（查 transfer_overheads.station_codes）
  const transferPairs = resolveTransferPairs(originCode, destCode, waypoints);
  // e.g. [{exit: "R10", enter: "BL12", overhead: 3.3}]
  
  // 組合完整路徑
  const result: PathNode[] = [];
  let cumTime = 0;
  let current = originCode;
  
  for (const { exit, enter, overhead } of transferPairs) {
    // 同線段：current → exit
    const segment = buildSameLinePath(current, exit);
    for (const node of segment) {
      result.push({ stationCode: node.code, cumulativeMin: cumTime + node.localCum });
    }
    cumTime += segmentTotalTime(current, exit);
    
    // 換乘步行時間
    cumTime += overhead;
    current = enter;
  }
  
  // 最後一段：current → destination
  const lastSegment = buildSameLinePath(current, destCode);
  for (const node of lastSegment) {
    result.push({ stationCode: node.code, cumulativeMin: cumTime + node.localCum });
  }
  
  return result;
}
```

#### resolveTransferPairs 邏輯

```typescript
function resolveTransferPairs(origin: string, dest: string, waypoints: string[]) {
  const pairs: TransferPair[] = [];
  const originLine = getLineCode(origin);  // e.g. "BR"
  let currentLine = originLine;
  
  for (const wp of waypoints) {
    // 查 transfer_overheads 找到包含 wp 的 station_codes
    // e.g. wp="G16" → station_codes="BR11/G16" → codes=["BR11","G16"]
    const overhead = findTransferByCode(wp);
    const codes = overhead.station_codes.split('/');
    
    // 判斷出/入：currentLine 端為 exit，另一端為 enter
    const exitCode = codes.find(c => getLineCode(c) === currentLine);
    const enterCode = codes.find(c => c !== exitCode);
    
    pairs.push({
      exit: exitCode,
      enter: enterCode,
      overhead: overhead.avg_transfer_time_min
    });
    
    currentLine = getLineCode(enterCode);
  }
  
  return pairs;
}
```

---

## 演算法：時間切片累積法（Time-Slice Accumulation）

### 概念

將一小時切割為 M 個時間片段（每片 δ = 60/M 分鐘，建議 M=60 即每分鐘一片）。
對每個 OD pair (A→B)，根據乘車時間計算旅客在每個時間片段位於哪一站，
然後累加所有 OD pair 的貢獻，得到每站每分鐘的在站人數。

### 步驟

```
Input:
  date, target_hour (e.g. 2026-03-31 08:00)
  resolution_min = 1 (每分鐘一個時間片)

1. 查詢 ridership：取出涵蓋 [target_hour - max_travel_time, target_hour + 1h] 的所有 OD 記錄
   → 通常需 target_hour 和 target_hour - 1 兩個小時（因為最長旅程 70 分）

2. 對每筆 OD 記錄 (origin=A, destination=B, hour=H, passengers=P):
   a. travel_time = route_min_time[A][B]
   b. 計算入站時間範圍：entry_start = H*60 - travel_time ... entry_end = (H+1)*60 - travel_time
      （分鐘數，以日起始 00:00 為 0）
   c. 出站時間範圍：exit_start = H*60 ... exit_end = (H+1)*60
   d. 推導 A→B 的途經站序列 [S0=A, S1, S2, ..., Sn=B] 及各站累積時間 [0, t1, t2, ..., tn=travel_time]

3. 對每個目標分鐘 t ∈ [target_hour*60, target_hour*60 + 59]:
   對每筆 OD:
     - 旅客旅程中的已行駛時間 elapsed = t - entry_time
     - 由於入站均勻分布在 60 分鐘內，elapsed 分布在 [t - entry_end, t - entry_start]
     - 找出此刻旅客位於哪一站（根據 cumulative segment times）
     - 累加 passengers/60 到該站

4. 輸出：station_load[station_id][minute] = 預估在站人數
```

### 簡化版（無途經站推導）

若不需要途經站精確分佈，只需**各站進出人數差**：

```
station_in_count[A][t]  += P/60  （入站貢獻）
station_out_count[B][t] += P/60  （出站貢獻）

station_occupancy[S][t] = Σ(歷史所有進站) - Σ(歷史所有出站)
                        = running integral
```

但這只知道「還在系統裡的人數」，不知道他們在哪一站。

---

## 精確版：途經站展開法

### 核心公式

對一筆 OD (A→B, hour H, P passengers)：
- 旅客於 [H:00, H:59] 均勻出站
- 等效入站時刻 = 出站時刻 - T（T = travel_time_min）
- 途經站序列：[S₀=A, S₁, S₂, ..., Sₙ=B]（由 transfer_ids 重建）
- 累積到站時間：[0, d₁, d₂, ..., dₙ=T]（由 segment_times + transfer_overheads 累加）

對任一查詢時刻 t（分鐘偏移）：
```
active_passengers_at_station(Sₖ, t) =
  Σ over all OD pairs where Sₖ is on route(A→B):
    (P / 60) × overlap
```

其中：
```
entry ∈ [H*60 - T, (H+1)*60 - T)  (均勻分布)

passenger_at_Sₖ interval = entry + dₖ 到 entry + dₖ₊₁
```

**overlap 計算**可以轉化為：
```
count_at_Sₖ_at_time_t = P/60 × max(0, min(t - dₖ, 60) - max(t - dₖ₊₁, 0))
                                    ↑ 用出站基準表達更清楚 ↑
```

（推導見附錄）

---

## 實作架構

### API 設計

```
GET /api/congestion/station-load?date=2026-03-31&hour=8&minute=30
```

Response:
```json
{
  "date": "2026-03-31",
  "hour": 8,
  "minute": 30,
  "stations": [
    { "station_id": 1, "code": "R28", "estimated_load": 342.4 },
    { "station_id": 2, "code": "R27", "estimated_load": 1205.1 }
  ]
}
```

### 後端計算流程

```typescript
async function computeStationLoad(date: string, hour: number, minute: number) {
  // 1. 取 2 小時 ridership (hour-1, hour) 以涵蓋最長 70 min 旅程
  const rows = await ridershipRepo.findByDateHours(date, [hour - 1, hour]);
  
  // 2. 靜態快取（啟動時載入）
  const travelTimes = await cache.getTravelTimes();     // Map<"A|B", number>
  const pathCache = await cache.getPathsWithTimes();    // Map<"A|B", PathNode[]>
  
  // 3. 計算
  const load: Record<string, number> = {};
  const targetMin = hour * 60 + minute;  // 今日第幾分鐘
  
  for (const { origin_id, destination_id, passengers, hour: h } of rows) {
    const T = travelTimes.get(`${origin_id}|${destination_id}`);
    if (!T) continue;
    
    const entryStart = h * 60 - T;       // 最早入站時刻
    const entryEnd   = h * 60 + 60 - T;  // 最晚入站時刻
    
    const path = pathCache.get(`${origin_id}|${destination_id}`);
    if (!path) continue;
    
    for (let k = 0; k < path.length - 1; k++) {
      const { stationCode, cumulativeMin: dK } = path[k];
      const { cumulativeMin: dK1 } = path[k + 1];
      
      // 入站時刻 e 在 [entryStart, entryEnd) 中，使旅客在 targetMin 時位於 Sₖ：
      //   e + dK ≤ targetMin < e + dK1
      //   → targetMin - dK1 < e ≤ targetMin - dK
      const eMin = Math.max(entryStart, targetMin - dK1 + 1);
      const eMax = Math.min(entryEnd,   targetMin - dK  + 1);
      const overlap = Math.max(0, eMax - eMin);  // 浮點小數
      
      const contribution = (passengers / 60) * overlap;
      load[stationCode] = (load[stationCode] ?? 0) + contribution;
    }
  }
  
  return load;  // Record<stationCode, expectedOccupancy: float>
}
```

### 效能考量

| 項目 | 估計 |
|------|------|
| 每小時 OD pairs | ~8,000–9,000 筆 |
| 2 小時 = ~18,000 筆 | |
| 每筆平均途經 ~10 站 | 180,000 次 station contribution 計算 |
| 每次計算 | O(1) 加減比較 |
| **總計算量** | ~180K 次簡單算術 ≈ **< 50ms** |

**快取策略**：
- `travelTimes` + `pathCache`（路徑 + segment_times）為靜態，啟動時建立
- `ridership` 按 (date, hour) 查詢，LRU 快取最近 5 個 hour

---

## 所需前置條件

1. **路徑重建**：用 `transfer_ids` + `station_segment_times` + `transfer_overheads` + `route_stops` 建立
   - 方案 A：啟動時 Dijkstra 重建（記憶體圖）
   - 方案 B：預計算所有 9,045 OD pair 的 PathNode[] 存入 `shortest_route_paths` 表

2. **各區間累積時間**：`station_segment_times` 提供行駛時間，`transfer_overheads` 提供步行時間

---

## 新增資料表（可選）

### `shortest_route_paths`

```sql
CREATE TABLE shortest_route_paths (
  from_station_id INT UNSIGNED NOT NULL,
  to_station_id   INT UNSIGNED NOT NULL,
  path_json       JSON NOT NULL,  -- [{"code":"R28","cum":0},{"code":"R27","cum":2},...] 
  PRIMARY KEY (from_station_id, to_station_id)
);
```

> 9,045 筆 × 平均 ~100 bytes/筆 ≈ 900KB，啟動時全部載入記憶體。

---

## API 端點規劃

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/congestion/station-load` | 指定 date + hour + minute，回傳各站推估人數 |
| `GET` | `/congestion/station-load-range` | 指定 date + start_hour + end_hour，每分鐘各站人數 |

### Query Parameters

| 參數 | 必填 | 說明 |
|------|------|------|
| date | ✅ | YYYY-MM-DD |
| hour | ✅ | 0–23 |
| minute | 選填 | 0–59，省略則回傳整小時 60 分鐘資料 |
| stations | 選填 | 逗號分隔 station_id，只回傳指定站 |

---

## 實作步驟

1. **建立路徑快取服務** (`RoutePathService`)
   - 啟動時從 `route_min_time`（含 transfer_ids）重建所有 OD 路徑
   - 用 `station_segment_times` + `transfer_overheads` 計算各節點累積時間
   - `getPath(from, to)` → `PathNode[]`

2. **建立壅塞計算服務** (`CongestionService`)
   - `computeStationLoad(date, hour, minute?)` → `Map<stationCode, float>`
   - 從 ridership 取 2 小時資料，展開途經站貢獻

3. **建立 API 端點**
   - `CongestionController` + `congestionRoutes`

4. **前端整合**
   - CongestionOverlay 呼叫 API，在地圖上以色階/氣泡渲染各站人數

---

## 數學附錄

### 出站基準的 overlap 公式

設某 OD (A→B), hour=H, P passengers, travel_time=T：

- 出站均勻分布在 [H×60, (H+1)×60) → 每分鐘出站 P/60 人
- 入站時刻 e = exit_time - T
- 在站 Sₖ 的時刻 = [e + dₖ, e + dₖ₊₁)

在查詢時刻 t，正在 Sₖ 的旅客滿足：
```
e + dₖ ≤ t < e + dₖ₊₁
⟹ t - dₖ₊₁ < e ≤ t - dₖ
```

且 e 必須在合法入站區間 [H×60 - T, (H+1)×60 - T):
```
effective_e_range = [max(H×60 - T, t - dₖ₊₁ + 1), min((H+1)×60 - T, t - dₖ + 1))
overlap = max(0, effective_e_range.end - effective_e_range.start)
count = (P / 60) × overlap
```

### 連續積分形式

```
load(Sₖ, t) = Σ_{OD} (P/60) × max(0, min(t - dₖ, 60) - max(t - dₖ₊₁, 0))
```

人數守恆：`Σₛ load(S, t) = 所有在途旅客的期望總數`

---

## 限制與假設說明

1. **期望值模型**：P < 60 時用浮點小數，輸出為統計期望人數，適合視覺化
2. **不考慮等車時間**：假設旅客入站即上車（可後續整合 headway/2）
3. **均勻分布近似**：實際出站可能非均勻，但整數級精度足夠視覺化
4. **單一最短路徑**：每 OD 只取一條路徑（由 transfer_ids 決定）
5. **無列車容量限制**：推估為理論期望人數
