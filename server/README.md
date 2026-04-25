# Taipei Metro Server

REST API backend for Taipei MRT (捷運) transit data analysis and visualization.

## What this system does

This server models the **Taipei Metro network** and exposes structured data for use in maps, dashboards, and transit tools. It covers:

- **Network topology** — Lines, stations, segments, and branch lines (淡水信義 R, 板南 BL, 松山新店 G, 中和新蘆 O, 文湖 BR, 環狀 Y, 新北投 R22A, 小碧潭 G03A)
- **Ridership analysis** — Hourly OD (origin–destination) passenger flows derived from historical data
- **Congestion estimation** — Per-station instantaneous passenger load and congestion rate, computed from ridership + train capacity + headway
- **Routing** — Shortest-stop and fastest (minimum travel time) routes between any two stations, with transfer overhead
- **Capacity data** — Per-line train capacity (`line_capacities`), route headways (`route_headways`), and inter-station travel times (`station_segment_times`)
- **Geospatial data** — Station coordinates, village boundary GeoJSON with population density for demand analysis

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| Database | MySQL 8 |
| Query builder | Knex |
| Docs | OpenAPI 3.0 (`doc/openapi.yaml`) |

## Getting started

```bash
cp .env.example .env        # configure DB credentials
npm install
npm run migrate             # run all schema migrations
npm run seed                # load static reference data (lines, stations, distances…)
npm run dev                 # start with hot reload at http://localhost:3000
```

## Key API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lines` | All lines with segments |
| GET | `/api/stations` | All stations with coordinates |
| GET | `/api/ridership` | Hourly OD passenger flows |
| GET | `/api/congestion/station-load-range` | Per-station instantaneous load over a time range |
| GET | `/api/congestion/congestion-rate-range` | Per-station congestion rate (load / capacity) |
| GET | `/api/routes/shortest` | Shortest-stop route between two stations |
| GET | `/api/routes/fastest` | Fastest (min travel time) route between two stations |
| GET | `/api/segment-times` | Inter-station travel times |
| GET | `/api/route-headways` | Train headways per route and time window |
| GET | `/api/line-capacities` | Passenger capacity per train per line |
| GET | `/api/population/villages` | Village GeoJSON with population and area |
| GET | `/api/docs` | Swagger UI |

Full spec: [`doc/openapi.yaml`](doc/openapi.yaml)

## Architecture

```
src/
  routes/        # Express route definitions only
  controllers/   # Parse request → call service → return response
  services/      # Business logic (no HTTP, no direct DB)
  repositories/  # All MySQL queries (one repo per domain)
  models/        # TypeScript interfaces
  config/        # DB connection, env
migrations/      # Knex schema migrations
seeds/           # Static reference data (lines, stations, distances…)
doc/             # OpenAPI spec, design notes, checklists
```

## Scripts

```bash
npm run build            # compile TypeScript
npm run lint             # ESLint + Prettier
npm test                 # Jest unit tests
npm run migrate          # run pending migrations
npm run migrate:rollback # rollback last batch
npm run migrate:status   # show migration status
npm run seed             # seed reference data
```
