import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpikeHarness, executeSql } from "./spikes/spike-helpers.mjs";
import {
  hashSessionToken,
  createSession,
  findSessionByHash,
  touchSession,
  revokeSession,
  revokeAllUserSessions,
  enforceMaxSessionsPerUser,
  pruneExpiredSessions
} from "../../src/worker/data/sessions.ts";
import {
  insertAuditLog,
  listAuditLogs
} from "../../src/worker/data/audit.ts";
import {
  getCommunitySettings,
  updateCommunitySettings
} from "../../src/worker/data/settings.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

describe("Task 3: Feature 1 — Data Access Layer Tests", () => {
  let mf;
  let db;
  const pepper = "test-session-pepper-mirach-secret";

  test("setup test harness and apply migrations", async () => {
    mf = await createSpikeHarness(["DB_CORE"]);
    db = await mf.getD1Database("DB_CORE");

    const coreSql = await fs.readFile(
      path.join(rootDir, "migrations/core/core_0001_initial_core.sql"),
      "utf-8"
    );
    await executeSql(db, coreSql);
  });

  test("HMAC-SHA256 session token hashing", async () => {
    const rawToken = "sample-secure-random-token-256";
    const hash1 = await hashSessionToken(rawToken, pepper);
    const hash2 = await hashSessionToken(rawToken, pepper);
    const differentHash = await hashSessionToken("different-token", pepper);

    assert.strictEqual(hash1, hash2, "Hashing same token with same pepper yields same hash");
    assert.notStrictEqual(hash1, differentHash, "Different token yields different hash");
    assert.strictEqual(hash1.length, 64, "SHA-256 hex is 64 characters");
  });

  test("Session lifecycle: create, find, touch, revoke", async () => {
    const now = Date.now();
    const rawToken = "user-1-token";
    const tokenHash = await hashSessionToken(rawToken, pepper);
    const sessionId = "sess_001";

    // 1. Create session
    await createSession(db, {
      id: sessionId,
      userId: "user_alice",
      tokenHash,
      createdAt: now,
      expiresAt: now + 86400000,
      userAgentSummary: "Desktop / Chrome"
    });

    // 2. Find active session
    const session = await findSessionByHash(db, tokenHash, now);
    assert.ok(session, "Session found");
    assert.strictEqual(session.user_id, "user_alice");
    assert.strictEqual(session.revoked_at, null);

    // 3. Touch session (under 1 hour cooldown -> changes = 0, write budget protected)
    const touchedImmediately = await touchSession(db, sessionId, now + 1000);
    assert.strictEqual(touchedImmediately, false, "Throttled: write skipped under 1 hour");

    // 4. Touch session (after 1 hour -> updated)
    const touchedAfterHour = await touchSession(db, sessionId, now + 3600000 + 1000);
    assert.strictEqual(touchedAfterHour, true, "Updated after 1 hour");

    // 5. Revoke session
    await revokeSession(db, sessionId, now + 5000);
    const revokedSession = await findSessionByHash(db, tokenHash, now + 5000);
    assert.strictEqual(revokedSession, null, "Revoked session cannot be found");
  });

  test("Session enforcement: max active sessions", async () => {
    const now = Date.now();
    const userId = "user_bob";

    for (let i = 1; i <= 5; i++) {
      const hash = await hashSessionToken(`bob_token_${i}`, pepper);
      await createSession(db, {
        id: `bob_sess_${i}`,
        userId,
        tokenHash: hash,
        createdAt: now + i * 100,
        expiresAt: now + 86400000
      });
    }

    // Limit to 3 sessions
    await enforceMaxSessionsPerUser(db, userId, 3, now);

    const active = await db
      .prepare("SELECT id FROM sessions WHERE user_id = ?1 AND revoked_at IS NULL")
      .bind(userId)
      .all();

    assert.strictEqual(active.results.length, 3, "Only 3 newest sessions remain active");
  });

  test("Session retention: prune sessions older than 30 days after expiry", async () => {
    const now = Date.now();
    const oldExpiredTime = now - 35 * 86400000;

    await createSession(db, {
      id: "sess_ancient",
      userId: "user_old",
      tokenHash: await hashSessionToken("ancient_token", pepper),
      createdAt: oldExpiredTime - 1000,
      expiresAt: oldExpiredTime
    });

    const pruned = await pruneExpiredSessions(db, now);
    assert.ok(pruned >= 1, "Ancient session pruned");
  });

  test("Audit logs: append-only and listing", async () => {
    const now = Date.now();
    await insertAuditLog(db, {
      actorId: "admin_1",
      action: "user.suspend",
      subjectType: "user",
      subjectId: "user_bad_actor",
      metadata: { reason: "spam" },
      createdAt: now
    });

    const logs = await listAuditLogs(db, 10);
    assert.ok(logs.length >= 1);
    assert.strictEqual(logs[0].actor_id, "admin_1");
    assert.strictEqual(logs[0].action, "user.suspend");
    assert.strictEqual(JSON.parse(logs[0].metadata).reason, "spam");
  });

  test("Community settings: singleton retrieval and patch update", async () => {
    const settings = await getCommunitySettings(db);
    assert.strictEqual(settings.id, 1);
    assert.strictEqual(settings.registration_open, 1);
    assert.strictEqual(settings.max_group_size, 25);

    await updateCommunitySettings(db, {
      registration_open: 0,
      max_group_size: 20
    });

    const updated = await getCommunitySettings(db);
    assert.strictEqual(updated.registration_open, 0);
    assert.strictEqual(updated.max_group_size, 20);
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
