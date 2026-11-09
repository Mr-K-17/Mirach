import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness, executeSql } from "./spike-helpers.mjs";

describe("Spike B: RETURNING, Partial Unique Indexes & STRICT Tables", () => {
  let mf;
  let db;

  test("setup test database", async () => {
    mf = await createSpikeHarness(["DB_SPIKE_B"]);
    db = await mf.getD1Database("DB_SPIKE_B");
  });

  test("Clause 1: RETURNING support on INSERT", async () => {
    await executeSql(db, `
      CREATE TABLE test_returning (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    const now = Date.now();
    const result = await db.prepare(`
      INSERT INTO test_returning (id, name, created_at)
      VALUES (?1, ?2, ?3)
      RETURNING id, name, created_at
    `).bind("row_1", "Alice", now).first();

    assert.ok(result, "D1 must support RETURNING clause on INSERT");
    assert.strictEqual(result.id, "row_1");
    assert.strictEqual(result.name, "Alice");
    assert.strictEqual(result.created_at, now);
  });

  test("Clause 2: Partial Unique Index support", async () => {
    await executeSql(db, `
      CREATE TABLE membership_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE UNIQUE INDEX uq_pending_user
      ON membership_requests(user_id)
      WHERE status = 'pending';
    `);

    // Insert user_1 as pending -> succeeds
    await db.prepare("INSERT INTO membership_requests VALUES (?1, ?2, 'pending', 100)").bind("req_1", "user_1").run();

    // Insert user_1 as pending again -> MUST throw unique constraint violation
    let duplicatePendingFailed = false;
    try {
      await db.prepare("INSERT INTO membership_requests VALUES (?1, ?2, 'pending', 200)").bind("req_2", "user_1").run();
    } catch (err) {
      duplicatePendingFailed = true;
      assert.match(err.message, /UNIQUE constraint failed/i);
    }
    assert.strictEqual(duplicatePendingFailed, true, "Partial unique index must block duplicate pending requests");

    // Insert user_1 as approved -> succeeds (not pending)
    await db.prepare("INSERT INTO membership_requests VALUES (?1, ?2, 'approved', 300)").bind("req_3", "user_1").run();

    // Insert user_1 as rejected -> succeeds (not pending)
    await db.prepare("INSERT INTO membership_requests VALUES (?1, ?2, 'rejected', 400)").bind("req_4", "user_1").run();

    const count = await db.prepare("SELECT COUNT(*) as c FROM membership_requests WHERE user_id = ?1").bind("user_1").first();
    assert.strictEqual(count.c, 3, "Non-pending rows must coexist under partial unique index");
  });

  test("Clause 3: STRICT Table support", async () => {
    let strictSupported = true;
    try {
      await executeSql(db, `
        CREATE TABLE test_strict (
          id INTEGER PRIMARY KEY,
          count INTEGER NOT NULL,
          note TEXT
        ) STRICT;
      `);
    } catch (err) {
      strictSupported = false;
      console.log("STRICT table creation failed:", err.message);
    }

    assert.strictEqual(strictSupported, true, "D1 SQLite engine must support STRICT table syntax");

    // Valid types
    await db.prepare("INSERT INTO test_strict (id, count, note) VALUES (?1, ?2, ?3)")
      .bind(1, 100, "valid strict text").run();

    // Type mismatch: insert string into count INTEGER column
    let typeMismatchCaught = false;
    try {
      await db.prepare("INSERT INTO test_strict (id, count, note) VALUES (?1, ?2, ?3)")
        .bind(2, "not-an-integer", "invalid").run();
    } catch (err) {
      typeMismatchCaught = true;
      assert.match(err.message, /cannot store TEXT value in INTEGER column|SQLITE_CONSTRAINT_DATATYPE|datatype mismatch/i);
    }

    assert.strictEqual(typeMismatchCaught, true, "STRICT table must enforce datatype mismatch errors");
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
