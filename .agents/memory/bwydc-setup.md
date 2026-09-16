---
name: BWYDC project setup quirks
description: Package firewall blocks tsx; drizzle-kit removed; DB schema applied via raw SQL
---

## tsx is blocked by the Replit package firewall
All tsx@4.23.x tarballs return 403 from the Replit package firewall.
- Removed `tsx` from the catalog in `pnpm-workspace.yaml`
- Removed the `@esbuild-kit/esm-loader` → tsx override from `pnpm-workspace.yaml`
- Removed `tsx` devDependency from `scripts/package.json` (replaced hello script with a plain node -e echo)

**Why:** tsx is a direct dependency of drizzle-kit@0.31.10 and was also in the workspace catalog. Both must be removed for `pnpm install` to succeed.

## drizzle-kit removed from lib/db
drizzle-kit@0.31.10 depends on tsx which is blocked. It was removed from `lib/db/package.json` devDependencies entirely.

**How to restore:** Once tsx is unblocked (check the firewall), add `"drizzle-kit": "^0.31.10"` back to `lib/db/package.json` devDependencies and run `pnpm install`. The `pnpm --filter @workspace/db run push` command will then work again.

## DB schema created via executeSql
Since drizzle-kit push is unavailable, the `membership_applications` table was created directly with executeSql (the checkDatabase/executeSql callbacks in CodeExecution).

**Why:** Drizzle-kit normally handles migrations; without it, use executeSql for DDL.

All DB schema changes must be added to lib/db/src/migrate.ts (idempotent startup migrations) — creating tables only via executeSql leaves fresh/production databases missing them (completion review rejects this).
