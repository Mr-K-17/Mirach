# Review Report — Mirach v3 (cloud-authoritative serverless revision)

> **Date:** 4 November 2026 (Asia/Kolkata); v3.1 pass 9 November 2026 (§14). **Scope:** all eleven documents. Previous versions: `_originals_2026-11-03/`, `_previous_v2_2026-11-04/`.
> **Result:** the six core documents were rewritten for the owner's cloud-only, serverless, no-card architecture; `DECISIONS.md`, `SOURCE_REGISTER.md`, `REVIEW_REPORT.md` updated; `EXPORT_SPECIFICATION.md` and `ANTIGRAVITY_HANDOFF.md` created. **No code, accounts or cloud resources were created; no provider was activated or tested.**

## 1. Method and limits

Read all earlier documents; re-researched current provider documentation with search tools (no page was fetched in full this round; all provider facts are search-excerpt or secondary evidence, tiered in `SOURCE_REGISTER.md`); designed the architecture against the owner's constraints; performed a text/cross-reference consistency audit with scripted searches and manual review (§9). Items that could not be verified are marked **UNVERIFIED** (15 listed in `SOURCE_REGISTER.md` §6). Nothing here is legal advice.

## 2. Executive summary

**What changed.** v2 (Supabase/Postgres) is superseded. The owner's serverless stack is adopted — Cloudflare Worker with Static Assets, D1, Durable Objects, Firebase Authentication (Spark), Backblaze B2, LiveKit — with **cloud-only authoritative data**, **no automatic transfer to the PC**, **manual exports only**, and **zero-cost/no-card** operation. Obsolete sync/archive/tunnel/24-hour-deletion ideas appear only as prohibitions.

**Honest assessment of the selected stack.** It is workable for a community of roughly 10–50 members, near its practical ceiling around 100 active members, but it is **materially tighter and riskier than the v2 design**:
- D1 has **no row-level security**; all authorization is custom Worker code (mitigated by a central policy layer, SQL-scoped predicates, lint rules and per-actor negative tests).
- Free quotas are small and daily: **100 k rows written/day** (index writes count), **100 k Worker requests/day**, **10 ms CPU**, **50 subrequests**, **500 MB per database**, **5 GB per account**.
- No card means **no escape hatch**: exhausting a quota is an outage until the reset, never a bill.
- Firebase Spark offers no MFA and limited email volume (150 password-reset emails/day; email-link sign-in 5/day).
- **Backblaze B2 no-card activation and egress behavior are unproven** — media is blocked until the owner passes Gate P. **Cloudflare R2 was rejected** because sources say it requests a payment method.
- Full-database export to the owner's PC means other members' private messages leave the platform; this is allowed only through controlled, audited, mandatorily encrypted operator exports with disclosure and handling rules (§6).

**Key design responses:** server-side Mirach sessions after one strict Firebase token validation (instant suspension, revocation, cookie-authenticated WebSockets); cursor-based receipts and Durable-Object presence to protect the write budget; ids-only realtime signals; a separate, shard-ready chat database; client-assembled paginated exports (Free Workers cannot build large archives); explicit failure matrix and outbox; one technically necessary phase reorder.

## 3. Gap analysis (changes since v2)

Severity: **C**ritical, **H**igh, **M**edium, **L**ow.

