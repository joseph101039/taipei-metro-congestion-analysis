# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conventions
- 如果有不確定的地方，請先提問確認，不要直接假設或做決定

## Helm / Kubernetes

```bash
bash ./helm/deploy.sh          # apply all releases
bash ./helm/deploy.sh --dry-run > dry-run.yaml          # dry-run all releases
bash ./helm/deploy.sh server   # apply only server release
bash ./helm/deploy.sh web      # apply only web release
```

**Ingress domains & service ports** (Kubernetes, `metro` namespace):

| Service | Ingress domain  | ClusterIP port |
|---------|-----------------|----------------|
| server  | api.metro.local | 3000           |
| web     | metro.local     | 5173           |

## Repository Layout

This is a monorepo. The `devops/` session root is empty — all code lives in sibling directories:

```
metro/
  server/   # Express + TypeScript API (Node.js)
  web/      # React + Vite frontend
  devops/   # (this session root — infrastructure/ops scripts) Run server and web on Docker Desktop (Kubeadm)
```

Each sub-project has its own `package.json`, git history, and `.claude/` settings. See their CLAUDE.md files for module-specific instructions:
- `@../server/CLAUDE.md`
- `@../web/CLAUDE.md`

## Server (`../server`)

**Stack**: Node.js + TypeScript (strict), Express, MySQL 8 via Knex, Jest

```bash
cd ../server
npm run dev              # hot reload via nodemon + ts-node
npm run build            # compile to dist/
```

**Layered architecture** (enforce strictly — no cross-layer imports):

```
src/
  routes/       # Express route bindings only
  controllers/  # Parse req → call service → return HTTP
  services/     # Business logic (no HTTP, no direct DB)
  repositories/ # Knex queries only — one file per entity
  models/       # TypeScript interfaces / domain types
  config/       # DB connection (database.ts)
  app.ts        # Middleware + route registration
  index.ts      # Server entry point
migrations/     # Schema-only migrations (TypeScript files, run via ts-node)
seeds/          # Static reference data
scripts/        # One-off data import / compute scripts
doc/            # openapi.yaml, design docs, checklist.md
```

**API conventions**: always write `doc/openapi.yaml` before implementing an endpoint. Response shape: `{ data: ... }` on success, `{ error: ... }` on failure. API prefix: `/api/...`, docs at `/api/docs`.

**Tests**: unit tests in `src/__tests__/`, mock repositories with Jest. Naming: `<Subject>.test.ts` (unit), `<subject>.route.test.ts` (integration).

**DB env vars required**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=metro`

## Web (`../web`)

**Stack**: React 19 + Vite (ESM), react-leaflet (Leaflet map), no TypeScript

```bash
cd ../web
npm run dev      # dev server on port 5173 (proxies /api → localhost:3000)
npm run build    # Vite production build to dist/
```

## Cross-cutting Conventions

**Branch naming**: `feat/xxx` for features, `fix/xxx` for bugs.

**Commit messages**: write a brief one-line message based on staged changes — do not ask for a message.

**Checklist**: always check `../server/doc/checklist.md` for alignment. If something in the code contradicts the checklist, raise it before proceeding.

**OpenAPI first**: write `doc/openapi.yaml` before implementing any new endpoint.

## Domain

Taipei Metro (MRT) congestion analysis system. Key concepts:
- **Congestion** is estimated by distributing OD (origin-destination) ridership records along shortest-path routes, weighted by travel time, to infer how many passengers are at each station at each minute.
- **RoutePathService** caches all-pairs shortest paths and travel times; `CongestionService` uses these to spread hourly OD counts into per-minute station load estimates.
- Reference data (lines, stations, capacities, headways, segment times, transfer overheads) is seeded via `seeds/` and never changed by migrations.
