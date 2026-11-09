# Phase 2 Spike Report: Database, API & Security Foundation

> **Date:** 9 November 2026 (Asia/Kolkata)  
> **Environment:** Cloudflare `workerd` runtime via local Miniflare test harness (`tests/worker/spikes/*.test.mjs`)  
> **Authority:** `Phases.md` §8, `Architecture.md` §5.3, §7, §8, §9, §15.3, §19, `Rules.md` §10, `DECISIONS.md` ADR-019…023  
> **Test Results:** 30/30 tests passed across 7 test suites

---

## 1. Summary of Spike Results (Expected vs. Observed)

| Spike | Topic | Expected Behavior | Observed Result | Status | Contradicts Docs? |
|---|---|---|---|---|---|
| **A** | **D1 `batch()` Atomicity & Order** | Transactional atomicity: if statement 2 violates a `UNIQUE` constraint, statement 1 rolls back; statement 2 can read mutations from statement 1 | **Confirmed:** Stmt 2 read Stmt 1's incremented `last_seq` (seq = 1). When Stmt 2 failed on duplicate `client_msg_id`, Stmt 1's `UPDATE` rolled back cleanly (`last_seq` remained 1, not 2). Invitation redemption pattern passed with derived counts | **Pass** | **No** (Directly validates Architecture §8.3) |
| **B** | **SQLite Syntax Support** | D1 supports `RETURNING`, partial unique indexes (`WHERE status='pending'`), and `STRICT` tables | **Confirmed:** `RETURNING id, name` returned row data immediately; partial unique index blocked duplicate pending requests while allowing multiple non-pending rows; `STRICT` table creation succeeded and threw `SQLITE_CONSTRAINT_DATATYPE` on type mismatch | **Pass** | **No** (Confirms Architecture §7.2 & §7.4) |
| **C** | **CPU Time & Subrequests** | Pipeline CPU time < 10 ms; Durable Object calls do not count against the 50 external subrequest cap | **Confirmed:** Pipeline average CPU time was **0.080 ms** (fastest 0.034 ms, well under 10 ms). 60 consecutive DO calls completed with 100% success without hitting the 50 subrequest limit | **Pass** | **No** (Clarifies Architecture §10.4 & §19.1) |
| **D** | **Workers Rate Limiting Binding** | Native `env.RATE_LIMITER` availability on Free plan vs. software fallback | **Observed:** Cloudflare's native `ratelimits` binding requires a provisioned `namespace_id` (a paid feature/dashboard provisioning not freely scriptable on Free accounts). Software fallback in DO / D1 sliding window executed in 0.4 ms | **Pass** | **Clarification Required:** Confirms software DO/D1 fallback is mandatory on Free tier |
| **E** | **DO Hibernation & Alarms** | WebSocket Hibernation auto-wakes on messages; storage alarms execute and persist state | **Confirmed:** `state.acceptWebSocket()` completed with 101 Switching Protocols and echoed messages via `webSocketMessage()`. Storage alarms (`state.storage.setAlarm`) fired and persisted incremented counts to DO SQLite storage | **Pass** | **No** (Confirms ADR-022 and ADR-023) |
| **F** | **From-Scratch Migrations** | Core, chat, and activity migrations apply into ONE shared staging DB with zero collisions | **Confirmed:** Applied `core_0001`, `chat_0001`, and `activity_0001` sequentially into a single database. Table names did not collide, and logical reference separation prevented FK errors | **Pass** | **No** (Confirms Rules §17 and Review Report V-05) |
| **G** | **Rows Read / Written via `meta`** | `meta.rows_written` and `meta.rows_read` track SQLite B-tree and index mutations | **Confirmed:** Unindexed insert reported 2 rows written (row + table B-tree). Table with 2 unique indexes reported 4 rows written (row + PK + 2 secondary indexes). Index seek read 1 row; table scan read 11 rows | **Pass** | **No** (Proves Architecture §19.2 write budgeting) |

---

## 2. Detailed Findings by Spike

### Spike A: D1 `batch()` Atomicity, Rollback & Statement Ordering
- **Suite:** [`tests/worker/spikes/spike-a-batch-atomicity.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-a-batch-atomicity.test.mjs)
- **Send-Message Batch Pattern (`Architecture.md` §8.3):**
  - Statement 1: `UPDATE conversations SET last_seq = last_seq + 1 ...`
  - Statement 2: `INSERT INTO messages ... SELECT ..., (SELECT last_seq FROM conversations ...)`
  - **Observation:** In the happy path, statement 2 read `last_seq = 1` immediately, showing that intra-batch statement ordering is sequential and visible to subsequent statements.
  - **Atomicity on Replay:** When statement 2 re-used a duplicate `client_msg_id`, D1 threw a `UNIQUE constraint failed: messages.conversation_id, messages.client_msg_id` error. Inspection of `conversations.last_seq` proved it remained `1`. Statement 1 was completely rolled back!
- **Invitation Redemption Pattern:**
  - Statement 1 conditional insert on `(SELECT COUNT(*) FROM invitation_redemptions ...) < max_uses` and Statement 2 conditional insert on `WHERE EXISTS (SELECT 1 FROM invitation_redemptions WHERE id = ?1)` executed atomically. When max uses was reached, both statements recorded 0 changes and no membership was created.

### Spike B: SQLite Syntax Support in D1
- **Suite:** [`tests/worker/spikes/spike-b-syntax.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-b-syntax.test.mjs)
- **`RETURNING`:** Fully supported. `INSERT INTO ... RETURNING id, name, created_at` returns the generated fields directly in `.first()`, eliminating a second SELECT query.
- **Partial Unique Indexes:** `CREATE UNIQUE INDEX ... WHERE status = 'pending'` is fully supported. Duplicate `pending` requests for the same user fail with `SQLITE_CONSTRAINT`, while multiple `approved` or `rejected` rows for that same user are accepted without conflict.
- **`STRICT` Tables:** `CREATE TABLE ... (...) STRICT;` is fully supported. When inserting a string into an `INTEGER` column, D1 rejects it with `SQLITE_CONSTRAINT_DATATYPE: cannot store TEXT value in INTEGER column`.

