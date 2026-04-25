---
name: run-full-stack
description: Start both the server and web dev servers together for full-stack work from the devops session root
disable-model-invocation: false
---

When the user runs /run-full-stack:

1. Check that the required server env vars are set or that `../server/.env` exists. If missing, list what's needed: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=metro.

2. Tell the user to open two terminal tabs and run these commands:

   **Tab 1 — Server (port 3000):**
   ```bash
   cd ../server && npm run dev
   ```

   **Tab 2 — Web (port 3000 dev server → proxies /api to :3000):**
   ```bash
   cd ../web && npm run dev
   ```

   Note: the web Vite dev server uses port 3000 by default per its config — confirm the actual port from `../web/vite.config.*` if different.

3. Remind the user:
   - API docs are available at http://localhost:3000/api/docs once server is running
   - The web proxies all `/api` requests to the server automatically in dev mode
   - Hot reload is active on both — save any file and changes apply immediately

4. If the user asks to verify both are running, suggest checking:
   ```bash
   curl -s http://localhost:3000/api/lines | head -c 200
   ```