# C2 — Consistency Audit: Contradictions, Gaps, and Alignments

> **Review Date:** 9 November 2026 (Asia/Kolkata)  
> **Scope:** Full audit of all 11 planning documents in `/docs` (`Rules.md`, `Memory.md`, `PRD.md`, `Architecture.md`, `Design.md`, `Phases.md`, `DECISIONS.md`, `EXPORT_SPECIFICATION.md`, `SOURCE_REGISTER.md`, `REVIEW_REPORT.md`, `ANTIGRAVITY_HANDOFF.md`).  
> **Status:** Implemented (Read-only review; no documents in `/docs` or application files modified).

---

## 1. Executive Summary & Audit Methodology

An automated and manual consistency audit was conducted across all 11 documents in `/docs` covering:
1. **Numbers that must match everywhere:** Session idle/absolute lifetime, re-authentication window (5 minutes), signed-URL TTL, call-token TTL, edit window, group cap, media quotas, rate limits, retention periods, database names, and number of Firebase projects (3).
2. **Cross-references:** 78 explicit cross-document section references, bare `§` intra-document references, and inverted syntax references.
3. **Requirement IDs (FR-*):** Complete cross-mapping of all 93 requirements in `PRD.md` against `Phases.md` phase assignments and acceptance criteria, and against the `REVIEW_REPORT.md` §8 traceability matrix.
4. **Database schema:** All 39 tables catalogued in `Architecture.md` §7.4 verified against "Database changes" in `Phases.md`.
5. **API routes:** All routes in `Architecture.md` §9 mapped to implementation phases.
6. **Role permissions:** Multi-document alignment of Visitor, Applicant, Member, Group Admin, Moderator, Admin, and Owner capabilities.
7. **Prohibited wording:** Identification of unqualified usage of "secure", "compliant", and "unlimited" per `Rules.md` §4 and §24.

---

## 2. Category Audits

### 2.1 Numbers That Must Match Everywhere

