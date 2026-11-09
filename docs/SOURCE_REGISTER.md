# Source Register — Mirach (v3)

> **Access date:** 4 November 2026 for every entry, except §0 (re-check on 9 November 2026).
> **Method and limits:** web search and fetch tools. Tiers: **A** official page fetched in full; **B** official content seen only as search-result excerpts (not fetched in full); **C** secondary source; **U** UNVERIFIED (not checked or inferred).
> **Honesty note:** in this session **no provider account was created, activated or tested**. All "no card" statements are what sources say, not what was observed. In v3 no page was fetched in full; every entry is B, C or U. Where an exact URL was not captured from the search result, the entry says so — the owner re-records exact URLs during Gate P and each phase spike.

## 0. Re-check on 9 November 2026 (v3.1)

Official pages were fetched (page text read through a summarizer, so tier **B**, not A) on 9 Nov 2026:

| # | Result | Source | Effect |
|---|---|---|---|
| R1 | Workers Free: 100,000 requests/day (error 1027 above it); 10 ms CPU per HTTP request and per cron trigger; **50 subrequests plus a separate cap of 1,000 for subrequests to internal Cloudflare services**; 5 cron triggers per account; 6 simultaneous open connections. The page counts calls to R2/KV/D1 as subrequests-to-services; it does **not** say whether Durable Object calls count | `https://developers.cloudflare.com/workers/platform/limits/index.md` | Confirms C1; resolves the cron count in C10 (5); the 3 MB script size in C1 was **not** re-confirmed (the summary said 64 MiB uncompressed, no compressed limit) — keep the 3 MB bundle rule as a conservative internal target. Whether DO calls count against 50 is added to the Phase 2 spike |
| R2 | D1 Free: 5 M rows read/day, 100 k rows written/day, 5 GB storage per account | `https://developers.cloudflare.com/d1/platform/pricing/index.md` | Confirms C3 |
| R3 | D1 limits: 10 databases, 500 MB per database, 5 GB per account, 50 queries per Worker invocation, 100 bound parameters, 100 KB statement, 2 MB row/string/BLOB | `https://developers.cloudflare.com/d1/platform/limits/index.md` | Confirms C3 |
| R4 | Firebase Auth Spark: verification 1,000/day; address change 1,000/day; password reset 150/day; email-link sign-in 5/day (more needs a billing instrument); account creation 100/hour/IP; SMS sign-in is Blaze-only. The page states no plan requirement for MFA | `https://firebase.google.com/docs/auth/limits` | Confirms F1; "MFA needs the Identity Platform upgrade" stays **U** |
| R5 | B2: first 10 GB free; downloads free up to 3× average stored data, then $0.01/GB; Class A/B/C API calls free; making a bucket **public** needs verified email and billing history or a small card fee. The (third-party) page does **not** say whether sign-up needs a card | `https://upstash.com/blog/backblaze-b2-pricing-explained-2026.md` (secondary) | Confirms B1 numbers; no-card activation remains **U** (Gate P). Buckets stay private, so the public-bucket card rule does not apply |
| R6 | D1 and Workers pages do not state whether a card is needed for the free plan | same pages | "No card" for Cloudflare rests on the pricing-page wording (C2) plus the owner's own sign-up (Gate P) |

## 1. Cloudflare

