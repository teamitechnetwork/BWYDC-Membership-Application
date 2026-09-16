---
name: Imported workspace startup
description: Startup constraints after moving a preserved repository into a durable Replit project
---

When a repository is moved from a temporary conversation workspace into a project, preserved `node_modules` links can still point at the old workspace path, and artifact manifests may not be registered until the project refreshes them. Reinstall dependencies from the repository lockfile before restarting the managed frontend workflow, then verify both workflow logs and the rendered preview.

**Why:** The first restart failed because the frontend executable link targeted the old temporary path; after reinstalling, Tailwind exposed a second incomplete dependency-link issue that was fixed by a forced lockfile install.

**How to apply:** Treat a successful file copy as incomplete until the project’s managed workflow starts cleanly and a browser preview renders without transform errors.