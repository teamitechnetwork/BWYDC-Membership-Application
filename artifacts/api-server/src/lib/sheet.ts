import { logger } from "./logger";

type SheetApplication = {
  id: string;
  submittedAt: string;
  fullName: string;
  phone: string;
  email: string;
  country: string;
  county: string;
  district: string;
  town: string;
  emergencyName: string;
  emergencyPhone: string;
  gender: string;
  dob: string;
  education: string;
  occupation: string;
  maritalStatus: string;
  children: number | string;
  affiliate: string;
  photo: "Yes" | "No";
  membershipType: string;
  loans: "Yes" | "No";
  groupDev: "Yes" | "No";
  training: "Yes" | "No";
  volunteer: "Yes" | "No";
  generalBenefits: "Yes" | "No";
  onBehalf: string;
  residentOf: string;
  shares: string;
  signature: string;
  newsletter: "Yes" | "No";
  terms: "Yes" | "No";
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 350;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function responseError(status: number): Error & { retryable?: boolean } {
  const error = new Error(`Webhook request failed with HTTP ${status}`) as Error & {
    retryable?: boolean;
  };
  error.retryable = status >= 500 && status <= 599;
  return error;
}

/**
 * Sends one application to the Google Apps Script webhook.
 *
 * This helper intentionally does not throw to its caller. A sheet outage must
 * never turn a successful database submission into a failed application.
 */
export async function sendToSheet(application: SheetApplication): Promise<void> {
  const url = process.env.SHEET_WEBHOOK_URL;
  const token = process.env.SHEET_WEBHOOK_TOKEN;

  if (!url || !token) {
    logger.error(
      { applicationId: application.id, hasUrl: Boolean(url), hasToken: Boolean(token) },
      "Google Sheet sync skipped because webhook secrets are missing",
    );
    return;
  }

  const payload = JSON.stringify({ ...application, token });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload,
        redirect: "follow",
      });

      if (!response.ok) {
        const error = responseError(response.status);
        if (error.retryable && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw error;
      }

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; row?: number; error?: string }
        | null;

      if (!result?.ok) {
        logger.error(
          { applicationId: application.id, status: response.status, webhookError: result?.error },
          "Google Sheet webhook reported a failure",
        );
        return;
      }

      logger.info(
        { applicationId: application.id, row: result.row, status: response.status },
        "Application synced to Google Sheet",
      );
      return;
    } catch (error) {
      const retryable =
        (error as { retryable?: boolean }).retryable === true ||
        error instanceof TypeError;

      if (retryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      logger.error(
        { applicationId: application.id, err: error },
        "Google Sheet webhook request failed",
      );
      return;
    }
  }
}

export function formatSubmittedAt(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export function yesNo(value: boolean): "Yes" | "No" {
  return value ? "Yes" : "No";
}

export function hasInterest(
  interests: readonly string[] | null | undefined,
  code: string,
): "Yes" | "No" {
  return yesNo(interests?.includes(code) ?? false);
}