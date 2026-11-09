# Runbook: Secret and Credential Rotation

> **Status:** Operational Runbook Stub (Phase 0)  
> **Authority:** `Rules.md` §7, `Architecture.md` §15.4, §17.5.  
> **Security Requirement:** Secrets must NEVER be committed to Git, pasted into prompts, or logged.

---

## 1. Scope of Secrets

The following Worker secrets are managed exclusively by the owner via `wrangler secret put`:

1. `SESSION_PEPPER`: Secret salt used for HMAC hashing of session cookies.
2. `B2_KEY_ID`: Backblaze B2 application key ID.
3. `B2_APP_KEY`: Backblaze B2 application key secret.
4. `VAPID_PRIVATE_KEY`: Web Push VAPID private key.
5. `LIVEKIT_API_KEY`: LiveKit Cloud API key.
6. `LIVEKIT_API_SECRET`: LiveKit Cloud API secret.
7. `FIREBASE_SERVICE_ACCOUNT_JSON` (Optional): Firebase admin credentials.

---

## 2. Rotation Procedures

### Rotating `SESSION_PEPPER` (Invalidates All Active Sessions)
1. Generate a new high-entropy 256-bit random pepper locally:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```
2. Upload the new secret:
   ```bash
   npx wrangler secret put SESSION_PEPPER --env <env>
   ```
3. Invalidate existing sessions in D1:
   ```bash
   npx wrangler d1 execute mirach-core --remote --command="UPDATE sessions SET revoked_at = unixepoch() * 1000 WHERE revoked_at IS NULL;"
   ```

### Rotating Backblaze B2 Application Keys
1. In the Backblaze B2 console, generate a new bucket-scoped application key.
2. Update Worker secrets:
   ```bash
   npx wrangler secret put B2_KEY_ID --env <env>
   npx wrangler secret put B2_APP_KEY --env <env>
   ```
3. Test an upload and download cycle on staging.
4. Delete the old application key from the Backblaze B2 console.

---

## 3. Suspected Secret Exposure Protocol

If any secret appears in code, Git history, logs, or chat:
1. **Immediate Revocation:** Rotate and revoke the compromised credential at the provider immediately.
2. **Examine Logs:** Check access logs at Cloudflare/B2/Firebase for unauthorized access during the exposure window.
3. **Notify Owner:** File an incident report following `incident-and-breach.md`.
4. **Note:** Deleting or rewriting the Git commit does NOT substitute for credential revocation.
