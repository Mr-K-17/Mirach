# C6 — Final Consolidated Review Findings and Decision List

> **Date:** 9 November 2026 (Asia/Kolkata)  
> **Source Documents Synthesized:** `/review/C1-understanding.md`, `/review/C2-consistency.md`, `/review/C3-security.md`, `/review/C4-providers.md`, `/review/C5-buildability.md`.  
> **Status:** Implemented (Consolidated decision list; no files in `/docs` modified).  
> **Authority:** Awaiting owner approval before any approved changes are applied to `/docs`.

---

## 1. Executive Summary

This document consolidates, deduplicates, and ranks all findings across the five independent reviews (C1 Understanding, C2 Consistency, C3 Security, C4 Provider Facts, C5 Buildability). 

Every finding is assigned:
- A unique ID (`F-01` to `F-20`)
- Severity rating (**High**, **Medium**, **Low**)
- Source reviews
- Target documents and sections to update
- The smallest concrete fix proposed
- Decision type: **Plain wording fix** vs. **Owner decision required** (Architecture / Security / Quota)

The findings are subsequently grouped into three actionable categories:
* **Group (a): Apply now, wording only** (10 items — formatting, cross-reference, prohibited words, table omissions)
* **Group (b): Needs owner decision** (6 items — security mitigations, quota caps, architectural enforcement)
* **Group (c): Answer later by a spike** (4 items — provider capabilities verified during development spikes)

---

## 2. Master De-Duplicated Findings Table (Sorted High $\rightarrow$ Low)

