import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isAllowedOrigin } from "./lib/origins";

// ── Startup environment checks ────────────────────────────────────────────────
// Fail fast so a misconfigured deployment is obvious rather than silently
// falling back to insecure defaults.

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required. " +
      "Set them as Replit Secrets.",
  );
}

// CORS origin allowlist lives in ./lib/origins (shared with CSRF protection).

// ── App ───────────────────────────────────────────────────────────────────────
const app: Express = express();

// Trust the first proxy (Replit's HTTPS gateway) so req.secure reflects the
// TLS connection and express-session writes the Secure cookie correctly.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin requests (no Origin header) and known origins.
      // Disallowed origins get no CORS headers (callback(null, false)) rather
      // than an error — the CSRF middleware rejects them with a clean 403.
      callback(null, !origin || isAllowedOrigin(origin));
    },
    credentials: true,
  }),
);

// Session cookies:
//   SameSite=None  — the production frontend (Vercel) is a different site from
//                    the API (replit.app), so cross-site cookies are required.
//                    CSRF is mitigated by strict Origin verification on all
//                    authenticated state-changing routes (see middleware/csrfProtection).
//   Secure=true    — required with SameSite=None; req.secure=true via trust proxy.
//   HttpOnly=true  — not accessible from JavaScript.
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

export default app;
