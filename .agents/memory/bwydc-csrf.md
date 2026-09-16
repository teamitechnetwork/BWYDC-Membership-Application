---
name: CSRF with cross-site cookies
description: Why the API uses Origin-check CSRF middleware alongside CORS
---
The API's session cookies are SameSite=None (Vercel frontend is a different site than the API), so browsers attach them to cross-site requests.

**Why:** CORS allowlists do NOT prevent a hostile page from *sending* credentialed simple POSTs (urlencoded forms) — they only block reading the response. A code review rejected relying on CORS alone.

**How to apply:** All session-touching state-changing routes — including auth login (login CSRF) and logout, not just authenticated ones — must pass strict Origin/Referer verification (middleware/csrfProtection in the api-server) against the exact origin allowlist (lib/origins). Only truly anonymous public writes (form submissions, membership applications) are exempt. Non-browser clients must send an allowed Origin header.