| ID | Severity | Source Reviews | Target Files & Sections | Issue / Finding Description | Smallest Concrete Fix | Decision Type |
|:---:|:---:|:---:|---|---|---|:---:|
| **F-01** | **High** | C3 (SEC-01) | `Architecture.md` §5.4, §8.1, §10.4; `Rules.md` §9 | WebSocket upgrade does not explicitly specify terminating connections on missing or non-matching `Origin` headers (Cross-Site WebSocket Hijacking risk). | Explicitly state in `Architecture.md` §10.4 and `Rules.md` §9 that WebSocket upgrade returns HTTP 403 Forbidden if `Origin` header is absent, null, or does not strictly equal `https://${env.ALLOWED_ORIGIN}`. | **Needs Owner Decision** (Security) |
| **F-02** | **High** | C3 (SEC-02) | `Architecture.md` §8.3; `Phases.md` Phase 2, Phase 3 | Multi-statement batch subquery `(SELECT COUNT(*) ...) < max_uses` can race under concurrent D1 SQLite requests, potentially exceeding `max_uses`. | Add an authoritative SQLite `BEFORE INSERT` trigger on `invitation_redemptions` in `mirach-core` to abort over-redemption inside SQLite's internal row lock. | **Needs Owner Decision** (Security / Database) |
| **F-03** | **High** | C3 (SEC-03) | `Architecture.md` §15.3, §19.2; `PRD.md` §6.4 | Lack of a daily per-user message/write limit allows 3 colluding users sending at allowable 30 msgs/min to exhaust the account-wide 100k daily D1 writes budget. | Add a daily per-user message cap (e.g. max 500 messages/user/day) and cursor cap (max 1,000/user/day) in `Architecture.md` §15.3 and `PRD.md` §6.4. | **Needs Owner Decision** (Quota / Abuse Policy) |
| **F-04** | **High** | C3 (SEC-04) | `Architecture.md` §8.2, §12; `Rules.md` §10 | Insecure Direct Object Reference (IDOR) on media: querying `message_attachments` by ID alone allows any member to fetch signed URLs for any conversation's media. | Mandate that all media lookup queries in `src/worker/data` join `conversation_members` with `left_at IS NULL` and active sequence visibility predicates. | **Needs Owner Decision** (Security) |
| **F-05** | **High** | C3 (SEC-05) | `Architecture.md` §5.4, §10.2; `Rules.md` §12 | WebSockets connected directly to `/ws/room/:conversationId` may survive user suspension if eviction only invokes `UserHub.evict()`. | Specify in `Architecture.md` §10.2 that client WebSockets multiplex through `UserHub` (recommended), or Worker emits eviction signals to all active rooms on suspension. | **Needs Owner Decision** (Architecture) |
| **F-06** | **Medium** | C4 (Finding 2), C1 | `Architecture.md` §7.2, §10.2, §19.1; `SOURCE_REGISTER.md` §6 | Cloudflare documentation confirms that SQLite-backed Durable Objects and D1 share the **same account-wide 100,000 daily rows written meter** on the Free plan. | Update `Architecture.md` §7.2 and §19.1 to make explicit that DO SQLite writes decrement the D1 write meter, reinforcing in-memory presence and alarm-batched cursors. | **Needs Owner Decision** (Architecture / Quota) |
| **F-07** | **Medium** | C3 (SEC-06) | `Architecture.md` §12 | Relying on client-reported `provider_version_id` for B2 versioned deletes allows client tampering or omission, leaving orphan versions in B2. | Specify in `Architecture.md` §12 that the Worker executes an authoritative S3 `HEAD` request to B2 during upload completion to capture `x-amz-version-id` directly. | **Needs Owner Decision** (Security / Storage) |
| **F-08** | **Medium** | C3 (SEC-07) | `Architecture.md` §5.3 | Intercepted Firebase ID tokens replayed within their 1-hour window could allow unauthorized duplicate session creation. | Require `POST /api/session` to verify that `auth_time` is within $\le 60$ seconds of session creation. | **Needs Owner Decision** (Security) |
| **F-09** | **Medium** | C3 (SEC-08) | `Architecture.md` §6; `Rules.md` §11 | Simultaneous mutual demotion of two owners could pass check-then-act counts and leave the platform with zero owners. | Embed an atomic constraint `(SELECT COUNT(*) FROM memberships WHERE role = 'owner') > 1` directly inside the demotion SQL `UPDATE` statement. | **Needs Owner Decision** (Security) |
| **F-10** | **Medium** | C2 (C2-01) | `PRD.md` §6.3 line 95 (`FR-PRO-04`) | Unescaped pipe `\|` characters inside inline backticks `` (`everyone\|connections\|nobody`) `` break Markdown table column splitting, corrupting the row into 6 columns. | Replace unescaped pipes with commas: `` (`everyone, connections, nobody`) `` or escaped pipes `` (`everyone\|connections\|nobody`) ``. | **Plain Wording Fix** |
| **F-11** | **Medium** | C2 (C2-02) | `REVIEW_REPORT.md` §8 line 101 | Traceability table lists `FR-AUTH-04…06`, omitting `FR-AUTH-07` (No phone numbers anywhere). | Update range in `REVIEW_REPORT.md` §8 from `FR-AUTH-04…06` to `FR-AUTH-04…07`. | **Plain Wording Fix** |
| **F-12** | **Medium** | C2 (C2-03) | `REVIEW_REPORT.md` §8; `Phases.md` §8, §10, §12, §18 | `FR-PRIV-02` (Retention jobs, Phase 4–12) and `FR-PRIV-03` (Data minimization, Phase 2–6) defined in `PRD.md` are omitted from the traceability table and phase acceptance lines. | Add `FR-PRIV-02` and `FR-PRIV-03` rows to `REVIEW_REPORT.md` §8, and reference them in `Phases.md` Phase 2, 4, 6, and 12 acceptance criteria. | **Plain Wording Fix** |
| **F-13** | **Low** | C4 (Finding 1), C1 | `Architecture.md` §10.4; `Rules.md` §12 | Cloudflare Free limits specify 1,000 subrequests to internal Cloudflare services (DO, D1) per invocation, whereas docs assumed a rigid cap of 50. | Update `Architecture.md` §10.4 and `Rules.md` §12 to clarify that internal Cloudflare service calls draw from the 1,000 subrequest limit. | **Plain Wording Fix** |
| **F-14** | **Low** | C4 (Finding 3) | `Architecture.md` §15.2 | `public/_headers` only applies to static files served by static assets handler, not to programmatic API responses intercepted by `run_worker_first`. | Clarify in `Architecture.md` §15.2 that Worker router middleware programmatically sets security headers on `/api/*` and `/ws/*` responses. | **Plain Wording Fix** |
| **F-15** | **Low** | C2 (C2-05) | `Rules.md` §13 line 100 vs `Architecture.md` §12 line 445 | `Rules.md` §13 states "Signed URLs ≤ 5 minutes" globally, whereas `Architecture.md` §12 specifies upload presigned PUT URLs as ≈ 10 minutes (and download GET URLs ≤ 5 min). | Update `Rules.md` §13: "Signed download URLs ≤ 5 minutes, upload presigned URLs ≤ 10 minutes, only after authorization; store keys, never URLs." | **Plain Wording Fix** |
| **F-16** | **Low** | C2 (C2-06) | `DECISIONS.md` §2 ADR-018 line 49 | ADR-018 trade-offs state *"static assets free and unlimited"*, violating `Rules.md` §24 and `PRD.md` §11 prohibitions against claiming "unlimited free". | Change wording in `DECISIONS.md` ADR-018 to: *"static asset bandwidth included at zero cost within Workers limits"*. | **Plain Wording Fix** |
| **F-17** | **Low** | C2 (C2-07, C2-08) | `PRD.md` §6.1, §6.7; `Phases.md` §7, §17 | Requirement titles and phase objectives use prohibited unqualified word "secure" ("Secure sessions", "Secure deletion", "secure empty shell"). | Rename `FR-AUTH-04` to "Server-side sessions", `FR-MED-07` to "Permanent media deletion", and rephrase phase objectives to "hardened empty shell" / "controlled exports". | **Plain Wording Fix** |
| **F-18** | **Low** | C2 (C2-04) | `Phases.md` §16 line 260 (Phase 10) | Phase 10 components include "reporting/blocking integration" for posts/stories, but acceptance criteria line lists only `FR-SOC-01…07`. | Update Phase 10 acceptance criteria line to: `FR-SOC-01…07, FR-SAFE-01 (posts/stories).` | **Plain Wording Fix** |
| **F-19** | **Low** | C2 (C2-09) | `DECISIONS.md` §2 line 50; `Rules.md` §12 line 92 | Inverted cross-reference notation `(§Architecture 19)` and `(§Design 16 rules)` rather than standard `(Architecture.md §19)` and `(Design.md §16)`. | Standardize syntax to `(Architecture.md §19)` and `(Design.md §16)`. | **Plain Wording Fix** |
| **F-20** | **Low** | C2 (C2-10) | `Architecture.md` §9 (API Table) | Under "Messages", endpoints `…/pins/:seq`, `…/messages/forward`, and `…/search?q=` are Phase 7 features, but appear grouped under Messages (Phase 5 domain row). | Add an explanatory note in the table: `(Pins, forward, and search implemented in Phase 7)`. | **Plain Wording Fix** |

