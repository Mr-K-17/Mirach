# C5 — Buildability, Testability, and Task Breakdown (Phases 0–7)

> **Review Date:** 9 November 2026 (Asia/Kolkata)  
> **Source Documents Audited:** `Phases.md`, `PRD.md`, `Design.md`, `Architecture.md`, `Rules.md`, `SOURCE_REGISTER.md`.  
> **Scope:** Phases 0 to 7 (the complete Trusted-Group Release milestone, ending at Gate B).  
> **Status:** Implemented (Read-only review; no application code or cloud resources modified).

---

## 1. Executive Summary & Buildability Verdict

The architecture for Phases 0 through 7 is **buildable, testable, and logically sound**, provided that the vertical phase ordering (Phase 2 Database Spine $\rightarrow$ Phase 3 Auth $\rightarrow$ Phase 4 Profiles $\rightarrow$ Phase 5 Messaging $\rightarrow$ Phase 6 Media $\rightarrow$ Phase 7 Enhancements) is strictly maintained.

However, several phases—particularly Phase 2, Phase 3, and Phase 5—are too large to be built in a single turn without drifting or hitting context saturation. They must be split into single-feature and single-migration tasks as mandated by `Rules.md` §3. Furthermore, automated testing for certain edge criteria (such as iOS Home Screen push and network latency reporting) requires explicit manual testing protocols.

---

## 2. Requirement Testability Analysis

Every functional requirement from `PRD.md` §6.1 through §6.8 was evaluated for automated vs. manual testability:

| Requirement / Criterion | Automated Testability | Verification Protocol / Limitations |
|---|:---:|---|
| **FR-AUTH-04 (No data flash on expired session)** | **Partially Automated** | Playwright can assert redirect timing and absence of cached DOM content; verified manually on slow 3G network simulation. |
| **FR-MEM-01 (Concurrent invitation redemption)** | **Fully Automated** | 20 concurrent HTTP requests in Workers test pool assert exactly 1 success for `max_uses = 1`. |
| **FR-MEM-10 (Versioned terms & 18+ policy acceptance)** | **Fully Automated** | API contract and D1 `policy_acceptances` assertions. |
| **FR-PRO-04 (Privacy settings reciprocity)** | **Fully Automated** | $2 \times 2$ matrix testing (viewer setting $\times$ target setting) through HTTP API asserting field masking. |
| **FR-MSG-04 (Realtime text delivery & latency)** | **Partially Automated** | Multi-browser Playwright test measures socket receipt. Latency is empirical/measured, not a boolean pass/fail gate. |
| **FR-MSG-06 (Idempotent delivery via `client_msg_id`)** | **Fully Automated** | Parallel duplicate POST requests assert identical message ID and sequence returned without duplicates. |
| **FR-INT-06 / 07 (Keyboard & gesture alternatives)** | **Fully Automated** | Playwright tests trigger actions via keyboard shortcuts (`Shift+F10`, Enter) and visible More button clicks. |
| **FR-MED-05 (Private media access with signed URLs)** | **Fully Automated** | Unauthorized member API calls assert HTTP 403; expired URLs assert Backblaze signature failure. |
| **FR-MED-07 (Permanent deletion including versions)** | **Partially Automated** | Automated API tests check D1 tombstone; staging Backblaze B2 S3 API call verifies version ID removal. |
| **FR-ENH-05 (Online presence lag on silent drop)** | **Manual / Simulated** | Simulated via abrupt TCP socket termination in Workers test pool; presence registry timeout observed. |
| **FR-ENH-07 (Web Push on iOS)** | **Manual Only** | Headless CI browsers cannot run Apple APNs push; requires manual verification on an iOS device added to Home Screen. |
| **Design §15 (Accessibility WCAG 2.2 AA)** | **Hybrid** | `@axe-core/playwright` automates ~40% of checks (contrast, ARIA, labels); screen-reader navigation requires manual audit. |

---

## 3. Cross-Phase Dependency Verification (Phases 0–7)

A rigorous check confirmed that dependencies between phases are strictly linear and forward-compatible:
1. **Profiles (Phase 4) vs. Media (Phase 6):** Phase 4 profile viewing and directory display use **generated initials avatars** only. Avatar uploads and cropping are explicitly deferred to Phase 6 when Backblaze B2 is available (ADR-027).
2. **Connections (Phase 4) vs. Messaging (Phase 5):** In Phase 4, the "Message" button on connection cards is hidden or disabled with a tooltip ("Messaging available in Phase 5"). Direct conversations cannot be created until Phase 5.
3. **In-App Notifications (Phase 4) vs. Web Push (Phase 7):** Phase 4 implements the internal `notifications` table and bell UI. Web Push (VAPID, service worker, background push) is layered on in Phase 7 without breaking the in-app notification center.
4. **Messaging Core (Phase 5) vs. Media Attachments (Phase 6):** Phase 5 implements text and system messages with `messages.kind IN ('text', 'system')`. Media attachments, voice notes, and video pipelines plug directly into `message_attachments` in Phase 6.
5. **Account Deletion Request (Phase 3) vs. Execution Job (Phase 6):** Phase 3 creates `account_deletion_requests` and the 14-day grace period. The background cron execution job is built in Phase 6 because it must sweep B2 media buckets.

