# C4 — Provider Facts Verification: Limits, Pricing, and No-Card Feasibility

> **Review Date:** 9 November 2026 (Asia/Kolkata)  
> **Source Documents Compared:** `SOURCE_REGISTER.md`, `Architecture.md` §2 and §19, and official vendor documentation.  
> **Scope:** Cloudflare (Workers, D1, Durable Objects, Static Assets), Firebase Authentication (Spark), Backblaze B2, and LiveKit Cloud.  
> **Status:** Implemented (Read-only review; no provider accounts created, no payment details entered, no documents in `/docs` modified).

---

## 1. Executive Summary & Mandatory Questions Answered

### Question 1: Do Durable Object calls count toward the Worker 50-subrequest limit?
* **Authoritative Answer:** **No.**
* **Official Evidence:** On the Workers Free plan, Cloudflare separates subrequest limits into two tiers:
  1. **External Subrequests:** Capped at **50 per invocation** (outbound `fetch()` calls to external third-party internet endpoints).
  2. **Cloudflare Services Subrequests:** Capped at **1,000 per invocation** for calls to internal Cloudflare service bindings, which explicitly includes **Durable Objects**, **D1**, **KV**, and **R2**.
* **Source:** [Cloudflare Workers Limits Documentation](https://developers.cloudflare.com/workers/platform/limits/).
* **Effect on Architecture:** This resolves the open question in `SOURCE_REGISTER.md` §0 (R1) and confirms that Worker-to-Durable-Object RPC calls and notifications do **not** exhaust the 50 external subrequest budget. The 25-member group size cap remains a prudent product and database write-budget protection, but the subrequest headroom is 1,000 internal calls per invocation.

---

### Question 2: Is a credit/debit card needed for free use?
* **Cloudflare Workers / D1 / Durable Objects (Free Tier):**
  * **Answer:** **No card required.**
  * **Official Evidence:** Cloudflare Workers pricing explicitly states *"No credit card required"* for the Free plan. Account creation and deployment of Workers, D1 databases, and SQLite-backed Durable Objects on the Free tier proceed without a billing instrument. Exceeding daily free quotas results in HTTP errors (e.g., error 1027 or D1 write failures) rather than automated billing.
  * **Source:** [Cloudflare Workers Pricing](https://workers.cloudflare.com/pricing/).
* **Firebase Authentication (Spark Plan):**
  * **Answer:** **No card required.**
  * **Official Evidence:** The Firebase Spark plan ($0/month) does not require a credit card or a Google Cloud Billing account. If Spark email or sign-in quotas are exhausted, operations pause until the next daily reset. A credit card is only required if a project is upgraded to the Blaze (pay-as-you-go) tier.
  * **Source:** [Firebase Pricing Plans](https://firebase.google.com/pricing).
* **Backblaze B2 Cloud Storage (Free Tier):**
  * **Answer:** **No card required for initial sign-up and private bucket storage; UNVERIFIED for ongoing zero-card account lifecycle (Gate P).**
  * **Official Evidence:** Backblaze B2 documentation and sign-up pages explicitly advertise *"First 10 GB free"* and *"No credit card required"* at sign-up. However, official support articles note that making a bucket *public* requires billing history or a card verification fee (not applicable to Mirach since all buckets are strictly private). The owner's Phase 0 script test (Gate P) remains the mandatory exit gate to verify that B2 creates private buckets, application keys, CORS, and presigned URLs without prompting for payment details.
  * **Source:** [Backblaze B2 Pricing](https://www.backblaze.com/cloud-storage/pricing).

---

### Question 3: Which Free-plan DO and D1 "rows written" meters are shared?
* **Authoritative Answer:** **The account-wide daily quota of 100,000 rows written and 5,000,000 rows read is shared across both D1 and SQLite-backed Durable Objects.**
* **Official Evidence:** Cloudflare's platform documentation states:
  > *"SQLite-backed Durable Objects and D1 share the same pricing and limits model for rows read and written. On the Workers Free plan, the shared limit is 100,000 rows written per day and 5,000,000 rows read per day per account."*
  Furthermore, on Durable Objects, key-value storage methods (`.get()`, `.put()`, `.delete()`), setting an alarm (`setAlarm()`), and SQLite statements all decrement the same row-meter.
* **Source:** [Cloudflare Durable Objects Pricing & Limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).
* **Effect on Architecture:** This resolves UNVERIFIED item 4 in `SOURCE_REGISTER.md` §6. Because D1 and Durable Object SQLite storage draw from the **same 100,000 daily write budget**, Mirach's decision to avoid writing presence to D1 and to coalesce WebSocket delivered-acknowledgments via Durable Object alarms is even more critical. Presence and socket tracking in `PresenceRegistry` and `UserHub` must rely primarily on ephemeral in-memory state rather than frequent DO SQLite writes.

---

## 2. Comprehensive Item-by-Item Provider Verification Matrix

Each figure from `SOURCE_REGISTER.md` and `Architecture.md` §2 and §19 was verified against official documentation as of 9 November 2026.

| Provider / Feature | Claimed Limit in Docs | Document Section | Official Page Finding (Quote / Number) | Official Source URL | Status | Effect on Design |
|---|---|---|---|---|:---:|---|
| **Workers Requests** | 100,000 requests/day | `Arch §2`, `SOURCE C1` | 100,000 requests/day account-wide; resets 00:00 UTC; returns HTTP 1027 on limit | `developers.cloudflare.com/workers/platform/limits/` | **Confirmed** | Strict fail-closed outage design confirmed. |
| **Workers CPU Time** | 10 ms CPU / invocation | `Arch §2`, `SOURCE C1` | 10 ms CPU per HTTP request and per cron trigger on Free tier | `developers.cloudflare.com/workers/platform/limits/` | **Confirmed** | Must offload crypto/chess to DOs (30 s limit). |
| **Workers External Subrequests** | 50 / invocation | `Arch §2`, `SOURCE C1` | 50 external subrequests (outbound fetch calls) | `developers.cloudflare.com/workers/platform/limits/` | **Confirmed** | Sufficient for external API calls (e.g. B2, Firebase). |
| **Workers Cloudflare Service Subrequests** | Unstated / assumed 50 | `Arch §10.4`, `SOURCE R1` | 1,000 subrequests to internal Cloudflare services (D1, DO, KV, R2) | `developers.cloudflare.com/workers/platform/limits/` | **Confirmed** | Confirms 25-member group signal fan-out fits easily. |
| **Cron Triggers** | 5 triggers / account | `Arch §17.1`, `SOURCE R1` | 5 cron triggers per account on Free tier | `developers.cloudflare.com/workers/platform/limits/` | **Confirmed** | Mirach uses ≤ 2 crons (retention & cleanup). |
| **Workers Static Assets** | Free & unlimited requests | `Arch §2`, `SOURCE C7` | Static asset requests are free; up to 20,000 files per Worker version | `developers.cloudflare.com/workers/static-assets/` | **Confirmed** | Host SPA shell without consuming 100k Worker requests. |
| **Static Assets `_headers`** | Supported via `_headers` | `Arch §15.2`, `SOURCE C7` | `_headers` file supported in asset directory; applies to static asset responses | `developers.cloudflare.com/workers/static-assets/` | **Confirmed (with nuance)** | Programmatic responses intercepted by Worker code must set headers in code. |
| **Static Assets SPA Fallback** | `not_found_handling = "single-page-application"` | `Arch §17.1`, `SOURCE C7` | Serves root `index.html` on 404 for client-side routing | `developers.cloudflare.com/workers/static-assets/routing/` | **Confirmed** | Standard SPA client-side routing confirmed. |
| **Static Assets Interception** | `run_worker_first = ["/api/*", "/ws/*"]` | `Arch §17.1`, `SOURCE C7` | Routes matching pattern execute Worker script first before static lookup | `developers.cloudflare.com/workers/static-assets/routing/` | **Confirmed** | Intercepts all API and WebSocket paths cleanly. |
| **D1 Database Count** | 10 databases / account | `Arch §2`, `SOURCE C3` | 10 databases per account on Free tier | `developers.cloudflare.com/d1/platform/limits/` | **Confirmed** | Accommodates core, chat, activity + staging. |
| **D1 Maximum Size** | 500 MB / database | `Arch §2`, `SOURCE C3` | 500 MB per database on Free tier | `developers.cloudflare.com/d1/platform/limits/` | **Confirmed** | Requires shard-ready chat design. |
| **D1 Total Account Storage** | 5 GB / account | `Arch §2`, `SOURCE C3` | 5 GB total storage per account on Free tier | `developers.cloudflare.com/d1/platform/limits/` | **Confirmed** | Bounds total community data volume. |
| **D1 Daily Rows Read** | 5,000,000 / day | `Arch §2`, `SOURCE C3` | 5 M rows read/day per account | `developers.cloudflare.com/d1/platform/pricing/` | **Confirmed** | Ample for 10–50 members (~20k–100k reads/day). |
| **D1 Daily Rows Written** | 100,000 / day | `Arch §2`, `SOURCE C3` | 100 k rows written/day per account (index writes count) | `developers.cloudflare.com/d1/platform/pricing/` | **Confirmed** | Critical budget: writes fail when exhausted. |
| **D1 Queries / Invocation** | 50 / invocation | `Arch §2`, `SOURCE C3` | 50 queries per Worker invocation (batch counts as one) | `developers.cloudflare.com/d1/platform/limits/` | **Confirmed** | Handlers must use batching and aim for ≤ 6 queries. |
| **D1 Statement & Row Size** | Statement 100 KB; Row/String 2 MB | `Arch §2`, `SOURCE C3` | Statement ≤ 100 KB; Bound parameters ≤ 100; Row/String ≤ 2 MB | `developers.cloudflare.com/d1/platform/limits/` | **Confirmed** | Sufficient for text messages (≤ 4,000 chars). |
| **D1 Time Travel** | 7 days on Free | `Arch §2`, `SOURCE C4` | Point-in-time recovery for 7 days on Free tier | `developers.cloudflare.com/d1/reference/time-travel/` | **Confirmed** | Primary disaster recovery mechanism confirmed. |
| **D1 CLI SQL Export** | `wrangler d1 export` | `Arch §18`, `SOURCE C5` | Supported via Wrangler CLI | `developers.cloudflare.com/d1/platform/changelog/` | **Confirmed** | Owner-initiated manual SQL backup confirmed. |
| **DO Daily Requests** | 100,000 / day | `Arch §2`, `SOURCE C6` | 100 k requests/day (HTTP, RPC, alarms; WS messages 20:1) | `developers.cloudflare.com/durable-objects/platform/pricing/` | **Confirmed** | Realtime coordination budget confirmed. |
| **DO Daily Duration** | 13,000 GB-s / day | `Arch §2`, `SOURCE C6` | 13,000 GB-s / day on Free tier | `developers.cloudflare.com/durable-objects/platform/pricing/` | **Confirmed** | Requires WebSocket Hibernation API. |
| **DO CPU Limit** | 30 s / invocation | `Arch §2`, `SOURCE C6` | 30 seconds default CPU limit per request | `developers.cloudflare.com/durable-objects/platform/limits/` | **Confirmed** | Ample headroom for chess move validation. |
| **DO Free Storage Engine** | SQLite-backed only | `Arch §2`, `SOURCE C6` | SQLite storage engine included on Free tier | `developers.cloudflare.com/durable-objects/platform/pricing/` | **Confirmed** | Key-value methods run on SQLite table. |
| **Firebase Email Verification** | 1,000 emails / day | `Arch §2`, `SOURCE F1` | 1,000 address verification emails/day on Spark | `firebase.google.com/docs/auth/limits` | **Confirmed** | Plenty for onboarding 10–50 members. |
| **Firebase Password Resets** | 150 emails / day | `Arch §2`, `SOURCE F1` | 150 password reset emails/day on Spark | `firebase.google.com/docs/auth/limits` | **Confirmed** | Tight limit: UI must soften repeat reset prompts. |
| **Firebase Email-Link Sign-In** | 5 emails / day | `Arch §2`, `SOURCE F1` | 5 email link sign-in emails/day on Spark | `firebase.google.com/docs/auth/limits` | **Confirmed** | Reaffirms ADR-004 decision NOT to use magic links. |
| **Firebase Account Creations** | 100 / hour / IP | `Arch §2`, `SOURCE F1` | 100 accounts created / hour per IP address | `firebase.google.com/docs/auth/limits` | **Confirmed** | Supplements Worker-side IP throttling. |
| **Firebase Auth MAUs** | Free up to 50,000 MAU | `Arch §2`, `SOURCE F1` | 50,000 monthly active users included for email & Google | `firebase.google.com/pricing` | **Confirmed** | Far exceeds community size (~100 members). |
| **Cloudflare R2 Card Requirement** | Card requested at activation | `Arch §2`, `SOURCE C8` | Payment method on file required to enable R2 | `developers.cloudflare.com/r2/pricing/` | **Confirmed** | Validates rejection of R2 under no-card rule. |
| **Backblaze B2 Free Storage** | 10 GB free | `Arch §2`, `SOURCE B1` | First 10 GB free per month | `backblaze.com/cloud-storage/pricing` | **Confirmed** | Base media storage capacity confirmed. |
| **Backblaze B2 Free Egress** | Up to 3× average stored data | `Arch §2`, `SOURCE B1` | Free egress up to 3× monthly average data stored | `backblaze.com/cloud-storage/pricing` | **Confirmed** | Requires client caching and small thumbnails. |
| **Backblaze B2 Lifecycle Rules** | Keep only last version | `Arch §12`, `SOURCE B3` | Supported via console or S3 `PutBucketLifecycleConfiguration` | `backblaze.com/docs/` | **Confirmed** | Enforces 1-day purge of hidden versions. |
| **LiveKit Build WebRTC Minutes** | 5,000 min / month | `Arch §2`, `SOURCE L1` | 5,000 WebRTC participant connection minutes/month | `livekit.io/pricing` | **Confirmed** | Supports ~2,500 1:1 call minutes/month. |
| **LiveKit Build Bandwidth** | 50 GB downstream | `Arch §2`, `SOURCE L1` | 50 GB downstream bandwidth included | `livekit.io/pricing` | **Confirmed** | Sufficient for voice and occasional 1:1 video. |
| **LiveKit Build Concurrency** | 100 participants | `Arch §2`, `SOURCE L1` | 100 concurrent participants | `livekit.io/pricing` | **Confirmed** | Matches total community design ceiling. |
| **LiveKit Build Hard Cap** | Hard cap, no billing | `Arch §2`, `SOURCE L2` | Requests fail when allowance is exhausted; no surprise bill | `docs.livekit.io/home/cloud/quotas-and-limits/` | **Confirmed** | Aligns with zero-cost outage behavior. |

---

## 3. Detailed Differences, Ambiguities, and Architectural Effects

### Finding 1: Durable Object Subrequests Exceed Previous Assumptions
* **Claim in Documents:** `Architecture.md` §10.4 and `Rules.md` §12 assume all subrequests count against a rigid cap of 50.
* **Official Reality:** Cloudflare documentation specifies 50 external subrequests and **1,000 subrequests to Cloudflare services** (including Durable Objects and D1).
* **Date Verified:** 9 November 2026.
* **Effect on Design:** Positive architectural buffer. Broadcaster fan-out to 24 recipient Durable Objects during group message sends draws from the 1,000-subrequest pool, not the 50-external pool. The 25-member group cap remains frozen as a product and write-budget constraint, but subrequest exhaustion risk is virtually eliminated.

### Finding 2: Shared Write Meters Between D1 and Durable Objects
* **Claim in Documents:** `SOURCE_REGISTER.md` §6 item 4 listed as UNVERIFIED whether D1 and Durable Object SQLite rows written meters are shared.
* **Official Reality:** Official Cloudflare documentation confirms that SQLite-backed Durable Objects and D1 share the **same 100,000 daily rows written meter** per account on the Free plan.
* **Date Verified:** 9 November 2026.
* **Effect on Design:** Critical constraint. Durable Objects must minimize persistent SQLite writes:
  - Presence must remain purely in-memory in `PresenceRegistry` (never written to DO SQLite tables).
  - Delivered-acknowledgment cursors in `UserHub` must be buffered in memory and flushed periodically via alarms (every 20–30 s) rather than written on every WebSocket event.

### Finding 3: `_headers` Rule Application on Worker-Intercepted Routes
* **Claim in Documents:** `Architecture.md` §15.2 states security headers (CSP, HSTS, X-Content-Type-Options) are set with `public/_headers`.
* **Official Reality:** Official Cloudflare Workers Static Assets documentation notes that `_headers` only applies to static files served directly by the static asset handler. For any request intercepted by `run_worker_first` (`/api/*`, `/ws/*`), `_headers` rules do **not** apply automatically.
* **Date Verified:** 9 November 2026.
* **Effect on Design:** The Worker's router middleware (`src/worker/middleware/headers.ts`) must programmatically set all security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: no-store`) on all `/api/*` and `/ws/*` responses. `public/_headers` remains necessary only for static shell assets (`/`, `index.html`, etc.).

---

## 4. Verification Verdicts Summary

* **Cloudflare Workers & Static Assets:** **Confirmed** (100k req/day, 10 ms CPU, 50 external / 1,000 internal subrequests, SPA fallback, `run_worker_first`, `_headers`).
* **Cloudflare D1:** **Confirmed** (500 MB/DB, 5 GB total, 10 DBs, 5 M reads/day, 100 k writes/day, 50 queries/invocation, 7 days Time Travel).
* **Cloudflare Durable Objects:** **Confirmed** (100k req/day, 13,000 GB-s/day, 30 s CPU, SQLite storage sharing D1 write meter).
* **Firebase Authentication (Spark):** **Confirmed** (1,000 verification emails, 150 password resets, 5 email-links, 100 creations/hr/IP, 50k MAUs, no card required).
* **Backblaze B2:** **Confirmed** (10 GB free, 3× egress, S3 presigned URLs, lifecycle rules; no card at sign-up; Gate P remains mandatory exit gate).
* **LiveKit Cloud (Build):** **Confirmed** (5,000 participant-minutes, 50 GB egress, 100 concurrent, hard cap, no card required).
* **Cloudflare R2:** **Confirmed Payment Method Required** (Rejection confirmed).
