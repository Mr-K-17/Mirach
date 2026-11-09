# Product Requirements Document (PRD) — Mirach (v3)

> **Status:** Version 3.0 — proposed for owner approval; becomes frozen scope on approval (§20).
> **Last reviewed:** 4 November 2026; consistency pass v3.1 on 9 November 2026 (Asia/Kolkata).
> **Authority:** Controls product scope and acceptance criteria. Technical design: `Architecture.md`. Screens: `Design.md`. Sequence: `Phases.md`. Export detail: `EXPORT_SPECIFICATION.md`.
> **Product name:** Mirach (owner-provided). Trademark and existing-product availability are **not verified** (OD-01).

## 1. Product overview

Mirach is a private, invitation-only community platform used from desktop browsers, laptops, tablets and mobile browsers. It combines private and group messaging (text, photos, videos, voice messages, attachments, replies, reactions, edit/delete/forward/pin/search, receipts, typing, presence), social posting (feed, stories, comments, announcements), voice/video calls, and private-room multiplayer games, with its own name, identity and implementation. Nothing is copied from WhatsApp, Instagram, Snapchat or any game.

Members sign in with **Google or email/password** (no phone number), choose a unique username, are admitted by **invitation code or administrator approval**, connect explicitly, and then communicate.

**Cloud-only data rule:** all application data lives in cloud infrastructure and the platform works independently of the owner's computer. The only data transfer to a personal device is a **manual, user-initiated export** (§6.12).

## 2. Problem and opportunity

A small community wants one private place to admit trusted people, let them find each other by username, connect deliberately, and talk, share and play — without phone numbers, public profiles, advertising or dependence on someone's home computer, and without monthly cost. Existing apps lack an invitation boundary, require phone numbers, or are not under the community's control.

## 3. Objectives and success criteria

**Objectives:** (1) phone-free registration; (2) admission by invitation or approval only; (3) explicit connections before private chat; (4) reliable, ordered, complete cloud-stored chat history; (5) private media access; (6) safe community tools (block, report, moderate, suspend); (7) calls, games and social features delivered in phases; (8) zero monthly spend with honest limits; (9) user-controlled exports and account deletion; (10) responsive on all four device classes.

**Success criteria for the first trusted-group release (after Phase 7):** a new member can complete both admission paths; two members exchange persistent messages, replies and reactions in two browsers and see them live under normal conditions (latency measured and reported, not promised); a non-participant cannot read, subscribe to, or download from a conversation through direct API calls; no critical/high authorization defect is open; quota monitoring and a restore drill have been performed; privacy notice, terms and community rules are published.

**Success criteria for full release (after Phase 12):** every feature in §6 is implemented and tested or explicitly recorded as not delivered with owner sign-off; `Phases.md` §18 exit gate is passed.

## 4. Audience and roles

**Audience:** an invited community of adults (initially India-based), starting at roughly 10–50 members and designed to remain usable at about 100 (`Architecture.md` §19.5). Minors are out of scope; the default is **18+ only** (OD-07).

| Role | Definition | Key abilities |
|---|---|---|
| Visitor | Not signed in | Landing page, sign-in |
| Applicant | Signed in; `pending` or `rejected`, or onboarding incomplete | Finish onboarding; see status; sign out; delete own account |
| **Member** | `active`, role `member` | Everything in §6 for members |
| Group admin | Member administering one group | Manage that group's members, title, pins, remove others' messages |
| **Moderator** | Role `moderator` | Review report evidence; dismiss, warn, escalate |
| **Admin** | Role `admin` | Moderator abilities + suspend, invitations, requests, settings, administrative export |
| **Owner** | Role `owner` | Admin abilities + manage admins/moderators + operator export |

No role grants application access to other members' private conversations. The owner's technical access through provider consoles and the operator export is disclosed (§10).

## 5. Core product rules

1. Authentication does not grant membership; membership does not grant connections; connections do not grant group access.
2. Valid invitation → `active`, unless "require approval for all" is on; no code → `pending` until approved.
3. Direct messages require an accepted connection and no block; groups require current membership.
4. Leaving/removal ends access to a group's history; re-adding grants history only from the new join point.
5. Blocking prevents new connection requests, DMs and calls in both directions; an existing DM becomes read-only; shared groups are unaffected (limitation).
6. Roles, status, sender, sequence numbers, counters, timestamps and game results are set by the server only.
7. Email is kept only by the authentication provider; it is never shown to members or stored in application databases.
8. **Cloud data is authoritative; exports are snapshots and never alter or delete online data.**
9. No end-to-end encryption claim; no claim that administrators/operators cannot access content.
10. No paid provider, billing setup or payment details at any time without explicit owner approval (§11).

