import type { Request, Response, NextFunction } from "express";
import { isAllowedOrigin } from "../lib/origins";

/**
 * CSRF protection for cookie-authenticated, state-changing requests.
 *
 * Session cookies use SameSite=None (the production frontend lives on a
 * different site than the API), so the browser attaches them to cross-site
 * requests. CORS does NOT stop a hostile page from *sending* a credentialed
 * simple POST (e.g. a urlencoded form) — it only blocks reading the response.
 *
 * Defense: strict Origin verification (per OWASP CSRF guidance). Browsers
 * always attach an Origin header to cross-site POST/PUT/PATCH/DELETE
 * requests, and it cannot be spoofed from a page. We therefore require every
 * state-changing request to an authenticated route to carry an Origin (or
 * Referer, as fallback) that is on the exact allowlist. Requests without
 * either header are rejected — legitimate browser clients always send one,
 * and non-browser clients (curl, scripts) are not CSRF-relevant but must be
 * explicit by setting an allowed Origin.
 */
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!STATE_CHANGING.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin) {
    if (isAllowedOrigin(origin)) {
      next();
      return;
    }
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }

  // Fallback: some older browsers send only Referer.
  const referer = req.headers.referer;
  if (referer) {
    try {
      if (isAllowedOrigin(new URL(referer).origin)) {
        next();
        return;
      }
    } catch {
      // fall through to rejection
    }
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }

  res.status(403).json({ error: "Missing Origin header" });
}
