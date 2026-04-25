# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conventions
- 如果有不確定的地方，請先提問確認，不要直接假設或做決定

## Stack

- **Runtime**: Node.js + TypeScript (ES2016+, strict mode)
- **Framework**: Express
- **Database**: MySQL 8 via Knex
- **Linting**: ESLint + Prettier
- **Tests**: Jest

## Commands

```bash
npm run dev              # run with hot reload (ts-node / nodemon)
npm run build            # compile TypeScript to dist/
npm run lint             # lint source files
npm test                 # run Jest unit tests

npm run migrate          # run pending migrations
npm run migrate:rollback # rollback last migration batch
npm run migrate:status   # show migration status
npm run seed             # seed reference data (stations, distances, headways…)
```

## Architecture

Strict layered structure — each layer has one responsibility:

```
src/
  routes/        # Express route definitions only — no logic
  controllers/   # Parse request, call service, return HTTP response
  services/      # Business logic — no HTTP, no direct DB access
  repositories/  # All MySQL queries via Knex — one file per domain entity
  models/        # TypeScript interfaces and domain types
  config/        # DB connection (database.ts), env config
  app.ts         # Express app setup (middleware, routes)
  index.ts       # Server entry point
migrations/      # Knex schema migrations (structure only, no seed data)
seeds/           # Static reference data (lines, stations, distances, capacities)
doc/             # OpenAPI spec, design notes, checklist
```

**Layer rules (enforce strictly):**
- Controllers must not query the DB directly — always go through a service
- Services must not import from `routes/` or use `req`/`res`
- Repositories must not contain business logic — raw Knex queries only
- New domain entity → new service + new repository file

## Writing APIs

1. **Always write `doc/openapi.yaml` first** before implementing any API endpoint
2. Follow the existing route → controller → service → repository chain
3. Return consistent JSON shape: `{ data: ... }` for success, `{ error: ... }` for errors

## Database

- Migrations live in `migrations/` — schema changes only, no seed data
- Seeds live in `seeds/` — static reference data (lines, stations, etc.)
- All queries go through Knex in the repository layer (`src/repositories/`)
- `.env` required: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=metro`

## Testing

- Write unit tests after implementing any API or service
- Tests live in `src/__tests__/`
- Mock repositories with Jest — services should be testable without a real DB
- Naming: `<Subject>.test.ts` for unit, `<subject>.route.test.ts` for integration

## Commit messages
- When asked to commit, automatically write a brief one-line message based on staged changes — do not ask the user for the message

## Checklist
檢查打勾完成事項 [checklist.md](doc/checklist.md)，不一致地方要提問
