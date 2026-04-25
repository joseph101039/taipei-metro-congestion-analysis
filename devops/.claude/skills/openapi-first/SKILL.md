---
name: openapi-first
description: Scaffold a new endpoint in doc/openapi.yaml before any implementation — enforces the openapi-first workflow
disable-model-invocation: false
---

When the user runs /openapi-first (optionally with an endpoint name as $ARGUMENTS):

1. Ask the user for the following if not already provided:
   - HTTP method (GET, POST, PUT, DELETE, PATCH)
   - Path (e.g., `/api/stations/{id}/congestion`)
   - Brief description of what this endpoint does
   - Request parameters or body shape (if any)
   - Response shape (what does `data` contain on success?)

2. Read `../server/doc/openapi.yaml` to understand the existing schema conventions (response shapes, tag naming, parameter style).

3. Draft the new path entry in OpenAPI 3.0 format, following the patterns already in the file:
   - Use `{ data: ... }` for success responses
   - Use `{ error: string }` for 4xx/5xx responses
   - Pick an appropriate existing tag or propose a new one
   - Include all required parameters with types and descriptions

4. Show the draft YAML to the user and ask: "Does this look right before I add it to the file?"

5. On approval, append the new path to `../server/doc/openapi.yaml` in the correct location (under `paths:`).

6. Remind the user: now implement in this order:
   - `src/routes/<entity>.ts` — route binding
   - `src/controllers/<entity>Controller.ts` — parse req, call service, return HTTP
   - `src/services/<entity>Service.ts` — business logic only
   - `src/repositories/<entity>Repository.ts` — Knex queries only
   - `src/__tests__/<Entity>.test.ts` — unit test with mocked repository