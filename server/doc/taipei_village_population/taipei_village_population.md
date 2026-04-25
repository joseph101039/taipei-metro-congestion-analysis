# 臺北市／新北市每月各里人口數及戶數

## 資料來源

| 縣市   | 來源機關       | 來源頁面 |
|--------|----------------|----------|
| 臺北市 | 臺北市民政局   | https://ca.gov.taipei/News_Content.aspx?n=8693DC9620A1AABF&sms=D19E9582624D83CB&s=6F385E21D02AAFD5 |
| 新北市 | 新北市民政局   | https://www.ca.ntpc.gov.tw/home.jsp?id=89bf7bf4d44b18e0 |

---

## 資料說明

- 提供臺北市／新北市各行政區、各里每月的人口數（男、女、合計）與戶數
- 格式：XLS / XLSX（官方每月更新）
- 粒度：里（最細行政層級）

---

## 取得步驟

1. 開啟來源頁面，找到最新月份的 Excel 附件（檔名格式如 `11312各里人口數.xls`）
2. 下載至 `doc/` 目錄，重新命名為 `taipei_village_population.xlsx`

---

## 解析步驟

### 前置套件

```bash
npm install xlsx
# 或使用 python: pip install openpyxl
```

### Excel 欄位對應

原始 Excel 通常有以下欄位（依實際檔案調整）：

| 原始欄位 | 說明 |
|----------|------|
| 區別     | 行政區名稱（如 中正區） |
| 里別     | 里名稱（如 文祥里） |
| 戶數     | 戶籍戶數 |
| 人口數   | 總人口（男＋女） |
| 男       | 男性人口 |
| 女       | 女性人口 |

### 目標 CSV 格式

輸出至 `doc/taipei_village_population.csv`，欄位如下：

```
year_month,district,village,households,population,male,female
```

範例：

```csv
year_month,district,village,households,population,male,female
202503,中正區,文祥里,1203,2845,1401,1444
202503,中正區,東門里,987,2210,1089,1121
```

- `year_month`：民國年月轉換為西元，格式 `YYYYMM`（民國 113 年 12 月 → `202412`）
- `district`：去除「區」字可選，建議保留完整名稱
- `village`：去除「里」字可選，建議保留完整名稱

---

## 民國年轉換

```typescript
function rocToAd(rocYearMonth: string): string {
  // 輸入格式: "11312"（民國113年12月）
  const year = parseInt(rocYearMonth.slice(0, -2), 10) + 1911;
  const month = rocYearMonth.slice(-2);
  return `${year}${month}`;
}
```

---

## 匯入資料庫

```bash
# 執行 migration（首次）
npm run migrate

# 將 doc/taipei_village_population/ 下所有 CSV 匯入
npx ts-node scripts/import_village_population.ts
```

腳本依檔名自動判斷格式：
- 含「新北」或「排行」→ 新北市格式（年月從欄位讀取）
- 其他 → 臺北市格式（年月從檔名解析，如「115年01月」）

---

## 里界線幾何資料

里面積（`area_km2`）由後端 API 提供，來源為 **內政部國土測繪中心村里界線**，
透過 [ronnywang/twgeojson](https://github.com/ronnywang/twgeojson) 整理為 GeoJSON。

幾何檔案存放於：`server/public/data/twvillage-taipei.json`（已篩選雙北，1488 里）

`shape_area` 為 TWD97 投影坐標系平方公尺，後端換算：

```
area_km2 = shape_area / 1_000_000
```

API 端點：

| 端點 | 說明 |
|------|------|
| `GET /api/population/village-boundaries` | 里界線 GeoJSON（含 `area_km2`），Cache 24h |
| `GET /api/population/village-density` | 各里月份人口數（tabular） |

前端在取得兩份資料後，以 `county \| district \| village` 為 key 進行 join，計算：

```
density_per_km2 = population / area_km2
```

---

## 注意事項

- Excel 第一列通常為標題或備註，需跳過（依實際檔案確認列號）
- 部分里可能有合計列（「合計」、「小計」），解析時需過濾
- 戶數與人口數欄位有時為字串帶千分位逗號，需 `replace(/,/g, '')` 後轉數字
- 各月份 Excel 結構基本一致，確認後可套用同一解析邏輯重複使用