## 6. Functional requirements

"Phase" refers to `Phases.md` (0 spec · 1 foundation · 2 database/API/security · 3 auth/membership · 4 profiles/connections · 5 messaging · 6 media · 7 enhancements · 8 calls · 9 games · 10 social · 11 export · 12 final testing). Architecture/Design references are by section.

### 6.1 Accounts and identity (Arch §5; Design §5)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-AUTH-01 | Google sign-in | Works with a verified Google account; no phone prompt exists | 3 |
| FR-AUTH-02 | Email/password sign-in with mandatory email verification, password reset | Unverified email cannot create a session; reset works within Spark limits | 3 |
| FR-AUTH-03 | Unique username | Lowercase `[a-z0-9_]`, 3–20; reserved names rejected; DB unique constraint is authoritative; change at most every 30 days, old name held 30 days | 3 |
| FR-AUTH-04 | Secure sessions | Server-side session cookie; sign out, **sign out of all devices**, idle/absolute expiry; expired session returns to sign-in without data flash | 3 |
| FR-AUTH-05 | Sensitive actions require recent sign-in | Role changes, account deletion, invitation management and the sensitive exports (operator E1, account-wide E7, administrative E8, cross-member E5) require `auth_time` ≤ 5 min (`reauth_at`); ordinary exports of one's own conversations need only an active session | 3 |
| FR-AUTH-06 | Token validation by the Worker | Issuer, audience, expiry, signature, provider and verified-email checks pass/fail as specified in Arch §5.3 | 3 |
| FR-AUTH-07 | No phone numbers anywhere | No field, API or table holds a phone number | 3 |

### 6.2 Membership and administration (Arch §6; Design §5, §11)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-MEM-01 | Join with invitation code | Atomic redemption; expired/revoked/exhausted/invalid return the same generic error; `max_uses` never exceeded under concurrency | 3 |
| FR-MEM-02 | Request access without code | Pending screen; admins approve/reject; rejected may re-apply after 30 days | 3 |
| FR-MEM-03 | Create, limit, expire, revoke invitations | Raw code shown once; hash stored; default 1 use/7 days; grants `member` only | 3 |
| FR-MEM-04 | "Require approval for all" setting | Invited applicants become `pending` when on | 3 |
| FR-MEM-05 | Suspend/restore members | Takes effect immediately: sessions revoked, sockets closed | 3 |
| FR-MEM-06 | Roles: owner, admin, moderator, member | Hierarchy, no self-change, last owner protected | 3 |
| FR-MEM-07 | Owner bootstrap and recovery | One-time bootstrap; recovery runbook; audited | 3 |
| FR-MEM-08 | Audit log | Append-only; no secrets or message text; admin viewer | 3 (write), 4 (viewer) |
| FR-MEM-09 | Admin dashboard | Pending requests, members, invitations, reports, settings, usage/quota page; no private content | 3, 12 |
| FR-MEM-10 | Terms, privacy notice, community rules, 18+ declaration | Versioned acceptance recorded before access | 3 |

### 6.3 Profiles and privacy (Arch §7.4; Design §6, §8)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-PRO-01 | Display name and biography | 1–40 / ≤ 160 characters; shown only to permitted viewers | 4 |
| FR-PRO-02 | Profile photograph | Generated initials avatar from Phase 4; **upload, crop, compress and storage in Phase 6** (needs media storage) | 4 / 6 |
| FR-PRO-03 | Member directory | Min 3 characters, prefix match, ≤ 20 results, rate-limited; `exact_username` visibility option | 4 |
| FR-PRO-04 | Privacy controls | Read receipts on/off; last seen and online visibility (`everyone|connections|nobody`); typing indicator on/off; profile-photo visibility; reciprocity rule explained in the UI | 4 (settings), 5/7 (effects) |
| FR-PRO-05 | Member profile view | Actions depend on relationship (request, accept, message, block, report) | 4 |

