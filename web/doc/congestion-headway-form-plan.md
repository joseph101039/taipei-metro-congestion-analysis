# 壅塞模擬 — 班距調整表單計畫

## 目標

在右上角路線圖面板（RouteChartPanel）下方，新增班距調整表單，讓使用者可以：
1. 查看各 RouteID 各時段的預設班距
2. 透過 slider 調整班距
3. 即時顯示調整後的每小時運能（`floor(60 / headway) × capacity_per_train`）

## API 串接

| API | 回傳 | 用途 |
|-----|------|------|
| `GET /api/line-capacities` | `[{ line_code, capacity_per_train, ... }]` | 取得各線列車定員 |
| `GET /api/route-headways?service_day=平日` | `[{ route_id, line_code, start_time, end_time, min_headway_min, ... }]` | 取得各 route 各時段預設班距 |

## 元件結構

```
Congestion/
  RouteChartPanel.jsx       ← 加入 HeadwayEditor
  CongestionRouteChart.jsx  ← 路線距離圖（既有）
  HeadwayEditor.jsx         ← 新增：班距調整表單
  HeadwayEditor.css         ← 新增：樣式
  index.jsx                 ← 更新 exports
```

## HeadwayEditor 設計

### State
```js
{
  serviceDay: '平日' | '假日',           // 使用者可切換

  // 各線載客量 (來自 API，使用者可覆蓋)
  carCapacity:  Map<lineCode, number>,   // 每輛定員，預設來自 API capacity_per_car
  carsPerTrain: Map<lineCode, number>,   // 輛/列，預設來自 API cars_per_train

  // 各線各小時班距（X 軸整點 6–24，共 19 點）
  // 預設從 API headway 區間展開；使用者拖曳後寫入 overrides
  headways: [{ route_id, line_code, start_time, end_time, min_headway_min, ... }],
  overrides: Map<`${line_code}|${hour}`, number>  // 使用者拖曳後的班距（分）
}
```

### UI 排版

```
┌─────────────────────────────────────────────┐
│ 營運日  [平日]  [假日]                       │
├─────────────────────────────────────────────┤
│ ● R 淡水信義線                               │
│   每輛 [100] 人 × [4] 輛/列 = 400 人/列     │
│                                             │
│  班距 ▲                                     │
│ (分)  │  ╮                                  │
│  15   │   ╰──╮                              │
│  10   │      ╰──╮   ╭────────╮             │
│   5   │         ╰───╯         ╰──────       │
│       └──────────────────────────────→ h   │
│        6  8  10  12  14  16  18  20  22 24 │
│   (拖曳節點上下調整班距)                     │
├─────────────────────────────────────────────┤
│ ● G 松山新店線                               │
│   每輛 [100] 人 × [6] 輛/列 = 600 人/列     │
│   [折線圖同上]                               │
├─────────────────────────────────────────────┤
│ ● O  ● BL  ● BR  ● Y  …（其餘路線同格式）  │
└─────────────────────────────────────────────┘
```

#### 折線圖互動

- X 軸：整點小時 6–24（共 19 點）
- Y 軸：班距範圍 1–30 分（可依資料自動調整上限）
- 渲染：SVG 平滑貝茲曲線（cubic bezier，control points 取相鄰點斜率）
- 節點：各整點一個圓點，hover 顯示 `{hour}:00 → {headway} min`
- 拖曳：mousedown/mousemove 縱向拖動節點，即時更新 overrides 並重繪曲線
- 顏色：曲線與節點使用路線色（`line.color`）

#### 運能計算（顯示在圖上方或 tooltip）

```
trainCapacity    = carCapacity × carsPerTrain
hourlyCapacity   = Math.floor(60 / headway) × trainCapacity
```

`headway` 優先取 `overrides[lineCode|hour]`，否則從 API 區間資料查對應小時。

## 元件結構（更新）

```
Congestion/
  RouteChartPanel.jsx        ← 加入 HeadwayEditor
  CongestionRouteChart.jsx   ← 路線距離圖（既有）
  HeadwayEditor.jsx          ← 班距調整（per-line capacity inputs + 折線圖）
  HeadwayChart.jsx           ← SVG 折線圖（可拖曳節點）
  HeadwayEditor.css
  index.jsx
```

## 實作步驟

1. `api.js` 確認 `fetchLineCapacities()` 和 `fetchRouteHeadways(serviceDay)` 已存在
2. 建立 `HeadwayChart.jsx`：純 SVG 元件，props `hours`/`values`/`color`/`onChange`
   - 每個整點一個可拖曳圓點
   - cubic bezier 平滑連線
   - hover tooltip 顯示 `{h}:00 → {v} min`
3. 建立 `HeadwayEditor.jsx`：
   - 按路線分組（`lineCode`），每線一個區塊
   - 每線頂部：`每輛 [input] 人 × [input] 輛/列 = N 人/列`（預設值來自 API）
   - 每線下方：`<HeadwayChart />` 顯示該線各小時班距，可拖曳調整
4. 在 `RouteChartPanel.jsx` 中 `<CongestionRouteChart />` 下方加入 `<HeadwayEditor />`
5. 後續：將 overrides 向上提升給 CongestionOverlay 用於地圖壅塞率渲染

