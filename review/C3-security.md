# C3 — Security and Authorization Architecture Review

> **Review Date:** 9 November 2026 (Asia/Kolkata)  
> **Scope:** Threat model, authorization architecture, session lifecycle, cryptographic boundaries, and failure modes across `Architecture.md` §5, §6, §8, §10, §12, §15, `Rules.md` §7–§13, and `EXPORT_SPECIFICATION.md`.  
> **Status:** Implemented (Read-only review; no application code or cloud resources modified).

---

## 1. Executive Summary & Review Approach

This review examines the **architectural design** of Mirach before any code is written. In a system built on Cloudflare D1 without row-level security, with client-side media pipelines, and operating strictly within zero-cost resource quotas, security cannot rely on default framework protections.

Each area is analyzed from an adversarial perspective: identifying concrete attack concepts, evaluating whether the current design neutralizes the threat, documenting architectural gaps, and proposing specific defensive remediations.

---

## 2. In-Depth Security Assessment by Area

### 2.1 Firebase ID-Token Validation and Session Creation

* **Attack Idea 1 — Cross-Project Token Confusion:** An attacker creates a Firebase project under their own Google Cloud account, issues valid RS256 ID tokens for arbitrary email addresses or UIDs, and presents them to `POST /api/session`.
  * **Design Defense:** `Architecture.md` §5.3 explicitly requires validating `iss == https://securetoken.google.com/<FIREBASE_PROJECT_ID>` and `aud == <FIREBASE_PROJECT_ID>`.
  * **Evaluation:** Stopped, provided that the Worker environment variable `FIREBASE_PROJECT_ID` is strictly bound and development/staging/production projects remain segregated.
* **Attack Idea 2 — Pre-Account Takeover via Unverified Password Accounts:** An attacker creates a password account using the victim's email before the victim registers with Google. If the victim later attempts Google sign-in, Firebase may link or overwrite accounts depending on project configuration.
  * **Design Defense:** `Architecture.md` §5.3 rule 8 enforces `email_verified == true` for the `password` provider.
  * **Gap:** If Firebase's project setting allows account linking across providers without verified email pre-conditions, an attacker could register an unverified password account and block the legitimate owner or trigger an unpredictable linking state.
  * **Severity:** **Medium**
  * **Concrete Fix:** In the Firebase console checklist (Phase 0/3), explicitly mandate enabling "Email enumeration protection" and setting "One account per email address" with provider linking restricted to verified credentials. Verify that `POST /api/session` rejects any token where `email_verified` is false, regardless of provider, except for Google accounts where Google guarantees verification at the IDP level.
* **Attack Idea 3 — Stolen Token Replay During Validity Window:** Firebase ID tokens are valid for 1 hour. If captured in transit or from client memory before session exchange, an attacker could create unauthorized sessions.
  * **Design Defense:** Handled by `inMemoryPersistence` (tokens never stored in `localStorage` or IndexedDB) and immediate client `signOut()` after calling `POST /api/session`.
  * **Concrete Fix:** Require `POST /api/session` to verify that `auth_time` is within the last 60 seconds of token issuance for new session creation, preventing replaying tokens captured earlier in their 1-hour window.

---

### 2.2 Cookie, CSRF, Origin, and WebSocket Upgrades

