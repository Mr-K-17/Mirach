# Memory — Mirach (v3)

> **Purpose:** Durable hand-off context for the owner and any future AI/developer session (including Antigravity). Keep it short and true.
> **Document status:** Planning baseline v3 awaiting owner approval and freeze. **No application code, accounts or cloud resources are confirmed as created.**
> **Last reviewed:** 4 November 2026 (Asia/Kolkata).

## 1. Project identity

**Mirach** (owner-provided name; trademark/domain unverified, OD-01) is a private, invitation-only, browser-based community platform: private and group messaging, calls, posts/stories, games. It is used from desktop, laptop, tablet and mobile browsers, has its own identity and code, and copies nothing from WhatsApp, Instagram, Snapchat or game vendors. Members register without phone numbers (Google or email/password), choose a username, are admitted by invitation code or administrator approval, connect explicitly, then communicate.

## 2. Owner decisions (frozen after approval)

1. **Cloud is the only authoritative data store.** The owner's PC is never a server, database, archive, sync target or required backup. **No automatic transfer to the PC**; only manual, user-initiated exports (snapshots). Existing MySQL/MongoDB are untouched. No 24-hour deletion rule; no sync/archive/tunnel/local-DB components, ever, without explicit approval.
2. **Serverless and zero-cost, no credit/debit card** with any provider. Free-limit exhaustion = defined outage, never a bill.
3. Registration by **invitation code and administrator approval** (both). Sign-in by **Google and email/password** (verified email). No phone numbers.
4. Browser-based; small private community (design target ≈ 10–100 members).
5. All requested features are assigned to phases; none is silently removed.
6. After approval: architecture, database engine, auth provider, hosting, storage provider, feature scope and phase order are **frozen**; changes need the change-control process (`Rules.md` §2).
7. Implementation will be done with Antigravity from `ANTIGRAVITY_HANDOFF.md`.

## 3. Selected stack

| Layer | Selected | Rejected / notes |
|---|---|---|
| Frontend | React + TypeScript (strict) + Vite + Tailwind SPA, PWA later | Next.js |
| Hosting + API | One Cloudflare Worker with Static Assets, `*.workers.dev` URL, no custom domain | GitHub Pages (no custom headers), Pages (fallback) |
| Identity | Firebase Authentication (Spark): Google + email/password; ID token verified once in the Worker at session creation; **Mirach server-side sessions** (HttpOnly cookie) afterwards | Firebase Cloud Functions, phone/SMS, email-link, MFA (not on Spark) |
| Database | Cloudflare D1 (`mirach-core`, `mirach-chat` shard-ready, `mirach-activity` from Phase 9); **authorization in Worker code + SQL predicates (no RLS)** | Durable Objects as DB; Supabase (v2 design, superseded) |
| Realtime | Durable Objects with WebSocket Hibernation (`UserHub`, `ConversationRoom`, `PresenceRegistry`, `GameRoom`); ids-only signals | Polling |
| Media | Backblaze B2 private bucket, presigned URLs, client-side processing — **conditional on the owner's no-card activation test (Gate P)** | **R2 (asks for a payment method)**, Firebase Storage |
| Calls | LiveKit Cloud Build (Phase 8, no card, hard cap); Cloudflare Realtime is the contingency | native P2P WebRTC |
| Push | Web Push (VAPID) + PWA, Phase 7 | — |
| Source/CI | GitHub (private) + Actions + Wrangler | — |

## 4. Key architectural decisions

