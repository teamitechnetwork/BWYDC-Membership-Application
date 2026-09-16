import { Router, type IRouter } from "express";
import { getSenderEmail, setSenderEmail } from "../lib/email";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Admin: get current sender email ──
router.get("/settings/sender-email", async (_req, res): Promise<void> => {
  const senderEmail = await getSenderEmail();
  res.json({ senderEmail });
});

// ── Admin: update sender email ──
router.put("/settings/sender-email", async (req, res): Promise<void> => {
  const { senderEmail } = req.body as { senderEmail?: string };
  const email = senderEmail?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }
  await setSenderEmail(email);
  res.json({ senderEmail: email });
});

export default router;
