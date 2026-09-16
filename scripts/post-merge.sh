#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Note: drizzle-kit is not used in this project; database tables are
# created/updated via SQL directly (see .agents/memory/bwydc-setup.md).