---

## 4. Spikes, Design Risks, and Fallback Paths

| Spike | Phase | What Could Fail | Design Impact if Spike Fails | Concrete Documented Fallback |
|---|:---:|---|---|---|
| **Gate P: Backblaze B2 No-Card Activation** | **Phase 0** | B2 asks for payment method during bucket creation, key generation, or CORS setup. | Media features are completely blocked. | App remains text-only for Phase 1–5. Owner evaluates alternative zero-card providers via ADR (Cloudinary, Uploadcare, Supabase). Cloudflare R2 is rejected. |
| **Firebase on `workers.dev`** | **Phase 1** | Google sign-in popups blocked by COOP/iframe policies, or `workers.dev` rejected as authorized domain. | Sign-in UX impaired on staging. | Implement Worker proxy for `/__/auth/*` routes, or switch client SDK to redirect mode (`signInWithRedirect`). |
| **D1 `batch()` Atomicity & Rollback** | **Phase 2** | UNIQUE violation in multi-statement batch does not roll back earlier statements in D1 SQLite. | Message ordering and sequence bump could become inconsistent. | Fallback to single-statement conditional write or application-level transactional compensation in Worker data layer. |
| **Workers Rate-Limiting on Free Plan** | **Phase 2** | Cloudflare native rate-limiting binding unavailable on Free tier. | Cannot use native binding for IP/endpoint throttling. | Fallback to an in-memory sliding window in a singleton Durable Object (`RateLimiterDO`) with zero D1 write cost. |
| **DO WebSocket Hibernation & Alarms** | **Phase 2** | DO fails to hibernate with open sockets or alarm flushes drop delivered-acknowledgment cursors. | DO duration quota (13,000 GB-s) exhausted. | Alarm-based flush adjusted to client-driven batch acks or immediate debounced D1 writes. |
| **Firebase Admin REST Hardening** | **Phase 3** | Google service-account REST calls fail without billing account or Cloud Functions. | Cannot programmatically revoke Firebase refresh tokens on suspension. | D1 tombstone blocks session creation for suspended UIDs; owner removes orphan Firebase accounts monthly in console. |
| **B2 Lifecycle Rules & Version Deletion** | **Phase 6** | `DeleteObject` leaves hidden versions downloadable or lifecycle rule fails to purge. | Old media lingering after "Delete for Everyone". | Worker calls S3 `ListObjectVersions` and issues explicit batch deletion of all version IDs. |
| **D1 FTS5 Write Amplification** | **Phase 7** | FTS5 virtual tables consume excessive writes against the 100k daily write budget. | Full-text search exhausts daily D1 write quota. | Stay with bounded `LIKE` scan over recent 20,000 messages with hard daily per-user search limits. |
| **Web Push CPU Overhead** | **Phase 7** | VAPID encryption for push payloads exceeds Worker 10 ms CPU limit. | Push notifications fail with Worker CPU limits. | Push encryption and dispatch offloaded to Durable Objects (which have a 30-second CPU limit). |

---

## 5. Repository Layout: Exact Folders and Files (Phases 0 & 1)

Based on `Architecture.md` §17.3, the following exact directory structure and files must be created:

### Phase 0 Skeleton
```
/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pinned GitHub Actions (commit hash), typecheck, lint, test, build
├── docs/                              # Existing 11 planning documents
│   └── runbooks/
│       ├── owner-recovery.md          # Emergency owner recovery runbook stub
│       ├── backup-restore.md          # D1 Time Travel & SQL restore drill runbook stub
│       ├── secret-rotation.md         # Worker secret rotation runbook stub
│       └── incident-and-breach.md     # Security incident response runbook stub
├── review/                            # C1-C6 review documents
├── AGENTS.md                          # Mandatory agent operating rules (created)
├── .gitignore                         # Strict exclusions (.env*, dist/, dumps, exports)
├── .env.example                       # Variable names only (Architecture §17.5)
├── package.json                       # Root scripts: typecheck, lint, test
├── tsconfig.json                      # Strict TypeScript configuration
└── .eslintrc.cjs                      # ESLint rules banning raw DB access & string-built SQL
```