* **Attack Idea 1 — Cross-Site WebSocket Hijacking (CSWSH):** A malicious site embeds JavaScript attempting `new WebSocket("wss://mirach.workers.dev/ws/hub")`. Since browsers include credentials on WebSocket handshakes, an authenticated member's socket could be hijacked.
  * **Design Defense:** `Architecture.md` §5.4, §8.1, §10.4 require checking the `Origin` header during WebSocket upgrade.
  * **Gap:** The specification does not define behavior if the `Origin` header is absent, `null` (e.g. from sandboxed iframes or privacy extensions), or contains subdomains.
  * **Severity:** **High**
  * **Concrete Fix:** The Worker WebSocket upgrade middleware must strictly enforce:
    ```typescript
    const origin = request.headers.get("Origin");
    if (!origin || origin !== `https://${env.ALLOWED_ORIGIN}`) {
      return new Response("Forbidden", { status: 403 });
    }
    ```
    Absence of `Origin` or mismatch must fail closed with HTTP 403.
* **Attack Idea 2 — Multi-Tenant Subdomain Cookie Bleed:** On `*.workers.dev`, multiple Cloudflare Workers share the same parent domain. A malicious Worker hosted on `attacker.workers.dev` could attempt to set or read cookies.
  * **Design Defense:** `Architecture.md` §5.2 utilizes `__Host-mirach_sid` with `Path=/; Secure; SameSite=Strict`.
  * **Evaluation:** Stopped. Browsers complying with RFC 6265bis refuse `__Host-` cookies with a `Domain` attribute and will not share them across subdomains.

---

### 2.3 Invitation Redemption Races

* **Attack Idea — Distributed Concurrency Race on Single-Use Invitations:** An invitation code with `max_uses = 1` is distributed. 20 concurrent HTTP requests from distinct authenticated accounts arrive simultaneously at `POST /api/invitations/redeem`.
  * **Design Defense:** `Architecture.md` §8.3 uses a D1 `batch()` with an insert containing:
    `WHERE (SELECT COUNT(*) FROM invitation_redemptions r WHERE r.invitation_id = i.id) < i.max_uses`.
  * **Gap:** D1 executes on SQLite. In multi-statement transactions, if SQLite does not take an immediate write lock before executing the `SELECT COUNT(*)`, concurrent transactions can both read `COUNT(*) = 0` and both insert, yielding `COUNT(*) = 2 > max_uses`.
  * **Severity:** **High**
  * **Concrete Fix:** Do not rely solely on the subquery in the `INSERT ... SELECT`. Add an explicit database trigger in `mirach-core`:
    ```sql
    CREATE TRIGGER trg_check_invitation_max_uses
    BEFORE INSERT ON invitation_redemptions
    BEGIN
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM invitation_redemptions WHERE invitation_id = NEW.invitation_id) >= 
             (SELECT max_uses FROM invitation_codes WHERE id = NEW.invitation_id)
        THEN RAISE(ABORT, 'INVITATION_MAX_USES_EXCEEDED')
      END;
    END;
    ```
    Triggers run synchronously inside SQLite's internal row-insertion lock, guaranteeing zero race conditions under any concurrency level.

---

### 2.4 Role Escalation and Last-Owner Immunity

* **Attack Idea 1 — Simultaneous Mutual Demotion / Deletion of Owners:** Two owners concurrently submit requests to demote each other to `member`, or an owner submits a self-demotion while an admin submits a demotion.
  * **Design Defense:** `Rules.md` §11 states "no self-role-change; admins cannot act on owners; only owners create admins; the last owner cannot be demoted or removed."
  * **Gap:** If two owners execute simultaneous demotions, a race condition `COUNT(*) = 2` could pass on both threads before either commit, resulting in zero owners remaining.
  * **Severity:** **Medium**
  * **Concrete Fix:** Embed an atomic constraint directly in the demotion update:
    ```sql
    UPDATE memberships
    SET role = ?new_role
    WHERE user_id = ?target_uid 
      AND role = 'owner'
      AND (SELECT COUNT(*) FROM memberships WHERE role = 'owner' AND status = 'active') > 1;
    ```
    If `meta.changes === 0`, the Worker must return `409 Conflict` ("Cannot demote or remove the last owner").

---

### 2.5 D1 Missing Row-Level Security: Query-Level Data Leakage

* **Attack Idea 1 — Direct Object Reference on Media Signatures:** An attacker enumerates UUIDs for `POST /api/media/sign` or direct attachment endpoints.
  * **Design Defense:** `Architecture.md` §8.2 mandates access predicates embedded in SQL.
  * **Gap:** If an attachment query fetches from `message_attachments` by `id` alone, any member can access attachments from any private conversation.
  * **Severity:** **High**
  * **Concrete Fix:** In `src/worker/data/attachments.ts`, every media lookup query MUST join conversation membership:
    ```sql
    SELECT a.* FROM message_attachments a
    JOIN conversation_members cm ON a.conversation_id = cm.conversation_id
    WHERE a.id = ?attachment_id 
      AND cm.user_id = ?actor_id 
      AND cm.left_at IS NULL
      AND (cm.cleared_before_seq IS NULL OR a.message_seq > cm.cleared_before_seq);
    ```
* **Attack Idea 2 — Historical Group Message Leak to Re-Joined Members:** A user was a member during messages 1–50, left the group, and is re-added at message 150. Can they read messages 51–149?
  * **Design Defense:** `Architecture.md` §7.5 states "a re-added member sees history only from the new `joined_seq`".
  * **Concrete Fix:** When fetching conversation messages, the SQL predicate must strictly enforce:
    ```sql
    WHERE m.conversation_id = ?conv_id
      AND m.seq >= (
        SELECT joined_seq FROM conversation_members 
        WHERE conversation_id = ?conv_id AND user_id = ?actor_id AND left_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM message_hides mh 
        WHERE mh.conversation_id = ?conv_id AND mh.message_seq = m.seq AND mh.user_id = ?actor_id
      );
    ```

---

### 2.6 Durable Object Admission and Eviction

* **Attack Idea — Zombie WebSocket Sockets in ConversationRoom Upon Suspension:** An active user has WebSockets open to `/ws/hub` and `/ws/room/:conversationId`. An administrator suspends the user. `UserHub.evict()` is called, closing `/ws/hub`. However, does the socket in `/ws/room/:conversationId` stay open?
  * **Design Defense:** `Architecture.md` §5.4 calls `UserHub.evict()`.
  * **Gap:** `ConversationRoom` is an independent Durable Object instance per conversation. If `ConversationRoom` sockets are not evicted, the suspended user can continue receiving ephemeral typing indicators, in-room presence, and sending typing events until network drop.
  * **Severity:** **High**
  * **Concrete Fix:** Two architectural adjustments:
    1. During suspension or group removal, the Worker must broadcast an eviction signal to all active `ConversationRoom` DO instances where the user was a member.
    2. Alternatively (recommended for simplicity and resource conservation), do NOT allow direct client connections to `/ws/room/:conversationId`. Instead, **multiplex all client WebSockets through the user's single `UserHub` connection**. `UserHub` subscribes to room signals internally, so evicting `UserHub` terminates 100% of the user's real-time traffic in a single operation.

---

### 2.7 Signed URLs and Media Deletion (Backblaze B2 Versions)

* **Attack Idea — Stale File Versions Lingering After "Delete for Everyone":** In B2, calling `DeleteObject` without a version ID places a "Delete Marker" over the file, leaving the underlying version intact and downloadable by anyone who possesses or guesses the version ID.
  * **Design Defense:** `Architecture.md` §12 specifies deleting with `provider_version_id` and setting a bucket lifecycle rule to keep only the last version.
  * **Gap:** When a browser uploads directly to B2 via presigned PUT, B2 returns `x-amz-version-id` in the response header to the client browser. If the client fails to report or tampers with `provider_version_id` during `POST /api/media/uploads/:id/complete`, the Worker cannot guarantee permanent deletion.
  * **Severity:** **Medium**
  * **Concrete Fix:** In `POST /api/media/uploads/:id/complete`, the Worker must issue an authoritative S3 `HEAD` request to B2 to read `x-amz-version-id` directly from Backblaze, storing that server-verified version ID in `message_attachments.provider_version_id`. Never trust client-submitted version metadata.

---

### 2.8 Account Deletion Across Firebase, D1, and B2

* **Attack Idea — Incomplete Distributed Deletion Leading to Account Resurfacing:** A user triggers account deletion. The 14-day grace period passes. The deletion job cleans up D1 profile rows, but network failure aborts B2 media deletion, or the optional Firebase Admin API call fails. The user signs in again with Google.
  * **Design Defense:** `Architecture.md` §7.6 tombstones the profile and releases the username after 30 days.
  * **Gap:** If the Firebase user is not deleted, Firebase allows authentication. If the D1 profile row is deleted rather than tombstoned, the user would appear as a brand-new user and could re-register with the same email.
  * **Severity:** **Medium**
  * **Concrete Fix:**
    1. Profiles must NEVER be deleted from D1; they must remain permanently as tombstones (`deleted_at IS NOT NULL`, `display_name = 'Deleted member'`).
    2. `POST /api/session` must check `SELECT deleted_at FROM profiles WHERE user_id = ?` and permanently reject session creation if `deleted_at IS NOT NULL`.
    3. The background deletion job must record execution states (`d1_cleared`, `b2_purged`, `firebase_purged`) to ensure retries complete orphan media purging.

---

### 2.9 Operator Export and What the Operator/Providers Can Read

* **Attack Idea — Silent In-App Surveillance by Platform Operator:** An owner triggers an operator export to harvest private communications across all community members without leaving evidence.
  * **Design Defense:** `EXPORT_SPECIFICATION.md` §5 enforces re-auth (≤ 5 min), typed phrase confirmation, mandatory client-side AES-256-GCM encryption, and an append-only `audit_logs` record.
  * **Honest Threat Model Reality:** As documented in `Architecture.md` §15.6, the owner has root access to Cloudflare and Wrangler CLI (`wrangler d1 export`), which cannot be prevented by application code.
  * **Concrete Fix:** Ensure the onboarding consent screen and privacy policy prominently display the disclosure mandated in `PRD.md` §10: *"Mirach is private, but NOT end-to-end encrypted. The community operator and infrastructure providers have technical access to cloud databases."*

---

### 2.10 Rate Limiting and Abuse Vectors

* **Attack Idea — Distributed Session Flood Bypassing IP Throttling:** An attacker rotates through public mobile/VPN IP addresses to generate sessions or hit search endpoints.
  * **Design Defense:** `Architecture.md` §15.3 specifies IP rate limits (10 sessions/hr/IP) and user rate limits.
  * **Gap:** The availability of Cloudflare's native rate-limiting binding on the Workers Free plan is UNVERIFIED (`SOURCE_REGISTER.md` §6 item 6).
  * **Severity:** **High**
  * **Concrete Fix:** Define an architectural fallback in Phase 2: if Cloudflare's native rate-limiting binding is unavailable on Free, route rate-limit counters through a dedicated singleton Durable Object (`RateLimiterDO`) with in-memory sliding-window counters, rather than writing to D1.

---

### 2.11 Quota Exhaustion Used as Denial-of-Service (DoS)

* **Attack Idea — Exhausting Daily D1 Write Quota (100,000 Rows):** Three malicious members script continuous message sending (at the allowable 30 msgs/min rate) and reaction toggling. 3 members × 30 msgs/min × 6 writes/msg × 60 min × 24 hr = 777,600 writes/day, exceeding the 100,000 account-wide D1 write limit within ~3 hours and taking down the platform for all members.
  * **Design Defense:** Per-minute throttling exists (30 msgs/min).
  * **Gap:** There is NO daily per-user message or write cap!
  * **Severity:** **High**
  * **Concrete Fix:** Implement a strict daily message and interaction quota per member:
    - Maximum 500 messages per user per 24-hour window.
    - Maximum 1,000 cursor/receipt updates per user per 24-hour window.
    Exceeding the daily budget returns HTTP 429 ("Daily message limit reached").

---

## 3. Top 10 High-Value Negative Security Tests

The following 10 negative tests represent the most critical verification gates across the delivery roadmap:

| Test ID | Owning Phase | Actor & Target Endpoint | Test Scenario & Attack Payload | Expected Result |
|---|:-:|---|---|---|
| **SEC-NEG-01** | **Phase 3** | Attacker with token from untrusted Firebase project $\rightarrow$ `POST /api/session` | Submit valid RS256 Firebase ID token generated from an attacker-controlled Firebase project (`aud != env.FIREBASE_PROJECT_ID`). | **401 Unauthorized**; no session cookie created; audit log entry. |
| **SEC-NEG-02** | **Phase 3** | Password user with unverified email $\rightarrow$ `POST /api/session` | Submit Firebase token where `firebase.sign_in_provider == 'password'` and `email_verified == false`. | **401 Unauthorized**; generic error returned. |
| **SEC-NEG-03** | **Phase 3** | 20 concurrent authenticated users $\rightarrow$ `POST /api/invitations/redeem` | Execute 20 simultaneous redemption requests with the same invitation code configured with `max_uses = 1`. | **Exactly 1 HTTP 200/201**; 19 HTTP 400/409; redemptions table contains exactly 1 row. |
| **SEC-NEG-04** | **Phase 3** | Non-owner member $\rightarrow$ `PATCH /api/admin/members/:id/role` | Member attempts to update their own role or promote another user to `owner` or `admin`. | **403 Forbidden**; role unchanged in D1; security event logged. |
| **SEC-NEG-05** | **Phase 3** | Owner $\rightarrow$ `PATCH /api/admin/members/:owner_id/role` | Last remaining active owner attempts to demote themselves or be demoted by another process. | **409 Conflict** / **403 Forbidden**; operation refused; last owner protected. |
| **SEC-NEG-06** | **Phase 5** | Malicious origin $\rightarrow$ `GET /ws/hub` (WebSocket Upgrade) | Authenticated user script initiates WebSocket handshake with `Origin: https://malicious-site.com`. | **403 Forbidden**; WebSocket connection terminated immediately. |
| **SEC-NEG-07** | **Phase 5** | Active non-participant $\rightarrow$ `GET /api/conversations/:id/messages` | Active member calls API to retrieve messages from a private 1:1 conversation or group they are not a member of. | **403 Forbidden** or **404 Not Found**; zero messages returned. |
| **SEC-NEG-08** | **Phase 5** | Re-added group member $\rightarrow$ `GET /api/conversations/:id/messages?before=:old_seq` | User left group at seq 50, re-added at seq 100; attempts to query messages in the seq 51–99 window. | **Empty array**; historical messages created during absence remain inaccessible. |
| **SEC-NEG-09** | **Phase 6** | Unauthorized member $\rightarrow$ `POST /api/media/sign` | Member requests signed download URL for an attachment UUID belonging to a conversation they cannot access. | **403 Forbidden**; no signed B2 URL minted. |
| **SEC-NEG-10** | **Phase 11** | Non-owner member $\rightarrow$ `POST /api/exports` with `type=operator` | Administrator or standard member attempts to initiate an `operator` full database export. | **403 Forbidden**; operation denied; security audit logged. |

