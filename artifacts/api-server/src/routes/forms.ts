import { Router, type IRouter } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { getSenderEmail, sendBulkEmail } from "../lib/email";

const router: IRouter = Router();

const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "select",
  "checkbox",
  "photo",
] as const;

interface FormField {
  id: string;
  label: string;
  type: (typeof FIELD_TYPES)[number];
  required: boolean;
  options?: string[]; // for select
}

const formFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(200),
    type: z.enum(FIELD_TYPES),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  })
  .strict()
  .superRefine((f, ctx) => {
    if (f.type === "select" && (!f.options || f.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Select field "${f.label}" must have at least one option`,
      });
    }
  });

const fieldsSchema = z
  .array(formFieldSchema)
  .min(1, "At least one field is required")
  .max(100, "Too many fields (max 100)")
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    for (const f of fields) {
      if (seen.has(f.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate field id "${f.id}"`,
        });
      }
      seen.add(f.id);
    }
  });

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
// Data-URL images: cap at ~1.4 MB of base64 (≈1 MB binary) for logos/headers.
const MAX_IMAGE_DATA_URL = 1_400_000;

const imageDataUrl = z
  .string()
  .max(MAX_IMAGE_DATA_URL, "Image is too large (max ~1 MB)")
  .refine((v) => isValidImageDataUrl(v), "Must be a valid image");