- Four separate states: identity ≠ membership ≠ connection ≠ conversation membership.
- D1 is the source of truth; Durable Objects hold only ephemeral/coordination state; **no media in D1 or DOs**.
- Per-conversation `seq` + `client_msg_id` give ordering and idempotency; delivered/read are **cursors**, not rows; unread is derived.
- Write budget matters: D1 Free = 100 k rows written/day (index writes count), 5 M reads/day, 500 MB per DB, 5 GB per account; Workers Free = 100 k requests/day, 10 ms CPU, 50 subrequests.
- Group size cap 25 (subrequest budget). Presence/last seen live in a Durable Object, not D1.
- Deletion: delete-for-me = hide row; delete-for-everyone = tombstone + media deletion + signals; account deletion offers keep-messages or delete-messages; exports show tombstones only.
- Moderation uses **evidence snapshots**; no role reads conversations in the app. The owner/operator **technically can** read data via consoles and the audited operator export — disclosed to members; **no E2EE**.
- Exports are client-assembled from authorized paginated APIs, optionally encrypted (mandatory when others' content is included), never stored on the server, never alter cloud data (`EXPORT_SPECIFICATION.md`).
- One technically necessary phase reorder: Cloud DB/API/security is Phase 2; Auth/membership Phase 3; Profiles/connections Phase 4; avatar upload moves to Phase 6.

## 5. Current status (truthful)

- Documents v3 written (eleven files) + `DEPENDENCIES.md` + operational runbook stubs in `docs/runbooks/` + spike stub `docs/spikes/phase1-firebase.md`. **v3.1 (9 Nov 2026):** consistency fixes and provider re-check applied, see `REVIEW_REPORT.md` §14.
- **Phase 0 (Repository Skeleton & Tooling):** **Tested** (skeleton folders, `.env.example`, `.gitignore`, pinned CI workflow, ESLint security rules forbidding raw D1 access and string-built SQL, TypeScript strict config, runbook stubs).
- **Phase 1 (Frontend & Hosting Foundation):** **Tested** (Vite + React + Tailwind AppShell responsive at 320/768/1024/1280px, UX route guards, error boundaries, offline banner, quota and maintenance screens, Cloudflare Worker Static Assets integration with `/api/health`, `public/_headers` with CSP, pinned CI and staging deploy workflows, Firebase SDK configured with `inMemoryPersistence`, Axe WCAG 2.2 AA accessibility suite passing 4/4 tests, bundle secret scan clean). Staging deployment and Firebase-on-workers.dev spike (`docs/spikes/phase1-firebase.md`) awaiting owner staging URL.
- **Phase 2 (Cloud Database, API & Security Foundation):** **Partially implemented** — Step 1 Spikes **Tested** (`docs/spikes/phase2-report.md`: D1 batch atomicity & ordering, RETURNING/partial indexes/STRICT tables, CPU 0.08 ms, DO subrequests 60/60, DO hibernation & alarms, shared staging migrations, D1 index write accounting). Step 2 (Data layer, pipeline, policy module, DO skeletons) **Planned** awaiting owner authorization.
- **Planned only:** Phases 3–12. No production database tables, feature logic, or cloud accounts/resources created by agents.
- Gate P (owner activation tests, especially Backblaze no-card) is pending.

Future sessions must inspect the real repository and command output before claiming progress.

## 6. Known limitations

No E2EE; operator and providers can technically read data; no MFA; D1/Workers/DO daily quotas can cause outages until 00:00 UTC; per-DB 500 MB and account 5 GB bound chat capacity; B2 media has no automatic backup, no server-side malware scanning; presence may lag; iOS Web Push only for Home Screen web apps; blocking does not hide messages in shared groups; age is a declaration; `*.workers.dev` hostname; not legal advice; DPDP substantive obligations start on or about 13–14 May 2027.

## 7. Outstanding decisions (see `DECISIONS.md` §3)

OD-01 name/trademark · OD-02 size · OD-04 directory/DM policy · OD-05 group history · OD-06 retention numbers · **OD-07 age** · **OD-08 legal review** · **OD-09 backup/export cadence** · OD-10 moderation staffing · OD-11 media limits · OD-12 data location disclosure · **OD-13 B2 no-card activation (Gate P)** · **OD-14 operator-access disclosure wording and full-export policy** · OD-15 workers.dev acceptance · OD-16 video/voice limits · OD-17 delete-for-everyone window · OD-18 Firebase Admin hardening spike · OD-19 LiveKit activation (Gate L).

## 8. Guidance for future AI agents

1. Read `Rules.md` then this file, `PRD.md`, `Architecture.md`, `Design.md`, `Phases.md`, `DECISIONS.md`, `EXPORT_SPECIFICATION.md`, `ANTIGRAVITY_HANDOFF.md`.
2. Work only in the current phase; inspect the real repo first; follow the 7-step procedure and completion report.
3. Never add a provider, paid service, card requirement, local database, sync job, or automatic export. If a provider screen asks for payment details, stop.
4. Never put secrets or real data anywhere; never bypass authorization; no raw SQL outside the data layer.
5. Use status words Planned / Partially implemented / Implemented / Tested / Verified in production.
6. The architecture is frozen once approved; propose changes via change control, not code.
