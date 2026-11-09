# C1 — Understanding Mirach: Architecture, Guardrails, and Buildability

> **Review Date:** 9 November 2026 (Asia/Kolkata)  
> **Source Documents Read in Order:** `Rules.md`, `Memory.md`, `PRD.md`, `Architecture.md`, `Design.md`, `Phases.md`, `DECISIONS.md`, `EXPORT_SPECIFICATION.md`, `SOURCE_REGISTER.md`, `REVIEW_REPORT.md`, `ANTIGRAVITY_HANDOFF.md`.  
> **Status:** Implemented (Read-only review; no application code or cloud resources modified).

---

## 1. Mirach in 10 Lines

1. **Product Concept:** Mirach is a private, invitation-only community messenger and social platform (direct/group messaging, voice/video calls, games, stories, feeds) with its own identity and code, copying nothing from existing apps.
2. **Target Audience:** An invited community of adults (initially India-based, default 18+ declaration, no minors), designed for 10–50 members and capped at ~100 under free tier quotas.
3. **Frontend Stack:** React + TypeScript (strict mode) + Vite SPA with Tailwind CSS, responsive across desktop, laptop, tablet, and mobile browsers (with a PWA manifest in Phase 7).
4. **Hosting & Routing Stack:** A single Cloudflare Worker serving Static Assets (SPA fallback, `run_worker_first` for API/WebSocket) under the assigned `*.workers.dev` domain with `public/_headers` CSP.
5. **Identity & Auth Stack:** Firebase Authentication (Spark free tier) for Google and email/password sign-in with mandatory email verification (no phone numbers), issuing Mirach server-side sessions (`__Host-` HttpOnly cookie) verified by Worker code.
6. **Database Stack:** Cloudflare D1 (SQLite) with logical databases `mirach-core`, `mirach-chat` (shard-ready), and `mirach-activity` (Phase 9+), accessed strictly via `src/worker/data` with prepared statements and query-level access predicates.
7. **Realtime Stack:** Cloudflare Durable Objects with WebSocket Hibernation (`UserHub`, `ConversationRoom`, `PresenceRegistry`, `GameRoom`) passing ids-only signals and ephemeral state (no message text).
8. **Media & Calls Stack:** Backblaze B2 private bucket with short-lived presigned URLs (subject to Gate P no-card validation); LiveKit Cloud Build plan (hard-capped, no card) for WebRTC calls in Phase 8.
9. **Data Principle & Exports:** Cloud is the sole authoritative store; the owner's PC is never a server, archive, or sync target; data leaves only via manual, user-initiated, browser-assembled exports.
10. **What is Frozen:** The entire serverless architecture, stack selections, zero-cost / no-card policy, manual-export rule, feature scope (`PRD.md` §6), and phase sequence (`Phases.md` §3, Phases 0–12) are completely frozen upon owner approval.

---

## 2. The 12 Non-Negotiable Rules (with Section Numbers)