| Item | Canonical Value | Document Locations | Status | Notes / Findings |
|---|---|---|---|---|
| **Re-authentication Window** | **5 minutes** | `Rules.md` §9, `Architecture.md` §5.3, `PRD.md` FR-AUTH-05, `EXPORT_SPECIFICATION.md` §4, §5 | **Consistent** | Unified in v3.1 pass; exactly 5 minutes everywhere. |
| **Session Idle Lifetime** | **14 days** | `Architecture.md` §5.2, `Rules.md` §9, `REVIEW_REPORT.md` §9 | **Consistent** | Exactly 14 days everywhere. |
| **Session Absolute Lifetime** | **60 days** | `Architecture.md` §5.2, `Rules.md` §9, `REVIEW_REPORT.md` §9 | **Consistent** | Exactly 60 days everywhere. |
| **Signed-URL TTL (Download/View)** | **≤ 5 minutes** | `Rules.md` §13, `Architecture.md` §12, §15.1, `PRD.md` FR-MED-05, `EXPORT_SPECIFICATION.md` §3, `Phases.md` Phase 6 | **Minor Clarification Needed** | Download signed URLs are strictly ≤ 5 min. Upload presigned PUT URLs are specified as ≈ 10 min in `Architecture.md` §12 (line 445); `Rules.md` §13 says "Signed URLs ≤ 5 minutes" without distinguishing uploads. |
| **Call-Token TTL** | **≤ 10 minutes** | `Rules.md` §14, `Architecture.md` §13, `PRD.md` FR-CALL-01, `Phases.md` Phase 8 | **Consistent** | Exactly ≤ 10 min everywhere. |
| **Call Ring Timeout** | **45 seconds** | `Architecture.md` §13, `PRD.md` FR-CALL-04, `Design.md` §9 | **Consistent** | Exactly 45 s everywhere. |
| **Message Edit Window** | **15 minutes** | `Architecture.md` §7.6, §11, `PRD.md` FR-INT-03, `Design.md` §7, `REVIEW_REPORT.md` §9 | **Consistent** | Exactly 15 min everywhere. |
| **Group Size Cap** | **25 members** | `Rules.md` §12, `Architecture.md` §2, §7.4, §10.4, `PRD.md` FR-MSG-02, `Design.md` §7 | **Consistent** | Exactly 25 members everywhere. |
| **Database Names** | `mirach-core`, `mirach-chat`, `mirach-activity` | `Rules.md` §2, `Architecture.md` §7.1, `Phases.md` §8, §11, §15, `DECISIONS.md` ADR-020 | **Consistent** | Exact 3 database names used everywhere. |
| **Firebase Projects Count** | **3 projects** (`dev`, `staging`, `prod`) | `Rules.md` §7, `Architecture.md` §17.2, `ANTIGRAVITY_HANDOFF.md` §5, `DECISIONS.md` v3.1 | **Consistent** | Unified at three separate projects everywhere. |
| **Media Limits & Quotas** | Photos ≤ 10 MB (0.5 MB/1600 px resized); Video ≤ 25 MB/60 s; Voice ≤ 5 min; Docs ≤ 10 MB; User quota 75 MB; Warn 7 GB, Hard stop 9 GB of 10 GB B2 | `Architecture.md` §12, `PRD.md` §6.7, `Rules.md` §13, `DECISIONS.md` OD-11, OD-16 | **Consistent** | Thresholds match across all architectural documents. |
| **Rate Limits** | 30 msgs/min/user; 20 conn req/day; 20 search/day; 60 dir/min; 5 failed invites/hr; 30 uploads/day; 10 sessions/hr/IP | `Architecture.md` §15.3, `PRD.md` §6.4, `Rules.md` §11 | **Consistent** | Consistent across technical specifications. |
| **Retention Schedules** | Evidence 90 d; Audit ≥ 1 y; Notifications 30 d; Membership requests 1 y; Attempts 24 h; Stories 24 h; Deletion grace 14 d; Sessions purge 30 d | `Architecture.md` §7.4, §7.6, `PRD.md` §10, `DECISIONS.md` OD-06 | **Consistent** | Fully aligned across database schemas and policies. |

---

### 2.2 Cross-Reference Integrity

* **Explicit Cross-Document References (78 total checked):** 100% valid. All targets (`Rules §X`, `Architecture §X`, `Phases §X`, `Design §X`, `DECISIONS §X`, `EXPORT_SPECIFICATION §X`, `SOURCE_REGISTER §X`) resolve to existing section headings.
* **Inverted Syntax References:**
  - `DECISIONS.md:50`: references `(§Architecture 19)` instead of standard `Architecture.md §19`.
  - `Rules.md:92`: references `(§Design 16 rules)` instead of standard `Design.md §16`.
* **Bare Intra-Document `§` References:**
  - In `REVIEW_REPORT.md` §8 traceability table, column headers designate the target document (e.g. `Architecture | Design`), meaning section numbers like `§17.6, §19` correctly refer to the column's parent document.
  - In `ANTIGRAVITY_HANDOFF.md` §2 line 15: quotes `"never violate Rules §2, §5, §7, §23, §24"` which correctly refer to `Rules.md`.

---

### 2.3 Requirements (FR-* IDs) & Phase Mapping

* **Total Requirements in `PRD.md`:** 93 requirements defined.
* **Traceability Table Coverage (`REVIEW_REPORT.md` §8):**
  - **Missing `FR-AUTH-07`:** Line 101 specifies `FR-AUTH-04…06`, inadvertently omitting `FR-AUTH-07` (No phone numbers anywhere).
  - **Missing `FR-PRIV-02`:** Retention jobs (Phase 4–12) is omitted from the traceability table.
  - **Missing `FR-PRIV-03`:** Data minimization (Phase 2–6) is omitted from the traceability table.