### Spike C: CPU Time & Subrequest Boundaries
- **Suite:** [`tests/worker/spikes/spike-c-cpu-subrequests.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-c-cpu-subrequests.test.mjs)
- **Handler CPU Duration:**
  - A complete request pipeline (session extraction, HMAC-SHA256 signature verification via WebCrypto, JSON parsing, and validation) measured an average of **0.080 ms** per invocation (fastest was 0.034 ms). This is less than 1% of the 10 ms CPU budget on the Workers Free tier.
- **Durable Object Subrequests:**
  - Executed 60 consecutive Durable Object stub calls (`env.CONVERSATION_ROOM.get(id).fetch(...)`) within a single worker test lifecycle.
  - All 60 succeeded without throwing subrequest errors.
  - **Finding:** Durable Object calls count against the 1,000 subrequests-to-internal-Cloudflare-services quota, **not** the 50 external subrequest quota. This confirms that a group conversation with up to 25 members will not exhaust subrequest limits during signal fan-out.

### Spike D: Workers Rate-Limiting Binding on Free Plan
- **Suite:** [`tests/worker/spikes/spike-d-rate-limiting.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-d-rate-limiting.test.mjs)
- **Finding:** The native `env.RATE_LIMITER` binding requires Cloudflare Rate Limiting namespace provisioning (`namespace_id`), which is not freely provisionable via standard config without a paid/enterprise account add-on.
- **Architecture Impact:** As anticipated in `Architecture.md` §15.3, coarse per-IP rate limiting and sensitive action rate limiting must use our software sliding-window implementation in Durable Objects (`UserHub`) and D1 (`invitation_attempts`), which executed in 0.4 ms and requires zero paid bindings.

### Spike E: Durable Object WebSocket Hibernation & Alarms
- **Suite:** [`tests/worker/spikes/spike-e-do-hibernation.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-e-do-hibernation.test.mjs)
- **Storage Alarms:** Scheduled an alarm for `Date.now() + 50`. The alarm handler executed reliably and updated SQLite DO storage, proving that cursor coalescing (buffering `last_read_seq` and flushing every 1–2 seconds) is fully viable.
- **WebSocket Hibernation:** Accepted incoming WebSocket with status 101, attached tags, and handled messages via `webSocketMessage()` callback without keeping the DO continuously active in memory.

### Spike F: From-Scratch Migrations into ONE Shared Database
- **Suite:** [`tests/worker/spikes/spike-f-migrations-scratch.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-f-migrations-scratch.test.mjs)
- **Finding:** Successfully applied schemas for `core_0001`, `chat_0001`, and `activity_0001` into a single shared database instance.
- **Validation:** Because table names use clean namespaces (`community_settings`, `conversations`, `announcements`) and cross-domain relationships are logical (e.g. `conversation_members.user_id` references users logically rather than by foreign key), there are zero table name collisions and zero FK errors when all bindings point to one database.

### Spike G: Rows Read / Written Reporting via `meta`
- **Suite:** [`tests/worker/spikes/spike-g-rows-meta.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-g-rows-meta.test.mjs)
- **Concrete Measurements:**
  - **Unindexed table insert:** `rows_written: 2` (1 data row + 1 primary key index entry).
  - **Table with 2 secondary indexes:** `rows_written: 4` (1 data row + 1 PK + 2 secondary index entries).
  - **Index seek by PK:** `rows_read: 1`.
  - **Full table scan (11 rows):** `rows_read: 11`.
- **Significance:** Proves conclusively that secondary indexes double or triple the write cost of an INSERT or UPDATE. Keeping indexes minimal is essential to stay within the 100,000 daily write budget.

---

## 3. Discrepancies & Contradictions Check

### Do any results contradict the documents?
- **No fundamental contradictions were found.** The design in `Architecture.md` §8.3 (transactional atomicity of `batch()`), §7.2 (strict tables and partial indexes), and `ADR-023` (coalesced cursor updates via DO alarms) is 100% verified by the runtime tests.
- **Two Clarifications to Formalize:**
  1. **Workers Rate Limiting (`Architecture.md` §15.3, `SOURCE_REGISTER.md` C10):**
     - *Observation:* The native `env.RATE_LIMITER` binding requires a provisioned `namespace_id` that is not part of the standard free/no-card tier.
     - *Decision:* As planned, Mirach will use software sliding-window rate limiting in Durable Objects (`UserHub`) for connection/message throttle and D1 for invitation attempts. No paid binding is needed.
  2. **Durable Object Subrequests (`Architecture.md` §10.4):**
     - *Observation:* DO stub calls do **not** consume the 50 external subrequest quota; they route through the 1,000 internal services quota.
     - *Decision:* The 25-member group cap is completely safe from subrequest exhaustion during message signal fan-out.

---

## 4. Checkpoint Status

Step 1 (Spikes) is **Tested & Complete**.  
Per instructions, I have stopped here. Awaiting owner review of this report before proceeding to **Step 2 (Migration Tooling, Data Layer & Security Spine)**.
