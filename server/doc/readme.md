
#  外部資料來源

1. 臺北捷運各站分時進出量統計: [station_hourly_ridership](./station_hourly_ridership)
   - [csv](station_hourly_ridership/station_hourly_ridership.csv) 
   - [source link](https://data.gov.tw/dataset/128506)
   - 下載運量腳本 [download_ridership.ts](../scripts/download_ridership.ts)
   - 存入資料庫腳本 [import_all_ridership.sh](../scripts/import_all_ridership.sh)
   
2. 臺北都會區大眾捷運系統車站點位圖 - 經緯度
   - [source link](https://data.taipei/dataset/detail?id=758e5ae0-e6ee-448b-81f5-316eb68a5ba7)
   
3. 捷運各站之間距離 (km)
   - [station_distances.md](./station_distances.md)
   
4. 捷運各站之間行車時間 (分鐘)
   - [web link](https://web.metro.taipei/pages2026/WebRoutePlan)
   - 爬蟲 腳本[compute_shortest_routes.ts](../scripts/compute_shortest_routes.ts))
   - 爬蟲出的 [csv](route_min_time.csv)

5. 臺北市每月各里人口數及戶數
   - [source link](https://ca.gov.taipei/News_Content.aspx?n=8693DC9620A1AABF&sms=D19E9582624D83CB&s=6F385E21D02AAFD5)
   - 解析說明 [taipei_village_population.md](taipei_village_population/taipei_village_population.md)

6. 台北捷運各線班距與每班運量
   - [line_service.md](line_capacity/line_service.md)
   - 班距資料 [line_service.csv](line_capacity/line_service.csv)
   - 運量資料 [line_capacity.csv](line_capacity/line_capacity.csv)