| ID | Gap / risk | Sev | Resolution | Docs |
|---|---|:-:|---|---|
| N-01 | Owner's phase order puts the database after auth/profiles, which need persistence | H | Reordered: DB/API/security = Phase 2; auth = 3; profiles = 4; avatar upload → Phase 6 | Phases §1, ADR-027 |
| N-02 | No row-level security in D1 | **C** | Policy module + SQL predicates, prepared statements only, data-layer isolation, negative-test matrix every phase | Arch §8, Rules §10 |
| N-03 | Firebase token validation unspecified | **C** | Exact RS256/iss/aud/exp/iat/auth_time/sub/provider/email_verified checks; validated once at session creation | Arch §5.3 |
| N-04 | Token-only auth gives weak revocation/suspension and awkward WebSocket auth | H | Server-side sessions (HttpOnly `__Host-` cookie, hash-only), CSRF/Origin controls, sign-out-all | Arch §5.2, §5.4, ADR-019 |
| N-05 | 100 k rows written/day with index writes counted | H | ≈ 6 writes/message budget; cursor receipts; no per-message notifications; presence in DO; debounced cursors | Arch §7.2, §19.2, ADR-023 |
| N-06 | 10 ms Worker CPU | H | No RSA verification on the hot path; heavy work (games, push crypto) in Durable Objects (30 s CPU); measure per handler | Arch §5.2, §14, Phases §5 |
| N-07 | 50 subrequests per invocation | M | Group cap 25; fan-out via `waitUntil`; ≤ 26 subrequests per send | Arch §10.4 |
| N-08 | 500 MB per D1 database; 5 GB account | H | Core/chat/activity split; shard-ready chat; capacity scenarios; ADR before scale-out; no auto-deletion | Arch §7.1, §19.5 |
| N-09 | R2 requires a payment method | H | R2 rejected; B2 conditional (Gate P); text-only fallback; alternatives need own no-card test | Arch §12, ADR-024 |
| N-10 | B2 egress (3× stored) and no-card behavior unknown; versioned deletes leave data | H | Thumbnails, caching, quotas, lifecycle rule + version-aware deletion (spike) | Arch §12 |
| N-11 | Server-side export generation impossible on Free Workers (CPU, no durable temp storage) | H | Client-assembled, resumable, paginated exports; CLI SQL dump by owner | Export spec §3, §11, ADR-026 |
| N-12 | Operator full export exposes private messages on a personal computer | H | Owner-only, re-auth, typed confirmation, mandatory encryption, audit, handling/retention/erasure rules, disclosure; OD-14 | Export spec §5, §8; Arch §15.6 |
| N-13 | Delete-for-me/everyone, edit, reply, reaction, forward, pin, search semantics undefined | M | Specified incl. tombstones, window, concurrency, limits, cost-bounded search | Arch §7.6, §11 |
| N-14 | Deleted content could reappear via caches/exports | M | `no-store`, signals purge caches, exports from live tables as tombstones only | Arch §7.6, Export spec §6 |
| N-15 | Account deletion spans Firebase, D1, B2, backups, exports | H | Choice of keep/delete messages, grace, jobs, Firebase removal path with fallback, disclosed Time Travel/export limits | Arch §7.6, PRD FR-PRIV-01 |
| N-16 | Presence, typing, last seen under DO quotas and privacy | M | Hibernation, WS 20:1 billing, registry DO, visibility settings with reciprocity | Arch §10 |
| N-17 | Gesture-only interactions inaccessible | M | Alternatives table; More button; keyboard shortcuts; tap-to-record | Design §15 |
| N-18 | Calls provider card status | M | LiveKit official "no credit card required" + hard cap; Cloudflare Realtime contingency (unverified) | Arch §13, ADR-025 |
| N-19 | Incoming calls/notifications when the browser is closed | M | Web Push + PWA (iOS Home Screen requirement), DO-based fan-out | Arch §10, PRD FR-ENH-07 |
| N-20 | `workers.dev` hostname with Firebase authorized domains and CSP | M | Phase 1 spike; `/__/auth` proxy option; documented limitation | Arch §2, §15.2 |
| N-21 | Recovery on Free tier | H | Time Travel 7 days + owner-run SQL exports + restore drills; media has no backup (stated) | Arch §18 |
| N-22 | Quota exhaustion could show false success or lose messages | H | Fail-closed matrix, `QUOTA_EXHAUSTED`, idempotent retries, outbox | Arch §19.3–19.4 |
| N-23 | Outbox on shared devices stores plaintext drafts | L | Labeled, user-visible, cleared at sign-out choice | Arch §19.4 |
| N-24 | Cron/DO alarm/Worker bundle limits | L | ≤ 2 crons, 3 MB bundle rule, dependency records | Arch §2, Rules §6 |
| N-25 | Legal: exports on owner's device, operator access, cross-border processors | H | Disclosure, handling rules, OD-08 counsel gate | Arch §16 |
| N-26 | Members' emails stored in app DB would enlarge breach/export surface | M | Email never stored in D1; stays in Firebase | Arch §5.3 |

