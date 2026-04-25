# 混雜率計算方法

> 本文說明如何利用現有的**每分鐘瞬間在車人數**（`station-load-range`）與**各線運能資料**
> （`line_capacities`、`route_headways`、`station_segment_times`）計算各站各區間的**混雜率**。

---

## 一、名詞定義

| 名詞 | 說明 |
|------|------|
| **在車人數** `L(s, t)` | 時刻 t，站 s 到下一站之間所有列車上的旅客總數（由 `CongestionService` 估算） |
| **區間行駛時間** `T_seg` | 相鄰兩站 s → s+1 的行駛時間（分），來自 `station_segment_times` |
| **有效班距** `H` | 站 s 在時刻 t 的有效發車間隔（分），由 `route_headways` 推算 |
| **列車定員** `C` | 每列車可乘載上限，來自 `line_capacities` |
| **瞬間區間運能** `Cap(s, t)` | 同一時刻該區間內所有列車的合計定員 |
| **混雜率** `R(s, t)` | `L(s, t) / Cap(s, t)`，>1 代表超載 |

---

## 二、核心公式

### 2.1 瞬間區間運能

某一時刻，介於站 s 和 s+1 之間的列車數量（期望值）為：

```
列車數 = T_seg / H
```

因此瞬間區間運能（單方向）為：

```
Cap(s, t) = (T_seg / H) × C
```

### 2.2 混雜率

```
R(s, t) = L(s, t) / Cap(s, t)
         = L(s, t) × H / (T_seg × C)
```

### 2.3 直覺理解

- **班距越大**（H 大）→ 同一區間列車越少 → 運能越低 → 混雜率越高
- **區間越長**（T_seg 大）→ 同一區間列車越多 → 運能越高 → 混雜率越低
- **定員越大**（C 大）→ 運能越高 → 混雜率越低

---

## 三、有效班距的推算

### 3.1 單一 Route 通過的站

直接取 `route_headways.min_headway_min`：

```
H = min_headway_min
```

### 3.2 多個 Route 重疊的站（同向疊加）

```
每小時班次 = Σ_i ( 60 / H_i )   // 對所有通過此站同向的 route i

有效 H = 60 / 每小時班次
```

例：R-1（6 min）+ R-2（6 min）→ 班次 = 10 + 10 = 20 班/時 → 有效 H = 3 min

### 3.3 時段選取

`route_headways` 依 `start_time`～`end_time` 分段，根據目前時刻 `t_hour` 選取對應列：

```
for each headway row of this route:
  if start_time <= t_hour < end_time → 使用此 min_headway_min
```

---

## 四、資料來源對照

混雜率所需的各項參數，**預設值由後端 API 提供**；使用者在前端「運能設置」面板調整班距或定員後，前端以調整後的數值**在本地重新計算混雜率**，不再呼叫後端。

| 資料 | 預設來源（後端） | 前端可否覆蓋 |
|------|----------------|-------------|
| 在車人數 `L(s, t)` | `GET /congestion/station-load-range` → `loads[code][idx]` | 否（由後端模型計算） |
| 區間行駛時間 `T_seg` | `GET /segment-times` → `travel_time_min` | 否（固定物理參數） |
| 班距 `H` | `GET /route-headways` → `min_headway_min` | **是**（運能設置可逐 Route 調整） |
| 站 ↔ Route 對應 | `GET /lines/routes` → `stops[]` | 否（固定拓樸） |
| 列車定員 `C` | `GET /line-capacities` → `capacity_per_train` | **是**（運能設置可調整每列定員） |

### 前端計算時機

```
初始化：
  從後端取得預設 H（route_headways）、C（line_capacities）
  從後端取得 L（station-load-range）、T_seg（segment-times）、站↔Route（lines/routes）

使用者調整「運能設置」後：
  前端以新的 H' 或 C' 代入公式
  Cap'(s, t) = (T_seg / H_eff') × C'
  R'(s, t)   = L(s, t) / Cap'(s, t)
  直接更新地圖色階，無需重新呼叫後端
```