### Phase 1 Foundation
```
/
├── public/
│   ├── _headers                       # Static Assets CSP, HSTS, X-Content-Type-Options
│   └── manifest.webmanifest           # Basic Web App manifest stub
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── AppShell.tsx           # Responsive shell (rail, header, content area)
│   │   │   ├── NavigationRail.tsx     # Desktop/tablet navigation rail
│   │   │   ├── TabBar.tsx             # Mobile bottom tab bar (hidden in chats)
│   │   │   └── ErrorBoundary.tsx      # React error boundary component
│   │   ├── routes/
│   │   │   ├── WelcomeScreen.tsx      # S1 landing and sign-in shell
│   │   │   ├── MaintenanceScreen.tsx  # System maintenance state
│   │   │   ├── QuotaExhaustedScreen.tsx # 503 quota exhaustion banner
│   │   │   └── NotFoundScreen.tsx     # 404 handler
│   │   ├── tokens.css                 # CSS variables mapped into Tailwind tokens
│   │   ├── router.tsx                 # Route declarations with UX-only guards
│   │   ├── main.tsx                   # React root entry point
│   │   └── App.tsx                    # Root application component
│   ├── lib/
│   │   └── firebase.ts                # Config-only Firebase SDK wiring (inMemoryPersistence)
│   └── worker/
│       ├── index.ts                   # Single Worker router, Static Assets fallback, /api/health
│       └── middleware/
│           └── headers.ts             # Programmatic security headers for /api/* and /ws/*
├── docs/spikes/
│   └── phase1-firebase.md             # Spike report for Firebase on workers.dev
├── tests/
│   ├── worker/
│   │   └── health.test.ts             # Health check and routing tests
│   └── e2e/
│       └── shell.spec.ts              # Playwright responsive shell & Axe tests
├── vite.config.ts                     # Vite configuration with React & Tailwind
├── tailwind.config.js                 # Tailwind CSS theme extension using Design §2 tokens
├── postcss.config.js                  # PostCSS configuration
└── wrangler.jsonc                     # Worker configuration with Static Assets bindings
```

---

## 6. Dependency Analysis Through Phase 7 (`Rules.md` §6)

| Package | Scope | Size Impact | Justification & Reason Native APIs Do Not Suffice | Verdict |
|---|---|:---:|---|:---:|
| `react`, `react-dom` | Frontend | Core | Declarative component model required for complex reactive UI. | **Approved** |
| `react-router-dom` | Frontend | ~20 KB | Standard client-side routing matching route map (`Design.md` §4). | **Approved** |
| `@tanstack/react-query` | Frontend | ~13 KB | Server-state caching, automatic refetch, and query deduplication. | **Approved** |
| `zod` | Frontend & Worker | ~12 KB | Unified runtime schema validation for forms and API request bodies. | **Approved** |
| `firebase` (web SDK) | Frontend | Tree-shaken | Required for Google and email/password sign-in; config-only. | **Approved** |
| `lucide-react` | Frontend | Tree-shaken | Lightweight, accessible, consistent icon set (`Design.md` §2.2). | **Approved** |
| `idb` | Frontend | ~1.5 KB | Tiny promise wrapper over IndexedDB for outbox drafts. | **Approved** |
| `jose` | Worker | ~18 KB | Universal JWT verification for Firebase RS256 tokens using WebCrypto. | **Approved** |
| `aws4fetch` | Worker | ~5 KB | Zero-dependency, WebCrypto-based SigV4 signer for Backblaze B2 S3 API. | **Approved** |
| `vitest`, `@cloudflare/vitest-pool-workers` | Dev/Test | Dev-only | Official Workers test pool for local D1 and DO testing. | **Approved** |
| `@playwright/test`, `@axe-core/playwright` | Dev/Test | Dev-only | Multi-user browser automation and automated WCAG 2.2 AA testing. | **Approved** |
| `axios` | Any | — | **Unnecessary:** Native `fetch()` is standard across browsers and Workers. | **REJECTED** |
| `crypto-js` | Any | — | **Prohibited:** Custom/legacy crypto; native WebCrypto must be used. | **REJECTED** |
| `@aws-sdk/client-s3` | Worker | > 2 MB | **Prohibited:** Massive bundle bloat; `aws4fetch` (5 KB) covers SigV4. | **REJECTED** |
| `firebase-admin` | Worker | > 5 MB | **Prohibited:** Incompatible with Worker runtime without heavy polyfills. | **REJECTED** |
| `moment` / `dayjs` | Any | — | **Unnecessary:** Modern `Intl.DateTimeFormat` handles localized UTC formatting. | **REJECTED** |

---

## 7. Short Table Per Phase: Tasks, Risks, Tests, and Owner Actions (Phases 0–7)

