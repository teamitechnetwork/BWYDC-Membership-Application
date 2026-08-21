import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import {
  ListApplicationsQueryParams,
  ListApplicationsResponse,
  CreateApplicationBody,
  CreateApplicationResponse,
  GetApplicationStatsResponse,
  GetApplicationParams,
  GetApplicationResponse,
  UpdateApplicationStatusParams,
  UpdateApplicationStatusBody,
  UpdateApplicationStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toApplication(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    county: row.county ?? row.district_town_city ?? "",
    countryState: row.country_state ?? "Liberia",
    town: row.town ?? null,
    phoneNumber: row.phone_number,
    emailAddress: row.email_address ?? null,
    gender: row.gender ?? null,
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    dateOfBirth: row.date_of_birth,
    age: row.age,
    educationalBackground: row.educational_background,
    maritalStatus: row.marital_status,
    numberOfChildren: row.number_of_children ?? null,
    affiliateGroup: row.affiliate_group ?? null,
    membershipType: row.membership_type,
    interestCategories: row.interest_categories,
    onBehalfOf: row.on_behalf_of ?? null,
    residentOf: row.resident_of,
    signatureName: row.signature_name,
    sharesContribution: row.shares_contribution ?? null,
    newsletterSubscribe: row.newsletter_subscribe ?? false,
    status: row.status,
    reviewDate: row.review_date ?? null,
    reviewerName: row.reviewer_name ?? null,
    reviewerPosition: row.reviewer_position ?? null,
    submittedAt:
      row.submitted_at instanceof Date
        ? row.submitted_at.toISOString()
        : String(row.submitted_at),
    // Photo is ONLY released for approved members — enforced at the data layer
    photoUrl: row.status === 'approved' ? (row.photo_url ?? null) : null,
  };
}

// GET /membership-applications
router.get("/membership-applications", async (req, res): Promise<void> => {
  const parsed = ListApplicationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status } = parsed.data;
  let query =
    "SELECT * FROM membership_applications ORDER BY submitted_at DESC";
  const params: unknown[] = [];

  if (status) {
    query =
      "SELECT * FROM membership_applications WHERE status = $1 ORDER BY submitted_at DESC";
    params.push(status);
  }

  const result = await pool.query(query, params);
  res.json(ListApplicationsResponse.parse(result.rows.map(toApplication)));
});

// POST /membership-applications
router.post("/membership-applications", async (req, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  // Generate a single-use upload token so the submitter (and only them) can
  // attach a photo to their application without needing an admin session.
  const photoUploadToken = randomUUID();

  const result = await pool.query(
    `INSERT INTO membership_applications (
      full_name, county, country_state, town,
      phone_number, email_address, gender,
      emergency_contact_name, emergency_contact_phone,
      date_of_birth, age, educational_background, marital_status,
      number_of_children, affiliate_group, membership_type, interest_categories,
      on_behalf_of, resident_of, signature_name, shares_contribution,
      newsletter_subscribe, status, photo_upload_token
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'pending', $23
    ) RETURNING *`,
    [
      d.fullName,
      d.county,
      d.countryState,
      d.town ?? null,
      d.phoneNumber,
      d.emailAddress ?? null,
      d.gender ?? null,
      d.emergencyContactName,
      d.emergencyContactPhone,
      d.dateOfBirth,
      d.age,
      d.educationalBackground,
      d.maritalStatus,
      d.numberOfChildren ?? null,
      d.affiliateGroup ?? null,
      d.membershipType,
      d.interestCategories,
      d.onBehalfOf ?? null,
      d.residentOf,
      d.signatureName,
      d.sharesContribution ?? null,
      d.newsletterSubscribe ?? false,
      photoUploadToken,
    ],
  );

  const app = toApplication(result.rows[0]);
  res.status(201).json({
    ...CreateApplicationResponse.parse(app),
    // Returned once so the client can upload a photo immediately after submission.
    // Not stored in the client after that; subsequent photo updates require admin access.
    photoUploadToken,
  });
});