v2 corrections remain in force where still relevant (hash-only invitations with atomic redemption, owner bootstrap, evidence-based moderation, EXIF stripping, DPDP timeline, 18+ default, group cap).

## 4. Provider and pricing comparison (checked 4 Nov 2026)

| Provider/product | Role | Free allowance that matters | Card needed? | Evidence | Verdict |
|---|---|---|---|---|---|
| Cloudflare Workers + Static Assets | Hosting + API | 100 k req/day; 10 ms CPU; 50 subrequests; static assets free; `_headers`, SPA fallback | Pricing page: no card | B | **Selected** |
| Cloudflare D1 | Database | 500 MB/DB; 5 GB; 10 DBs; 5 M reads/100 k writes per day; Time Travel 7 d | Included in Workers Free | B/C | **Selected** (tight) |
| Cloudflare Durable Objects | Realtime | SQLite-only on Free; 100 k req/day; 13,000 GB-s/day; WS 20:1 | Included | B | **Selected** (realtime only) |
| Firebase Authentication (Spark) | Identity | Email caps (1,000/150/5 per day), no MFA | Secondary: no | B/C | **Selected** |
| Backblaze B2 | Media | 10 GB; egress 3× stored | Sign-up says none; activation/egress **unverified** | B/U | **Conditional (Gate P)** |
| Cloudflare R2 | Media | 10 GB nominal | **Payment method requested** (secondary) | C | **Rejected** |
| Firebase Storage | Media | — | Billing plan required (secondary) | C | Rejected |
| LiveKit Cloud Build | Calls | 5,000 min; 50 GB; 100 participants; hard cap | Official: none | B | **Selected (Gate L)** |
| Cloudflare Realtime SFU/TURN | Calls alternative | 1,000 GB/month | Unverified | B | Contingency |
| Supabase | v2 backend | 500 MB DB, 1 GB storage, pauses idle, no backups | not verified in v3 | — | Superseded by owner decision |
| GitHub (private) + Actions | Source/CI | Minutes **unverified** | No | U | Selected |

## 5. Capacity and failure analysis

Scenario arithmetic (assumptions A1–A7) is in `Architecture.md` §19.5: at 100 members heavy text use ≈ 26 k rows written/day (26 %), ≈ 25 k Worker requests/day (25 %), ≈ 84 MB chat growth/month (one 500 MB DB fills in ≈ 6 months; shard/ADR path needed); images ≈ 1 GB/month (10 GB B2 in ≈ 10 months); video must be quota-managed; LiveKit 4,000 of 5,000 minutes under modest call use. The 20 failure scenarios and their behaviors are in `Architecture.md` §19.3 and each has a test (`Phases.md` §5, F-01…F-20).

## 6. Security and privacy review summary