---

## 3. Findings Grouped by Action Category

### Group (a): Apply Now — Plain Wording and Consistency Fixes (10 items)
These items fix syntax, documentation cross-references, table omissions, and prohibited vocabulary violations without altering technical architecture or system scope:
1. **F-10:** Escape pipe characters in `PRD.md` line 95 (`FR-PRO-04`).
2. **F-11:** Add missing `FR-AUTH-07` to traceability table in `REVIEW_REPORT.md` §8.
3. **F-12:** Add missing `FR-PRIV-02` and `FR-PRIV-03` to `REVIEW_REPORT.md` §8 and `Phases.md` acceptance criteria lines.
4. **F-13:** Clarify 1,000 internal services subrequest limit vs. 50 external subrequests in `Architecture.md` §10.4 and `Rules.md` §12.
5. **F-14:** Clarify that programmatic Worker responses set security headers in code while `_headers` applies to static assets (`Architecture.md` §15.2).
6. **F-15:** Harmonize signed URL TTLs in `Rules.md` §13 (download $\le 5$ min, upload $\approx 10$ min per `Architecture.md` §12).
7. **F-16:** Remove prohibited claim "free and unlimited" from `DECISIONS.md` ADR-018 trade-offs.
8. **F-17:** Replace unqualified word "secure" in requirement titles (`FR-AUTH-04`, `FR-MED-07`) and phase objectives in `PRD.md` and `Phases.md`.
9. **F-18:** Add `FR-SAFE-01 (posts/stories)` to Phase 10 acceptance criteria line in `Phases.md`.
10. **F-19:** Standardize inverted cross-reference syntax in `DECISIONS.md` line 50 and `Rules.md` line 92.
11. **F-20:** Add Phase 7 implementation note for pins, forward, and search in `Architecture.md` §9 API table.

