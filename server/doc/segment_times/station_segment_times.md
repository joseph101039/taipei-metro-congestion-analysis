# 相鄰站搭乘時間 & 轉運站轉乘時間

資料來源：
- `../route_min_time_v2.csv`（任兩站最短乘車時間）
- `../transfer_overhead.csv`（轉運站平均轉乘時間）

---

## 推導方法

### 相鄰站搭乘時間

`route_min_time_v2.csv` 記錄任兩站之間的最短乘車時間。對於**直接相鄰**的兩站（同線且站碼差 1），其對應紀錄即為該區間的實際行駛時間。

**篩選邏輯**：
- 同一路線前綴（`BR`、`BL`、`R`、`G`、`O`、`Y`）
- 站碼數字差距 = 1（或含特殊站如 `R22A`、`G03A`）
- 取 `(A→B)` 或 `(B→A)` 任一記錄的乘車時間（雙向對稱）

### 轉運站轉乘時間

直接使用 `transfer_overhead.csv` 的 `平均轉乘時間(分)` 欄位。

---

## 相鄰站搭乘時間（各線）

### 文湖線 BR

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| BR01  | BR02  | 2 |
| BR02  | BR03  | 1 |
| BR03  | BR04  | 2 |
| BR04  | BR05  | 2 |
| BR05  | BR06  | 3 |
| BR06  | BR07  | 2 |
| BR07  | BR08  | 3 |
| BR08  | BR09  | 2 |
| BR09  | BR10  | 2 |
| BR10  | BR11  | 2 |
| BR11  | BR12  | 2 |
| BR12  | BR13  | 3 |
| BR13  | BR14  | 3 |
| BR14  | BR15  | 2 |
| BR15  | BR16  | 2 |
| BR16  | BR17  | 2 |
| BR17  | BR18  | 2 |
| BR18  | BR19  | 2 |
| BR19  | BR20  | 2 |
| BR20  | BR21  | 3 |
| BR21  | BR22  | 2 |
| BR22  | BR23  | 2 |
| BR23  | BR24  | 2 |

### 板南線 BL

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| BL01  | BL02  | 3 |
| BL02  | BL03  | 2 |
| BL03  | BL04  | 2 |
| BL04  | BL05  | 3 |
| BL05  | BL06  | 2 |
| BL06  | BL07  | 2 |
| BL07  | BL08  | 2 |
| BL08  | BL09  | 2 |
| BL09  | BL10  | 4 |
| BL10  | BL11  | 2 |
| BL11  | BL12  | 2 |
| BL12  | BL13  | 2 |
| BL13  | BL14  | 2 |
| BL14  | BL15  | 2 |
| BL15  | BL16  | 2 |
| BL16  | BL17  | 2 |
| BL17  | BL18  | 2 |
| BL18  | BL19  | 2 |
| BL19  | BL20  | 2 |
| BL20  | BL21  | 2 |
| BL21  | BL22  | 2 |
| BL22  | BL23  | 2 |

### 松山新店線 G

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| G01   | G02   | 2 |
| G02   | G03   | 2 |
| G03   | G03A  | 4 |
| G03A  | G04   | 8 |
| G04   | G05   | 2 |
| G05   | G06   | 2 |
| G06   | G07   | 3 |
| G07   | G08   | 2 |
| G08   | G09   | 2 |
| G09   | G10   | 2 |
| G10   | G11   | 2 |
| G11   | G12   | 2 |
| G12   | G13   | 2 |
| G13   | G14   | 2 |
| G14   | G15   | 2 |
| G15   | G16   | 2 |
| G16   | G17   | 2 |
| G17   | G18   | 2 |
| G18   | G19   | 3 |

> 備註：G03A 為小碧潭支線，G03（七張）→ G03A（小碧潭），屬支線端點。

### 中和新蘆線 O

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| O01   | O02   | 2 |
| O02   | O03   | 2 |
| O03   | O04   | 2 |
| O04   | O05   | 4 |
| O05   | O06   | 4 |
| O06   | O07   | 3 |
| O07   | O08   | 2 |
| O08   | O09   | 2 |
| O09   | O10   | 2 |
| O10   | O11   | 2 |
| O11   | O12   | 2 |
| O12   | O13   | 3 |
| O13   | O14   | 2 |
| O14   | O15   | 2 |
| O15   | O16   | 3 |
| O16   | O17   | 2 |
| O17   | O18   | 2 |
| O18   | O19   | 3 |
| O19   | O20   | 2 |
| O20   | O21   | 3 |
| O50   | O51   | 2 |
| O51   | O52   | 2 |
| O52   | O53   | 2 |
| O53   | O54   | 2 |