- **AuthN:** Firebase proof once, server sessions, CSRF/Origin checks, re-auth for sensitive actions, global revocation, no phone, email not stored.
- **AuthZ:** central policy + SQL predicates; moderators/admins have no content access; group admins limited to their group; negative-test matrix per phase; lint against raw SQL/DB access.
- **Data:** D1 authoritative; DOs ephemeral only; B2 private with ≤ 5-minute signed URLs; type allow-list + magic bytes; EXIF stripped; quotas; secure deletion including versions.
- **Realtime:** ids-only signals; cookie + Origin on upgrade; eviction on revocation.
- **Secrets:** Worker secrets only; no `VITE_*` secrets; scoped CI token; secret scanning.
- **Encryption:** TLS yes; at-rest not verified; **no E2EE**; exports encrypted client-side (mandatory for others' content) with a reviewed library (no custom crypto).
- **Owner/operator access model:** the owner and providers technically can read content; admin/mod cannot in-app; operator export is controlled and audited; console/CLI access is not audited by Mirach; all disclosed in the privacy notice (OD-14).
- **India:** DPDP Rules notified Nov 2025; substantive obligations on or about 13–14 May 2027; 18+ default; counsel needed for Data Fiduciary status, exemptions, notice/consent, breach duties, cross-border transfer, IT Rules duties, and handling of exports on the owner's device (OD-08). No compliance claim.

## 7. Diagrams, matrices and where to find them

Final architecture diagram: `Architecture.md` §3. ER diagram: §7.3. Message sequence: §10.4. Export sequence: `EXPORT_SPECIFICATION.md` §3. User flow: `Design.md` §13. Dependency roadmap: `Phases.md` §2. **Feature-to-phase matrix:** `Phases.md` §3. Provider comparison: §4 above. Failure matrix: `Architecture.md` §19.3.

## 8. Traceability matrix

All statuses are **Planned**.

| Requirement | PRD | Architecture | Design | Phase |
|---|---|---|---|---|
| Google and email/password sign-in, verification | FR-AUTH-01/02 | §5.1 | §5 S1 | 3 |
| Strict token validation, server sessions, sign-out-all, re-auth | FR-AUTH-04…06 | §5.2–5.4 | §8 S16 | 3 |
| Username policy | FR-AUTH-03 | §7.4 | §5 S2 | 3 |
| Invitation join (atomic), request/approve, approval-for-all | FR-MEM-01…04 | §6, §8.3 | §5 S2–S3, §11 | 3 |
| Roles, bootstrap, suspension, audit | FR-MEM-05…08 | §6 | §11 | 3 (viewer 4) |
| Admin dashboard and usage panel | FR-MEM-09 | §17.6, §19 | §11 S17 | 3, 12 |
| Terms/notice/18+ acceptance | FR-MEM-10 | §16 | §5 S2 | 3 |
| Profiles, privacy settings, directory | FR-PRO-01/03/04/05 | §7.4, §8.2 | §6, §8 | 4 |
| Profile photograph | FR-PRO-02, FR-MED-08 | §12 | §6 S10 | 4 (initials) / 6 |
| Connections, blocks | FR-CON-01…03 | §7.5 | §6 S6 | 4 |
| Reports and moderation | FR-SAFE-01/02 | §7.5 | §11 S18 | 4–10 |
| Rate limiting, quota handling | FR-SAFE-03, FR-CLD-02 | §15.3, §19 | §16 | 2 onward |
| DM, groups, administration | FR-MSG-01…03 | §7.4–7.5, §11 | §7 S7–S8 | 5 |
| Realtime messaging, history, idempotency, unread, receipts, typing, outbox | FR-MSG-04…10 | §10, §19.4 | §7, §16 | 5 |
| Reply, reactions, edit, delete-for-me/everyone | FR-INT-01…05 | §7.6, §11 | §7 | 5 (media-aware in 6) |
| Context menus, long-press, right-click, swipe, keyboard alternatives | FR-INT-06/07 | §11 | §7, §15 | 5 |
| Photos, video, voice, documents, private access, quotas, deletion | FR-MED-01…07 | §12 | §7 | 6 |
| Search, forward, pin, mute, presence, last seen | FR-ENH-01…06 | §10, §11 | §7, §8 | 7 |
| Notification centre and Web Push | FR-ENH-07 | §10 | §8 S15 | 4 / 7 |
| Voice/video/group calls, missed history, quota guard | FR-CALL-01…07 | §13 | §9 S13 | 8 |
| Games (rooms, TTT, C4, quiz, chess, history) | FR-GAME-01…07 | §14 | §10 S14 | 9 |
| Posts, feed, reactions, comments, stories, audiences, announcements | FR-SOC-01…07 | §14 | §10 S11–S12 | 10 |
| Manual exports (all types), encryption, audit, never mutate | FR-EXP-01…07 | §18, Export spec | §8, §11 | 11 |
| Account deletion | FR-PRIV-01 | §7.6 | §8 | 3 / 6 / 12 |
| Cloud-authoritative operation, no PC dependency | FR-CLD-01, PRD §5 rule 8 | §4 | §1 | all |
| Zero-cost/no-card | PRD §11 | §2, §19.6 | §16 | 0 onward |
| Responsive (4 device classes), accessibility | PRD §9 | — | §3, §14, §15 | 1, all, 12 |
| Failure handling F-01…F-20 | PRD §17 #8 | §19.3 | §16 | per Phases §5 |

## 9. Cross-document consistency audit

**Checks performed** (scripted searches plus manual reading of all eleven files): cloud-authoritative statement; absence of sync/archive/home-server/tunnel/24-hour requirements; absence of local database; manual-export-only wording; provider selections vs no-card status; D1/Workers/DO/Firebase/B2/LiveKit numbers; role and permission tables; invitation and session rules; message semantics and deletion rules; feature coverage vs phases; phase numbering; section cross-references; group cap, edit window, URL TTL, token TTL, quota thresholds; MVP/release boundaries.

**Results**
- **Obsolete sync/archive/tunnel/24-hour terms:** appear only in prohibitions (`Architecture.md` §4, `Rules.md` §2, `Memory.md`, `EXPORT_SPECIFICATION.md` §14, `ANTIGRAVITY_HANDOFF.md` §8, `PRD.md` §13) and in no requirement. No local database or home-server dependency remains.
- **Supabase/RLS/Postgres terms:** only as rejected/superseded alternatives or v2 history.
- **Inconsistencies found and fixed during the audit:** (1) account-deletion *execution* had no phase → assigned to Phase 6 (PRD FR-PRIV-01, Phases §3, §12, F-17); (2) two dangling cross-references in `Architecture.md` (§7.5 evidence bullet, §15.3 export limits) → corrected; (3) Phases matrix and PRD phase numbers for account deletion aligned.
- **Verified consistent:** sign-in methods (Google + email/password, no phone, no email-link); session design (cookie, hash-only, idle 14 d/absolute 60 d); invitation defaults (≥ 80-bit, hash, 1 use/7 days, 5 failed/hour); roles (owner > admin > moderator > member; group admin scoped); group cap 25; edit window 15 min; signed URLs ≤ 5 min; call tokens ≤ 10 min; ring 45 s; storage thresholds 7 GB/9 GB and 75 MB per user; export limits; D1 database names; phase numbers 0–12 and the Phase 2/3/4 reorder; B2 conditional on Gate P and R2 rejected everywhere; LiveKit Gate L; operator export controls identical in Architecture, PRD, Design and Export spec.
- **Not tested mechanically:** no link-checker or markdown linter was run; Mermaid diagrams were reviewed by eye, not rendered.
- **Residual items (not contradictions):** open decisions carry defaults; spikes may amend ADRs; 15 unverified provider facts.

## 10. Unresolved owner decisions

OD-01, 02, 04, 05, 06, **07**, **08**, **09**, 10, 11, 12, **13 (B2 activation)**, **14 (operator access/export policy)**, 15, 16, 17, 18, **19 (LiveKit)** — `DECISIONS.md` §3. Highest priority before freeze: OD-13, OD-14, OD-07, OD-09.

## 11. Documentation freeze checklist

Owner tick-list (all must be done before implementation begins):
- [ ] Read and approve `PRD.md` §6 (every feature present and phase-assigned).
- [ ] Approve the owner/operator access model and privacy-notice implications (`Architecture.md` §15.6; OD-14).
- [ ] Approve the phase order including the Phase 2/3/4 reorder and avatar upload in Phase 6 (ADR-027).
- [ ] Gate P: Cloudflare, Firebase Spark, GitHub accounts created with **no card**; **B2 test passed** (or an alternative ADR approved).
- [ ] Accept `*.workers.dev` hostname (OD-15) and the documented limitations (`PRD.md` §18).
- [ ] Confirm age policy 18+ (OD-07) and arrange legal review timing (OD-08).
- [ ] Confirm backup/export cadence and handling rules (OD-09, OD-14).
- [ ] Confirm media limits and quotas (OD-11, OD-16) and group cap 25.
- [ ] Appoint a second admin (OD-10) before Gate B.
- [ ] Confirm that no paid service, card, local database, sync, archive or automatic export exists anywhere in the documents.
- [ ] Record approval in `DECISIONS.md` §4 (date, signature line) — this freezes architecture, database, auth, hosting, storage, scope and phase order.

## 12. Risks and limitations

See `PRD.md` §16/§18 and `Phases.md` §20. Most important: custom authorization correctness, daily quota exhaustion, B2 activation, 500 MB/DB growth, no MFA, operator access to private data, unverified provider details, no external security review.

## 13. Prioritized next steps

1. Answer OD-13/14/07/09 and tick the freeze checklist.
2. Do Gate P activations (no card) and record results.
3. Start Phase 0 and Phase 1 with Antigravity using `ANTIGRAVITY_HANDOFF.md`.
4. Do not start Phase 3 before the Phase 2 spike report is accepted.

## 14. v3.1 review pass (9 November 2026)

**Method:** all eleven documents read end to end; cross-document comparison of numbers, names and rules; provider limits re-read on the official pages (`SOURCE_REGISTER.md` §0). No code, account or cloud resource exists, so nothing could be run. The nested `Mirach-Documentation-v3.zip` in the hand-over was byte-identical to the eleven top-level files (it additionally holds the `backups/` folders).

| ID | Finding | Sev | Fix applied |
|---|---|:-:|---|
| V-01 | Re-authentication window: `Rules.md` §9 said 10 minutes; `PRD` FR-AUTH-05, `Architecture` §5.3 and `EXPORT_SPECIFICATION` §4–5 said 5 | H | Unified at **5 minutes** (`Rules.md` §9) |
| V-02 | "Exports need re-auth" (PRD, Rules) contradicted the Export spec, where ordinary self-exports need only a session | M | PRD FR-AUTH-05 and Rules §9 now list exactly E1/E7/E8/cross-member E5 |
| V-03 | `ANTIGRAVITY_HANDOFF.md` §5 said two Firebase projects (dev/staging + production); `Architecture` §17.2 and `Rules.md` §7 require three | H | Handoff corrected to three |
| V-04 | `Rules.md` §10 allowed only `src/worker/data` to touch `env.DB_*`, but Durable Objects (`UserHub` flush, `ConversationRoom`, `GameRoom`) write to D1 from `src/worker/do` | H | Rule clarified: DOs call data-layer functions; lint covers both folders (`Rules.md` §10, `Architecture.md` §8.2) |
| V-05 | Staging points three bindings at one D1 database; Wrangler tracks migrations by file name, so identical names (`0001_init.sql`) in three folders would collide | H | File names unique across folders; CI applies all three to one DB (`Rules.md` §17, `Architecture.md` §7.2, `Phases.md` Phase 2) |
| V-06 | Creating a conversation writes to core then chat with no atomicity; a failure in between could leave an orphan or a duplicate on retry | M | Idempotent two-step creation + reconciliation report; test added to Phase 5 (`Architecture.md` §7.5, `Phases.md`) |
| V-07 | `UserHub` "flush delivered acks every ~20 s" conflicted with Hibernation (no timers; no data only in memory) | M | Acks kept in DO storage and flushed by a DO alarm (`Architecture.md` §10.2) |
| V-08 | Firebase SDK default persistence leaves an ID/refresh token in IndexedDB, undercutting the "no token readable by JavaScript" goal of server sessions | M | `inMemoryPersistence` + sign-out after session creation (`Rules.md` §9/§16, `Architecture.md` §5.2) |
| V-09 | The "50 subrequests" rationale for the group cap is incomplete: the official page lists 50 external + 1,000 internal; DO-call counting is not stated | L | Recorded; Phase 2 spike measures it; cap stays 25 (`Architecture.md` §10.4, `SOURCE_REGISTER.md` R1) |
| V-10 | Garbled wording in `notifications.type` ("mention-free system types") | L | Reworded |
| V-11 | Cron-trigger count and D1/Workers/Firebase numbers rested on secondary or excerpt sources | L | Re-read on official pages; confirmed (`SOURCE_REGISTER.md` §0). B2 no-card activation and the Cloudflare/Firebase no-card claims still need the owner's Gate P |

**Not changed (by design):** stack, ADRs, scope, phase order, quotas, security model. Items still open for the owner: OD-13, OD-14, OD-07, OD-09 and the freeze checklist (§11). Items only a real run can settle: D1 `batch()` semantics, Firebase on `workers.dev`, B2 behaviour, rate-limit binding, FTS5, push CPU (all already spiked in `Phases.md`).