1. **Frozen Stack, Scope, and Sequence (`Rules.md` §2, `ANTIGRAVITY_HANDOFF.md` §4, §8):** Never change, replace, or bypass the frozen architecture, database, auth provider, hosting, storage, feature scope in `PRD.md` §6, or phase sequence without an explicit owner ADR. New ideas go strictly to the backlog (`DECISIONS.md` §5).
2. **No PC Sync, Local Database, or Automatic Export (`Rules.md` §2, §23, `Architecture.md` §4, `EXPORT_SPECIFICATION.md` §1):** Never reintroduce Windows/PC background sync services, archive collection, sync queues to the home PC, automatic transfer of chats, 24-hour cleanup, local database replication, home-server health checks, Cloudflare Tunnel to a home archive, automatic local media download, or any local database as part of the system.
3. **Zero-Cost and No-Card Policy (`Rules.md` §5, `PRD.md` §11, `ANTIGRAVITY_HANDOFF.md` §8):** Never enter, request, or configure credit/debit cards, payment methods, billing accounts, pay-as-you-go services, paid APIs, budgets that assume payment, or automatic upgrades. If any screen asks for payment details, stop immediately and report.
4. **No Cloud Resources or Secrets Managed by Agent (`Rules.md` §7, `ANTIGRAVITY_HANDOFF.md` §2, §5):** Never create cloud accounts or resources; never read, commit, print, log, paste, or write secrets (`SESSION_PEPPER`, B2 keys, Firebase service-account JSON, tokens). Backend secrets are set exclusively by the owner using `wrangler secret put`.
5. **No Phone Numbers Anywhere (`Rules.md` §9, `PRD.md` FR-AUTH-07, `Architecture.md` §5.1):** No field, API, table, prompt, or flow ever collects, holds, or accepts phone numbers.
6. **Email Never Stored in Application Databases (`Rules.md` §9, `Architecture.md` §5.3):** Email is validated through Firebase ID tokens at session creation/re-auth only and is never stored in D1, returned by any API, logged, or exported (it stays exclusively in Firebase).
7. **All Authorization in Worker Policy Layer + SQL Predicates (`Rules.md` §10, `Architecture.md` §8):** D1 has no row-level security; every handler must call the central `authorize()` policy module and embed access predicates directly into SQL queries. Prepared statements with bound parameters only; D1 accessed exclusively through `src/worker/data` (Durable Objects must call this layer too).
8. **No Client-Supplied Identity, Roles, or Authority (`Rules.md` §10, `PRD.md` §5 rule 6, `Architecture.md` §7.5):** Never accept `user_id`, `sender_id`, role, status, `seq`, counters, winners, or timestamps from the client.
9. **Private Media Bucket with Short-Lived Presigned URLs (`Rules.md` §13, `Architecture.md` §12):** Media storage must be a private Backblaze B2 bucket (conditional on Gate P) accessed only via server-generated signed URLs (TTL ≤ 5 min); never public buckets, and never store media bytes in D1 or Durable Objects.
10. **Never Show Unconfirmed Status or Swallow Write Errors (`Rules.md` §10, §12, `ANTIGRAVITY_HANDOFF.md` §8):** Never display "sent", "delivered", "read", "deleted", or "exported" before server confirmation; never swallow write errors; return `503 QUOTA_EXHAUSTED` when provider limits are reached.
11. **Every Gesture Must Have a Visible Non-Gesture Alternative (`Rules.md` §16, `Design.md` §1, §15, `ANTIGRAVITY_HANDOFF.md` §8):** No action may depend solely on a touch gesture or mouse hover; visible buttons, context menus, and keyboard-operable controls are mandatory.
12. **Prohibited Claims and Mandatory Status Vocabulary (`Rules.md` §4, §24, `ANTIGRAVITY_HANDOFF.md` §8):** Never state "secure", "done", "complete", "production-ready", "end-to-end encrypted", "administrators cannot read messages", or "compliant with DPDP" without evidence and defined scope. Use only: **Planned**, **Partially implemented**, **Implemented**, **Tested**, **Verified in production**.

---

## 3. Phase Breakdown: Phases 0, 1, and 2

### Phase 0 — Final Specification Approval and Provider Gate
* **Objective:** Freeze architecture, database engine, authentication provider, hosting, storage provider, scope, and sequence based on verified evidence; confirm all zero-cost accounts.
* **What the Owner Must Do:**
  - Create private GitHub repository and place the 11 documents in `/docs`.
  - Create accounts **without entering card details**: GitHub, Cloudflare, Firebase (Spark; create 3 separate projects: `mirach-dev`, `mirach-staging`, `mirach-prod`), and Backblaze B2; turn on 2FA on all accounts.
  - Execute Gate P on Backblaze B2: create a private bucket, scoped application key, configure CORS, and run a test script verifying presigned PUT/GET and versioned delete. Stop and report if payment details are requested.
  - Decide open decisions OD-01, OD-02, OD-07, OD-09, OD-13, OD-14, or confirm safe defaults.
  - Approve documentation and sign off on the architecture freeze checklist (`REVIEW_REPORT.md` §11).
* **What the Agent Must Do:**
  - Read all planning documents in order.
  - Create `AGENTS.md` operating rules at repository root.
  - Perform document review prompts C1 to C6 to `/review/` without touching `/docs` or code.
  - Inspect repository; set up repo skeleton, CI workflow skeleton, `.env.example`, lint rules forbidding raw DB access and string SQL, and runbook stubs. Do NOT create any cloud resources or accounts.
* **Exit Gate:** **Gate P** passed (no-card B2 proven or ADR fallback selected) + owner approval recorded in `DECISIONS.md` = **Architecture Freeze**.

### Phase 1 — Frontend and Hosting Foundation
* **Objective:** Deploy an empty, responsive, accessible application shell with Worker Static Assets routing, security headers, and Firebase web SDK configuration wiring.
* **What the Owner Must Do:**
  - Provide a scoped Cloudflare API deploy token stored as a GitHub secret for CI.
  - Add the assigned `*.workers.dev` staging domain to Firebase authorized domains in the Firebase console.
  - Confirm the staging URL is live and inform the agent.
* **What the Agent Must Do:**
  - Build Vite + React + TypeScript (strict) + Tailwind app shell responsive across 320, 768, 1024, and 1280 px viewports.
  - Implement AppShell navigation, route guards (UX only), error boundaries, and offline/quota/maintenance screens.
  - Configure single Cloudflare Worker with Static Assets (SPA fallback, `run_worker_first` for `/api/*` and `/ws/*`), `public/_headers` (CSP and security headers), and `/api/health`.
  - Wire Firebase web SDK with configuration only (`inMemoryPersistence`).
  - Run the Phase 1 spike (Firebase on `workers.dev`, popup vs redirect, `/__/auth` proxy need, CSP entries) and record results in `docs/spikes/phase1-firebase.md`.
  - Run verification: deploy smoke test, headers verification in browser, Axe accessibility audit on shell, bundle secret inspection.