### 6.4 Connections and safety (Arch §6, §7.5; Design §6, §11)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-CON-01 | Send, accept, decline, cancel connection requests | One row per pair; no self/duplicate/blocked/cooldown violations; server-confirmed state | 4 |
| FR-CON-02 | Remove connection | Direct chat becomes read-only until reconnected | 4 |
| FR-CON-03 | Block / unblock | Effects per core rule 5 | 4 |
| FR-SAFE-01 | Report a member, message, post or story | Reporter sees exactly what is shared; evidence snapshot stored | 4 (members), 5–10 (content) |
| FR-SAFE-02 | Moderation queue | Moderators act from evidence only; actions audited | 4 |
| FR-SAFE-03 | Rate limiting and abuse controls | Per-action limits per Arch §15.3; 429 without side effects | 2 onward |

### 6.5 Messaging core (Arch §7.5, §10, §11; Design §7)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-MSG-01 | One-to-one chat | Requires accepted connection and no block; one DM per pair | 5 |
| FR-MSG-02 | Group conversations | Created from the creator's connections; size ≤ 25; creator is group admin | 5 |
| FR-MSG-03 | Group administration | Add/remove members, title, avatar (after Phase 6), promote/demote admins, at least one admin remains | 5 |
| FR-MSG-04 | Text messages in realtime | Server `seq` returned before the UI shows "sent"; recipient signal and fetch without refresh | 5 |
| FR-MSG-05 | Full persistent history | Participants only; cursor pagination ≤ 50; stable order; complete online history until deleted | 5 |
| FR-MSG-06 | Reliable delivery | Same `client_msg_id` never duplicates; reconnect fetches missed `seq` | 5 |
| FR-MSG-07 | Unread counts | From cursors; consistent across devices | 5 |
| FR-MSG-08 | Delivered and read receipts | Cursor-based; read shown only when both sides allow; no unconfirmed status shown | 5 |
| FR-MSG-09 | Typing indicators | Private room channel, throttled, never stored, honors setting | 5 |
| FR-MSG-10 | Unsent-message outbox | Local, labeled "Not sent", retried safely, cleared on sign-out choice | 5 |

### 6.6 Message interactions and gestures (Arch §11; Design §7, §15)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-INT-01 | Reply to a message | Reference + preview; deleted original → "Original message deleted"; works in groups | 5 |
| FR-INT-02 | Emoji reactions with picker | Multiple reactions (≤ 3 per user per message), add/remove, counts and who reacted | 5 |
| FR-INT-03 | Edit message | Sender only, 15 minutes, `edited` indicator, conflict returns 409 and shows current text | 5 |
| FR-INT-04 | Delete for me | Hidden only for the requester; others retain it | 5 |
| FR-INT-05 | Delete for everyone | Tombstone for all; attachments and derived thumbnails deleted; caches purged by signal | 5 (text), 6 (media) |
| FR-INT-06 | Long-press, right-click and keyboard menus | Long-press (touch), right-click (desktop), `Shift+F10`/Menu key, **and a visible "More" button** open the same menu | 5 |
| FR-INT-07 | Swipe to reply with alternatives | Swipe gesture plus a Reply button/menu item and keyboard shortcut; no action depends only on a gesture or hover | 5 |

### 6.7 Media and attachments (Arch §12; Design §7)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-MED-01 | Photos | Client resize/re-encode, EXIF removed, thumbnail, upload progress | 6 |
| FR-MED-02 | Videos | ≤ 25 MB and ≤ 60 s after client re-encode (where supported); thumbnail frame; no autoplay | 6 |
| FR-MED-03 | Voice messages | Record/play, waveform or duration, ≤ 5 min, Opus where supported | 6 |
| FR-MED-04 | Attachments (documents) | Allow-listed types ≤ 10 MB, download-only | 6 |
| FR-MED-05 | Private access | Participants only; ≤ 5-minute signed URLs; direct guessing fails | 6 |
| FR-MED-06 | Storage quota and monitoring | Per-user quota, warning at 7 GB, block at 9 GB, admin usage view | 6 |
| FR-MED-07 | Secure deletion | Objects and thumbnails deleted with message/account; versions removed | 6 |
| FR-MED-08 | Profile photos and group avatars | Upload, crop, compress | 6 |

