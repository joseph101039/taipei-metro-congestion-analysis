---
name: checklist
description: Read ../server/doc/checklist.md and show all incomplete items grouped by category
---

When the user runs /checklist:

1. Read `../server/doc/checklist.md` in full.

2. Parse all checklist items and group them by category (e.g., Infrastructure, Database, Seeds, API Endpoints, API Documentation, Testing).

3. Show only the **incomplete items** (those marked `[ ]`), grouped by category, formatted as a clean checklist:

   ```
   ## Infrastructure
   - [ ] CORS middleware
   - [ ] Global error handler middleware
   ...

   ## Testing
   - [ ] Lines tests
   ...
   ```

4. At the bottom, print a summary: "X of Y items complete across Z categories."

5. If the user asks which item to tackle next, recommend the highest-priority incomplete item based on its category (Infrastructure gaps block everything else; Testing gaps are lower priority than missing API endpoints).
