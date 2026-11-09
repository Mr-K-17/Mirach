import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpikeHarness, executeSql } from "./spikes/spike-helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

describe("Task 2: Migration Tooling & Schemas Verification", () => {
  let coreSql;
  let chatSql;

  test("Read migration files from disk", async () => {
    coreSql = await fs.readFile(
      path.join(rootDir, "migrations/core/core_0001_initial_core.sql"),
      "utf-8"
    );
    chatSql = await fs.readFile(
      path.join(rootDir, "migrations/chat/chat_0001_initial_chat.sql"),
      "utf-8"
    );

    assert.ok(coreSql.length > 50, "core_0001 migration exists and is non-empty");
    assert.ok(chatSql.length > 50, "chat_0001 migration exists and is non-empty");
  });

  test("Apply both migrations into ONE single shared staging database", async () => {
    const mf = await createSpikeHarness(["STAGING_SHARED_DB"]);
    const db = await mf.getD1Database("STAGING_SHARED_DB");

    // Apply core first
    await executeSql(db, coreSql);
    // Apply chat into same database
    await executeSql(db, chatSql);

    const tablesRes = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tablesRes.results.map(r => r.name);

    // Verify core tables
    assert.ok(tableNames.includes("community_settings"));
    assert.ok(tableNames.includes("reserved_usernames"));
    assert.ok(tableNames.includes("audit_logs"));
    assert.ok(tableNames.includes("sessions"));
    assert.ok(tableNames.includes("conversation_directory"));
    assert.ok(tableNames.includes("invitation_attempts"));

    // Verify chat tables
    assert.ok(tableNames.includes("conversations"));
    assert.ok(tableNames.includes("conversation_members"));
    assert.ok(tableNames.includes("messages"));

    // Verify default community settings row
    const settings = await db.prepare("SELECT * FROM community_settings WHERE id = 1").first();
    assert.strictEqual(settings.id, 1);
    assert.strictEqual(settings.registration_open, 1);
    assert.strictEqual(settings.max_group_size, 25);

    // Verify reserved usernames
    const adminUser = await db.prepare("SELECT name FROM reserved_usernames WHERE name = 'admin'").first();
    assert.strictEqual(adminUser.name, "admin");

    await mf.dispose();
  });

  test("Apply migrations into separate production databases (DB_CORE & DB_CHAT)", async () => {
    const mf = await createSpikeHarness(["DB_CORE", "DB_CHAT"]);
    const dbCore = await mf.getD1Database("DB_CORE");
    const dbChat = await mf.getD1Database("DB_CHAT");

    await executeSql(dbCore, coreSql);
    await executeSql(dbChat, chatSql);

    const coreTables = (await dbCore.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(r => r.name);
    const chatTables = (await dbChat.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(r => r.name);

    assert.ok(coreTables.includes("sessions"));
    assert.ok(!coreTables.includes("messages"));

    assert.ok(chatTables.includes("messages"));
    assert.ok(!chatTables.includes("sessions"));

    await mf.dispose();
  });
});