### 6.8 Messaging enhancements (Arch §10, §11; Design §7, §8)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-ENH-01 | Message search | Per conversation; bounded scan; rate-limited; hidden/deleted excluded | 7 |
| FR-ENH-02 | Forward messages | Up to 5 targets; "Forwarded" label; original sender not exposed; media copied | 7 |
| FR-ENH-03 | Pin messages | ≤ 3 per conversation; role rules by chat type | 7 |
| FR-ENH-04 | Mute conversations | Per member; suppresses badges and push | 7 |
| FR-ENH-05 | Online presence | Shown per viewer privacy rules; may lag a few minutes after a silent network drop | 7 |
| FR-ENH-06 | Last seen with privacy | Respects both users' settings (reciprocal) | 7 |
| FR-ENH-07 | Notifications | In-app notification centre for connection, membership, call, game, announcement events; **Web Push** (opt-in, generic text by default, iOS requires Home Screen install) | 4 (basic), 7 |

### 6.9 Calls (Arch §13; Design §9)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-CALL-01 | Voice calls (1:1) | Authorization, no block, server token ≤ 10 min | 8 |
| FR-CALL-02 | Video calls (1:1) | Permission and device errors handled | 8 |
| FR-CALL-03 | Incoming call notification; accept/reject | In-app ring via realtime; Web Push when the app is closed (where supported) | 8 |
| FR-CALL-04 | Missed/declined call history | Server-side states, 45 s ring timeout | 8 |
| FR-CALL-05 | Group calls | Later Phase 8 milestone, ≤ 6 participants, inside provider quota | 8 |
| FR-CALL-06 | Quota guard | "Calling unavailable until next month" with no billing | 8 |
| FR-CALL-07 | No recording | No recording path exists | 8 |

### 6.10 Games (Arch §14; Design §10)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-GAME-01 | Private rooms and invitations | Only invited connections join | 9 |
| FR-GAME-02 | Tic-tac-toe | Server-validated moves | 9 |
| FR-GAME-03 | Connect Four | Server-validated moves | 9 |
| FR-GAME-04 | Multiplayer quiz | Server timing and scoring; question bank managed by admins | 9 |
| FR-GAME-05 | Chess | Full legality validation in a Durable Object; draw/resign/timeout rules | 9 |
| FR-GAME-06 | Game history | Results and move logs per member | 9 |
| FR-GAME-07 | Resume and forfeit | Authoritative state restored after disconnect; timeout forfeits | 9 |

### 6.11 Social (Arch §14; Design §10)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-SOC-01 | Posts and community feed | Audience chosen and shown before posting; enforced on reads and media | 10 |
| FR-SOC-02 | Likes and reactions | Audience-only; idempotent | 10 |
| FR-SOC-03 | Comments | Threaded one level; reportable | 10 |
| FR-SOC-04 | Temporary stories | Expire at 24 h by server time; unreachable after expiry; viewers visible to the author | 10 |
| FR-SOC-05 | Shared media | Uses the same private media pipeline and quotas | 10 |
| FR-SOC-06 | Audience and visibility controls | `connections` or `community`; changeable | 10 |
| FR-SOC-07 | Community announcements | Admin-only, pinned, in-app notification | 10 |

### 6.12 Export and data ownership (`EXPORT_SPECIFICATION.md`)

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-EXP-01 | Manual user-initiated export only | No automatic or scheduled transfer to any device | 11 |
| FR-EXP-02 | Self-service export of own data, selected conversations, date ranges, own media | Preview of what will be included; categories and date filters; manifest | 11 |
| FR-EXP-03 | Administrative report export | Admin/owner; no private message content | 11 |
| FR-EXP-04 | Operator (full) export | Owner only; re-auth, typed confirmation, mandatory encryption, audit entry | 11 |
| FR-EXP-05 | Formats | JSON, CSV where suitable, ZIP with media + manifest; SQL via the owner's Wrangler export | 11 |
| FR-EXP-06 | Exclusions and safety | Never passwords, tokens, secrets, provider credentials, session data; optional encryption | 11 |
| FR-EXP-07 | Never mutates online data | Export does not delete, redact or change retention | 11 |

### 6.13 Account deletion, privacy and cloud behavior

