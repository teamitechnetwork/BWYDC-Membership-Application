---
name: BWYDC group chat architecture
description: Why chat/calls use DB polling instead of WebSockets, and the signaling rules
---

# Group chat & calls — architecture decisions

**Rule:** All realtime features (chat messages, presence, WebRTC call signaling) go through Postgres + short-interval polling, not WebSockets.
**Why:** API is deployed on Replit autoscale which can run multiple instances; in-memory WS broadcast would break across instances. Polling against the shared DB is instance-safe. Chat state polls every 2.5s; call signals every 1.5s while in a call.
**How to apply:** Don't add a WS server for new realtime features unless deployment moves to a single reserved-VM instance.

Other decisions:
- Members auth via opaque `X-Member-Token` header (issued on invite-link join), routed under `/public/chat/*` so it bypasses session auth + CSRF (header-based auth is CSRF-immune). Rate limits are per-token in-memory (per instance, acceptable).
- WebRTC is peer-to-peer mesh (Google STUN, no TURN) — fine for ~6-8 participants; calls may fail behind symmetric NATs.
- Signaling glare avoidance: the peer with the **lower member id** always creates the offer; higher-id peer announces itself with a directed `call-join`. ICE candidates arriving before the remote description are buffered client-side.
- Signals are rejected server-side when no `active_call` on the group; signals table is purged on call start/end.
- "Admin-only screen share / call start" is enforced server-side for call start/end, but screen-share is UI-only (a raw client could send any track) — accepted limitation.

## TURN relay (Aug 2026)
STUN-only RTC_CONFIG caused "can't hear / can't see screen share" on the live site (mobile data / strict NATs). Fixed by adding Open Relay free public TURN (openrelay.metered.ca, user/cred "openrelayproject") to RTC_CONFIG in ChatRoom.tsx.
**Why:** signaling worked (participants visible) but media never flowed — classic symmetric-NAT failure.
**How to apply:** if calls still fail or the free relay proves unreliable, move to a paid/managed TURN (metered.ca or Twilio NTS) with credentials in secrets.