| # | Claim | Source | Tier |
|---|---|---|---|
| C1 | Workers Free: 100,000 requests/day, 10 ms CPU per invocation, 50 subrequests, 128 MB memory; resets 00:00 UTC; error 1027 when daily limit exceeded; request body limit by plan; 3 MB compressed script (Free) | Cloudflare Workers pricing/limits docs (`developers.cloudflare.com/workers/platform/limits/` and `/pricing/` — standard doc paths; excerpts via search) + workers pricing page `https://workers.cloudflare.com/pricing/.md` | B (limits page URL to be re-confirmed) |
| C2 | Workers pricing page states free plan "no credit card required" | `https://workers.cloudflare.com/pricing/.md` | B |
| C3 | D1 Free: 500 MB per database; 5 GB per account; 10 databases; 5 M rows read/day; 100 k rows written/day; 50 queries per Worker invocation (batch counts as one); max row/string 2 MB; statement 100 KB; 100 bound parameters; inserts/reads fail when daily limits are exceeded | D1 limits and pricing docs (`developers.cloudflare.com/d1/platform/limits/`, `/pricing/` — excerpts) + secondary summaries | B / C |
| C4 | D1 Time Travel: point-in-time restore for 7 days on Free (30 days on paid) | `https://developers.cloudflare.com/d1/reference/time-travel/` | B |
| C5 | D1 SQL export through Wrangler (`wrangler d1 export`) | D1 changelog / Wrangler docs (`developers.cloudflare.com/d1/platform/changelog/`) | B |
| C6 | Durable Objects on Free: SQLite-backed only; 100,000 requests/day (HTTP, RPC, alarms; WebSocket messages 20:1); 13,000 GB-s/day duration; 5 GB SQLite storage; rows read 5 M/day, written 100 k/day (whether these overlap D1's account-wide meters is **U**); 30 s CPU per invocation | `https://developers.cloudflare.com/durable-objects/platform/pricing/` and `https://developers.cloudflare.com/durable-objects/platform/limits` | B |
| C7 | Workers Static Assets: requests to static assets are free/unlimited; supports `_headers` and `_redirects`; SPA fallback (`not_found_handling`); `run_worker_first` patterns; 20,000 files per version | `https://developers.cloudflare.com/workers/static-assets/compatibility-matrix`, `…/routing/single-page-application/index.md`, `…/routing/worker-script/index.md` | B |
| C8 | Cloudflare R2: payment method requested at activation even for the free tier | multiple guides: `https://tech-insider.org/how-to-set-up-cloudflare-r2-2026/`, `https://agentdeals.dev/storage-alternatives`; `https://www.cloudflare.com/r2/` markets "free" without detail | **C** (official wording **U**) → **R2 not approved** |
| C9 | Cloudflare Realtime SFU/TURN: first 1,000 GB/month egress free then metered; card requirement for the free allowance **U** | `https://developers.cloudflare.com/realtime/sfu/pricing`, `https://developers.cloudflare.com/calls/pricing/`, `https://www.cloudflare.com/products/turn-sfu/` | B |
| C10 | Cron triggers: 5 per account on Free; Workers rate-limiting binding availability on Free | third-party project docs / community summaries | **C/U** |
| C11 | Static Assets/Workers recommended for new projects over Pages | Cloudflare Workers docs excerpts + commentary (carried from v2) | B / C |

## 2. Firebase (Google)

| # | Claim | Source | Tier |
|---|---|---|---|
| F1 | Auth limits (Spark): verification emails 1,000/day; password-reset emails 150/day; email-link sign-in 5/day; account creation 100/hour per IP; Spark + Identity Platform upgrade capped at 3,000 DAU (not planned) | `https://firebase.google.com/docs/auth/limits` | B |
| F2 | ID-token verification requirements: RS256; `kid` matches a Google public key; `exp`/`iat`/`auth_time` in the right ranges; `aud` = project ID; `iss` = `https://securetoken.google.com/<project>`; `sub` non-empty string (UID) | `https://firebase.google.com/docs/auth/admin/verify-id-tokens` | B |
| F3 | Spark plan needs no payment method | secondary firebase pricing guides (e.g. `https://dev.to/androve2k/spark-vs-blaze-the-firebase-pricing-guide-i-wish-id-read-sooner-onb`) | **C** |
| F4 | Cloud Storage requires the Blaze plan since early 2026 (reason Firebase Storage is not used) | same secondary guides | **C** |
| F5 | JWK endpoint for Firebase signing keys usable by JWT libraries; Firebase docs name the x509 endpoint | libraries' documentation | **U** (Phase 3 spike) |

## 3. Backblaze B2

| # | Claim | Source | Tier |
|---|---|---|---|
| B1 | B2 sign-up page states "No credit card required"; 10 GB free storage; free egress up to 3× average monthly stored data; free API transactions up to stated daily amounts | backblaze.com B2 sign-up and pricing pages as returned by search excerpts (exact URLs to be recorded at Gate P) | B |
| B2 | Behavior when egress/transaction allowances are exceeded on an account without payment details; private-only/public-bucket restrictions on free accounts | an older article claims private buckets only on free; current official wording not captured | **U** |
| B3 | S3-compatible presigned URLs, CORS rules, bucket lifecycle ("keep only the last version"), `DeleteObject` with version id | B2 documentation (general knowledge) | **U** (Phase 6 spike) |

## 4. LiveKit

| # | Claim | Source | Tier |
|---|---|---|---|
| L1 | Build plan $0 with note "No credit card required"; 5,000 WebRTC participant-minutes; 50 GB downstream; 100 concurrent participants | `https://livekit.com/pricing.md` | B |
| L2 | On Build the free allowance is a hard cap; requests fail until the monthly reset; allowance shared across projects | `https://docs.livekit.io/home/cloud/quotas-and-limits/` | B |

## 5. Browser/web platform and legal

| # | Claim | Source | Tier |
|---|---|---|---|
| W1 | iOS web push requires iOS/iPadOS 16.4+, the site added to the Home Screen as a web app, manifest and service worker, permission prompt from a user gesture | vendor integration docs, e.g. `https://flarelane.com/en/docs/sdk-integrations/ios-web-push`, Braze and MoEngage Safari mobile push docs | **C** |
| W2 | DPDP Rules 2025 notified Nov 2025; 18-month phasing (substantive obligations on or about 13–14 May 2027, sources differ by a day); verifiable parental consent for under-18 | `https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&reg=48&lang=2`; `https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&reg=3&lang=2`; rules PDF linked there; law-firm summary `https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/` | B (PIB) / C |
| W3 | Contrast ratios in `Design.md` | computed locally with the WCAG formula | A (own computation) |

## 6. Items that remain UNVERIFIED

1. **Backblaze B2 no-card activation, private bucket creation, application-key scoping, CORS, presigned PUT/GET and versioned deletion** — Gate P (owner).
2. B2 behavior when free egress/transaction allowances are exhausted without payment details.
3. Cloudflare account creation/activation without a card for Workers, D1 and Durable Objects as actually experienced (the pricing page says no card; owner confirms at Gate P).
4. Whether D1 and Durable Object SQLite "rows written" meters share the 100 k/day allowance.
5. D1 `batch()` rollback and ordering semantics as relied upon in `Architecture.md` §8.3; STRICT tables; `RETURNING`; partial unique indexes.
6. Workers rate-limiting binding on Free; cron trigger count; exact exceeded-limit behaviors for DO requests/duration.
7. Firebase: `workers.dev` authorized domain; popup vs redirect behavior; account linking; email-enumeration protection and password-policy settings; Admin REST via service account without billing; JWK vs x509 key endpoints; Spark's no-card status.
8. Whether D1 exports lock the database during export; D1 data location/jurisdiction on Free.
9. LiveKit sign-up without a card as actually experienced (Gate L); Cloudflare Realtime free allowance without a card.
10. Web Push behavior on iOS/Android/desktop in the Phase 7 spike; Workers CPU for push encryption (hence DO fan-out).
11. D1 FTS5 write amplification (Phase 7 spike).
12. GitHub Actions minutes for private repos.
13. Cloudflare provider audit-log availability for console access.
14. Legal: DPDP details not read in primary text (breach-notification timing, log retention, exemptions, Data Fiduciary status), IT Rules intermediary duties, cross-border transfer implications.
15. Provider-side encryption at rest.

## 7. Re-verification procedure

At the start of each phase and at Gate P: open the official limits/pricing page for each provider used by the phase, copy the numbers, record URL and date here, compare with `Architecture.md` §2/§19, and if different update the architecture, PRD §11 and capacity scenarios and notify the owner. If any step asks for payment details: stop and report (`Rules.md` §5).
