# Decisions — Mirach (v3)

> **Last reviewed:** 4 November 2026 (Asia/Kolkata).
> **Purpose:** Architecture Decision Records (ADRs), the open-decision register and the future-enhancement backlog. Supporting document; the six core documents remain authoritative.

## 1. How to use

- After owner approval, items marked **Accepted** are frozen. Changes need the process in `Rules.md` §2 (explanation, evidence, cost, security, migration, explicit approval) and a new/amended ADR.
- Open decisions (§3) have a **safe default**; work may proceed on defaults; the owner confirms by the stated gate.
- Statuses: **Accepted** · **Superseded** (replaced by the named ADR) · **Proposed**.

## 2. Architecture decision records

| ADR | Decision | Status |
|---|---|---|
| 001 | Frontend is a static SPA hosted separately from data services; GitHub holds code and CI only | Accepted |
| 002 | Cloudflare Workers Static Assets in a **single Worker** (SPA fallback, `_headers`, `run_worker_first` for `/api/*` and `/ws/*`); Pages is the fallback. GitHub Pages rejected (no custom headers, static only, public, wording against sensitive transactions) | Accepted (features verified in docs) |
| 003 | Supabase as backend | **Superseded by 018, 020** (owner chose a serverless Cloudflare stack) |
| 004 | Sign-in methods: **Google + email/password via Firebase Auth (Spark)**, mandatory email verification, no phone, no email-link (5/day limit), no MFA | Accepted (revised) |
| 005 | Identity ≠ membership ≠ connection ≠ conversation membership | Accepted |
| 006 | Realtime via Postgres Changes/Broadcast | **Superseded by 022** |
| 007 | RPC-only writes under row-level security | **Superseded by 021** |
| 008 | Per-conversation `seq` and `client_msg_id` idempotency | Accepted (receipt part revised by 023) |
| 009 | One `connections` table with canonical user pair | Accepted |
| 010 | Moderation by evidence snapshots; no administrator message browser | Accepted |
| 011 | Client-side media processing, EXIF removal, thumbnails; no server-side media transformation | Accepted |
| 012 | Profiles are tombstoned (never hard-deleted); user key is the Firebase UID; no cascading FK to identity | Accepted |
| 013 | LiveKit for calls | Accepted — see 025 |
| 014 | No end-to-end encryption; no custom cryptography | Accepted |
| 015 | Release re-sequencing of v2 | **Superseded by 027** |
| 016 | Authorization from database lookups, not token claims | Accepted — realized by 019 |
| **017** | **Cloud is the sole authoritative store; the owner's PC is never a sync/archive/backup target; manual user-initiated exports only; no 24-hour deletion rule** | Accepted |
| **018** | **Serverless stack:** React/TS/Vite/Tailwind on Cloudflare Workers + Static Assets; Firebase Auth (Spark); Cloudflare D1; Durable Objects; Backblaze B2 (conditional); LiveKit Cloud; GitHub; zero cost, no card | Accepted |
| **019** | Firebase proves identity once (`POST /api/session`, strict token validation); Mirach issues an opaque HttpOnly server-side session (hash-only in D1). Gives per-device revocation, sign-out-all, instant suspension and cookie-authenticated WebSockets without Firebase Admin credentials. Firebase Admin REST is optional hardening (spike) | Accepted |
| **020** | D1 is the persistent store, in three logical databases (`core`, `chat`, `activity`); chat is **shard-ready** (`conversation_directory.shard_id`), single shard at launch; staging uses one database for all bindings; no cross-group foreign keys | Accepted |
| **021** | No row-level security exists in D1: authorization is a central Worker policy module **plus** access predicates embedded in SQL; prepared statements only; D1 access only through `src/worker/data`; negative-test matrix per phase | Accepted |
| **022** | Realtime = Durable Objects (`UserHub`, `ConversationRoom`, `PresenceRegistry`, `GameRoom`) with Hibernation; ids-only signals; cookie + Origin auth; revocation by eviction | Accepted |
| **023** | Delivered/read are per-member cursors (not per-message rows); coalesced writes; presence and last seen in a Durable Object; no per-message notification rows — to protect the 100 k rows/day write budget | Accepted |
| **024** | Backblaze B2 private bucket with presigned URLs, **conditional on Gate P** (owner no-card activation test). **Cloudflare R2 rejected** (payment method requested at activation). If B2 fails, media is blocked until an ADR approves a no-card-verified alternative | Accepted (conditional) |
| **025** | LiveKit Cloud Build for calls (official "No credit card required"; hard cap). Cloudflare Realtime SFU/TURN is the documented contingency (1,000 GB/month free; card requirement unverified) | Accepted (Gate L) |
| **026** | Exports are assembled in the requester's browser from authorized, paginated APIs; no server-side export file; optional (and for others' content mandatory) client-side AES-256-GCM encryption; full SQL backups via the owner's own `wrangler d1 export`; operator export controls and audit | Accepted |
| **027** | Phase reorder: DB/API/security foundation is Phase 2, Auth/membership Phase 3, Profiles/connections Phase 4 (technically required: auth and profiles need persistence); avatar upload moves to Phase 6 (needs media); B2 activation proven in Phase 0 | Accepted |
| **028** | Deletion semantics: delete-for-me hide row; delete-for-everyone tombstone + media deletion + signals; account deletion with keep/delete-messages choice and 14-day grace; exports show tombstones; D1 Time Travel and downloaded exports cannot be selectively purged (disclosed) | Accepted |
| **029** | Zero-cost/no-card policy: no payment method anywhere; exhaustion of a free quota is handled as a defined outage or feature disablement, never a charge; no paid upgrade without explicit owner approval | Accepted |
| **030** | Documentation freeze and change control after owner approval | Accepted |