---

## 五、計算流程（後端實作建議）

```
【前置快取，啟動時一次性載入】
  stationToRoutes[stationCode] → [routeId, ...]
  routeHeadways[routeId]       → 時段班距列表
  segmentTime[stationCode]     → T_seg (min)（取往下一站方向）
  capacity[lineCode]           → C

【每分鐘 t 計算】
  for each station s:
    L = loads[s][t]
    routes = stationToRoutes[s]
    trains_per_hour = Σ_route( 60 / headwayAtTime(route, t) )
    H_eff = 60 / trains_per_hour
    T_seg = segmentTime[s]
    C     = capacity[lineOf(s)]
    Cap   = (T_seg / H_eff) × C
    R[s][t] = L / Cap
```

---

## 六、數值範例

### 場景 A：R 線某站（R-1 平日尖峰，僅單一 Route）

| 參數 | 數值 |
|------|------|
| 在車人數 `L` | 1,200 人 |
| 區間行駛時間 `T_seg` | 2 分 |
| 有效班距 `H` | 6 分（R-1 alone） |
| 列車定員 `C` | 1,860 人 |

```
Cap = (2 / 6) × 1,860 = 620 人
R   = 1,200 / 620 ≈ 1.94  →  混雜率 194%（嚴重超載）
```

### 場景 B：G 線中段（G-1 + G-2 重疊，平日尖峰）

| 參數 | 數值 |
|------|------|
| 在車人數 `L` | 800 人 |
| 區間行駛時間 `T_seg` | 1.5 分 |
| G-1 班距 | 4 分；G-2 班距 5 分 |
| 有效班距 `H` | 60 / (15 + 12) ≈ 2.22 分 |
| 列車定員 `C` | 1,764 人 |

```
Cap = (1.5 / 2.22) × 1,764 ≈ 1,192 人
R   = 800 / 1,192 ≈ 0.67  →  混雜率 67%（正常）
```

---

## 七、實作注意事項

### 7.1 方向性

`CongestionService` 目前將雙向旅次合併計算，`L(s, t)` 是**雙向合計**。
對應地，`Cap` 也應使用雙向合計：`Cap = 2 × (T_seg / H) × C`。
若未來需要區分上下行，須拆分 OD 旅次依路徑方向分組後各自計算。

### 7.2 `L` 的站段對應

`loads[s]` 代表目前在「s → s+1」區間的人數（旅客歸屬於前一站）。
因此 `T_seg` 取「站 s 到下一站」，非「上一站到 s」。

### 7.3 超載情況（R > 1）

可能原因：
1. OD 旅次估算誤差（進出量假設均勻分布，峰值可能被低估）
2. 旅客無法上車被迫等下一班（真實塞車），模型目前未模擬
3. 轉乘站附近多條 Route 判斷不完整

建議 UI 色階：

| 混雜率 | 等級 | 顏色 |
|--------|------|------|
| < 50% | 寬鬆 | 🟢 綠 |
| 50–80% | 正常 | 🟡 黃 |
| 80–100% | 壅擠 | 🟠 橙 |
| > 100% | 超載 | 🔴 紅 |

---

## 八、API 擴充建議

新增 `GET /congestion/congestion-rate-range`，回傳與 `station-load-range` 相同結構，
但 `loads[stationCode][minuteIdx]` 的值為**混雜率**（0.0 ～ N.N）而非人數：

```json
{
  "date": "2026-03-31",
  "end_date": "2026-03-31",
  "start_hour": 7,
  "end_hour": 9,
  "minutes": [420, 421, 422],
  "loads": {
    "R10":  [0.82, 0.85, 0.91],
    "BL09": [1.12, 1.08, 1.05]
  }
}
```

前端 `CongestionOverlay` 的 `mode='congestion-rate'` 分支直接使用此 API，
`StationLoadLayer` 以 0～1 為刻度渲染色階，>1 以紅色飽和顯示。

