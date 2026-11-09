# Rules — Development, Security and AI-Agent Operating Rules for Mirach (v3)

> **Purpose:** Binding rules for the owner, developers and AI coding agents (including Antigravity).
> **Last reviewed:** 4 November 2026; consistency pass v3.1 on 9 November 2026 (Asia/Kolkata) — see `REVIEW_REPORT.md` §14. "Must" and "never" are literal.

## 1. Read order and precedence

Before planning or changing anything, read in this order:
1. `Rules.md` (this file) 2. `Memory.md` 3. `PRD.md` 4. `Architecture.md` 5. `Design.md` 6. `Phases.md` 7. `DECISIONS.md` 8. `EXPORT_SPECIFICATION.md` (for exports) 9. `ANTIGRAVITY_HANDOFF.md`.

**Precedence:** security, privacy, cost and cloud-only rules here cannot be weakened without an explicit owner decision recorded in `DECISIONS.md`. `PRD.md` controls scope; `Architecture.md` technical boundaries; `Design.md` interaction; `Phases.md` sequence; `Memory.md` current status. If documents conflict: **stop**, state the conflict, propose the smallest fix, update the documents, then continue. Never silently choose one.

## 2. Frozen decisions and change control

After the owner approves the documentation, these are **frozen**: cloud-authoritative architecture; Cloudflare Worker + Static Assets hosting; Cloudflare D1 as the persistent database (with `mirach-core`, `mirach-chat`, `mirach-activity` layout); Durable Objects for realtime/ephemeral state only; Firebase Authentication (Spark) as identity provider with Mirach server-side sessions; Backblaze B2 private storage (subject to Gate P); LiveKit Cloud (Phase 8); React + TypeScript + Vite + Tailwind; GitHub; the full feature scope in `PRD.md` §6; the phase sequence in `Phases.md`; **manual-export-only** data transfer; zero-cost/no-card policy.

**An agent must not change, replace or bypass any of these.** New ideas go to the backlog (`DECISIONS.md` §5). A change request must contain: (1) explanation; (2) technical evidence; (3) cost impact (must remain $0 and card-free unless the owner decides otherwise); (4) security impact; (5) migration impact; (6) explicit owner approval recorded as an ADR **before** implementation.

**Never reintroduce without explicit owner approval:** Windows/PC background sync services, archive collection, sync queues to the home PC, automatic transfer of chats, 24-hour cleanup after archiving, local database replication, home-server health checks, Cloudflare Tunnel to a home archive, automatic local media download, any local database as part of the system.

## 3. Task procedure (mandatory)

1. **Inspect existing state** — read the relevant documents and the real repository (`git status`, branch, files, migrations, tests). Never assume what exists.
2. **Plan** — list files, migrations, handlers, policies, tests; confirm the task belongs to the current phase.
3. **Implement** — small, reviewable change; one feature or migration set per task.
4. **Test** — add and run required tests (§18), including negative tests and the failure tests assigned to the phase; report exact commands and results.
5. **Security and quota impact review** — authorization, SQL scoping, secrets, logging, rate limits, rows read/written, Worker requests/CPU/subrequests, DO requests, storage, provider limits.
6. **Update documentation** — migrations, `.env.example`, `Memory.md` status, traceability, any contradicted statement.
7. **Completion report** (§22).

If a step cannot be done (no repo, no provider access, tests not runnable) say so and stop claiming progress; ask for files or command output.

## 4. Status vocabulary

**Planned** (documents only) · **Partially implemented** (list what is missing) · **Implemented** (runs; not verified by tests) · **Tested** (name the tests) · **Verified in production** (observed). Never write "done", "complete", "working" or "secure" without evidence and scope.

## 5. Scope control

- Work only on the current phase. Implement nothing unrequested, no later-phase items, no "nice-to-haves".
- Do not add providers, SaaS, plugins or services for convenience. Any new provider needs the change-control process **and** proof that it is activatable without a payment method.
- **No-card, zero-cost policy:** never enter, request or configure credit/debit cards, payment methods, billing accounts, pay-as-you-go services, paid APIs, budgets that assume payment, or automatic upgrades. If a provider screen asks for payment details, **stop** and report; do not proceed.
- Provider limits in documents are dated snapshots; re-verify at implementation and update `SOURCE_REGISTER.md`.