| ID | Requirement | Acceptance | Phase |
|---|---|---|---|
| FR-PRIV-01 | Account deletion | Re-auth, 14-day grace, choice to keep or delete own messages, media removed, tombstone, Firebase account removal path | 3 (request flow), 6 (execution job), 12 (verification) |
| FR-PRIV-02 | Retention jobs | Evidence, attempts, notifications, expired stories, orphan media purged on schedule | 4–12 |
| FR-PRIV-03 | Data minimization | No email/phone in application DB; EXIF stripped | 2–6 |
| FR-CLD-01 | Cloud-authoritative operation | App fully works with the owner's PC off; no local database or sync components exist | all |
| FR-CLD-02 | Quota-failure behavior | Explicit failure messages; no false "sent"; no data loss | all |

## 7. User stories

- **Visitor:** sign in with Google or email/password without a phone number.
- **Applicant:** enter an invitation code or request access; see my status.
- **Member:** find people by username, connect, chat 1:1 and in groups; reply (swipe or button), react, edit, delete for me/everyone, forward, pin, search; see typing, delivery and read status as my privacy settings allow; share photos, videos, voice messages and documents; set privacy; block/report; export or delete my data.
- **Member (later):** call a connection; play games; post, comment, react, post stories.
- **Group admin:** manage group members and pins.
- **Moderator/Admin/Owner:** review evidence, act, administer invitations/members, audit, export reports; the owner exports full data on demand.

## 8. Key journeys

**A Invitation:** sign in → username/profile → accept terms and 18+ → enter code → active (or pending). **B Request:** … → request → pending → approved. **C Connect and chat:** search → request → accept → chat. **D Media:** select/record → compress locally → progress → send. **E Delete:** menu → "Delete for me / for everyone" with consequences stated. **F Export:** Settings → Your data → choose scope/dates → preview → generate in the browser → save the file. **G Account deletion:** Settings → confirm → grace → completion.

## 9. Non-functional requirements

- **Security:** Worker policy layer on every call; SQL-scoped predicates; server-side sessions; CSP and headers; negative tests for all private resources.
- **Reliability:** D1 authoritative; idempotent writes; reconnect catch-up; failure matrix (Arch §19.3) behaviors; no silent data loss.
- **Performance (measured, reported, not promised):** page size ≤ 50; request budget ≤ 250 per active member per day; realtime perceived within a couple of seconds on normal broadband.
- **Compatibility:** latest stable Chrome, Edge, Firefox and Safari on desktop and mobile (versions recorded per release); iOS Web Push only for Home Screen web apps.
- **Accessibility:** WCAG 2.2 AA target; every gesture has a non-gesture alternative (`Design.md` §15).
- **Maintainability:** feature modules, strict TypeScript, versioned migrations, CI checks.
- **Internationalization readiness:** English first; centralized strings; times in viewer locale, stored UTC.
- **Observability:** request IDs, error classes; no content in logs.
- **Capacity:** designed for ≈ 10–100 members under the free quotas (Arch §19.5).

## 10. Privacy requirements

- Collect only: Firebase identity (UID), username, display name, bio, avatar, membership/roles, relationships, content members send, privacy settings, consent records. **Never** phone numbers, contacts, birth dates or location; EXIF stripped; email remains in Firebase only.
- Show the audience before content is shared.
- **Owner/operator access model must be disclosed:** the platform operator and the infrastructure providers (Cloudflare, Google/Firebase, Backblaze, LiveKit) can technically access stored content; administrators and moderators have no conversation browser; the owner's operator export is controlled and audited (Arch §15.6). The privacy notice must say so, and that Mirach is **not end-to-end encrypted**.
- Provide export and deletion; document retention (Arch §7.6): evidence 90 days after resolution, audit ≥ 1 year, notifications 30 days, membership requests 1 year, invitation attempts 24 h, stories 24 h, deletion grace 14 days.
- Downloaded exports are outside the platform; the owner holds them under the export-handling rules.
- Legal review is required before wider rollout; DPDP substantive obligations start on or about 13–14 May 2027.

## 11. Zero-cost and no-card requirements

- No provider may be added that needs a payment method; no paid plan, pay-as-you-go service, billing alert dependency or automatic upgrade is allowed. Approved providers and their no-card status are in `Architecture.md` §2; Backblaze B2 is **conditional on the owner's Phase 0 activation test (Gate P)**.
- Reaching a free limit causes a defined outage or feature disablement (Arch §19.3), never a charge.
- The platform must not promise unlimited storage, requests or uptime.
- No custom domain is required; the `*.workers.dev` URL is used.
- Cost layers: development $0; launch $0; ongoing $0 within quotas; any future paid step requires explicit owner approval and a new ADR.

