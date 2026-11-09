import { test, describe } from "node:test";
import assert from "node:assert";
import worker from "../../src/worker/index.ts";

describe("Worker API Routes", () => {
  test("GET /api/health returns 200 with JSON payload and no-store headers", async () => {
    const request = new Request("http://localhost/api/health");
    const env = { ENVIRONMENT: "test" };
    const response = await worker.fetch(request, env);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get("Content-Type"), "application/json");
    assert.strictEqual(response.headers.get("Cache-Control"), "no-store");
    assert.strictEqual(response.headers.get("X-Content-Type-Options"), "nosniff");

    const body = await response.json();
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.environment, "test");
    assert.ok(typeof body.timestamp === "number");
  });

  test("POST /api/health returns 405 Method Not Allowed", async () => {
    const request = new Request("http://localhost/api/health", { method: "POST" });
    const env = { ENVIRONMENT: "test" };
    const response = await worker.fetch(request, env);

    assert.strictEqual(response.status, 405);
    assert.strictEqual(response.headers.get("Allow"), "GET");
  });

  test("GET unknown route without ASSETS binding returns 404", async () => {
    const request = new Request("http://localhost/unknown");
    const env = { ENVIRONMENT: "test" };
    const response = await worker.fetch(request, env);

    assert.strictEqual(response.status, 404);
  });
});
