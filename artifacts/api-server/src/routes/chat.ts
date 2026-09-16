import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

/* ────────────────────────────────────────────────────────────────────────────
 * Group chat
 *
 * Admin (session-authenticated) routes manage groups; members interact via
 * /public/chat/* routes authenticated with an opaque per-member token
 * (X-Member-Token header) that is issued when they join via an invite link.
 * Audio/video calls are WebRTC peer-to-peer; the call_signals table is the
 * signaling mailbox that clients poll while in a call.
 * ──────────────────────────────────────────────────────────────────────────── */

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

interface Member {
  id: number;
  group_id: number;
  name: string;
  is_admin: boolean;
  is_muted: boolean;
}

/** Resolves the member from the X-Member-Token header, or responds 401. */
async function requireMember(
  req: Request,
  res: Response,
): Promise<Member | null> {
  const token = req.header("x-member-token");
  if (!token || token.length > 100) {
    res.status(401).json({ error: "Missing member token" });
    return null;
  }
  const result = await pool.query(
    `SELECT id, group_id, name, is_admin, is_muted FROM chat_members WHERE member_token = $1`,
    [token],
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: "Invalid member token — rejoin the group" });
    return null;
  }
  return result.rows[0] as Member;
}

/* ── lightweight per-token rate limiting (per instance) ──────────────────── */

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the caller is within `limit` actions per `windowMs`. */
function withinRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    // Opportunistically trim expired buckets so the map cannot grow unbounded.
    if (rateBuckets.size > 10_000) {
      for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k);
    }
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

const MAX_MEMBERS_PER_GROUP = 200;

const DATA_URL_RE = /^data:[a-z0-9.+/-]+;base64,[A-Za-z0-9+/]+={0,2}$/i;
const IMAGE_DATA_URL_RE =
  /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const messageSchema = z
  .object({
    kind: z.enum(["text", "image", "file"]),
    content: z.string().min(1),
    fileName: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.kind === "text" && m.content.length > 5000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Message is too long (max 5000 characters)" });
    }
    if (m.kind === "image") {
      if (m.content.length > 4_200_000 || !IMAGE_DATA_URL_RE.test(m.content)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid or oversized image (max 3 MB)" });
      }
    }
    if (m.kind === "file") {
      if (m.content.length > 7_000_000 || !DATA_URL_RE.test(m.content)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid or oversized file (max 5 MB)" });
      }
      if (!m.fileName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fileName is required for files" });
      }
    }
  });

