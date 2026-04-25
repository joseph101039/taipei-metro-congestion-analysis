# Taipei Metro Server — 建構清單

## 基礎設施

- [x] TypeScript + Express + Knex 專案初始化
- [x] ESLint + Prettier 設定
- [x] Jest 測試框架設定
- [x] `.env` / `knexfile.ts` 資料庫連線設定
- [x] `npm run dev` 熱重載（nodemon + ts-node）
- [x] `npm run build` TypeScript 編譯通過
- [ ] CORS middleware
- [ ] 全域 error handler middleware（未捕捉例外統一回 5xx）
- [ ] 404 handler（路由不存在時回 404 JSON）
- [ ] Request logging middleware（morgan 或自訂）
- [ ] Health check 端點 `GET /health`

---

## 資料庫 Migration（共 17 筆，全部完成）

- [x] `create_stations`
- [x] `create_ridership`
- [x] `create_station_distances`
- [x] `add_station_alias`
- [x] `create_lines`
- [x] `add_line_id_to_stations`
- [x] `add_parent_line_id_to_lines`
- [x] `add_coordinates_to_stations`
- [x] `create_shortest_routes`
- [x] `create_route_min_time`
- [x] `create_line_routes_and_route_stops`
- [x] `create_village_population`
- [x] `add_line_id_to_line_routes`
- [x] `create_line_capacities`
- [x] `create_route_headways`
- [x] `create_station_segment_times`
- [x] `create_transfer_overheads`

---

## 資料載入

### Seed（靜態參考資料）

- [x] `00_lines` — 路線基本資料
- [x] `01_stations` — 站點基本資料
- [x] `02_station_distances` — 站間距離
- [x] `03_line_capacities` — 各線車廂定員
- [x] `04_route_headways` — 各線班距
- [x] `05_station_segment_times` — 相鄰站行駛時間
- [x] `06_transfer_overheads` — 轉運站轉乘時間

### Import Scripts（大型或動態資料）

- [x] `import_ridership.ts` — 進出站旅次資料
- [x] `import_all_ridership.sh` — 批次匯入多月旅次
- [x] `import_route_min_time.ts` — 任兩站最短乘車時間
- [x] `import_route_stops.ts` — 路線停靠站序
- [x] `import_village_population.ts` — 里人口資料
- [x] `compute_shortest_routes.ts` — 預算最短路徑快取
- [x] `crawl_routes.ts` / `crawl_routes_v2.ts` — 路線資料爬取

---

## API 功能模組

### 路線 Lines

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/lines` — 所有路線（含區段）
- [x] `GET /api/lines/:code` — 單一路線
- [x] `GET /api/lines/routes` — 所有路線行駛路徑
- [x] `GET /api/lines/:code/routes` — 單一路線行駛路徑

### 站點 Stations

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/stations` — 所有站點
- [x] `GET /api/stations/:code` — 單一站點

### 站間距離 Station Distances

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/station-distances`

### 進出站旅次 Ridership

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/ridership` — 各站各小時進出旅次
- [x] `GET /api/ridership/flows` — 旅次流量（OD 對）

### 路線規劃 Route

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/route` — 最短路徑規劃（含轉乘）

### 旅行時間 Route Time

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/route-time` — 任兩站最短乘車時間
- [x] `GET /api/route-time/transfers` — 附轉乘段明細

### 村里人口 Population

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/population/village-boundaries` — 里行政邊界
- [x] `GET /api/population/village-density` — 里人口密度

### 車廂定員 Line Capacities

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/line-capacities`

### 班距 Route Headways

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/route-headways`
- [x] `GET /api/route-headways/:routeId`

### 相鄰站行駛時間 Segment Times

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/segment-times`
- [x] `GET /api/segment-times/:from/:to`

### 轉運站轉乘時間 Transfer Overheads

- [x] Model / Repository / Service / Controller / Routes
- [x] `GET /api/transfer-overheads`
- [x] `GET /api/transfer-overheads/:sid`

### 壅塞分析 Congestion

- [x] Service / Controller / Routes
- [x] `GET /api/congestion/station-load` — 各站各小時單向乘載量
- [x] `GET /api/congestion/station-load-range` — 指定時段乘載量

---

## API 文件

- [x] `doc/openapi.yaml` — OpenAPI 3.0 規格
- [x] Swagger UI 掛載於 `GET /api/docs`
- [ ] openapi.yaml 補齊 segment-times、transfer-overheads、congestion 的 schema 定義
- [ ] 撰寫 ER diagram 說明資料庫結構和關聯
---

## 測試

- [x] `StationDistanceService` 單元測試
- [x] `StationDistanceController` 單元測試
- [x] `station-distances` 路由整合測試
- [ ] Lines / Stations 路由測試
- [ ] Route / RouteTime 服務測試
- [ ] Ridership 服務測試
- [ ] Congestion 服務測試
- [ ] Segment Times / Transfer Overheads 測試

---

## 文件

- [x] `doc/segment_times/station_segment_times.md` — 相鄰站時間推導 & 實作計畫
- [x] `doc/line_capacity/line_service.md` — 班距與車廂定員說明
- [x] `doc/conjestion/station_hourly_capacity.md` — 壅塞計算方法說明
- [x] `doc/conjestion/congestion_rate.md` — 混雜率計算公式與實作建議
- [x] `doc/station_distances.md` — 站間距離資料說明
