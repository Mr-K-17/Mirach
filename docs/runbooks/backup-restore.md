# Runbook: Backup, Time Travel, and Restore Drills

> **Status:** Operational Runbook Stub (Phase 0)  
> **Authority:** `Rules.md` §17/§20, `Architecture.md` §18, `EXPORT_SPECIFICATION.md` §11, Gate B requirement.  
> **Cadence:** Quarterly and mandatory prior to Gate B (Trusted-Group Release).

---

## 1. Purpose

This runbook defines the procedures for cloud-native disaster recovery using Cloudflare D1 Time Travel and manual owner SQL backups via the Wrangler CLI.

---

## 2. Cloudflare D1 Time Travel (Point-in-Time Restore)

D1 Time Travel provides 7-day point-in-time recovery on the Free tier.

### Step 1: Identify Bookmark / Timestamp
Retrieve recent bookmarks:
```bash
npx wrangler d1 time-travel info <database-name> --remote
```

### Step 2: Restore to Timestamp (Overwrites In-Place)
Restore database to a specific bookmark:
```bash
npx wrangler d1 time-travel restore <database-name> --remote --bookmark=<bookmark-id>
```

---

## 3. Manual SQL Export and Import Drill

### Step 1: Export Database (Owner Initiated Only)
Run only during off-peak hours on the owner's personal device:
```bash
npx wrangler d1 export mirach-core --remote --output=mirach-core-backup.sql
npx wrangler d1 export mirach-chat --remote --output=mirach-chat-backup.sql
```

### Step 2: Import into a Scratch Database (Verification Drill)
Verify dump integrity by importing into a temporary test database:
```bash
npx wrangler d1 create mirach-drill-scratch
npx wrangler d1 execute mirach-drill-scratch --file=mirach-core-backup.sql
```
Verify row counts against production:
```bash
npx wrangler d1 execute mirach-drill-scratch --command="SELECT count(*) FROM profiles;"
```

### Step 3: Cleanup Scratch Database
```bash
npx wrangler d1 delete mirach-drill-scratch
```

---

## 4. Verification & Audit Checklist

- [ ] Restore drill completed and counts match production baseline.
- [ ] Backup SQL files stored on an encrypted drive and scheduled for 90-day deletion (`EXPORT_SPECIFICATION.md` §8).
- [ ] No backup SQL files committed to version control.