function toMessage(r: Record<string, unknown>) {
  return {
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name,
    isAdmin: r.member_is_admin ?? false,
    kind: r.kind,
    content: r.content,
    fileName: r.file_name ?? null,
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

/* ── Admin: manage groups ─────────────────────────────────────────────────── */

router.get("/chat/groups", async (_req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT g.*, COALESCE(m.cnt, 0)::int AS member_count,
            COALESCE(msg.cnt, 0)::int AS message_count
     FROM chat_groups g
     LEFT JOIN (SELECT group_id, COUNT(*) AS cnt FROM chat_members GROUP BY group_id) m
       ON m.group_id = g.id
     LEFT JOIN (SELECT group_id, COUNT(*) AS cnt FROM chat_messages GROUP BY group_id) msg
       ON msg.group_id = g.id
     ORDER BY g.created_at DESC`,
  );
  res.json(
    result.rows.map((g) => ({
      id: g.id,
      name: g.name,
      inviteToken: g.invite_token,
      memberCount: g.member_count,
      messageCount: g.message_count,
      activeCall: g.active_call ?? null,
      createdAt:
        g.created_at instanceof Date ? g.created_at.toISOString() : String(g.created_at),
    })),
  );
});

router.post("/chat/groups", async (req, res): Promise<void> => {
  const parsed = z
    .object({ name: z.string().trim().min(1, "name is required").max(120) })
    .strict()
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const result = await pool.query(
    `INSERT INTO chat_groups (name, invite_token) VALUES ($1, $2) RETURNING *`,
    [parsed.data.name, newToken()],
  );
  const g = result.rows[0];
  res.status(201).json({ id: g.id, name: g.name, inviteToken: g.invite_token });
});

router.delete("/chat/groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid group ID" });
    return;
  }
  const result = await pool.query(
    "DELETE FROM chat_groups WHERE id = $1 RETURNING id",
    [id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json({ deleted: true, id });
});

// Admin joins a group's chat (issues an admin-flagged member token).
router.post("/chat/groups/:id/join", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid group ID" });
    return;
  }
  const group = await pool.query("SELECT * FROM chat_groups WHERE id = $1", [id]);
  if (group.rows.length === 0) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const member = await pool.query(
    `INSERT INTO chat_members (group_id, name, member_token, is_admin)
     VALUES ($1, 'BWYDC Admin', $2, true) RETURNING member_token`,
    [id, newToken()],
  );
  res.status(201).json({
    memberToken: member.rows[0].member_token,
    inviteToken: group.rows[0].invite_token,
  });
});

/* ── Public: join via invite link ─────────────────────────────────────────── */

router.get("/public/chat/info/:inviteToken", async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT g.name, COALESCE(m.cnt, 0)::int AS member_count
     FROM chat_groups g
     LEFT JOIN (SELECT group_id, COUNT(*) AS cnt FROM chat_members GROUP BY group_id) m
       ON m.group_id = g.id
     WHERE g.invite_token = $1`,
    [req.params.inviteToken],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json({ name: result.rows[0].name, memberCount: result.rows[0].member_count });
});

router.post("/public/chat/join/:inviteToken", async (req, res): Promise<void> => {
  const parsed = z
    .object({ name: z.string().trim().min(1, "Please enter your name").max(80) })
    .strict()
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  if (!withinRate(`join:${req.ip}`, 10, 60_000)) {
    res.status(429).json({ error: "Too many join attempts — try again in a minute" });
    return;
  }
  const group = await pool.query(
    "SELECT id FROM chat_groups WHERE invite_token = $1",
    [req.params.inviteToken],
  );
  if (group.rows.length === 0) {
    res.status(404).json({ error: "This invite link is not valid" });
    return;
  }
  const count = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM chat_members WHERE group_id = $1",
    [group.rows[0].id],
  );
  if (count.rows[0].cnt >= MAX_MEMBERS_PER_GROUP) {
    res.status(409).json({ error: "This group is full" });
    return;
  }
  const member = await pool.query(
    `INSERT INTO chat_members (group_id, name, member_token)
     VALUES ($1, $2, $3) RETURNING id, member_token`,
    [group.rows[0].id, parsed.data.name, newToken()],
  );
  res.status(201).json({ memberToken: member.rows[0].member_token });
});

/* ── Public (member-token): chat ──────────────────────────────────────────── */

router.get("/public/chat/state", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;

  const after = parseInt(String(req.query.after ?? "0"), 10) || 0;
  // Oldest message id the client still has cached — deletions are reported
  // for everything from that point on, so long-lived clients stay in sync.
  const min = parseInt(String(req.query.min ?? "0"), 10) || 0;
  // Heartbeat: refresh presence, but only when it is meaningfully stale so
  // frequent polls don't turn into constant row updates.
  await pool.query(
    `UPDATE chat_members SET last_seen = now()
     WHERE id = $1 AND last_seen < now() - interval '15 seconds'`,
    [me.id],
  );

  const [group, messages, members, deleted] = await Promise.all([
    pool.query("SELECT name, active_call FROM chat_groups WHERE id = $1", [me.group_id]),
    pool.query(
      `SELECT msg.*, mem.name AS member_name, mem.is_admin AS member_is_admin
       FROM chat_messages msg
       JOIN chat_members mem ON mem.id = msg.member_id
       WHERE msg.group_id = $1 AND msg.id > $2 AND NOT msg.deleted
       ORDER BY msg.id ASC
       LIMIT 200`,
      [me.group_id, after],
    ),
    pool.query(
      `SELECT id, name, is_admin, is_muted, last_seen > now() - interval '45 seconds' AS online
       FROM chat_members WHERE group_id = $1 AND NOT removed ORDER BY joined_at ASC`,
      [me.group_id],
    ),
    // Deleted message ids within the client's cached range, so they can be
    // dropped from view no matter how old they are.
    pool.query(
      `SELECT id FROM chat_messages
       WHERE group_id = $1 AND deleted AND id >= $2
       ORDER BY id DESC LIMIT 1000`,
      [me.group_id, min],
    ),
  ]);

  res.json({
    me: { id: me.id, name: me.name, isAdmin: me.is_admin, isMuted: me.is_muted },
    groupName: group.rows[0]?.name ?? "",
    activeCall: group.rows[0]?.active_call ?? null,
    messages: messages.rows.map(toMessage),
    deletedMessageIds: deleted.rows.map((r) => r.id),
    members: members.rows.map((m) => ({
      id: m.id,
      name: m.name,
      isAdmin: m.is_admin,
      isMuted: m.is_muted,
      online: !!m.online,
    })),
  });
});

