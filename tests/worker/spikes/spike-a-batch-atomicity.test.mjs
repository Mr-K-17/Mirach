import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness, executeSql } from "./spike-helpers.mjs";

describe("Spike A: D1 batch() Atomicity, Rollback & Statement Ordering", () => {
  let mf;
  let db;

  test("setup test database", async () => {
    mf = await createSpikeHarness(["DB_SPIKE_A"]);
    db = await mf.getD1Database("DB_SPIKE_A");

    await executeSql(db, `
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0,
        last_message_at INTEGER
      );

      CREATE TABLE conversation_members (
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        left_at INTEGER,
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        sender_id TEXT NOT NULL,
        client_msg_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (conversation_id, client_msg_id),
        UNIQUE (conversation_id, seq)
      );

      CREATE TABLE invitation_codes (
        id TEXT PRIMARY KEY,
        code_hash TEXT UNIQUE NOT NULL,
        max_uses INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      );

      CREATE TABLE invitation_redemptions (
        id TEXT PRIMARY KEY,
        invitation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        redeemed_at INTEGER NOT NULL,
        UNIQUE (invitation_id, user_id)
      );

      CREATE TABLE memberships (
        user_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        role TEXT NOT NULL,
        joined_at INTEGER NOT NULL
      );

      CREATE TABLE community_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        require_admin_approval_for_all INTEGER NOT NULL DEFAULT 0
      );

      INSERT INTO community_settings (id, require_admin_approval_for_all) VALUES (1, 0);
    `);
  });

  test("Scenario 1: Statement ordering in batch() — statement 2 reads updated state from statement 1", async () => {
    // Seed conversation and active member
    await db.prepare("INSERT INTO conversations (id, last_seq) VALUES (?1, 0)").bind("conv_1").run();
    await db.prepare("INSERT INTO conversation_members (conversation_id, user_id) VALUES (?1, ?2)").bind("conv_1", "user_alice").run();

    const now = Date.now();

    // Batch send message:
    // Stmt 1: increment last_seq
    // Stmt 2: insert message with seq = (SELECT last_seq FROM conversations WHERE id = ?conv)
    const stmt1 = db.prepare(`
      UPDATE conversations
      SET last_seq = last_seq + 1, last_message_at = ?2
      WHERE id = ?1
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = ?1 AND user_id = ?3 AND left_at IS NULL)
    `).bind("conv_1", now, "user_alice");

    const stmt2 = db.prepare(`
      INSERT INTO messages (id, conversation_id, seq, sender_id, client_msg_id, body, created_at)
      SELECT ?1, ?2, (SELECT last_seq FROM conversations WHERE id = ?2), ?3, ?4, ?5, ?6
      WHERE EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = ?2 AND user_id = ?3 AND left_at IS NULL)
    `).bind("msg_1", "conv_1", "user_alice", "client_uuid_1", "Hello Mirach", now);

    const batchResults = await db.batch([stmt1, stmt2]);

    assert.strictEqual(batchResults.length, 2);
    assert.strictEqual(batchResults[0].meta.changes, 1);
    assert.strictEqual(batchResults[1].meta.changes, 1);

    // Verify seq read in statement 2 is indeed 1 (reflecting statement 1's update)
    const msg = await db.prepare("SELECT seq, body FROM messages WHERE id = ?1").bind("msg_1").first();
    assert.strictEqual(msg.seq, 1);

    const conv = await db.prepare("SELECT last_seq FROM conversations WHERE id = ?1").bind("conv_1").first();
    assert.strictEqual(conv.last_seq, 1);
  });

  test("Scenario 2: Atomicity & Rollback — duplicate client_msg_id must roll back statement 1", async () => {
    const now = Date.now();

    // Replay with identical client_msg_id ("client_uuid_1")
    // Stmt 1 attempts to increment last_seq to 2
    // Stmt 2 attempts to insert duplicate client_msg_id -> UNIQUE constraint violation
    const stmt1 = db.prepare(`
      UPDATE conversations
      SET last_seq = last_seq + 1, last_message_at = ?2
      WHERE id = ?1
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = ?1 AND user_id = ?3 AND left_at IS NULL)
    `).bind("conv_1", now, "user_alice");

    const stmt2 = db.prepare(`
      INSERT INTO messages (id, conversation_id, seq, sender_id, client_msg_id, body, created_at)
      SELECT ?1, ?2, (SELECT last_seq FROM conversations WHERE id = ?2), ?3, ?4, ?5, ?6
      WHERE EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = ?2 AND user_id = ?3 AND left_at IS NULL)
    `).bind("msg_2", "conv_1", "user_alice", "client_uuid_1", "Hello Again", now);

    let batchThrew = false;
    try {
      await db.batch([stmt1, stmt2]);
    } catch (err) {
      batchThrew = true;
      assert.match(err.message, /UNIQUE constraint failed/i);
    }

    assert.strictEqual(batchThrew, true, "D1 batch must throw on UNIQUE constraint failure");

    // CRITICAL ATOMICITY CHECK: Did statement 1 roll back?
    // last_seq must STILL be 1, NOT 2!
    const conv = await db.prepare("SELECT last_seq FROM conversations WHERE id = ?1").bind("conv_1").first();
    assert.strictEqual(conv.last_seq, 1, "last_seq must NOT increment if statement 2 failed (full rollback required)");

    // msg_2 must not exist
    const msg2 = await db.prepare("SELECT * FROM messages WHERE id = ?1").bind("msg_2").first();
    assert.strictEqual(msg2, null);
  });

  test("Scenario 3: Invitation Redemption Batch — statement 2 sees statement 1 row conditionally", async () => {
    const now = Date.now();
    const future = now + 100000;

    // Insert invitation with max_uses = 1
    await db.prepare("INSERT INTO invitation_codes (id, code_hash, max_uses, expires_at) VALUES (?1, ?2, 1, ?3)")
      .bind("inv_1", "hash_secret_code", future).run();

    // Redemption attempt for Bob
    const stmtRedeem = db.prepare(`
      INSERT INTO invitation_redemptions (id, invitation_id, user_id, redeemed_at)
      SELECT ?1, i.id, ?2, ?3 FROM invitation_codes i
      WHERE i.code_hash = ?4 AND i.revoked_at IS NULL AND i.expires_at > ?3
        AND (SELECT COUNT(*) FROM invitation_redemptions r WHERE r.invitation_id = i.id) < i.max_uses
    `).bind("red_bob", "user_bob", now, "hash_secret_code");

    const stmtMember = db.prepare(`
      INSERT INTO memberships (user_id, status, role, joined_at)
      SELECT ?1,
        CASE WHEN (SELECT require_admin_approval_for_all FROM community_settings WHERE id = 1) = 1
             THEN 'pending' ELSE 'active' END,
        'member', ?2
      WHERE EXISTS (SELECT 1 FROM invitation_redemptions WHERE id = ?3)
    `).bind("user_bob", now, "red_bob");

    const res = await db.batch([stmtRedeem, stmtMember]);
    assert.strictEqual(res[0].meta.changes, 1);
    assert.strictEqual(res[1].meta.changes, 1);

    const member = await db.prepare("SELECT status, role FROM memberships WHERE user_id = ?1").bind("user_bob").first();
    assert.strictEqual(member.status, "active");

    // Second redemption attempt with SAME code (exhausted, max_uses = 1) for Charlie
    const stmtRedeem2 = db.prepare(`
      INSERT INTO invitation_redemptions (id, invitation_id, user_id, redeemed_at)
      SELECT ?1, i.id, ?2, ?3 FROM invitation_codes i
      WHERE i.code_hash = ?4 AND i.revoked_at IS NULL AND i.expires_at > ?3
        AND (SELECT COUNT(*) FROM invitation_redemptions r WHERE r.invitation_id = i.id) < i.max_uses
    `).bind("red_charlie", "user_charlie", now, "hash_secret_code");

    const stmtMember2 = db.prepare(`
      INSERT INTO memberships (user_id, status, role, joined_at)
      SELECT ?1,
        CASE WHEN (SELECT require_admin_approval_for_all FROM community_settings WHERE id = 1) = 1
             THEN 'pending' ELSE 'active' END,
        'member', ?2
      WHERE EXISTS (SELECT 1 FROM invitation_redemptions WHERE id = ?3)
    `).bind("user_charlie", now, "red_charlie");

    const res2 = await db.batch([stmtRedeem2, stmtMember2]);
    // Changes should be 0 because code is exhausted
    assert.strictEqual(res2[0].meta.changes, 0);
    assert.strictEqual(res2[1].meta.changes, 0);

    const charlie = await db.prepare("SELECT * FROM memberships WHERE user_id = ?1").bind("user_charlie").first();
    assert.strictEqual(charlie, null, "Exhausted invitation must not grant membership");
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