* **Exit Gate:** Staging URL live and verified; shell usable across all 4 device classes; spike results recorded.

### Phase 2 — Cloud Database, Worker API and Security Foundation
* **Objective:** Build the authoritative data layer and security spine (migrations, prepared queries, request pipeline, policy module, rate limiting) that all subsequent phases rely on.
* **What the Owner Must Do:**
  - Create D1 database for staging/local environments via Wrangler/Cloudflare dashboard without entering payment details.
  - Review the Phase 2 spike report and approve proceeding to step 2 (building the data layer and policy module).
* **What the Agent Must Do:**
  - **Step 1 (Spikes):** Run spikes against local D1 in the Workers test pool for: D1 `batch()` atomicity/rollback on UNIQUE violations and statement order; `RETURNING`; partial unique indexes; `STRICT` tables; per-handler CPU; subrequest counts (including whether DO calls count against the 50 limit); single-database migrations from scratch; Workers rate-limiting binding on Free; DO hibernation; D1 `meta` read/write metrics. Write `docs/spikes/phase2-report.md` and stop for owner review.
  - **Step 2 (After Owner Approval):** Create migration tooling (`/migrations/{core|chat|activity}` with globally unique file names); implement `src/worker/data` layer (the exclusive access point for D1); build request pipeline (rate limit, Origin/CSRF, session lookup stub, Zod validation, error format, request IDs); implement central `authorize()` policy module with unit tests; logging with redaction; 503 `QUOTA_EXHAUSTED` handling; DO and cron skeletons.
  - Run verification: migration from scratch into a single database, policy unit tests, SQL pattern tests on real D1 semantics, F-02, F-03, F-20, and SQL injection attempts.
* **Exit Gate:** Spike report accepted; data layer and policy module reviewed; all tests passing.

---

## 4. Unclear Areas, Ambiguities, and Document Gaps

The documents are remarkably rigorous, but the following 8 items represent areas where specifications are unverified, vendor limits are ambiguous, or fallback mechanisms require spike validation:

1. **Durable Objects Subrequest Accounting:** The limits documentation re-check (9 Nov 2026, `SOURCE_REGISTER.md` R1) confirmed 50 external subrequests and 1,000 internal subrequests to Cloudflare services, but explicitly noted that it is **unclear whether Durable Object calls count toward the 50 limit or the 1,000 limit**. While the group size cap of 25 protects the 50 limit, the exact subrequest budget behavior under concurrent WebSocket broadcasts requires Phase 2 spike verification.
2. **Durable Object and D1 "Rows Written" Metric Sharing:** `SOURCE_REGISTER.md` §6 item 4 and `Architecture.md` §19.1 note it is unverified whether the 100,000 daily rows written limit is separate for D1 and SQLite-backed Durable Objects, or shared across the entire Cloudflare account. If shared, write budgets for presence tracking and cursor coalescing will be tighter.
3. **Workers Rate-Limiting Binding on Free Tier:** `Architecture.md` §15.3 and `SOURCE_REGISTER.md` C10 acknowledge that availability and behavior of Cloudflare's rate-limiting binding on the Workers Free plan is unverified. If unavailable on Free, the exact fallback mechanism (e.g., tracking within DO memory or D1 tables) is not explicitly detailed in the architecture.
4. **Firebase Auth on `*.workers.dev` Subdomain:** In `Architecture.md` §2 and §5, it is unverified whether Firebase Authentication allows adding arbitrary `*.workers.dev` subdomains to Authorized Domains without a custom domain, and whether Google sign-in popups will encounter Cross-Origin-Opener-Policy (COOP) / iframe restrictions requiring the `/__/auth/` reverse proxy.
5. **Backblaze B2 Free Tier No-Card Activation & Public/Private Bucket Restrictions:** `SOURCE_REGISTER.md` R5 notes that making a bucket public requires billing history or a card fee, while private buckets do not. While Mirach uses private buckets, it remains unverified until Gate P whether Backblaze allows complete account activation, S3 application key creation, and API downloads up to 3× stored data without any payment method on file.
6. **Firebase Signing Keys JWK Endpoint:** `Architecture.md` §5.3 specifies `jose` validating against Google's Firebase keys and notes that Firebase documentation names the x509 endpoint, whereas standard JWT libraries consume the JWK endpoint (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`). The exact endpoint format and caching behavior in Worker environments are unverified until the Phase 3 spike.
7. **D1 Locking During `wrangler d1 export`:** `Architecture.md` §18 and `EXPORT_SPECIFICATION.md` §11 mention that D1 may be busy or lock tables during CLI SQL export, but the exact behavior on live databases during active writes is unverified.
8. **GitHub Actions Minute Allowance for Private Repos:** `SOURCE_REGISTER.md` C12 notes that GitHub Actions free minutes for a private repository were unverified.
