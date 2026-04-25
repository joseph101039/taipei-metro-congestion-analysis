# 旅客流量視覺化頁面實作計畫

以 Canvas 粒子動畫疊加在現有 Leaflet 地圖上，透過 `requestAnimationFrame` 驅動的粒子系統，將每小時的 OD（起訖站）旅客流量以動態光點呈現；同時新增時間軸 UI 供使用者選擇起迄日期時間範圍、以及播放／暫停。

---

## 檔案結構

```
web/src/
├── data/
│   └── api.js                      ← fetchRidership(date, hour)
├── hooks/
│   ├── useRidership.js             ← API 快取、prefetch、資料正規化
│   └── useParticleEngine.js        ← Canvas 粒子系統（沿路線移動、右靠偏移、密度差異化）
├── utils/
│   └── metroGraph.js               ← BFS 路徑查詢（建圖 + 快取）
└── components/
    └── PassengerFlow/
        ├── index.jsx               ← 主容器（起迄日時範圍、播放控制）
        ├── FlowCanvas.jsx          ← Canvas overlay
        ├── TimelineBar.jsx         ← 起迄日時選擇 + 滑桿 + 播放控制
        └── PassengerFlow.css       ← 樣式
```

---

## Data Layer — `api.js` + `useRidership.js`

### `data/api.js`

```js
export async function fetchRidership(date, hour) {
  const res = await fetch(`/api/ridership?date=${date}&hour=${hour}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}
