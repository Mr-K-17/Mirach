# Runbook: Security Incident and Breach Response

> **Status:** Operational Runbook Stub (Phase 0)  
> **Authority:** `Rules.md` §7, §19, `Architecture.md` §15, §16, DPDP compliance guidelines.  
> **Target:** Private adult community; rapid containment and transparent member notification.

---

## 1. Incident Classification

| Severity | Definition | Examples |
|---|---|---|
| **Critical** | Confirmed unauthorized data exfiltration, database dump exposure, or full account takeover. | Worker secret leaked, D1 database exported without authorization, SQL injection discovered. |
| **High** | Session hijacking, isolated unauthorized access to a private conversation, broken authorization check. | IDOR on message attachments, CSWSH bypass, session fixation. |
| **Medium** | Service disruption, persistent quota exhaustion, abnormal registration activity. | Spam invitation redemptions, rate-limiting evasion. |
| **Low** | Non-sensitive information disclosure, misconfigured cosmetic headers. | Verbose client error messages, missing non-security header. |

---

## 2. Immediate Containment Actions

1. **Global Session Revocation (Immediate Killswitch):**
   ```bash
   npx wrangler d1 execute mirach-core --remote --command="UPDATE sessions SET revoked_at = unixepoch() * 1000 WHERE revoked_at IS NULL;"
   ```
2. **Close All Realtime Sockets:**
   Redeploy the Worker or invoke `UserHub.evictAll()` to disconnect all active WebSocket connections.
3. **Emergency Maintenance Mode:**
   Toggle `community_settings.registration_open = 0` and route Worker middleware to return 503 Maintenance banner.

---

## 3. Investigation and Remediation

1. **Audit Log Inspection:**
   Query append-only `audit_logs` for privileged actions taken during the incident window:
   ```bash
   npx wrangler d1 execute mirach-core --remote --command="SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;"
   ```
2. **Review Cloudflare Analytics & Worker Logs:**
   Examine request volume, 4xx/5xx spikes, IP addresses, and error classifications.
3. **Patch Vulnerability & Run Regression:**
   Develop test reproducing the vulnerability, implement patch in `src/worker/`, and verify all negative tests green.

---

## 4. Notification & Legal Obligations (DPDP)

1. **Member Notification:**
   If personal data or message content was accessed, notify affected members via in-app banner or verified email within the statutory reporting window.
2. **Disclosure Content:**
   State plain facts: what occurred, what categories of data were impacted, containment steps executed, and guidance for members.
