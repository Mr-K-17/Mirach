import { test, describe } from "node:test";
import assert from "node:assert";
import { validateOriginAndCsrf } from "../../src/worker/middleware/csrf.ts";
import { checkMemoryRateLimit } from "../../src/worker/middleware/rateLimiter.ts";
import { ApiError, formatErrorResponse, isQuotaExhaustedError } from "../../src/worker/middleware/errors.ts";
import { logRequest } from "../../src/worker/middleware/logger.ts";

describe("Task 4: Feature 2 — Request Pipeline Middleware Tests", () => {
  describe("CSRF & Origin Validation", () => {
    test("Safe methods (GET, HEAD) are allowed without Origin header", () => {
      const req = new Request("https://mirach.workers.dev/api/health", { method: "GET" });
      assert.doesNotThrow(() => validateOriginAndCsrf(req));
    });

    test("Same-origin POST request is allowed", () => {
      const req = new Request("https://mirach.workers.dev/api/session", {
        method: "POST",
        headers: {
          Origin: "https://mirach.workers.dev"
        }
      });
      assert.doesNotThrow(() => validateOriginAndCsrf(req));
    });

    test("Cross-site Sec-Fetch-Site is rejected with 403 CSRF_DETECTED", () => {
      const req = new Request("https://mirach.workers.dev/api/session", {
        method: "POST",
        headers: {
          "Sec-Fetch-Site": "cross-site",
          Origin: "https://evil.attacker.com"
        }
      });
      assert.throws(
        () => validateOriginAndCsrf(req),
        (err) => err instanceof ApiError && err.statusCode === 403 && err.code === "CSRF_DETECTED"
      );
    });

    test("Foreign origin is rejected with 403 CSRF_DETECTED", () => {
      const req = new Request("https://mirach.workers.dev/api/session", {
        method: "POST",
        headers: {
          Origin: "https://evil.attacker.com"
        }
      });
      assert.throws(
        () => validateOriginAndCsrf(req),
        (err) => err instanceof ApiError && err.statusCode === 403 && err.code === "CSRF_DETECTED"
      );
    });
  });

  describe("Rate Limiting (Sliding Window)", () => {
    test("Allows requests up to limit and rejects subsequent ones with 429", () => {
      const testKey = "test-ip-1:action";
      const now = 1000000;

      // Limit 3 requests per 60s
      checkMemoryRateLimit(testKey, 3, 60000, now);
      checkMemoryRateLimit(testKey, 3, 60000, now + 100);
      checkMemoryRateLimit(testKey, 3, 60000, now + 200);

      // 4th request must throw 429
      assert.throws(
        () => checkMemoryRateLimit(testKey, 3, 60000, now + 300),
        (err) => err instanceof ApiError && err.statusCode === 429 && err.code === "RATE_LIMITED"
      );

      // After window passes, succeeds again
      assert.doesNotThrow(() => checkMemoryRateLimit(testKey, 3, 60000, now + 61000));
    });
  });

  describe("Error Formatting & Quota Handling", () => {
    test("Detects D1 daily quota exhausted errors", () => {
      const quotaErr = new Error("D1_ERROR: storage limit exceeded daily quota");
      assert.strictEqual(isQuotaExhaustedError(quotaErr), true);
    });

    test("Formats 503 QUOTA_EXHAUSTED with Retry-After header", async () => {
      const quotaErr = new Error("Rate limit exceeded / daily limit");
      const res = formatErrorResponse(quotaErr, "req-123");

      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.headers.get("X-Request-Id"), "req-123");
      assert.strictEqual(res.headers.get("Retry-After"), "3600");

      const body = await res.json();
      assert.strictEqual(body.error.code, "QUOTA_EXHAUSTED");
      assert.ok(body.error.message.includes("Try again after midnight UTC"));
    });

    test("Formats ApiError correctly", async () => {
      const apiErr = new ApiError(404, "NOT_FOUND", "Resource not found");
      const res = formatErrorResponse(apiErr, "req-456");

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.headers.get("X-Request-Id"), "req-456");

      const body = await res.json();
      assert.strictEqual(body.error.code, "NOT_FOUND");
      assert.strictEqual(body.error.message, "Resource not found");
    });

    test("Redacts details for generic internal errors", async () => {
      const internalErr = new Error("FATAL: Database connection failed at secret_host:5432 with password xyz");
      const res = formatErrorResponse(internalErr, "req-789");

      assert.strictEqual(res.status, 500);
      const body = await res.json();
      assert.strictEqual(body.error.code, "INTERNAL_ERROR");
      // Never leaks internal error string to user
      assert.ok(!body.error.message.includes("password"));
      assert.ok(!body.error.message.includes("secret_host"));
    });
  });

  describe("Safe Logging", () => {
    test("Logs structured record without leaking sensitive parameters", () => {
      let logged = "";
      const originalLog = console.log;
      console.log = (msg) => { logged = msg; };

      logRequest({
        requestId: "req-log-1",
        method: "POST",
        pathname: "/api/session",
        statusCode: 200,
        durationMs: 4.5,
        userId: "user_alice",
        rowsRead: 2,
        rowsWritten: 1
      });

      console.log = originalLog;

      const parsed = JSON.parse(logged);
      assert.strictEqual(parsed.rid, "req-log-1");
      assert.strictEqual(parsed.p, "/api/session");
      assert.strictEqual(parsed.s, 200);
      assert.strictEqual(parsed.r_read, 2);
      assert.strictEqual(parsed.r_write, 1);
    });
  });
});
