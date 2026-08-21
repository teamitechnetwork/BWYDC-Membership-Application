import { ReplitConnectors } from "@replit/connectors-sdk";
import { pool } from "@workspace/db";

const DEFAULT_SENDER = "onboarding@resend.dev";

export async function getSenderEmail(): Promise<string> {
  const result = await pool.query(
    "SELECT value FROM app_settings WHERE key = 'sender_email'",
  );
  const value = result.rows[0]?.value?.trim();
  return value || DEFAULT_SENDER;
}

export async function setSenderEmail(email: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('sender_email', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [email],
  );
}

interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send an email to many recipients individually (each recipient gets their
 * own email; they cannot see each other's addresses). Uses Resend's batch
 * endpoint in chunks of 100.
 */
export async function sendBulkEmail(options: {
  from: string;
  fromName?: string;
  recipients: string[];
  subject: string;
  text: string;
}): Promise<SendResult> {
  const connectors = new ReplitConnectors();
  const from = options.fromName
    ? `${options.fromName} <${options.from}>`
    : options.from;

  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  const CHUNK = 100;

  for (let i = 0; i < options.recipients.length; i += CHUNK) {
    const chunk = options.recipients.slice(i, i + CHUNK);
    const payload = chunk.map((to) => ({
      from,
      to: [to],
      subject: options.subject,
      text: options.text,
    }));

    const response = await connectors.proxy("resend", "/emails/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      result.sent += chunk.length;
    } else {
      result.failed += chunk.length;
      let message = `Resend error (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) message = body.message;
      } catch {
        // keep generic message
      }
      result.errors.push(message);
    }
  }

  return result;
}
