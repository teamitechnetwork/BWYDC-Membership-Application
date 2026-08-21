import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { requireAuth } from "../middleware/requireAuth";
import { csrfProtection } from "../middleware/csrfProtection";
import authRouter from "./auth";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import formsRouter from "./forms";
import settingsRouter from "./settings";
import chatRouter from "./chat";

const router: IRouter = Router();

/**
 * Return true for routes that must be publicly accessible without a session.
 *
 * Rules applied in order:
 *  - /healthz                          — health probe (any method)
 *  - /auth/*                           — login, logout, me (any method)
 *  - /public/*                         — public custom-form fetch & submission
 *  - POST  /membership-applications    — new member submits an application
 *  - PATCH /membership-applications/:id/photo — applicant uploads their photo
 */
function isPublicRoute(req: Request): boolean {
  const { method, path } = req;

  if (path === "/healthz") return true;
  if (path.startsWith("/auth/")) return true;
  if (path.startsWith("/public/")) return true;
  if (method === "POST" && path === "/membership-applications") return true;
  if (method === "PATCH" && path.endsWith("/photo")) return true;

  return false;
}

/**
 * Which requests need strict Origin/Referer (CSRF) verification.
 *
 * All state-changing requests do, except truly anonymous public writes that
 * never touch the session cookie (custom-form submissions and membership
 * applications). Auth routes are NOT exempt: login creates a session (login
 * CSRF) and logout destroys one, so both require an allowed Origin even
 * though they respond without an existing session.
 */
function needsCsrfProtection(req: Request): boolean {
  if (!isPublicRoute(req)) return true;
  if (req.path.startsWith("/auth/")) return true;
  return false;
}

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const finish = (err?: unknown): void => {
    if (err) {
      next(err);
      return;
    }
    if (isPublicRoute(req)) {
      next();
    } else {
      requireAuth(req, res, next);
    }
  };
  if (needsCsrfProtection(req)) {
    // Verify Origin first (CSRF), then session where required.
    csrfProtection(req, res, finish);
  } else {
    finish();
  }
}

router.use(adminAuth);
router.use(healthRouter);
router.use(authRouter);
router.use(applicationsRouter);
router.use(formsRouter);
router.use(settingsRouter);
router.use(chatRouter);

export default router;
