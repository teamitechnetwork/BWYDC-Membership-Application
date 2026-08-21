---
name: BWYDC email via Resend
description: Bulk email setup, Resend test-mode limits, sender-email storage, and stale lib dist gotcha
---

## Resend integration (connected Aug 2026)
- Sending goes through `@replit/connectors-sdk` proxy (`connectors.proxy("resend", "/emails/batch", ...)`), see `artifacts/api-server/src/lib/email.ts`.
- **Test-mode limits:** until the org verifies a domain in the Resend dashboard, only sender `onboarding@resend.dev` works, and delivery is restricted to the Resend account owner's address. `example.com` recipients are rejected with a clear error.
- **How to apply:** if bulk send fails with sender/recipient errors, it's almost certainly domain verification, not code.

## Sender email
- Admin-editable "From" address stored in `app_settings` table (key `sender_email`), defaults to `onboarding@resend.dev`. Managed via `/api/settings/sender-email`.

## Stale lib dist .d.ts breaks tsc
- `lib/*` packages export `./src/index.ts`, but stale `dist/*.d.ts` files can make `tsc --noEmit` in artifact packages report missing exports that exist at runtime.
- **How to apply:** rebuild lib packages / run `tsc -b --force` before trusting type errors about workspace package exports.