router.post("/public/chat/messages", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (me.is_muted) {
    res.status(403).json({ error: "You have been muted by the admin" });
    return;
  }

  // Text: 30/min. Media (multi-MB base64 rows): 10/min.
  const isMedia = req.body?.kind === "image" || req.body?.kind === "file";
  if (!withinRate(`msg${isMedia ? "-media" : ""}:${me.id}`, isMedia ? 10 : 30, 60_000)) {
    res.status(429).json({ error: "You are sending messages too quickly — slow down a little" });
    return;
  }

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { kind, content, fileName } = parsed.data;
  const result = await pool.query(
    `INSERT INTO chat_messages (group_id, member_id, kind, content, file_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [me.group_id, me.id, kind, kind === "text" ? content.trim() : content, fileName ?? null],
  );
  res.status(201).json({ id: result.rows[0].id });
});

/* ── Public (member-token): moderation ────────────────────────────────────── */

// Delete a message: admins may delete any message; members may delete their own.
router.delete("/public/chat/messages/:id", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid message ID" });
    return;
  }
  const result = await pool.query(
    `UPDATE chat_messages SET deleted = true
     WHERE id = $1 AND group_id = $2 AND ($3 OR member_id = $4)
     RETURNING id`,
    [id, me.group_id, me.is_admin, me.id],
  );
  if (result.rows.length === 0) {
    res.status(403).json({ error: "You can only delete your own messages" });
    return;
  }
  res.json({ deleted: true, id });
});

// Admin: mute or unmute a member.
router.post("/public/chat/members/:id/mute", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (!me.is_admin) {
    res.status(403).json({ error: "Only the admin can mute members" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  const parsed = z.object({ muted: z.boolean() }).strict().safeParse(req.body);
  if (isNaN(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const result = await pool.query(
    `UPDATE chat_members SET is_muted = $1
     WHERE id = $2 AND group_id = $3 AND NOT is_admin
     RETURNING id`,
    [parsed.data.muted, id, me.group_id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Member not found (admins cannot be muted)" });
    return;
  }
  res.json({ id, muted: parsed.data.muted });
});

// Admin: remove a member from the group (their messages are removed too).
// Soft removal: the member row is kept (so their messages can be soft-deleted
// and synced to every client) but their token is rotated, which logs them out.
router.delete("/public/chat/members/:id", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (!me.is_admin) {
    res.status(403).json({ error: "Only the admin can remove members" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid member ID" });
    return;
  }
  const result = await pool.query(
    `UPDATE chat_members SET removed = true, member_token = $3
     WHERE id = $1 AND group_id = $2 AND NOT is_admin
     RETURNING id`,
    [id, me.group_id, newToken()],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Member not found (admins cannot be removed)" });
    return;
  }
  await pool.query(
    `UPDATE chat_messages SET deleted = true WHERE member_id = $1 AND group_id = $2`,
    [id, me.group_id],
  );
  res.json({ removed: true, id });
});

/* ── Public (member-token): calls & WebRTC signaling ──────────────────────── */

router.post("/public/chat/call/start", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (!me.is_admin) {
    res.status(403).json({ error: "Only the admin can start a call" });
    return;
  }
  const parsed = z
    .object({ kind: z.enum(["audio", "video"]) })
    .strict()
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "kind must be audio or video" });
    return;
  }
  const call = {
    kind: parsed.data.kind,
    startedBy: me.id,
    startedAt: new Date().toISOString(),
  };
  await pool.query("UPDATE chat_groups SET active_call = $1 WHERE id = $2", [
    JSON.stringify(call),
    me.group_id,
  ]);
  // Clear stale signals from any previous call.
  await pool.query("DELETE FROM call_signals WHERE group_id = $1", [me.group_id]);
  res.json({ activeCall: call });
});

router.post("/public/chat/call/end", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (!me.is_admin) {
    res.status(403).json({ error: "Only the admin can end the call" });
    return;
  }
  await pool.query("UPDATE chat_groups SET active_call = NULL WHERE id = $1", [
    me.group_id,
  ]);
  await pool.query("DELETE FROM call_signals WHERE group_id = $1", [me.group_id]);
  res.json({ ended: true });
});

const signalSchema = z
  .object({
    toMember: z.number().int().positive().nullable(),
    type: z.enum(["call-join", "call-leave", "offer", "answer", "ice"]),
    payload: z.unknown().optional(),
  })
  .strict();

router.post("/public/chat/signals", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  if (!withinRate(`sig:${me.id}`, 120, 60_000)) {
    res.status(429).json({ error: "Too many signaling requests" });
    return;
  }
  const parsed = signalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid signal" });
    return;
  }
  const payloadJson = JSON.stringify(parsed.data.payload ?? null);
  if (payloadJson.length > 100_000) {
    res.status(400).json({ error: "Signal payload too large" });
    return;
  }
  // Signals are only meaningful while a call is live, and only to members of
  // this group.
  const group = await pool.query(
    "SELECT active_call FROM chat_groups WHERE id = $1",
    [me.group_id],
  );
  if (!group.rows[0]?.active_call) {
    res.status(409).json({ error: "No active call" });
    return;
  }
  if (parsed.data.toMember !== null) {
    const target = await pool.query(
      "SELECT id FROM chat_members WHERE id = $1 AND group_id = $2",
      [parsed.data.toMember, me.group_id],
    );
    if (target.rows.length === 0) {
      res.status(400).json({ error: "Unknown signal target" });
      return;
    }
  }
  const result = await pool.query(
    `INSERT INTO call_signals (group_id, from_member, to_member, type, payload)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [me.group_id, me.id, parsed.data.toMember, parsed.data.type, payloadJson],
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.get("/public/chat/signals", async (req, res): Promise<void> => {
  const me = await requireMember(req, res);
  if (!me) return;
  const after = parseInt(String(req.query.after ?? "0"), 10) || 0;
  const result = await pool.query(
    `SELECT id, from_member, to_member, type, payload
     FROM call_signals
     WHERE group_id = $1 AND id > $2
       AND from_member <> $3
       AND (to_member IS NULL OR to_member = $3)
     ORDER BY id ASC LIMIT 200`,
    [me.group_id, after, me.id],
  );
  // Occasional opportunistic cleanup (signals are also purged on call
  // start/end) — avoid a delete on every poll.
  if (Math.random() < 0.05) {
    await pool.query(
      "DELETE FROM call_signals WHERE group_id = $1 AND created_at < now() - interval '10 minutes'",
      [me.group_id],
    );
  }
  res.json({
    signals: result.rows.map((s) => ({
      id: s.id,
      fromMember: s.from_member,
      toMember: s.to_member,
      type: s.type,
      payload: s.payload,
    })),
  });
});

export default router;
