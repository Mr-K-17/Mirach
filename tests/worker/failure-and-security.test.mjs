import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../../src/worker/index.ts";
import { createSpikeHarness, executeSql } from "./spikes/spike-helpers.mjs";
import { findSessionByHash } from "../../src/worker/data/sessions.ts";
import { formatErrorResponse } from "../../src/worker/middleware/errors.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

describe("Task 7: Feature 5 — Failure & Security Regressions (F-02, F-03, F-20, Injections)", () => {
  let mf;
  let db;

  test("setup test harness", async () => {
    mf = await createSpikeHarness(["DB_CORE"]);
    db = await mf.getD1Database("DB_CORE");

    const coreSql = await fs.readFile(
      path.join(rootDir, "migrations/core/core_0001_initial_core.sql"),
      "utf-8"
    );
    await executeSql(db, coreSql);
  });

  describe("F-02: Worker 5xx / Unhandled Exceptions", () => {
    test("Worker returns formatted 500 without leaking internal error traces or secrets", async () => {
      const simulatedException = new Error("Database timeout at internal.secrets.cluster.local:3306");
      const res = formatErrorResponse(simulatedException, "req-f02");

      assert.strictEqual(res.status, 500);
      assert.strictEqual(res.headers.get("X-Request-Id"), "req-f02");

      const body = await res.json();
      assert.strictEqual(body.error.code, "INTERNAL_ERROR");
      assert.strictEqual(body.error.message, "An unexpected error occurred. Please try again later.");
      assert.ok(!JSON.stringify(body).includes("secrets"));
    });
  });

  describe("F-03 & F-20: D1 Quota Exhaustion (503 QUOTA_EXHAUSTED)", () => {
    test("D1 daily limit error produces HTTP 503 and Retry-After header with zero false successes", async () => {
      const d1QuotaExhaustedError = new Error("D1_ERROR: storage limit exceeded daily quota");
      const res = formatErrorResponse(d1QuotaExhaustedError, "req-f03");

      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.headers.get("X-Request-Id"), "req-f03");
      assert.strictEqual(res.headers.get("Retry-After"), "3600");

      const body = await res.json();
      assert.strictEqual(body.error.code, "QUOTA_EXHAUSTED");
      assert.ok(body.error.message.includes("Try again after midnight UTC"));
    });
  });

  describe("Security: SQL Injection Immunity via Parameter Binding", () => {
    test("SQL injection strings in token hash do not alter query logic or leak records", async () => {
      const injectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE sessions; --",
        "admin' --",
        "' UNION SELECT * FROM community_settings --"
      ];

      for (const payload of injectionPayloads) {
        // Query must safely execute with 0 rows found and NO SQL syntax/injection crash
        const result = await findSessionByHash(db, payload, Date.now());
        assert.strictEqual(result, null, `Payload safely bound without injection: ${payload}`);
      }

      // Verify sessions table was NOT dropped
      const checkTable = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").first();
      assert.ok(checkTable, "sessions table remains intact after injection attempt");
    });
  });

  describe("HTTP API Pipeline via Worker fetch()", () => {
    test("GET /api/health succeeds with 200 and X-Request-Id", async () => {
      const req = new Request("https://mirach.workers.dev/api/health", { method: "GET" });
      const res = await worker.fetch(req, { ENVIRONMENT: "test" });

      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get("X-Request-Id"));
      const body = await res.json();
      assert.strictEqual(body.status, "ok");
    });

    test("POST /api/health returns 405 Method Not Allowed", async () => {
      const req = new Request("https://mirach.workers.dev/api/health", {
        method: "POST",
        headers: { Origin: "https://mirach.workers.dev" }
      });
      const res = await worker.fetch(req, {});

      assert.strictEqual(res.status, 405);
      const body = await res.json();
      assert.strictEqual(body.error.code, "BAD_REQUEST");
    });

    test("GET /api/admin/usage denies unauthenticated member with 401", async () => {
      const req = new Request("https://mirach.workers.dev/api/admin/usage", { method: "GET" });
      const res = await worker.fetch(req, {});

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error.code, "UNAUTHORIZED");
    });

    test("GET /api/admin/usage denies non-admin member with 403", async () => {
      const req = new Request("https://mirach.workers.dev/api/admin/usage", {
        method: "GET",
        headers: {
          "X-User-Id": "alice_1",
          "X-Session-Id": "sess_1",
          "X-User-Role": "member",
          "X-User-Status": "active"
        }
      });
      const res = await worker.fetch(req, {});

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.error.code, "FORBIDDEN");
    });

    test("GET /api/admin/usage grants access to admin with 200", async () => {
      const req = new Request("https://mirach.workers.dev/api/admin/usage", {
        method: "GET",
        headers: {
          "X-User-Id": "admin_1",
          "X-Session-Id": "sess_admin",
          "X-User-Role": "admin",
          "X-User-Status": "active"
        }
      });
      const res = await worker.fetch(req, {});

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.status, "ok");
      assert.strictEqual(body.limits.d1DailyWrites, 100000);
    });
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