const themeSchema = z
  .object({
    logoDataUrl: imageDataUrl.optional().nullable(),
    headerImageDataUrl: imageDataUrl.optional().nullable(),
    primaryColor: z.string().regex(HEX_COLOR_RE, "Invalid color").optional().nullable(),
    textColor: z.string().regex(HEX_COLOR_RE, "Invalid color").optional().nullable(),
    backgroundColor: z.string().regex(HEX_COLOR_RE, "Invalid color").optional().nullable(),
    successMessage: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const createFormSchema = z
  .object({
    title: z.string().trim().min(1, "title is required").max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    fields: fieldsSchema,
    theme: themeSchema.optional(),
  })
  .strict();

const updateFormSchema = z
  .object({
    title: z.string().trim().min(1, "title cannot be empty").max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    fields: fieldsSchema.optional(),
    published: z.boolean().optional(),
    theme: themeSchema.optional(),
  })
  .strict();

function zodErrorMessage(err: z.ZodError): string {
  const issue = err.issues[0];
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_VALUE_LENGTH = 5000;
// One photo: ~3 MB binary (≈4.2M base64 chars). Whole submission: stay well
// under the 10 MB express.json parser limit including JSON overhead.
const MAX_PHOTO_CHARS = 4_200_000;
const MAX_SUBMISSION_CHARS = 8_000_000;

/**
 * Verifies a data URL contains valid base64 that decodes to bytes with a
 * recognized image signature (PNG, JPEG, GIF, WEBP).
 */
function isValidImageDataUrl(dataUrl: string): boolean {
  const m = /^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    dataUrl,
  );
  if (!m) return false;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(m[2], "base64");
  } catch {
    return false;
  }
  if (bytes.length < 12) return false;
  // Magic-byte checks
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true; // GIF
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true; // WEBP (RIFF....WEBP)
  return false;
}

/**
 * Validates a public submission's data against the form's field
 * definitions. Returns a cleaned data object or an error message.
 */
function validateSubmission(
  fields: FormField[],
  data: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const fieldIds = new Set(fields.map((f) => f.id));
  for (const key of Object.keys(data)) {
    if (!fieldIds.has(key)) {
      return { ok: false, error: `Unknown field "${key}"` };
    }
  }

  const clean: Record<string, unknown> = {};
  for (const f of fields) {
    const v = data[f.id];
    const empty = v === undefined || v === null || v === "" || v === false;

    if (empty) {
      if (f.required) {
        return { ok: false, error: `"${f.label}" is required` };
      }
      continue;
    }

    if (f.type === "checkbox") {
      if (typeof v !== "boolean") {
        return { ok: false, error: `"${f.label}" must be true or false` };
      }
      clean[f.id] = v;
      continue;
    }

    if (f.type === "photo") {
      if (typeof v !== "string") {
        return { ok: false, error: `"${f.label}" must be an uploaded image` };
      }
      if (v.length > MAX_PHOTO_CHARS) {
        return { ok: false, error: `"${f.label}" image is too large (max 3 MB)` };
      }
      if (!isValidImageDataUrl(v)) {
        return { ok: false, error: `"${f.label}" must be a valid image upload` };
      }
      clean[f.id] = v;
      continue;
    }

    if (typeof v !== "string" && typeof v !== "number") {
      return { ok: false, error: `"${f.label}" has an invalid value` };
    }
    const s = String(v).trim();
    if (s.length > MAX_VALUE_LENGTH) {
      return {
        ok: false,
        error: `"${f.label}" is too long (max ${MAX_VALUE_LENGTH} characters)`,
      };
    }

    switch (f.type) {
      case "email":
        if (!EMAIL_RE.test(s)) {
          return { ok: false, error: `"${f.label}" must be a valid email address` };
        }
        break;
      case "number":
        if (!Number.isFinite(Number(s)) || s === "") {
          return { ok: false, error: `"${f.label}" must be a number` };
        }
        break;
      case "date": {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (!m) {
          return { ok: false, error: `"${f.label}" must be a valid date (YYYY-MM-DD)` };
        }
        const [, ys, ms, ds] = m;
        const y = Number(ys), mo = Number(ms), d = Number(ds);
        const dt = new Date(Date.UTC(y, mo - 1, d));
        // Reject impossible dates that Date would silently normalize (e.g. Feb 29
        // in a non-leap year) by checking the components round-trip exactly.
        if (
          dt.getUTCFullYear() !== y ||
          dt.getUTCMonth() !== mo - 1 ||
          dt.getUTCDate() !== d
        ) {
          return { ok: false, error: `"${f.label}" must be a valid date (YYYY-MM-DD)` };
        }
        break;
      }
      case "select":
        if (!(f.options ?? []).includes(s)) {
          return { ok: false, error: `"${f.label}" must be one of the listed options` };
        }
        break;
      // text, textarea, phone: length check above is enough
    }
    clean[f.id] = s;
  }

  // Total submission budget: keep well under the JSON body parser limit so
  // multi-photo forms fail with a clear message instead of an opaque 413.
  let total = 0;
  for (const v of Object.values(clean)) {
    if (typeof v === "string") total += v.length;
  }
  if (total > MAX_SUBMISSION_CHARS) {
    return {
      ok: false,
      error:
        "This submission is too large. Please use smaller photos (about 5 MB total across all uploads).",
    };
  }

  return { ok: true, data: clean };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function toForm(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    slug: row.slug,
    fields: row.fields ?? [],
    theme: row.theme ?? {},
    published: row.published ?? false,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

// ── Admin: list all forms (with submission counts) ──
router.get("/forms", async (_req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT f.*, COALESCE(s.cnt, 0)::int AS submission_count,
            l.sent AS last_sent, l.failed AS last_failed,
            l.error AS last_error, l.sent_at AS last_sent_at
     FROM custom_forms f
     LEFT JOIN (
       SELECT form_id, COUNT(*) AS cnt FROM form_submissions GROUP BY form_id
     ) s ON s.form_id = f.id
     LEFT JOIN LATERAL (
       SELECT sent, failed, error, sent_at
       FROM email_send_log
       WHERE form_id = f.id
       ORDER BY sent_at DESC
       LIMIT 1
     ) l ON true
     ORDER BY f.created_at DESC`,
  );
  res.json(
    result.rows.map((r) => ({
      ...toForm(r),
      submissionCount: r.submission_count,
      lastSend:
        r.last_sent_at == null
          ? null
          : {
              sent: r.last_sent,
              failed: r.last_failed,
              error: r.last_error ?? null,
              sentAt:
                r.last_sent_at instanceof Date
                  ? r.last_sent_at.toISOString()
                  : String(r.last_sent_at),
            },
    })),
  );
});

// ── Admin: create a form ──
router.post("/forms", async (req, res): Promise<void> => {
  const parsed = createFormSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: zodErrorMessage(parsed.error) });
    return;
  }
  const { title, description, fields, theme } = parsed.data;

  let slug = slugify(title);
  if (!slug) slug = `form-${Date.now()}`;

  // ensure unique slug
  const existing = await pool.query(
    "SELECT slug FROM custom_forms WHERE slug LIKE $1 || '%'",
    [slug],
  );
  if (existing.rows.length > 0) {
    const taken = new Set(existing.rows.map((r) => r.slug));
    if (taken.has(slug)) {
      let i = 2;
      while (taken.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }
  }

  const result = await pool.query(
    `INSERT INTO custom_forms (title, description, slug, fields, theme, published)
     VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
    [
      title.trim(),
      description?.trim() || null,
      slug,
      JSON.stringify(fields),
      JSON.stringify(theme ?? {}),
    ],
  );
  res.status(201).json(toForm(result.rows[0]));
});

// ── Admin: update a form (title, description, fields, published) ──
router.patch("/forms/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid form ID" });
    return;
  }

  const parsedUpdate = updateFormSchema.safeParse(req.body);
  if (!parsedUpdate.success) {
    res.status(400).json({ error: zodErrorMessage(parsedUpdate.error) });
    return;
  }
  const { title, description, fields, published, theme } = parsedUpdate.data;

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (title !== undefined) {
    sets.push(`title = $${idx++}`);
    params.push(title);
  }
  if (description !== undefined) {
    sets.push(`description = $${idx++}`);
    params.push(description || null);
  }
  if (fields !== undefined) {
    sets.push(`fields = $${idx++}`);
    params.push(JSON.stringify(fields));
  }
  if (published !== undefined) {
    sets.push(`published = $${idx++}`);
    params.push(!!published);
  }
  if (theme !== undefined) {
    sets.push(`theme = $${idx++}`);
    params.push(JSON.stringify(theme));
  }

  if (sets.length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  params.push(id);
  const result = await pool.query(
    `UPDATE custom_forms SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params,
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  res.json(toForm(result.rows[0]));
});

// ── Admin: delete a form (and its submissions via CASCADE) ──
router.delete("/forms/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid form ID" });
    return;
  }
  const result = await pool.query(
    "DELETE FROM custom_forms WHERE id = $1 RETURNING id",
    [id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  res.json({ deleted: true, id });
});

// ── Admin: list submissions for a form ──
router.get("/forms/:id/submissions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid form ID" });
    return;
  }
  const form = await pool.query("SELECT * FROM custom_forms WHERE id = $1", [
    id,
  ]);
  if (form.rows.length === 0) {
    res.status(404).json({ error: "Form not found" });
    return;
  }
  const subs = await pool.query(
    "SELECT * FROM form_submissions WHERE form_id = $1 ORDER BY submitted_at DESC",
    [id],
  );
  res.json({
    form: toForm(form.rows[0]),
    submissions: subs.rows.map((r) => ({
      id: r.id,
      data: r.data,
      submittedAt:
        r.submitted_at instanceof Date
          ? r.submitted_at.toISOString()
          : String(r.submitted_at),
    })),
  });
});

// ── Admin: send bulk email to a form's applicants ──
router.post("/forms/:id/email", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid form ID" });
    return;
  }
  const { subject, message } = req.body as {
    subject?: string;
    message?: string;
  };
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }

  const form = await pool.query("SELECT * FROM custom_forms WHERE id = $1", [
    id,
  ]);
  if (form.rows.length === 0) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  // Recipients come from email-type fields in each submission
  const fields = (form.rows[0].fields ?? []) as FormField[];
  const emailFieldIds = fields.filter((f) => f.type === "email").map((f) => f.id);
  if (emailFieldIds.length === 0) {
    res.status(400).json({
      error: "This form has no email field, so applicants cannot be emailed",
    });
    return;
  }

  const subs = await pool.query(
    "SELECT data FROM form_submissions WHERE form_id = $1",
    [id],
  );
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipients = [
    ...new Set(
      subs.rows
        .flatMap((r) =>
          emailFieldIds.map((fid) =>
            String((r.data as Record<string, unknown>)?.[fid] ?? "")
              .trim()
              .toLowerCase(),
          ),
        )
        .filter((e) => EMAIL_RE.test(e)),
    ),
  ];
  if (recipients.length === 0) {
    res.status(400).json({ error: "No valid recipient emails found" });
    return;
  }

  const from = await getSenderEmail();
  const result = await sendBulkEmail({
    from,
    fromName: "BWYDC",
    recipients,
    subject: subject.trim(),
    text: message.trim(),
  });

  // Persist the outcome so admins can see a "last sent" summary
  const errorMessage = result.errors[0] ?? null;
  await pool.query(
    `INSERT INTO email_send_log (form_id, recipient_count, sent, failed, error)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, recipients.length, result.sent, result.failed, errorMessage],
  );

  if (result.sent === 0) {
    res.status(502).json({
      error: `Sending failed: ${errorMessage ?? "unknown error"}`,
    });
    return;
  }
  res.json({ sent: result.sent, failed: result.failed, error: errorMessage, from });
});