---

## 4. Master Security Findings Table

| ID | Severity | Area / Section | Finding / Vulnerability Description | Recommended Architectural Fix |
|---|:-:|---|---|---|
| **SEC-01** | **High** | Realtime / `Arch §10.4` | WebSocket upgrade does not explicitly specify closing connection on missing or non-matching `Origin` header (CSWSH risk). | Enforce strict Origin equality check (`Origin === https://${ALLOWED_ORIGIN}`) and reject missing Origin with 403. |
| **SEC-02** | **High** | Invitations / `Arch §8.3` | Multi-statement batch subquery `COUNT(*) < max_uses` is susceptible to concurrency race conditions in D1 SQLite. | Implement an authoritative `BEFORE INSERT` SQLite trigger on `invitation_redemptions` to abort concurrent over-redemption. |
| **SEC-03** | **High** | Quota DoS / `Arch §15.3` | Lack of a daily per-user message/write limit allows 3 colluding users to exhaust the 100k daily D1 writes budget. | Add a daily per-user cap (e.g. max 500 messages/user/day) in the rate-limiting policy. |
| **SEC-04** | **High** | Media Access / `Arch §8.2, §12` | IDOR vulnerability if `message_attachments` is queried by ID alone without joining conversation membership. | Enforce that all attachment queries join `conversation_members` with `left_at IS NULL` and active sequence bounds. |
| **SEC-05** | **High** | Realtime / `Arch §5.4, §10.2` | Sockets in `ConversationRoom` instances may survive user suspension if only `UserHub.evict()` is called. | Multiplex room WebSockets through `UserHub`, or emit eviction signals to all active rooms upon member suspension. |
| **SEC-06** | **Medium** | Media Deletion / `Arch §12` | B2 versioned delete relies on client reporting `provider_version_id`, which could be spoofed or omitted. | Worker must execute a server-side `HEAD` request to B2 during upload completion to record verified `x-amz-version-id`. |
| **SEC-07** | **Medium** | AuthN / `Arch §5.3` | Replay of intercepted Firebase ID tokens within their 1-hour window could permit duplicate session creation. | Require `POST /api/session` to enforce that token `auth_time` is within ≤ 60 seconds of session creation. |
| **SEC-08** | **Medium** | Roles / `Arch §6` | Concurrent mutual demotion of two owners could result in zero owners remaining via check-then-act race. | Embed atomic `(SELECT COUNT(*) WHERE role = 'owner') > 1` predicate inside the demotion `UPDATE` statement. |
| **SEC-09** | **Medium** | Deletion / `Arch §7.6` | If Firebase account removal fails, an un-tombstoned user could authenticate again with the same credentials. | Enforce permanent D1 tombstone rows that permanently reject session creation for deleted UIDs. |
| **SEC-10** | **Low** | Rate Limiting / `Arch §15.3` | Native Workers rate-limiting binding is UNVERIFIED on Free plan; missing concrete architectural fallback. | Specify `RateLimiterDO` (Durable Object sliding window) as the explicit fallback if Cloudflare binding requires paid plan. |