* **Phase Acceptance Criteria (`Phases.md`):**
  - `FR-PRIV-02` (Retention jobs) and `FR-PRIV-03` (Data minimization) do not appear in any phase acceptance criteria line in `Phases.md`.
  - `FR-CLD-01` (Cloud-authoritative operation) and `FR-CLD-02` (Quota-failure behavior) are assigned to "all" in `PRD.md`, but neither is listed in phase acceptance lines.
  - `FR-SAFE-01` for posts and stories is covered in Phase 10 components ("reporting/blocking integration"), but is missing from Phase 10's acceptance criteria line (`FR-SOC-01…07`).
* **Table Formatting Defect in `PRD.md`:**
  - In `PRD.md` line 95 (`FR-PRO-04`), raw unescaped pipe characters inside backticks `` (`everyone|connections|nobody`) `` break markdown table column parsing, splitting the row into 6 columns and shifting the phase cell into column 6.

---

### 2.4 Database Tables Catalogue vs. Phase Allocation

* **Architecture §7.4:** Defines 39 tables:
  - **Core (20):** `profiles`, `reserved_usernames`, `community_settings`, `memberships`, `membership_requests`, `invitation_codes`, `invitation_redemptions`, `invitation_attempts`, `policy_acceptances`, `sessions`, `connections`, `blocked_users`, `conversation_directory`, `notifications`, `push_subscriptions`, `reports`, `audit_logs`, `export_jobs`, `account_deletion_requests`, `call_sessions`.
  - **Chat (7):** `conversations`, `conversation_members`, `messages`, `message_attachments`, `message_reactions`, `message_hides`, `conversation_pins`.
  - **Activity (12):** `posts`, `post_attachments`, `comments`, `post_reactions`, `stories`, `story_views`, `announcements`, `game_sessions`, `game_players`, `game_moves`, `quiz_questions`, `quiz_answers`.
* **Phases.md "Database changes":** Every single one of the 39 tables is introduced in the exact correct phase and associated with the matching database binding (`core`, `chat`, or `activity`). Zero orphans or mismatched table allocations exist.

---

### 2.5 API Routes Coverage in Architecture §9

All API endpoints listed in `Architecture.md` §9 are accounted for across the phases:
* **Session & Onboarding:** Phase 3.
* **Profile & Connections:** Phase 4.
* **Conversations & Realtime:** Phase 5.
* **Media:** Phase 6.
* **Search, Forward, Pin, Web Push:** Phase 7. *(Note: Grouped under "Messages" in Arch §9 table, but requirements `FR-ENH-01/02/03` belong to Phase 7).*
* **Calls:** Phase 8.
* **Games & Social:** Phases 9 & 10.
* **Exports:** Phase 11.
* **Account Deletion:** Phase 3 (request), Phase 6 (execution), Phase 12 (verification).

---

### 2.6 Prohibited Wording & Claims Audit

`Rules.md` §4 and §24 explicitly prohibit stating "secure", "done", "complete", "production-ready", "end-to-end encrypted", "compliant", or "unlimited free" without evidence and defined scope. The audit revealed several places where unqualified terms were used:
1. `DECISIONS.md` §2 ADR-018 trade-offs: describes static assets as *"free and unlimited"*.
2. `Phases.md` Phase 1 objective: states *"a deployed, responsive, secure empty shell"*.
3. `Phases.md` Phase 11 objective: states *"user-initiated, secure, optionally encrypted exports"*.
4. `PRD.md` §6.1 line 68: requirement title for `FR-AUTH-04` is *"Secure sessions"*.
5. `PRD.md` §6.7 line 146 & `Architecture.md` §12 line 449: requirement title and header use *"Secure deletion"*.

---

## 3. Findings & Proposed Corrections Table

