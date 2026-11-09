import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness, executeSql } from "./spike-helpers.mjs";

describe("Spike G: Rows Read / Written Reported by D1 meta", () => {
  let mf;
  let db;

  test("setup test database", async () => {
    mf = await createSpikeHarness(["DB_SPIKE_G"]);
    db = await mf.getD1Database("DB_SPIKE_G");

    await executeSql(db, `
      CREATE TABLE table_unindexed (
        id TEXT PRIMARY KEY,
        val TEXT
      );

      CREATE TABLE table_multi_indexed (
        id TEXT PRIMARY KEY,
        idx1 TEXT NOT NULL,
        idx2 TEXT NOT NULL,
        UNIQUE (idx1),
        UNIQUE (idx2)
      );
    `);
  });

  test("Metric 1: Insert into unindexed table", async () => {
    const res = await db.prepare("INSERT INTO table_unindexed VALUES (?1, ?2)")
      .bind("row_1", "value_1").run();

    console.log("Unindexed insert meta:", JSON.stringify(res.meta));
    assert.strictEqual(res.meta.changes, 1);
    assert.ok(typeof res.meta.rows_written !== "undefined" || typeof res.meta.changes !== "undefined");
  });

  test("Metric 2: Insert into multi-indexed table (measuring index write reporting)", async () => {
    const res = await db.prepare("INSERT INTO table_multi_indexed VALUES (?1, ?2, ?3)")
      .bind("row_1", "idx_a", "idx_b").run();

    console.log("Multi-indexed insert meta:", JSON.stringify(res.meta));
    assert.strictEqual(res.meta.changes, 1);
  });

  test("Metric 3: Read rows measurement — index seek vs full table scan", async () => {
    // Insert 10 rows
    for (let i = 0; i < 10; i++) {
      await db.prepare("INSERT INTO table_unindexed VALUES (?1, ?2)").bind("row_" + (i + 10), "data").run();
    }

    // Scan table
    const scanRes = await db.prepare("SELECT * FROM table_unindexed WHERE val = 'data'").all();
    console.log("Full scan meta:", JSON.stringify(scanRes.meta));

    // Seek by primary key
    const seekRes = await db.prepare("SELECT * FROM table_unindexed WHERE id = 'row_10'").all();
    console.log("Index seek meta:", JSON.stringify(seekRes.meta));

    assert.ok(seekRes.results.length === 1);
    assert.ok(scanRes.results.length === 10);
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