| Phase | Granular Tasks | Primary Risks | Tests to Run | Owner Actions |
|:---:|---|---|---|---|
| **Phase 0** | 1. Review docs (C1–C6)<br/>2. Repo skeleton & `.env.example`<br/>3. ESLint DB/SQL rules<br/>4. CI stub & runbook stubs | B2 requires payment method; unverified provider facts. | Cross-reference checks; CI dry-run; Gate P script execution. | Create GitHub, Cloudflare, Firebase (3 projects), and B2 accounts without card. Execute Gate P script. Sign off on freeze. |
| **Phase 1** | 1. Vite + React + Tailwind setup<br/>2. Responsive AppShell & routes<br/>3. Worker Static Assets & `/api/health`<br/>4. Firebase SDK wiring<br/>5. Staging CI deploy workflow | Firebase popup blocked on `workers.dev`; CSP misconfiguration. | Deploy smoke; Axe accessibility; responsive snapshots (320, 768, 1024, 1280 px); header verification. | Provide Cloudflare deploy token as GitHub secret. Add staging `*.workers.dev` to Firebase authorized domains. |
| **Phase 2** | 1. Execute Phase 2 spikes<br/>2. Migration tooling & schema stubs<br/>3. `src/worker/data` layer<br/>4. Request pipeline middleware<br/>5. `authorize()` policy module<br/>6. Rate limiting & 503 handling | D1 batch atomicity fails; subrequests exceeded; DO write meter sharing. | Migration from scratch; policy unit tests; SQL pattern tests; F-02, F-03, F-20; SQL injection attempts. | Create D1 databases for staging/local without card. Review Phase 2 spike report and approve proceeding to step 2. |
| **Phase 3** | 1. Firebase token validation<br/>2. Server sessions (`__Host-` cookie)<br/>3. Username claim & 18+ policy<br/>4. Invitation redemption & creation<br/>5. Membership approval flow<br/>6. Owner bootstrap CLI<br/>7. Admin console & suspension<br/>8. Account deletion request flow | Invitation concurrency races; token replay; mutual owner demotion. | F-01, F-12, F-14; 20 concurrent redemptions; token negative tests (issuer, audience, unverified email); CSRF tests. | Run one-time owner bootstrap CLI. Verify Gate A criteria. Appoint second admin. |
| **Phase 4** | 1. Profile view/edit (initials avatar)<br/>2. Privacy controls<br/>3. Directory search (prefix match)<br/>4. Canonical connections<br/>5. Bidirectional user blocking<br/>6. Reports & evidence snapshots<br/>7. Basic notification centre | Directory scraping; check-then-act races on connection requests. | F-15; duplicate simultaneous connection requests; blocked member isolation; directory rate limits; privacy matrix. | Review moderation queue procedures; verify zero email exposure in directory or database. |
| **Phase 5** | 1. 1:1 and group conversations<br/>2. Realtime DO spine (`UserHub`, `Room`)<br/>3. Idempotent message sending (`seq`)<br/>4. Message pagination & catch-up<br/>5. Cursors (delivered/read)<br/>6. Typing indicators & unread counts<br/>7. Replies, reactions, 15-min edit<br/>8. Delete for me / for everyone<br/>9. Accessible menus & gestures<br/>10. Client IndexedDB outbox | Daily D1 write quota exhaustion; subrequest limits; zombie WebSocket rooms. | F-04, F-05, F-09, F-10, F-11, F-15, F-16; 2-browser Playwright E2E; offline reconnect; rows written per message measurement. | Observe real-time messaging between two browsers; verify write budget remains within ~6 writes/message target. |
| **Phase 6** | 1. Backblaze B2 SigV4 client<br/>2. Media upload & magic-byte check<br/>3. Client resize & EXIF stripping<br/>4. Signed GET URLs ($\le 5$ min)<br/>5. Profile photo / group avatar upload<br/>6. Storage quota monitoring (75 MB)<br/>7. Permanent versioned deletion<br/>8. Account deletion execution job | Orphan files lingering in B2; malicious file uploads; egress limit exhaustion. | F-06, F-07, F-08, F-13; upload cancellation; magic-byte rejection; EXIF absence verification; B2 version deletion check. | Inspect B2 bucket console to confirm private bucket status and verify object and version deletion after "Delete for everyone". |
| **Phase 7** | 1. Bounded message search<br/>2. Forwarding ($\le 5$ targets)<br/>3. Message pinning ($\le 3$ pins)<br/>4. Conversation muting<br/>5. Presence & reciprocal last seen<br/>6. Web Push (VAPID) & PWA manifest<br/>7. Gate B verification drill | FTS5 write amplification; push payload encryption CPU limits; iOS push caveats. | Search privacy & rate limits; forward authorization; presence reciprocity matrix; Web Push delivery; D1 restore drill. | Conduct D1 Time Travel restore drill and SQL export drill; publish limitations notice; sign off on Gate B release. |
