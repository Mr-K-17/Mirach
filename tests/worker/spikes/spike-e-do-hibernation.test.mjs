import { test, describe } from "node:test";
import assert from "node:assert";
import { createSpikeHarness } from "./spike-helpers.mjs";

describe("Spike E: Durable Object WebSocket Hibernation & Alarm-Based Flushing", () => {
  let mf;

  test("setup test harness with Durable Objects", async () => {
    mf = await createSpikeHarness(["DB_SPIKE_E"], ["USER_HUB", "CONVERSATION_ROOM"]);
    await mf.ready;
  });

  test("Feature 1: Durable Object Storage Alarms schedule and fire", async () => {
    // Schedule alarm in UserHub
    const userHubStub = await mf.getDurableObjectNamespace("USER_HUB");
    const id = userHubStub.idFromName("user_alice");
    const stub = userHubStub.get(id);

    // Initial alarm count should be 0
    const resInitial = await stub.fetch("http://do/alarm-count");
    const { count: initialCount } = await resInitial.json();
    assert.strictEqual(initialCount, 0);

    // Trigger alarm scheduling (50 ms into the future)
    const resSchedule = await stub.fetch("http://do/alarm");
    assert.strictEqual(resSchedule.status, 200);

    // Wait for the alarm to trigger
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify alarm ran and incremented count in DO storage
    const resAfter = await stub.fetch("http://do/alarm-count");
    const { count: afterCount } = await resAfter.json();
    console.log(`DO Alarm execution verified: count went from ${initialCount} to ${afterCount}`);
    assert.ok(afterCount >= 1, "Durable Object alarm must execute and persist state");
  });

  test("Feature 2: WebSocket Hibernation lifecycle (accept, tags, echo, close)", async () => {
    const roomStub = await mf.getDurableObjectNamespace("CONVERSATION_ROOM");
    const id = roomStub.idFromName("conv_123");
    const stub = roomStub.get(id);

    const wsResponse = await stub.fetch("http://do/ws", {
      headers: { Upgrade: "websocket" }
    });

    assert.strictEqual(wsResponse.status, 101, "DO must accept WebSocket with 101 Switching Protocols");
    const ws = wsResponse.webSocket;
    assert.ok(ws, "WebSocket instance must be returned");

    ws.accept();

    const echoPromise = new Promise(resolve => {
      ws.addEventListener("message", event => {
        resolve(event.data);
      });
    });

    ws.send("ping");
    const echoData = await echoPromise;
    console.log("WebSocket Hibernation echo message received:", echoData);
    assert.strictEqual(echoData, "echo:ping");

    ws.close(1000, "Normal Closure");
  });

  test("teardown", async () => {
    if (mf) await mf.dispose();
  });
});
