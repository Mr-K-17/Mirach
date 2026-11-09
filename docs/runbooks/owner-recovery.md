# Runbook: Owner Break-Glass Recovery

> **Status:** Operational Runbook Stub (Phase 0)  
> **Authority:** `Rules.md` §11, `Architecture.md` §6, `PRD.md` FR-MEM-07.  
> **Security Requirement:** Emergency use only; writes an append-only row to `audit_logs`.

---

## 1. Purpose

This runbook documents the break-glass procedure for restoring owner administrative access to Mirach in the event that the primary owner loses credentials, account access, or 2FA tokens.

---

## 2. Prerequisites

1. Cloudflare account access with permissions to run Wrangler CLI commands against production D1 databases.
2. A newly verified Firebase account (Google or email/password) representing the restored owner, yielding a new Firebase UID (`RestoredOwnerUID`).
3. Local development environment with authenticated Wrangler CLI.

---

## 3. Recovery Procedure

### Step 1: Verify Current Ownership State
Execute a query using Wrangler against `mirach-core`:
```bash
npx wrangler d1 execute mirach-core --remote --command="SELECT user_id, status, role, joined_at FROM memberships WHERE role = 'owner';"
```

### Step 2: Insert or Promote the Restored Owner
Promote the restored owner UID while preserving audit traceability:
```bash
npx wrangler d1 execute mirach-core --remote --command="
INSERT INTO memberships (user_id, status, role, joined_at, reviewed_by, reviewed_at, reason_code)
VALUES ('<RestoredOwnerUID>', 'active', 'owner', unixepoch() * 1000, 'system_break_glass', unixepoch() * 1000, 'OWNER_RECOVERY')
ON CONFLICT(user_id) DO UPDATE SET role = 'owner', status = 'active';
"
```

### Step 3: Record Append-Only Audit Entry
Insert the mandatory audit log row:
```bash
npx wrangler d1 execute mirach-core --remote --command="
INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, metadata, created_at)
VALUES ('system_break_glass', 'OWNER_BREAK_GLASS_RECOVERY', 'membership', '<RestoredOwnerUID>', '{\"reason\":\"Manual emergency owner recovery via Wrangler CLI\"}', unixepoch() * 1000);
"
```

### Step 4: Revoke Lost Owner Sessions
If the previous owner account was compromised, revoke all active sessions:
```bash
npx wrangler d1 execute mirach-core --remote --command="
UPDATE sessions SET revoked_at = unixepoch() * 1000 WHERE user_id = '<PreviousOwnerUID>';
UPDATE memberships SET status = 'suspended' WHERE user_id = '<PreviousOwnerUID>';
"
```

---

## 4. Verification Checklist

- [ ] Restored owner can sign in and access `/admin/overview`.
- [ ] Emergency audit row appears in `audit_logs` table.
- [ ] At least one active owner exists in `memberships`.
- [ ] All team administrators are notified of break-glass invocation.