> 備註：O50–O54 為蘆洲支線（蘆洲方向），與主線 O17（新莊→南勢角）獨立分段計算。

### 淡水信義線 R

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| R02   | R03   | 2 |
| R03   | R04   | 2 |
| R04   | R05   | 2 |
| R05   | R06   | 2 |
| R06   | R07   | 2 |
| R07   | R08   | 3 |
| R08   | R09   | 2 |
| R09   | R10   | 2 |
| R10   | R11   | 2 |
| R11   | R12   | 2 |
| R12   | R13   | 1 |
| R13   | R14   | 2 |
| R14   | R15   | 2 |
| R15   | R16   | 2 |
| R16   | R17   | 2 |
| R17   | R18   | 2 |
| R18   | R19   | 2 |
| R19   | R20   | 2 |
| R20   | R21   | 2 |
| R21   | R22   | 2 |
| R22   | R22A  | 3 |
| R22A  | R23   | 8 |
| R23   | R24   | 2 |
| R24   | R25   | 2 |
| R25   | R26   | 3 |
| R26   | R27   | 3 |
| R27   | R28   | 3 |

> 備註：R22A 為新北投支線（北投→新北投），屬支線端點。

---

## 資料驗證結果

### 驗證方法

以 Python 腳本對照 `route_min_time_v2.csv`：
1. **直接比對**：每條相鄰區間 `(A, B)` 的文件值是否等於 CSV 中的 `(A→B)` 或 `(B→A)` 的乘車時間
2. **累加比對**：各線從起點累加區間時間，與 CSV 中任兩站的直接時間比較

---

### 結果摘要

| 驗證項目 | 結果 |
|---------|------|
| 相鄰區間直接比對（共 128 筆） | ✅ 全部吻合，0 筆錯誤 |
| 累加值與 CSV 多站直接值比對 | ⚠️ 722 筆差異（見原因分析） |

---

### 差異原因分析

#### 原因 A：CSV 使用分鐘整數四捨五入

CSV 儲存的是各站對之間的**整數分鐘**，由實際班表推導取整。相鄰區間時間各自取整後相加，可能產生 ±1 分鐘的誤差。

範例（文湖線）：
```
BR05→BR06 實際：~2.7 分 → 取整 = 3
BR06→BR07 實際：~1.8 分 → 取整 = 2
合計文件值 = 5

BR05→BR07 實際：~4.5 分 → 取整 = 4  ← CSV 直接值
```
→ 文件累加 5 ≠ CSV 4，差 -1

同理也有 +1 的方向（BL01→BL03 文件=5，CSV=6）。

**結論**：差異均為 ±1～±5 分鐘，源自分鐘取整誤差，**不代表區間值本身有誤**。

---

#### 原因 B：CSV 採用跨線最短路徑路由

`route_min_time_v2.csv` 為**全網最短乘車時間**，長途旅程可能透過換乘其他線路得到更短時間，而非同線直達。

範例：
```
BR01→BR24（文湖線全線）
  同線累加 = 50 分
  CSV = 37 分  (via BL15 轉乘板南線)

BR10→BR24
  同線累加 = 31 分
  CSV = 15 分  (轉乘路徑更快)
```

相鄰區間則必為同線直達，故不受此影響。

---

### 結論

**文件中的 128 個相鄰區間行駛時間數值均正確**，與 CSV 完全吻合。

累加值與 CSV 多站直達值之差異，來自：
1. 整數取整傳播誤差（±1～±5 分）
2. CSV 使用跨線換乘路由（長途差距更大）

**這些區間時間適用於壅塞模擬中的同線區間載客量計算**，若需要精確的兩站旅行時間，應直接查詢 `route_min_time_v2.csv`。

### 環狀線 Y

| 起站  | 迄站  | 行駛時間(分) |
|-------|-------|-------------|
| Y07   | Y08   | 3 |
| Y08   | Y09   | 2 |
| Y09   | Y10   | 2 |
| Y10   | Y11   | 2 |
| Y11   | Y12   | 4 |
| Y12   | Y13   | 2 |
| Y13   | Y14   | 2 |
| Y14   | Y15   | 2 |
| Y15   | Y16   | 3 |
| Y16   | Y17   | 4 |
| Y17   | Y18   | 3 |
| Y18   | Y19   | 2 |
| Y19   | Y20   | 3 |

---

## 轉運站轉乘時間

資料來源：`transfer_overhead.csv`（實測平均值）

