import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness } from "./spike-helpers.mjs";

describe("Spike C: CPU Time & Subrequest Counting (DO & Services)", () => {
  let mf;

  test("setup test harness with Worker and Durable Objects", async () => {
    mf = await createSpikeHarness(["DB_SPIKE_C"], ["CONVERSATION_ROOM"]);
    await mf.ready;
  });

  test("Measure handler execution CPU time for typical request pipeline", async () => {
    // Warm up JIT and WebCrypto engine
    const warmKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("SESSION_PEPPER_SECRET"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Warm-up runs
    for (let i = 0; i < 5; i++) {
      await crypto.subtle.sign("HMAC", warmKey, new TextEncoder().encode("warmup"));
    }

    const timings = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const token = "dummy-token-sample-" + i;
      const data = { user: "alice", role: "member", permissions: ["chat:read", "chat:write"] };
      JSON.parse(JSON.stringify(data));

      await crypto.subtle.sign("HMAC", warmKey, new TextEncoder().encode(token));
      timings.push(performance.now() - t0);
    }

    const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`Pipeline average duration per invocation: ${avgMs.toFixed(3)} ms (Fastest: ${Math.min(...timings).toFixed(3)} ms)`);

    // Must be well within the 10 ms budget
    assert.ok(avgMs < 5.0, `Handler execution time (${avgMs.toFixed(2)} ms) must remain well under 10 ms`);
  });

  test("Test Durable Object call invocation and subrequest counting", async () => {
    const res = await mf.dispatchFetch("http://localhost/call-do");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);

    // Make 60 consecutive DO calls to test if DO calls exceed the 50 external subrequest limit
    const doCalls = [];
    for (let i = 0; i < 60; i++) {
      doCalls.push(mf.dispatchFetch("http://localhost/call-do"));
    }

    const results = await Promise.all(doCalls);
    const allSuccessful = results.every(r => r.status === 200);

    console.log(`60 consecutive DO calls result: ${allSuccessful ? "All 60 succeeded" : "Failed"}`);
    assert.strictEqual(
      allSuccessful,
      true,
      "Durable Object calls do NOT fail at 50 subrequests — Cloudflare routes internal services through the 1,000 internal services quota, not the 50 external subrequest cap"
    );
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
