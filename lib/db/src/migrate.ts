/**
 * Idempotent startup migration.
 *
 * This module runs DDL that is safe to execute on every server boot:
 * - CREATE TABLE IF NOT EXISTS for every table the API server relies on
 * - ALTER TABLE … ADD COLUMN IF NOT EXISTS for columns added after initial deploy
 *
 * Any structural changes to the database MUST be added here so the schema is
 * fully reproducible from a fresh Replit database provision.
 */
import { pool } from "./index";

const MIGRATIONS = [
  // ── app_settings ─────────────────────────────────────────────────────────
  // Key/value store for admin-configurable settings (e.g. sender_email).
  `CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // ── membership_applications ───────────────────────────────────────────────
  // Core member application table.  Columns introduced after the initial
  // deployment are added with IF NOT EXISTS so this is idempotent.
  `CREATE TABLE IF NOT EXISTS membership_applications (
    id                      SERIAL PRIMARY KEY,
    full_name               TEXT NOT NULL,
    county                  TEXT NOT NULL,
    country_state           TEXT NOT NULL,
    district_town_city      TEXT,
    town                    TEXT,
    phone_number            TEXT NOT NULL,
    email_address           TEXT,
    gender                  TEXT,
    emergency_contact_name  TEXT NOT NULL,
    emergency_contact_phone TEXT NOT NULL,
    date_of_birth           TEXT NOT NULL,
    age                     INTEGER NOT NULL,
    educational_background  TEXT NOT NULL,
    marital_status          TEXT NOT NULL,
    number_of_children      INTEGER,
    affiliate_group         TEXT,
    membership_type         TEXT NOT NULL,
    interest_categories     TEXT[] NOT NULL DEFAULT '{}',
    on_behalf_of            TEXT,
    resident_of             TEXT NOT NULL,
    signature_name          TEXT NOT NULL,
    shares_contribution     TEXT,
    newsletter_subscribe    BOOLEAN NOT NULL DEFAULT false,
    status                  TEXT NOT NULL DEFAULT 'pending',
    review_date             TIMESTAMPTZ,
    reviewer_name           TEXT,
    reviewer_position       TEXT,
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    photo_url               TEXT,
    photo_upload_token      TEXT
  )`,

  // photo_upload_token — single-use UUID issued at submission; consumed
  // (set to NULL) after a successful photo upload so it cannot be reused.
  `ALTER TABLE membership_applications
     ADD COLUMN IF NOT EXISTS photo_upload_token TEXT`,
  `ALTER TABLE membership_applications
     ADD COLUMN IF NOT EXISTS district TEXT`,
  `ALTER TABLE membership_applications
     ADD COLUMN IF NOT EXISTS occupation TEXT`,

  // ── custom_forms / form_submissions ──────────────────────────────────────
  // Admin-built custom forms and their public submissions. Created here so a
  // fresh database provision is fully reproducible (they pre-date this file
  // in existing databases, where IF NOT EXISTS makes these no-ops).
  `CREATE TABLE IF NOT EXISTS custom_forms (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    slug        TEXT NOT NULL UNIQUE,
    fields      JSONB NOT NULL DEFAULT '[]'::jsonb,
    published   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // theme — per-form branding customization (logo, colors, success message),
  // editable by the admin in the form builder.
  `ALTER TABLE custom_forms
     ADD COLUMN IF NOT EXISTS theme JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE TABLE IF NOT EXISTS form_submissions (
    id           SERIAL PRIMARY KEY,
    form_id      INTEGER NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    data         JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // ── email_send_log ────────────────────────────────────────────────────────
  // One row per bulk-email send, so admins can see a "last sent" summary
  // (sent/failed counts, timestamp, and any human-readable error).
  `CREATE TABLE IF NOT EXISTS email_send_log (
    id              SERIAL PRIMARY KEY,
    form_id         INTEGER NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    recipient_count INTEGER NOT NULL,
    sent            INTEGER NOT NULL,
    failed          INTEGER NOT NULL,
    error           TEXT,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS email_send_log_form_idx
     ON email_send_log(form_id, sent_at DESC)`,

  // ── group chat ───────────────────────────────────────────────────────────
  // Admin-created chat groups. Members join via invite_token links. Calls are
  // WebRTC peer-to-peer; active_call holds {kind, startedBy, startedAt} while
  // a call is live. Signals are the WebRTC signaling mailbox (short-lived).
  `CREATE TABLE IF NOT EXISTS chat_groups (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    invite_token TEXT NOT NULL UNIQUE,
    active_call  JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_members (
    id           SERIAL PRIMARY KEY,
    group_id     INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    member_token TEXT NOT NULL UNIQUE,
    is_admin     BOOLEAN NOT NULL DEFAULT false,
    last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id         SERIAL PRIMARY KEY,
    group_id   INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    member_id  INTEGER NOT NULL REFERENCES chat_members(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL DEFAULT 'text',
    content    TEXT NOT NULL,
    file_name  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS chat_messages_group_idx
     ON chat_messages(group_id, id)`,
  `CREATE TABLE IF NOT EXISTS call_signals (
    id          SERIAL PRIMARY KEY,
    group_id    INTEGER NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    from_member INTEGER NOT NULL,
    to_member   INTEGER,
    type        TEXT NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS call_signals_group_idx
     ON call_signals(group_id, id)`,
  `CREATE INDEX IF NOT EXISTS chat_members_group_idx
     ON chat_members(group_id)`,
  // Admin moderation: mute members, soft-delete messages.
  `ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false`,
];

/**
 * Run all migrations in order.  Call this once at server startup before
 * accepting any traffic.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const sql of MIGRATIONS) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}