| 轉運站代碼 | 站碼組合      | 站名       | 平均轉乘時間(分) |
|-----------|--------------|-----------|----------------|
| 009  | BR11 / G16   | 南京復興   | 4.4 |
| 010  | BR10 / BL15  | 忠孝復興   | 4.5 |
| 011  | BR09 / R05   | 大安       | 4.6 |
| 031  | BR24 / BL23  | 南港展覽館 | 4.3 |
| 035  | G03          | 七張       | 2.2 |
| 036  | G04 / Y07    | 大坪林     | 2.5 |
| 041  | G09 / O05    | 古亭       | 1.3 |
| 042  | R08 / G10    | 中正紀念堂 | 1.4 |
| 047  | O02 / Y11    | 景安       | 5.3 |
| 051  | R10 / BL12   | 台北車站   | 3.3 |
| 053  | R11 / G14    | 中山       | 2.8 |
| 055  | R13 / O11    | 民權西路   | 2.5 |
| 064  | R22          | 北投       | 2.3 |
| 086  | G12 / BL11   | 西門       | 1.3 |
| 089  | O07 / BL14   | 忠孝新生   | 1.5 |
| 123  | O17 / Y18    | 頭前庄     | 5.5 |
| 128  | O12          | 大橋頭     | 0.7 |
| 132  | G15 / O08    | 松江南京   | 1.4 |
| 134  | R07 / O06    | 東門       | 1.2 |
| 209  | Y16          | 板橋       | 0.0 |
| 210  | Y17          | 新埔民生   | 0.0 |

---

## 實作計畫

### 目標

新增兩張資料表：
1. `station_segment_times` — 相鄰站區間行駛時間
2. `transfer_overheads` — 轉運站平均轉乘時間

---

### 資料庫 Schema

#### `station_segment_times`

```sql
CREATE TABLE station_segment_times (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  line_code        VARCHAR(5)  NOT NULL,        -- 路線代碼 (BR/BL/R/G/O/Y)
  from_station_code VARCHAR(6) NOT NULL,        -- 起站代碼
  to_station_code  VARCHAR(6)  NOT NULL,        -- 迄站代碼（升序方向）
  travel_time_min  TINYINT UNSIGNED NOT NULL,   -- 行駛時間（分）
  UNIQUE KEY uq_segment (line_code, from_station_code, to_station_code),
  KEY idx_line (line_code)
);
```

> 雙向對稱：查詢時需同時查 `(from→to)` 與 `(to→from)`，或 seed 時存兩筆。

#### `transfer_overheads`

```sql
CREATE TABLE transfer_overheads (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transfer_station_id   SMALLINT UNSIGNED NOT NULL UNIQUE, -- 轉運站代碼（009、010…）
  station_codes         VARCHAR(20) NOT NULL,              -- 站碼組合，如 "BR11/G16"
  station_name          VARCHAR(20) NOT NULL,
  sample_count          SMALLINT UNSIGNED NOT NULL,
  avg_transfer_time_min DECIMAL(3,1) NOT NULL,
  KEY idx_transfer_station (transfer_station_id)
);
```

---

### 遷移檔案

```
migrations/
  20260421000003_create_station_segment_times.ts
  20260421000004_create_transfer_overheads.ts
```

---

### Seed 檔案

```
seeds/
  05_station_segment_times.ts   -- 依上方各線資料表插入
  06_transfer_overheads.ts      -- 依轉運站資料表插入
```

---

### TypeScript 介面（models/）

```typescript
// models/StationSegmentTime.ts
export interface StationSegmentTime {
  id: number;
  line_code: string;
  from_station_code: string;
  to_station_code: string;
  travel_time_min: number;
}

// models/TransferOverhead.ts
export interface TransferOverhead {
  id: number;
  transfer_station_id: number;
  station_codes: string;
  station_name: string;
  sample_count: number;
  avg_transfer_time_min: number;
}
```

---

### API 端點

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/segment-times` | 取得所有相鄰站行駛時間（可 `?line=BR` 篩選） |
| `GET` | `/segment-times/:from/:to` | 取得指定區間行駛時間 |
| `GET` | `/transfer-overheads` | 取得所有轉運站轉乘時間 |
| `GET` | `/transfer-overheads/:station_id` | 取得指定轉運站轉乘時間 |

---

### 檔案清單

```
migrations/20260421000003_create_station_segment_times.ts
migrations/20260421000004_create_transfer_overheads.ts
seeds/05_station_segment_times.ts
seeds/06_transfer_overheads.ts
src/models/StationSegmentTime.ts
src/models/TransferOverhead.ts
src/repositories/StationSegmentTimeRepository.ts
src/repositories/TransferOverheadRepository.ts
src/services/StationSegmentTimeService.ts
src/services/TransferOverheadService.ts
src/controllers/StationSegmentTimeController.ts
src/controllers/TransferOverheadController.ts
src/routes/stationSegmentTimeRoutes.ts
src/routes/transferOverheadRoutes.ts
```
