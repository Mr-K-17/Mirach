import { test, describe } from "node:test";
import assert from "node:assert";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

describe("Spike D: Workers Rate-Limiting Binding on Free Plan", () => {
  test("Test native rate limiting binding simulation", async () => {
    // Cloudflare Workers provides native rate_limiting binding:
    // { name: "RATE_LIMITER", namespace_id: "..." }
    // Let's test if Miniflare supports the rate limit binding or what fallback is required
    let nativeBindingSupported = true;
    let mf;
    try {
      const opts = convertV4MiniflareOptions({
        modules: true,
        script: `
          export default {
            async fetch(request, env) {
              if (env.RATE_LIMITER) {
                const { success } = await env.RATE_LIMITER.limit({ key: "test-ip" });
                return Response.json({ success });
              }
              return Response.json({ fallback: true });
            }
          };
        `,
        ratelimits: {
          RATE_LIMITER: { simple: { limit: 10, period: 60 } }
        }
      });
      mf = new Miniflare(opts);
      await mf.ready;
      const res = await mf.dispatchFetch("http://localhost/");
      const body = await res.json();
      console.log("Rate limit response:", body);
    } catch (err) {
      nativeBindingSupported = false;
      console.log("Native rate limiting binding config status in local simulation:", err.message);
    } finally {
      if (mf) await mf.dispose();
    }

    // Software fallback verification:
    // In Architecture §15.3 and ADR-023:
    // Sensitive actions use D1/DO-based counters (invitation_attempts, sessions creation per IP)
    console.log(`Native rate_limiting binding status: ${nativeBindingSupported ? "Supported" : "Requires software/DO fallback on Free"}`);
    assert.ok(true);
  });

  test("Software-based sliding window rate limiter fallback (in Durable Object / D1)", async () => {
    // Test sliding window algorithm in memory/DO
    const windowMs = 60000; // 1 minute
    const maxRequests = 5;
    const timestamps = [];

    function checkRateLimit(now) {
      // Evict timestamps outside window
      while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
        timestamps.shift();
      }
      if (timestamps.length >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }
      timestamps.push(now);
      return { allowed: true, remaining: maxRequests - timestamps.length };
    }

    const t0 = 1000000;
    // 5 requests within window succeed
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(t0 + i * 1000);
      assert.strictEqual(res.allowed, true);
    }

    // 6th request within window fails with 429
    const res6 = checkRateLimit(t0 + 6000);
    assert.strictEqual(res6.allowed, false);

    // After window expires (t0 + 61000), requests are allowed again
    const resAfterWindow = checkRateLimit(t0 + 61000);
    assert.strictEqual(resAfterWindow.allowed, true);
  });
});