## 6. Dependencies

Do not add a package silently. Record: purpose, maintenance, licence, size (Worker bundle < 3 MB gzip), vulnerabilities, why existing tools do not suffice. Commit the lockfile; use `npm ci`; pin GitHub Actions by commit hash; prefer versions at least two weeks old; no floating `latest`; run `npm audit` and fix or record high/critical findings. Prefer Web platform APIs over libraries. Never write custom cryptography; use WebCrypto and approved libraries only.

## 7. Secrets and configuration

- Never commit, print, log or paste: Worker secrets (`SESSION_PEPPER`, `B2_KEY_ID`, `B2_APP_KEY`, `VAPID_PRIVATE_KEY`, `LIVEKIT_API_KEY/SECRET`, Firebase service-account JSON), Cloudflare/GitHub tokens, session cookies, ID tokens, invitation codes, signed URLs, export passphrases, real user data, `.env*` (except `.env.example`).
- Public `VITE_*` values are limited to Firebase web config and the environment name. Backend secrets are set with `wrangler secret put` or the CI secret store. Development, staging and production use different Firebase projects, D1 databases, keys and buckets.
- Document every variable in `.env.example` and `Architecture.md` §17.5.
- Suspected exposure: stop using it, rotate/revoke, check logs, tell the owner. Removing it from the latest commit is not remediation.
- Never place secrets in prompts, issues, screenshots or chat.

## 8. Environments and data

Local → staging → production (`Architecture.md` §17.2). **Synthetic data only** outside production; never copy real data down; never present synthetic data as real. Never bypass authentication or authorization for demos (no disabled checks, no hard-coded admin, no `if (dev)` shortcuts reaching production code).

## 9. Authentication and sessions

