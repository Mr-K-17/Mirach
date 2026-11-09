import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness, executeSql } from "./spike-helpers.mjs";

describe("Spike F: From-Scratch Migrations into ONE Shared Database", () => {
  let mf;
  let db;

  test("setup single shared database", async () => {
    mf = await createSpikeHarness(["SHARED_STAGING_DB"]);
    db = await mf.getD1Database("SHARED_STAGING_DB");
  });

  test("Apply core_0001 migration", async () => {
    // core_0001_initial_core.sql schema
    const coreSql = `
      CREATE TABLE community_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        registration_open INTEGER NOT NULL DEFAULT 1 CHECK (registration_open IN (0, 1)),
        require_admin_approval_for_all INTEGER NOT NULL DEFAULT 0 CHECK (require_admin_approval_for_all IN (0, 1)),
        max_group_size INTEGER NOT NULL DEFAULT 25,
        media_quota_bytes_per_user INTEGER NOT NULL DEFAULT 78643200,
        reapply_cooldown_days INTEGER NOT NULL DEFAULT 30,
        delete_for_everyone_window_ms INTEGER DEFAULT NULL
      );

      CREATE TABLE reserved_usernames (
        name TEXT PRIMARY KEY
      );

      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        reauth_at INTEGER,
        user_agent_summary TEXT,
        revoked_at INTEGER
      );

      CREATE TABLE conversation_directory (
        conversation_id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
        shard_id INTEGER NOT NULL DEFAULT 0,
        direct_key TEXT UNIQUE,
        created_at INTEGER NOT NULL
      );
    `;

    await executeSql(db, coreSql);
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.results.map(r => r.name);
    assert.ok(tableNames.includes("community_settings"));
    assert.ok(tableNames.includes("reserved_usernames"));
    assert.ok(tableNames.includes("audit_logs"));
    assert.ok(tableNames.includes("sessions"));
    assert.ok(tableNames.includes("conversation_directory"));
  });

  test("Apply chat_0001 migration into SAME database (proving zero name collision & logical references)", async () => {
    // chat_0001_initial_chat.sql schema
    // Critical architecture rule: Chat tables do NOT create foreign keys to core tables (logical reference only)
    const chatSql = `
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
        title TEXT,
        created_by TEXT NOT NULL,
        last_seq INTEGER NOT NULL DEFAULT 0,
        last_message_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE conversation_members (
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
        last_delivered_seq INTEGER NOT NULL DEFAULT 0,
        last_read_seq INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        left_at INTEGER,
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        sender_id TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'text',
        body TEXT NOT NULL,
        reply_to_seq INTEGER,
        client_msg_id TEXT NOT NULL,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        UNIQUE (conversation_id, client_msg_id),
        UNIQUE (conversation_id, seq)
      );
    `;

    await executeSql(db, chatSql);
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.results.map(r => r.name);
    assert.ok(tableNames.includes("conversations"));
    assert.ok(tableNames.includes("conversation_members"));
    assert.ok(tableNames.includes("messages"));
  });

  test("Apply activity_0001 migration stub into SAME database", async () => {
    const activitySql = `
      CREATE TABLE announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `;

    await executeSql(db, activitySql);
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.results.map(r => r.name);
    assert.ok(tableNames.includes("announcements"));
    assert.strictEqual(tableNames.length >= 9, true);
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
