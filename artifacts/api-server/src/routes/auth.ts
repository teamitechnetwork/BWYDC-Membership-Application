import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Admin credentials MUST be provided as environment variables.
// The server will throw at startup if either is missing (see app startup check
// in app.ts), so these non-null assertions are safe after that guard.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

// ── POST /auth/login ──────────────────────────────────────────
router.post("/auth/login", (req, res): void => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim() !== ADMIN_USERNAME ||
    password !== ADMIN_PASSWORD
  ) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  (req.session as { adminAuthenticated?: boolean }).adminAuthenticated = true;
  res.json({ ok: true });
});

// ── POST /auth/logout ─────────────────────────────────────────
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── GET /auth/me ──────────────────────────────────────────────
// Lets the frontend check whether the current session is valid.
router.get("/auth/me", (req, res): void => {
  const authenticated = !!(req.session as { adminAuthenticated?: boolean })
    .adminAuthenticated;
  if (authenticated) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