// ── Public: fetch a published form by slug ──
router.get("/public/forms/:slug", async (req, res): Promise<void> => {
  const result = await pool.query(
    "SELECT * FROM custom_forms WHERE slug = $1 AND published = true",
    [req.params.slug],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Form not found or not published" });
    return;
  }
  res.json(toForm(result.rows[0]));
});

// ── Public: submit to a published form ──
router.post("/public/forms/:slug/submissions", async (req, res): Promise<void> => {
  const form = await pool.query(
    "SELECT * FROM custom_forms WHERE slug = $1 AND published = true",
    [req.params.slug],
  );
  if (form.rows.length === 0) {
    res.status(404).json({ error: "Form not found or not published" });
    return;
  }

  const { data } = req.body as { data?: Record<string, unknown> };
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    res.status(400).json({ error: "data object is required" });
    return;
  }

  // Validate the submission against the form's field definitions
  const fields = (form.rows[0].fields ?? []) as FormField[];
  const validated = validateSubmission(fields, data);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const result = await pool.query(
    "INSERT INTO form_submissions (form_id, data) VALUES ($1, $2) RETURNING id",
    [form.rows[0].id, JSON.stringify(validated.data)],
  );
  res.status(201).json({ id: result.rows[0].id, submitted: true });
});

export default router;