- No phone numbers anywhere. Email is never stored in D1, returned by an API, logged or exported (it stays in Firebase).
- Firebase ID tokens are validated **only** at `POST /api/session` and `/api/session/reauth`, exactly as `Architecture.md` §5.3 (RS256 only; `iss`, `aud` = environment's project ID; `exp`, `iat`, `auth_time`; non-empty `sub` ≤ 128; provider allow-list; verified email for password accounts). Never trust a token from another project, an anonymous token, or a decoded-but-unverified token.
- After that, authorization uses the **Mirach server-side session** (opaque `HttpOnly; Secure; SameSite=Strict` `__Host-` cookie, hash-only storage). Never place roles, status or permissions in cookies or client-readable tokens.
- Every state-changing request needs the Origin/`Sec-Fetch-Site` check and the custom header; WebSocket upgrades need the Origin check.
- Sensitive actions (role change, account deletion, invitation management, and the sensitive exports E1/E7/E8/cross-member E5 in `EXPORT_SPECIFICATION.md` §4) require `reauth_at` within **5 minutes** (same value as `Architecture.md` §5.3 and `PRD.md` FR-AUTH-05). Ordinary self-exports of own conversations (E2/E3/E6) need only an active session.
- The Firebase web SDK uses `inMemoryPersistence`: the Firebase ID token exists only long enough to call `POST /api/session` (or `/reauth`), after which the client calls Firebase `signOut()`. After that only the Mirach `HttpOnly` cookie identifies the user; no Firebase token is kept in IndexedDB or `localStorage`.
- Suspension must revoke sessions, close sockets and flip status in one operation; Firebase Admin hardening is optional and must not be required for correctness.
- Never use Firebase Cloud Functions, Firebase Hosting billing features, Identity Platform upgrade, SMS/phone auth, or email-link sign-in.

## 10. Authorization and D1

- **All authorization is in the Worker**: `authorize()` policy module + SQL predicates. D1 has no row-level security, so there is no safety net: every handler must call the policy layer and scope its SQL.
- **Prepared statements with bound parameters only.** Never build SQL from strings; bounded `IN` lists use fixed placeholder counts. Only `src/worker/data` may touch `env.DB_*`; Durable Objects (`src/worker/do`) reach D1 only by calling functions exported from `src/worker/data`, never `env.DB_*` directly (lint covers both folders).
- Embed access predicates in the write itself (check-then-act races are bugs). Use `batch()` for atomic multi-statement changes; verify batch semantics per the Phase 2 spike.
- Never accept `user_id`, `sender_id`, role, status, `seq`, counters, timestamps or results from the client.
- Respect the D1 limits in design: ≤ 50 queries per invocation (aim ≤ 6), rows read/written budgets (index only what is needed; coalesce cursor updates; no per-message receipt rows; no presence in D1), page sizes ≤ 50 (≤ 200 for exports), 2 MB row limit, 100 bound parameters, 100 KB statement.
- No unbounded scans. Every list query is cursor-paginated and indexed.
- Handle D1 daily-limit and storage-full errors explicitly: return `503 QUOTA_EXHAUSTED`, never a success; never swallow write errors.
- Chat tables must never reference core tables by foreign key (logical references only) so databases can be split.

## 11. Invitations, administration and recovery

Invitation codes ≥ 80-bit random, shown once, stored as hash, default 1 use/7 days, `member` role only, redeemed atomically with derived counts, ≤ 5 failed attempts/hour, generic errors. Roles: owner > admin > moderator > member; no self-role-change; admins cannot act on owners; only owners create admins; the last owner cannot be removed or demoted. Owner bootstrap runs once with a runtime-supplied UID (never committed) and refuses if an owner exists. **Break-glass recovery** follows `docs/runbooks/owner-recovery.md` and writes an audit row. Every privileged action writes an append-only `audit_logs` row (no secrets, no message text). **No admin or moderator may read conversations**; moderation uses evidence snapshots only. Never add an admin message browser, impersonation or a hidden backdoor.

## 12. Messaging and realtime

- D1 is the source of truth; Durable Objects carry ids-only signals and ephemeral state. A signal never contains message text.
- Use WebSocket Hibernation; no timers/pending fetches that prevent hibernation; do not store durable data only in DO memory.
- Group size cap 25 (subrequest budget) unless changed by ADR.
- Idempotent sends via `client_msg_id`; never show "sent" before server confirmation; never show "read/delivered" unless recorded and permitted.
- Outbox: IndexedDB only, labelled "Not sent", never presented as server data, cleared per §Design 16 rules.
- Deletion: delete-for-me = hide row; delete-for-everyone = tombstone + attachment deletion + signals; no deleted text may be recoverable through APIs, caches or exports.
- After removal/block/suspension/sign-out, test that sockets are evicted and fetches fail.

## 13. Storage and media

- Backblaze B2 private bucket only; never a public bucket; no media in D1 or Durable Objects. If Gate P is not passed, do **not** implement Phase 6 against another provider without an ADR.
- Types: images JPEG/PNG/WebP; video MP4/WebM; audio Opus/WebM/MP4; documents PDF/TXT/CSV/DOCX/XLSX/PPTX. Reject SVG, HTML, scripts, executables, macro-enabled Office files. Verify magic bytes server-side after upload.
- Paths and filenames are server-generated; client input is never authorization. Signed URLs ≤ 5 minutes, only after authorization; store keys, never URLs.
- Client pipelines must resize/re-encode images (EXIF removed), generate thumbnails, and enforce size/duration limits before upload; server enforces again.
- Deletion removes objects **and** versions; sweep failures are visible to the owner.
- Respect per-user quotas and the 7 GB warning / 9 GB hard stop.

## 14. Calls (Phase 8 only)

Not before Gate L. Secrets only in Worker secrets. The server decides who may join: validate session, membership, connection, block, call state; mint a room-scoped token ≤ 10 minutes with least privilege. State transitions are server-side. No recording. No E2EE claims. Stay within the free allowance; show "calling unavailable" rather than enabling paid options.

## 15. Games (Phase 9 only)

Server-authoritative. Validate turn, legality, player and idempotency in the `GameRoom` Durable Object, then write moves to D1 with unique move numbers. Browsers never submit winners or scores. No gambling, stakes or rewards with monetary value.

## 16. Frontend and code standards

TypeScript `strict`; no `any`/`@ts-ignore` without a local justification; feature modules; components do not call `fetch` or Firebase outside `src/lib`/`src/features/*/api`; route guards are UX only; every data component handles loading, empty, error, offline, quota and revoked states; no `dangerouslySetInnerHTML`; centralized strings; accessibility and gesture alternatives are requirements (`Design.md` §15); no tokens or personal data in `localStorage`; Firebase Auth set to `inMemoryPersistence` (§9); do not cache authenticated API responses beyond the in-memory query cache and the labeled outbox; reuse existing components.

## 17. Migrations

Every schema change is a versioned SQL migration under `/migrations/{core|chat|activity}`; dashboard edits are never the only record. **Migration file names are unique across all three folders** (`core_0001_…`, `chat_0001_…`, `activity_0001_…`) because staging points all three bindings at one D1 database and Wrangler tracks applied migrations by file name; the CI from-scratch test must apply all three folders to a single database as well as to separate ones. Review grants of data-layer access, indexes (write cost!), constraints and rollback. Apply local → staging → production; never edit an applied migration; test from-scratch apply in CI. Before risky production migrations: note the current D1 Time Travel bookmark and, when appropriate, ask the owner to take a manual `wrangler d1 export`.

## 18. Testing standards

Unit, Worker/API (Workers test pool with local D1/DO), component, Playwright multi-user. **Privacy features require negative tests through the HTTP API** for every actor in `Phases.md` §5. Required regressions: invitation concurrency, idempotent send, `seq` ordering, block effects, suspension, removed group member, signed-URL expiry, deleted-content non-reappearance, export exclusions, quota-exhaustion responses. Do not skip, delete or weaken failing tests; fix the cause or record an owner-approved exception. Report what ran and what did not.

## 19. Logging, monitoring, quota and privacy

Log request ID, route, status, error class, timing, rows read/written (from D1 `meta`), never message bodies, media, tokens, cookies, invitation codes, emails, passphrases, signed URLs or secrets. Safe user-facing errors; detail in protected logs. Follow the retention schedule (`Architecture.md` §7.6). Collect the minimum. Monitor quotas weekly (`Architecture.md` §17.6); warn at 70 %; fail closed when exhausted; never enable billing. Do not invite minors; make no legal-compliance claims.

## 20. Git, CI and deployment

Check `git status`/branch before large operations; feature branches; PRs to `main`; CI must pass (type-check, lint incl. SQL/DB-access rules, tests, build, migration dry-run, secret scan, audit). Never force-push, rewrite history, hard-reset, `git clean -fdx` or mass-delete without owner permission and a recovery path. Do not overwrite a user-authored file without reading it. Staging deploys from `main`; production deploys by owner-approved manual workflow. Never commit build output, dumps, exports or `.env*`.

## 21. Documentation maintenance

Behavior, data, security, scope, environment or cost changes update the affected documents **in the same change**. Architectural change = ADR. Keep the eleven filenames; no `-final`/`-new` copies; backups live in dated folders. Update `Memory.md` status at the end of each session, truthfully. Re-verified provider facts go to `SOURCE_REGISTER.md`. Keep the traceability matrix (`REVIEW_REPORT.md` §8) current.

## 22. Completion report (every task)

1. **Changed** — files, migrations, handlers, policies, behavior. 2. **Why** — requirement ID and phase. 3. **Tests run** — exact commands, results, and what was **not** run. 4. **Security and quota impact** — authorization, SQL, secrets, rows read/written, requests, CPU, storage. 5. **Status** — Planned/Partially implemented/Implemented/Tested per item. 6. **Not done / risks / unverified.** 7. **Documentation updated.** 8. **Next approved step.**

## 23. Cloud-only and export rules

- All application data is stored and served from the cloud; never design a feature that requires the owner's or a user's computer to be on.
- Exports are **manual only**, user-initiated, authorized, previewed, never scheduled, never automatic, and never delete or modify online data. Follow `EXPORT_SPECIFICATION.md` exactly (exclusions, encryption, audit).
- Do not add automatic downloads, background sync, service-worker data mirroring, or local replicas. The browser stores only caches, labeled outbox/drafts and files the user explicitly saves.

## 24. Prohibited claims

Never state, in code, UI, docs or reports, without evidence and defined scope: "secure", "production-ready", "end-to-end encrypted", "fully encrypted", "administrators cannot read messages", "unlimited free", "compliant with DPDP/GDPR", "no data is ever lost", "calls work on every network", "free forever", "completed". Do not create placeholder security policies (for example an `authorize()` that always returns true) and describe the app as secure. Say what was verified and how.
