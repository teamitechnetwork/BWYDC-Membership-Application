// ── Allowed origins ───────────────────────────────────────────────────────────
// Credentialed CORS and CSRF checks must use an exact allowlist — wildcard
// patterns would let any other Replit project on the same domain make
// authenticated requests. We build the list from the Replit runtime domain
// env vars (which are exact, not patterns) plus localhost variants for dev.
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Exact Replit domains — provided by the platform at runtime.
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    origins.add(`https://${devDomain}`);
    origins.add(`http://${devDomain}`); // proxied HTTP in some setups
  }
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    for (const d of domains.split(",")) {
      const trimmed = d.trim();
      if (trimmed) {
        origins.add(`https://${trimmed}`);
      }
    }
  }

  // Production frontend (Vercel) + any extra origins from env (comma-separated).
  origins.add("https://bwydc-membership-form-2026.vercel.app");
  const extra = process.env.FRONTEND_ORIGINS;
  if (extra) {
    for (const o of extra.split(",")) {
      const trimmed = o.trim().replace(/\/$/, "");
      if (trimmed) origins.add(trimmed);
    }
  }

  // Localhost variants for local development.
  for (const port of ["3000", "5173", "8081", "19033"]) {
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }

  return origins;
}

export const ALLOWED_ORIGINS = buildAllowedOrigins();

// Vercel preview deployments for this project (created per git push) get
// unique subdomains under the owner's team scope. Allow those too so the
// admin isn't locked out when opening a preview link. The suffix is exact
// and scoped to this Vercel team, so other sites can't match it.
const VERCEL_PREVIEW_SUFFIX = "-itechnetworkafrica-gifs-projects.vercel.app";

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return origin.startsWith("https://") && origin.endsWith(VERCEL_PREVIEW_SUFFIX);
}