---

### Group (b): Needs Owner Decision (6 items)
These items address security defenses, quota boundaries, and architectural patterns requiring explicit owner confirmation:
1. **F-01 (CSWSH Defense):** Require strict equality check on `Origin` header (`Origin === https://${ALLOWED_ORIGIN}`) and immediate HTTP 403 rejection if missing or non-matching on WebSocket handshakes.
2. **F-02 (Invitation Concurrency):** Implement a `BEFORE INSERT` trigger on `invitation_redemptions` in SQLite to prevent concurrent race conditions from exceeding `max_uses`.
3. **F-03 (Daily Message Cap):** Add a daily message cap (e.g. 500 messages/user/day) in `Architecture.md` §15.3 and `PRD.md` §6.4 to protect the 100k account-wide D1 write budget from malicious exhaustion.
4. **F-04 (Media IDOR Protection):** Explicitly mandate in `Architecture.md` §8.2 that all attachment queries join `conversation_members` with sequence bounds and `left_at IS NULL`.
5. **F-05 (WebSocket Multiplexing vs Room Eviction):** Confirm architectural decision to multiplex room WebSockets through `UserHub` so suspension cleanly terminates 100% of a user's real-time traffic in one call.
6. **F-06 (DO & D1 Shared Write Meter):** Formally acknowledge that SQLite-backed Durable Objects and D1 share the 100k daily write budget, strictly enforcing in-memory presence tracking and alarm-batched delivered cursors.

---

### Group (c): Answer Later by a Spike (4 items)
These items cannot be resolved by text edits alone and must be measured during their assigned development spikes:
1. **Gate P Spike (Phase 0):** Backblaze B2 no-card account activation, private bucket creation, scoped application key, CORS configuration, and versioned delete verified via test script.
2. **Phase 1 Spike:** Firebase web SDK on `*.workers.dev` subdomain (authorized domains, popup vs. redirect sign-in, whether `/__/auth/` Worker reverse proxy is needed).
3. **Phase 2 Spike:** Verification of D1 `batch()` atomicity, rollback on UNIQUE violation, and Workers native rate-limiting binding availability on the Free plan (fallback: `RateLimiterDO`).
4. **Phase 7 Spike:** D1 FTS5 write amplification measurement (fallback: bounded `LIKE` scan over recent 20,000 messages) and Web Push VAPID encryption CPU benchmarking (fallback: DO push fan-out).

---

## 4. Proposed Application Prompt

Once the owner has reviewed and decided on the items above, approve the changes by issuing the following prompt:

```markdown
Apply ONLY these approved changes to the files in /docs: <paste the approved list of items from Group (a) and approved Group (b) items>.
Keep the 11 file names. Update "Last reviewed" lines and add a row to the decision log in DECISIONS.md §4. Show me the diff before committing. Commit message: "docs: review fixes (C6 approved items)".
```