## 12. Release scope

All features in §6 are in scope and phase-assigned; none is silently removed. **First trusted-group release** = Phases 1–7 (auth through messaging enhancements). **Later releases** = Phase 8 calls, 9 games, 10 social, 11 export, 12 full release. If a phase cannot meet its acceptance criteria within provider limits, the owner decides explicitly (reduce, defer or accept a limitation) via the change-control process; agents may not drop it.

## 13. Out of scope (not planned)

Public registration; phone login or lookup; contact upload; payments, ads, gambling; call recording; native mobile apps; automatic synchronization or archiving to a personal computer; local databases; app-level E2EE (until separately designed); paid services; server-side malware scanning; MFA (not available without paid-tier-dependent features); passkeys; global "who's online" directory beyond the privacy-controlled presence in §6.8.

## 14. Feature-to-phase matrix

The complete matrix, listing every requested feature and its phase, is `Phases.md` §3. It is the authoritative assignment list; PRD requirement IDs above carry the same phase numbers.

## 15. Dependencies and assumptions

Owner can create and control accounts for GitHub, Cloudflare, Firebase, Backblaze and (Phase 8) LiveKit **without payment details**; Gate P results are recorded; members have Google or email accounts; provider free quotas remain as recorded on 4 Nov 2026; counsel is available before wider rollout.

## 16. Risks

| Risk | Mitigation |
|---|---|
| D1/Worker daily limits | Write minimization, coalescing, budgets, usage page, graceful failure |
| 500 MB per D1 database | Chat database separated and shard-ready; scale-out ADR |
| No MFA, no RLS | Server-side sessions, policy layer, negative tests, strict secrets handling |
| B2 no-card activation or egress limits | Gate P test; text-only fallback; ADR for alternatives |
| Authorization bugs in custom code | Central policy module, SQL-scoped predicates, contract tests per actor |
| Free-tier outage windows | Clear status screens; retries; no data loss |
| Storage exhaustion by video | Per-user quota, caps, 9 GB hard stop |
| Legal obligations underestimated | 18+ default; counsel gate; export handling rules |
| Owner as single point of failure | Second admin; owner-recovery runbook |

## 17. Release acceptance criteria

1. Both sign-in methods work; no phone number exists anywhere.
2. Both admission paths work; invitation redemption is atomic under concurrency.
3. Roles and hierarchy enforced; suspension immediate (sessions and sockets).
4. Connections, blocks, directory privacy behave as specified.
5. DM/group chat with replies, reactions, edit, delete for me/everyone, forward, pin, search, receipts, typing, presence all pass multi-user tests; deleted content never reappears.
6. Media (photo, video, voice, documents) private, validated, quota-managed and deleted securely.
7. Calls, games, stories, feed, announcements function within quotas with defined quota behavior.
8. Every failure case in Arch §19.3 has a passing test.
9. Manual exports work for every type in `EXPORT_SPECIFICATION.md`; no automatic export exists; exports never alter online data.
10. Account deletion works end to end; retention jobs run.
11. Desktop, laptop, tablet and mobile layouts pass; accessibility checks pass; gesture alternatives exist.
12. No secret in repo/bundle/logs; no paid or card-requiring service is configured.
13. Privacy notice (including operator access and no E2EE), terms and rules are published and accepted.
14. A D1 restore drill and an export-import drill were performed.
15. The owner has approved the final open decisions and limitations.

## 18. Known limitations

No E2EE; operator and providers can technically read data; no MFA; Free quotas can cause daily outages; D1 per-database 500 MB and account 5 GB caps bound chat history capacity; B2 media has no automatic backup; no server-side malware scanning; presence may lag; Web Push is limited on iOS to installed web apps; blocking does not hide messages in shared groups; age is a declaration; `*.workers.dev` hostname; not legal advice.

## 19. Open decisions

Maintained in `DECISIONS.md` §3, each with a safe default and a gate.

## 20. Freeze and change control

On owner approval this document freezes the scope, feature set and phase assignments. Changes require the process in `Rules.md` §2 (explanation, technical evidence, cost, security and migration impact, explicit owner approval). New ideas go to the future-enhancement backlog in `DECISIONS.md` §5.