```

### `hooks/useRidership.js`

1. 接收 `(date, hour)` 參數。
2. 內部用 `useRef(Map)` 快取 `"YYYY-MM-DD|HH" → response`。
3. `date` 變更時，分批 prefetch 全日 24 小時（每批 4 個）。
4. `flows` sparse map 正規化為 `[{ originId, destId, count }]`，依 count 降序排列。
5. 回傳：`{ flowPairs, totalPassengers, loading, error }`。

---

## State Management — `PassengerFlow/index.jsx`

### 時間範圍模型

使用「起始日時～結束日時」範圍取代單一日期＋小時：

| State | 類型 | 預設值 | 說明 |
|---|---|---|---|
| `startDate` | `string` | 前一個月月底 | 起始日期 |
| `startHour` | `number` | 0 | 起始時 |
| `endDate` | `string` | 前一個月月底 | 結束日期 |
| `endHour` | `number` | 23 | 結束時 |
| `currentSlot` | `number` | 0 | 目前播放位置（0-based） |
| `isPlaying` | `boolean` | false | 播放中／暫停 |
| `playSpeed` | `number` | 2 | 每小時停留秒數 |

- **最大可選日期**：前一個月的最後一天（如當下為 2026-04-19，maxDate = 2026-03-31）。
- **totalSlots**：起迄日時間的小時總數。
- **currentDate / currentHour**：由 `startDate + startHour + currentSlot` 推算。

### 播放邏輯

```jsx
useEffect(() => {
  if (!isPlaying) return;
  const id = setInterval(() => {
    setCurrentSlot(s => {
      if (s >= totalSlots - 1) { setIsPlaying(false); return totalSlots - 1; }
      return s + 1;
    });
  }, playSpeed * 1000);
  return () => clearInterval(id);
}, [isPlaying, playSpeed, totalSlots]);
```

播放時從起始到結束**連續推進**，每個小時的粒子一次性出發後消亡（one-shot），不會重播同一小時。

---

## Timeline UI — `TimelineBar.jsx`

### 介面元素

1. **起迄日時選擇器**：兩組 `<input type="date">` + `<select>` 時刻下拉。
2. **播放滑桿**：`<input type="range" min=0 max={totalSlots-1}>`，顯示目前日時。
3. **播放／暫停按鈕**：▶ / ⏸。到達結尾再按會重頭播放。
4. **速度按鈕組**：`0.5s / 1s / 2s / 5s`。
5. **旅客總數**：`48,320 人次`。

### 樣式定位

```css
.timeline-bar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  padding: 12px 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  pointer-events: all;
  min-width: 480px;
}
```

---

## 捷運路網圖 — BFS 路徑查詢 `utils/metroGraph.js`

從 `/api/lines` 的 segments 建立雙向鄰接圖：

1. **路線邊**：每條線的 `segments[{from, to}]` 加入鄰接。
2. **轉乘邊**：同 alias 的站點（不同 code）互相連通。
3. **BFS 最短路徑**：`findPath(fromCode, toCode) → [code, code, ...]`，結果快取。

粒子沿此路徑的站點序列移動，而非走直線。

---

## Animation Engine — `useParticleEngine.js`

### 沿路線移動 + 右靠偏移

粒子沿 BFS 路徑的站點折線移動。在每一段的行進方向上，向**右側垂直偏移 4px**（順時針旋轉 90°），使雙向人流自然分離不重疊：

```js
// 行進方向 (dx, dy) 的右側法向量
const nx = dy / len;    // 順時針 90°
const ny = -dx / len;
position.x += nx * OFFSET_PX;
position.y += ny * OFFSET_PX;
```

### 密度差異化

根據旅客人數分級，高流量用更多更小的密集點，低流量用較少稍大的點：

| 人數 | 粒子數 | 半徑 |
|------|--------|------|
| ≥ 500 | count/20（最多 30） | 2 px |
| ≥ 200 | count/30（最多 30） | 2.5 px |
| ≥ 50 | count/40（最多 15） | 3 px |
| < 50 | count/30（至少 1） | 3.5 px |

### 出發時間分散

同一小時內的粒子**均勻分散在 slotDuration（= playSpeed × 1000 ms）內出發**：

```js
const departDelay = (i / n) * slotDurationMs;
particle.progress = -(departDelay / TRAVEL_MS);
```

粒子在 slot 期間陸續出發、各自飛行 3 秒後消亡，不會重生（one-shot）。

### 常數設定

```js
const SCALE_FACTOR = 30;
const MAX_PER_PAIR = 30;
const MAX_TOTAL = 1200;
const TRAVEL_MS = 3000;
const OFFSET_PX = 4;
```

---

## 地圖整合 — `MetroMap.jsx` + `App.jsx`

### 淡色路線圖 + 淡色站點

`passenger` 視圖時：

- **路線**：`opacity: 0.25, weight: 3`（與搭乘路徑頁面一致）。
- **站點**：`dim` 模式 — 半徑 3px、透明度 0.4、細邊框。hover 仍顯示站名＋代碼 tooltip，但不顯示距離資訊。

### mapInstance 傳出

```jsx
function MapCapture({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}
```

`App.jsx` 用 `useState` 存 `mapInstance`，`activeView === 'passenger'` 時渲染 `<PassengerFlow>`。

同時透過 `onStationsLoaded` 和 `onLinesLoaded` 回傳站點與路線資料，供 PassengerFlow 建立 BFS 圖和粒子。

---

## 效能注意事項

| 項目 | 策略 |
|---|---|
| 粒子上限 | 全域硬上限 1200，依 count 降序取 top OD pairs |
| API 預載 | 切換日期後，分 6 批（每批 4 小時）非同步 prefetch 全日 24h 資料 |
| 座標計算 | 站點像素座標只在 `zoom / move` 事件時重算，不逐幀計算 |
| Canvas 清除 | `clearRect` 保持透明底 |
| BFS 快取 | 路徑結果快取於 `Map`，相同 OD pair 不重複計算 |

---

## 延伸考量

1. **粒子顏色**：依起點站所屬路線顏色著色（`origin.lineColor`），增加辨識度。
2. **無資料處理**：`flows` 為空時 TimelineBar 顯示「本時段無資料」。
3. **熱力圖模式**（選配）：站點圓圈大小依出站人次縮放的靜態模式。