| ID | Severity | Files and Sections | What Disagrees / Contradiction or Gap | Smallest Fix Proposed |
|---|:-:|---|---|---|
| **C2-01** | **Medium** | `PRD.md` §6.3 line 95 (`FR-PRO-04`) | Unescaped pipe `\|` characters in inline backticks `` (`everyone\|connections\|nobody`) `` break Markdown table column parsing, splitting the row into 6 columns and corrupting the phase cell. | Replace unescaped pipes with escaped pipes: `` (`everyone\|connections\|nobody`) `` or commas: `` (`everyone, connections, nobody`) ``. |
| **C2-02** | **Medium** | `REVIEW_REPORT.md` §8 line 101 | Traceability table lists `FR-AUTH-04…06`, omitting `FR-AUTH-07` (No phone numbers anywhere). | Change `FR-AUTH-04…06` to `FR-AUTH-04…07` in `REVIEW_REPORT.md` §8. |
| **C2-03** | **Medium** | `REVIEW_REPORT.md` §8 & `Phases.md` | `FR-PRIV-02` (Retention jobs, Phase 4–12) and `FR-PRIV-03` (Data minimization, Phase 2–6) are defined in `PRD.md` §6.13 but missing from the traceability table in `REVIEW_REPORT.md` §8 and from `Phases.md` acceptance criteria lines. | Add `FR-PRIV-02` and `FR-PRIV-03` rows to `REVIEW_REPORT.md` §8, and reference them in Phase 2, 4, 6, and 12 acceptance criteria lines in `Phases.md`. |
| **C2-04** | **Low** | `Phases.md` §16 line 260 (Phase 10) | Phase 10 components include "reporting/blocking integration" for posts and stories, but Phase 10 acceptance criteria line lists only `FR-SOC-01…07`, omitting `FR-SAFE-01 (posts/stories)`. | Update Phase 10 acceptance criteria line to: `FR-SOC-01…07, FR-SAFE-01 (posts/stories).` |
| **C2-05** | **Low** | `Rules.md` §13 line 100 vs `Architecture.md` §12 line 445 | `Rules.md` §13 states "Signed URLs ≤ 5 minutes" globally, whereas `Architecture.md` §12 specifies upload presigned PUT URLs as ≈ 10 minutes (with download signed GET URLs at ≤ 5 minutes). | Clarify `Rules.md` §13: "Signed download URLs ≤ 5 minutes, upload presigned URLs ≤ 10 minutes, only after authorization; store keys, never URLs." |
| **C2-06** | **Low** | `DECISIONS.md` §2 ADR-018 line 49 | ADR-018 trade-offs state *"static assets free and unlimited"*, contradicting `Rules.md` §24 and `PRD.md` §11 prohibitions against claiming "unlimited free" without scope. | Change wording to: *"static asset bandwidth included at zero cost within Workers limits"*. |
| **C2-07** | **Low** | `Phases.md` §7 (Phase 1) & §17 (Phase 11) | Objectives use the prohibited unqualified adjective "secure": Phase 1 states *"secure empty shell"* and Phase 11 states *"secure, optionally encrypted exports"*, contrary to `Rules.md` §4/§24. | Replace *"secure empty shell"* with *"hardened empty shell"* (or *"authenticated empty shell"*), and in Phase 11 use *"controlled, optionally encrypted exports"*. |
| **C2-08** | **Low** | `PRD.md` §6.1 (`FR-AUTH-04`) & §6.7 (`FR-MED-07`) | Requirement names use prohibited word "secure": *"Secure sessions"* and *"Secure deletion"*. | Rename `FR-AUTH-04` to *"Server-side sessions"* and `FR-MED-07` to *"Permanent media deletion"*. |
| **C2-09** | **Low** | `DECISIONS.md` §2 line 50 & `Rules.md` §12 line 92 | Inverted cross-reference notation `(§Architecture 19)` and `(§Design 16 rules)` rather than standard `(Architecture.md §19)` and `(Design.md §16)`. | Standardize to `(Architecture.md §19)` and `(Design.md §16)`. |
| **C2-10** | **Low** | `Architecture.md` §9 (API Table) | Under "Messages", endpoints `…/pins/:seq`, `…/messages/forward`, and `…/search?q=` are Phase 7 features, but appear grouped under Messages (Phase 5 domain row). | Add an explanatory note in the table: `(Pins, forward, and search implemented in Phase 7)`. |