// GET /membership-applications/stats  — must be before /:id
router.get(
  "/membership-applications/stats",
  async (_req, res): Promise<void> => {
    const [totals, byType] = await Promise.all([
      pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'denied')::int AS denied
      FROM membership_applications
    `),
      pool.query(`
      SELECT membership_type, COUNT(*)::int AS count
      FROM membership_applications
      GROUP BY membership_type
    `),
    ]);

    const typeMap: Record<string, number> = { individual: 0, group: 0, associate: 0 };
    for (const row of byType.rows) {
      typeMap[row.membership_type as string] = row.count as number;
    }

    const stats = {
      total: totals.rows[0].total,
      pending: totals.rows[0].pending,
      approved: totals.rows[0].approved,
      denied: totals.rows[0].denied,
      byMembershipType: {
        individual: typeMap.individual,
        group: typeMap.group,
        associate: typeMap.associate,
      },
    };

    res.json(GetApplicationStatsResponse.parse(stats));
  },
);

// GET /membership-applications/:id
router.get("/membership-applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await pool.query(
    "SELECT * FROM membership_applications WHERE id = $1",
    [params.data.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json(GetApplicationResponse.parse(toApplication(result.rows[0])));
});

// PATCH /membership-applications/:id/photo
// Public endpoint — requires a single-use upload token issued at submission time
// (returned in the POST /membership-applications response).  The token is stored
// stored as a plaintext UUID in the DB.
router.patch(
  "/membership-applications/:id/photo",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    // Accept token from X-Photo-Token header or body field.
    const token =
      (req.headers["x-photo-token"] as string | undefined) ||
      (req.body as { photoUploadToken?: string }).photoUploadToken;

    if (!token || typeof token !== "string") {
      res.status(401).json({ error: "Photo upload token is required" });
      return;
    }

    const { photoUrl } = req.body as { photoUrl?: string };
    if (!photoUrl || typeof photoUrl !== "string") {
      res.status(400).json({ error: "photoUrl is required" });
      return;
    }

    // Sanity-check: must be a data URL (base64 image)
    if (!photoUrl.startsWith("data:image/")) {
      res
        .status(400)
        .json({ error: "photoUrl must be a base64 image data URL" });
      return;
    }

    // Single atomic UPDATE: validate the token and consume it (set to NULL) in
    // one statement so concurrent requests cannot both succeed.  A 0-row result
    // means the token was wrong, already consumed, or the application does not
    // exist — all treated as 403 so we don't leak existence information.
    const result = await pool.query(
      `UPDATE membership_applications
       SET photo_url = $1, photo_upload_token = NULL
       WHERE id = $2 AND photo_upload_token = $3
       RETURNING *`,
      [photoUrl, id, token],
    );

    if (result.rows.length === 0) {
      res.status(403).json({ error: "Invalid or expired upload token" });
      return;
    }

    res.json(toApplication(result.rows[0]));
  },
);

// PATCH /membership-applications/:id/status
router.patch(
  "/membership-applications/:id/status",
  async (req, res): Promise<void> => {
    const params = UpdateApplicationStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = UpdateApplicationStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const { status, reviewerName, reviewerPosition } = body.data;
    const reviewDate = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `UPDATE membership_applications
       SET status = $1, review_date = $2, reviewer_name = $3, reviewer_position = $4
       WHERE id = $5
       RETURNING *`,
      [
        status,
        reviewDate,
        reviewerName ?? null,
        reviewerPosition ?? null,
        params.data.id,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(
      UpdateApplicationStatusResponse.parse(toApplication(result.rows[0])),
    );
  },
);

// DELETE /membership-applications/:id
// Permanently removes a member record and all associated data from the database.
router.delete(
  "/membership-applications/:id",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid application ID" });
      return;
    }

    // Confirm the record exists before deleting
    const check = await pool.query(
      "SELECT id, full_name FROM membership_applications WHERE id = $1",
      [id],
    );
    if (check.rows.length === 0) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    await pool.query(
      "DELETE FROM membership_applications WHERE id = $1",
      [id],
    );

    res.status(200).json({ deleted: true, id });
  },
);

// GET /public/member-cards/:id
// Public endpoint — only approved members are visible; pending/denied records
// return 404 so non-approved applicant data is never exposed.
// Date of birth (PII) is omitted; all other fields shown on a physical ID card
// are included.  Contact details (phone, email, emergency contacts) are excluded.
router.get(
  "/public/member-cards/:id",
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    // Restrict to approved members only — pending/denied return 404 so their
    // existence is not leaked.
    const result = await pool.query(
      `SELECT
         id, full_name, county, country_state, town, district_town_city,
         membership_type, status, interest_categories,
         signature_name, shares_contribution, resident_of,
         reviewer_name, reviewer_position, review_date,
         submitted_at, photo_url
       FROM membership_applications
       WHERE id = $1 AND status = 'approved'`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      county: row.county ?? row.district_town_city ?? "",
      countryState: row.country_state ?? "Liberia",
      town: row.town ?? null,
      membershipType: row.membership_type,
      status: row.status,
      // dateOfBirth intentionally omitted — PII not needed for card display
      interestCategories: row.interest_categories ?? [],
      signatureName: row.signature_name,
      sharesContribution: row.shares_contribution ?? null,
      residentOf: row.resident_of,
      reviewerName: row.reviewer_name ?? null,
      reviewerPosition: row.reviewer_position ?? null,
      reviewDate: row.review_date ?? null,
      submittedAt:
        row.submitted_at instanceof Date
          ? row.submitted_at.toISOString()
          : String(row.submitted_at),
      photoUrl: row.photo_url ?? null,
    });
  },
);

export default router;