### ADR-018 trade-offs (recorded honestly)

**Gains versus v2 (Supabase):** no card needed; no project pausing; static assets free and unlimited; Time Travel recovery included; pure serverless operation.
**Losses/risks:** no row-level security (more custom, security-critical code); much tighter daily write/read/request budgets; 10 ms Worker CPU and 50 subrequests; per-database 500 MB; no MFA; B2 activation unproven; no managed Postgres features; workers.dev hostname; Firebase email limits (150 resets/day). These are mitigated by design (§Architecture 19) and explicit tests, not by pretending they do not exist.

## 3. Open decisions register

Each has a **safe default**; the owner confirms by the gate.

| ID | Decision needed | Safe default | Gate |
|---|---|---|---|
| OD-01 | Name "Mirach": trademark/existing product check; logo | Use internally; centralize name; no copied branding | Before any public sharing |
| OD-02 | Expected community size and concurrency | ≤ 25 members at first; measure | Gate B |
| OD-04 | Directory visibility and DM policy | Active members only; username/display name/avatar; DMs only between accepted connections; discoverability default "all members" | Before Phase 4 |
| OD-05 | Group history after leaving | Lose all history; re-add sees only from re-join | Gate B |
| OD-06 | Retention numbers | Evidence 90 d after resolution; audit ≥ 1 y; notifications 30 d; membership requests 1 y; attempts 24 h; stories 24 h; deletion grace 14 d; sessions purge 30 d after expiry | Gate B |
| **OD-07** | Age policy | 18+ only (declaration); no minors until counsel advises | Gate A |
| **OD-08** | Legal review scope (DPDP status of owner, personal-use exemption, notice/consent, breach duties, cross-border transfer to US processors, IT Rules intermediary duties, operator access, exports held by owner) | Build privacy features early; no compliance claim | Gate C and before 13–14 May 2027 |
| **OD-09** | Backup/export cadence (no paid plans available) | D1 Time Travel (7 days) + owner-run `wrangler d1 export` at the owner's chosen interval + restore drill before Gate B | Gate B |
| OD-10 | Moderation staffing | Owner + one more admin before Gate B | Gate B |
| OD-11 | Media quotas | 75 MB/user; warn 7 GB, stop 9 GB of 10 GB | Before Phase 6 |
| OD-12 | Data location disclosure (US-based processors; D1 jurisdiction not selectable on Free — unverified) | Disclose in the privacy notice | Gate C |
| **OD-13** | **B2 no-card activation result (Gate P)**; fallback provider if it fails | Media blocked if not proven | End of Phase 0 |
| **OD-14** | Operator access disclosure wording and **full-export policy**: scope (structure-only vs including message bodies/media), retention of exports on the owner's device, handling of erasure requests | Operator export defaults to encrypted, audited, message bodies included only on explicit tick; exports kept ≤ 90 days unless needed; erasure requests trigger a purge of held exports | Before Phase 11 and Gate A (notice wording) |
| OD-15 | Acceptance of the `*.workers.dev` hostname | Accept; no domain purchase | Phase 1 |
| OD-16 | Video/voice limits | Video ≤ 25 MB and ≤ 60 s; voice ≤ 5 min; docs ≤ 10 MB | Before Phase 6 |
| OD-17 | Delete-for-everyone time window | No window (sender anytime) | Before Phase 5 |
| OD-18 | Firebase Admin REST hardening (service-account secret) | Skip if spike fails; owner removes orphan Firebase accounts monthly | Phase 3 |
| OD-19 | LiveKit activation without card (Gate L) | Calls stay disabled until proven | Start of Phase 8 |

Resolved in v3: former OD-03 (members without Google) — both Google and email/password are included; former OD-09 (Supabase Pro) — no paid plan is available.

## 4. Decision log

| Date | Change |
|---|---|
| 2026-11-04 | v2 ADR set and register created (Supabase design) |
| 2026-11-04 | v3: cloud-authoritative serverless architecture adopted; ADR-003/006/007/015 superseded; ADR-017…030 added; register updated |
| 2026-11-09 | v3.1 consistency pass (no architectural change, no new ADR): re-auth window unified at 5 minutes; three Firebase projects stated everywhere; Firebase SDK uses in-memory persistence; Durable Objects reach D1 only through the data layer; migration file names unique across folders; conversation creation made idempotent; delivered-ack flush uses DO storage + alarm; provider numbers re-checked (`SOURCE_REGISTER.md` §0). Details: `REVIEW_REPORT.md` §14 |

## 5. Future-enhancement backlog (not in scope; needs change control)

Passkeys and MFA (if a no-card path appears); end-to-end encryption (separate audited project); native mobile apps; custom domain; polls and events; shared albums; voice rooms; close-friends audiences for stories; FTS5 message search if the Phase 7 spike shows acceptable write amplification; additional chat shards; server-side malware scanning; Cloudflare Realtime migration for calls; paid-plan upgrade path (only with a payment method and explicit approval). **Never in the backlog (prohibited):** automatic PC sync, archive/delete-after-archive, local replicas, home-server dependencies.
