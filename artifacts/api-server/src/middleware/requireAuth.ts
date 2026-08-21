import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that rejects unauthenticated requests with 401.
 * Attach to any route that should only be accessible by a logged-in admin.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if ((req.session as { adminAuthenticated?: boolean }).adminAuthenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}
