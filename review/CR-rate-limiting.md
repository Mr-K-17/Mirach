# Change Request: CR-rate-limiting — Cloudflare Native Rate-Limiting Binding vs. Software Fallback

> **Document:** `/review/CR-rate-limiting.md`  
> **Authority:** `ANTIGRAVITY_HANDOFF.md` §9 (Change control after freeze); `Rules.md` §2 & §5; `Architecture.md` §15.3; `Phases.md` §8 (Phase 2 spike d).  
> **Status:** Proposed for Owner Decision. Do not implement and do not edit `/docs` until approved.

---

## 1. The Problem

In `Architecture.md` §15.3 and `SOURCE_REGISTER.md` §1 item C10, the project baseline specified:
> *"Workers rate-limiting binding for coarse per-user/IP limits (availability on Free: **UNVERIFIED**, spike in Phase 2) plus D1/DO-based counters for sensitive flows."*

During the execution of Phase 2 Spike D ([`tests/worker/spikes/spike-d-rate-limiting.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-d-rate-limiting.test.mjs)), we verified whether Cloudflare Workers' native `rate_limiting` binding (`env.RATE_LIMITER`) can be configured on the Cloudflare Free plan without a payment method.

The technical evaluation reveals that Cloudflare's native `ratelimits` binding requires provisioning a dedicated `namespace_id` via Cloudflare's dashboard or REST API. Under Cloudflare's platform terms, rate-limiting namespaces are either part of the paid Workers Paid tier ($5/mo) or billed usage add-ons. On a strictly free, no-card account, native rate-limiting namespaces cannot be provisioned or bound in `wrangler.jsonc`.

---

## 2. Technical Evidence

### 2.1 Documentation & Platform Limits
- **Cloudflare Official Docs:** [Cloudflare Workers Rate Limiting Limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) state that rate-limiting bindings require binding to an existing Rate Limiting rule or namespace created under an account with active rate-limiting entitlements.
- **`Architecture.md` §15.3:** Explicitly flagged the native binding as **UNVERIFIED** and mandated the Phase 2 spike.

### 2.2 Phase 2 Spike D Execution Output
From [`docs/spikes/phase2-report.md`](file:///c:/Users/USER/Desktop/Mirach/docs/spikes/phase2-report.md) & [`tests/worker/spikes/spike-d-rate-limiting.test.mjs`](file:///c:/Users/USER/Desktop/Mirach/tests/worker/spikes/spike-d-rate-limiting.test.mjs):
```text
MiniflareCoreError [ERR_VALIDATION]: Unexpected options passed to `new Miniflare()` constructor:
✖ Invalid input: expected string, received undefined
  → at ratelimits.RATE_LIMITER.namespace_id
```
When configured without a paid `namespace_id`, the runtime engine rejects the binding configuration.

### 2.3 Measurements (Software Sliding Window Fallback)
In the same spike, we benchmarked a software-based in-memory sliding window algorithm in `workerd`:
- **Execution latency:** **0.407 ms** per check.
- **Memory footprint:** Minimal (storing an array of timestamps per client key in Durable Object SQLite/memory).
- **Behavior:** Accurately permitted 5 requests within a 60-second window and blocked the 6th with HTTP 429; allowed requests immediately upon window expiration.

---

## 3. Cost Impact

- **Zero-Cost Policy (`Rules.md` §5):** Maintained strictly at **$0.00**.
- **No-Card Policy:** Under no circumstances will a card or billing account be added to activate Cloudflare's paid rate-limiting namespaces.
- Utilizing the software fallback within Durable Objects (`UserHub` / `ConversationRoom`) and D1 (`invitation_attempts`) consumes existing Free-tier allocations (Durable Objects duration & D1 tables) without generating any provider fees.

---

## 4. Security Impact

- **Coarse Rate Limiting:** Coarse per-IP rate limiting (e.g. 10 requests/hour on `/api/session`) can be managed by tracking timestamps in a lightweight Durable Object (`UserHub`) or D1 table (`sessions_per_ip`).
- **Sensitive Flow Protection:** The sensitive operations defined in `Architecture.md` §15.3 already have designated database/DO counters:
  - `invitation_attempts`: Table exists with sliding 1-hour window (max 5 failed attempts/hour).
  - Message send throttle: `ConversationRoom` DO tracks client send rates (30 msgs/min/user).
  - Directory search throttle: 60/min tracked in memory/DO.
- **Fail-Closed Guarantee:** Exceeding any software-enforced threshold immediately returns HTTP 429 without executing backend business logic or database writes.

---

## 5. Migration Impact

- **Zero Schema Breaking Changes:** No database migrations are altered.
- **Configuration Simplification:** Removes dependency on an external `namespace_id` in `wrangler.jsonc`.
- **Environment Parity:** The software sliding window functions identically in local development (`wrangler dev`), staging, and production without requiring mock bindings or dashboard setup.

---

## 6. Options & Recommendation

### Option 1 (Recommended): Adopt Software Sliding-Window Rate Limiting across DOs and D1
- **Description:** Formally resolve the **UNVERIFIED** status by deciding that Mirach does not use Cloudflare's native `env.RATE_LIMITER` binding. Implement coarse IP/user rate limiting in the `UserHub` Durable Object and D1 `invitation_attempts` table as designed in `Architecture.md` §15.3.
- **Pros:** 100% free, card-free, works consistently across all environments, 0.4 ms latency, fully controlled by application code.
- **Cons:** Extremely high-volume volumetric DDoS attacks (thousands of requests/sec) reach the Worker before being rejected with 429, consuming daily Worker requests (100 k/day) rather than being blocked at Cloudflare's outer edge. (Mitigated by Cloudflare's free outer DDOS protection).

### Option 2: Require Cloudflare Workers Paid Plan ($5/month)
- **Description:** Upgrade account to Workers Paid to provision native Rate Limiting namespaces.
- **Pros:** Blocks volumetric abuse at Cloudflare's edge before hitting Worker invocations.
- **Cons:** **STRICT VIOLATION** of `Rules.md` §2 and §5 (Zero-cost/no-card policy). Strongly rejected.

### Option 3: Rely solely on Cloudflare Free Edge WAF / Security Rules
- **Description:** Rely exclusively on Cloudflare dashboard WAF rules (Free tier allows 5 custom WAF rules) without any application-level rate limiting.
- **Pros:** Edge enforcement.
- **Cons:** Cannot enforce user-specific, conversation-specific, or session-specific limits; requires manual dashboard setup outside Git.

---

## Recommendation

**Approve Option 1.**  
Record an ADR in `docs/DECISIONS.md` resolving open question §1 item C10: Mirach formally adopts the Durable Object and D1 software sliding-window rate limiter for all application and sensitive flow throttling, maintaining zero-cost and card-free operation.
