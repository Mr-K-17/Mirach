import { test, describe } from "node:test";
import assert from "node:assert";
import { authorize } from "../../src/worker/policy/authorize.ts";
import { ApiError } from "../../src/worker/middleware/errors.ts";

describe("Task 5: Feature 3 — Authorization Policy Engine (Negative Matrix)", () => {
  const allActions = [
    "directory.search",
    "conversation.read",
    "conversation.write",
    "room.join",
    "attachment.sign",
    "admin.read_usage",
    "admin.manage_settings",
    "admin.view_audit",
    "reports.moderate",
    "export.request"
  ];

  test("Signed-out actor is denied on every single action with 401 UNAUTHORIZED", () => {
    const signedOutActors = [
      {},
      { userId: "alice" }, // missing sessionId
      { sessionId: "sess_1" } // missing userId
    ];

    for (const actor of signedOutActors) {
      for (const action of allActions) {
        assert.throws(
          () => authorize(actor, action),
          (err) => err instanceof ApiError && err.statusCode === 401 && err.code === "UNAUTHORIZED",
          `Expected 401 on ${action} for signed-out actor`
        );
      }
    }
  });

  test("Pending, Suspended, or Deleted actor is denied on all actions with 403 FORBIDDEN", () => {
    const nonActiveStatuses = ["pending", "suspended", "deleted"];

    for (const status of nonActiveStatuses) {
      const actor = {
        userId: "user_bad",
        sessionId: "sess_bad",
        role: "member",
        status
      };

      for (const action of allActions) {
        assert.throws(
          () => authorize(actor, action),
          (err) => err instanceof ApiError && err.statusCode === 403 && err.code === "FORBIDDEN",
          `Expected 403 on ${action} for ${status} actor`
        );
      }
    }
  });

  test("Active non-participant is strictly denied conversation reads, writes, and room joins", () => {
    const actor = {
      userId: "user_alice",
      sessionId: "sess_alice",
      role: "member",
      status: "active"
    };

    const privateResource = {
      type: "conversation",
      id: "conv_secret",
      isParticipant: false
    };

    assert.throws(
      () => authorize(actor, "conversation.read", privateResource),
      (err) => err instanceof ApiError && err.statusCode === 403
    );

    assert.throws(
      () => authorize(actor, "conversation.write", privateResource),
      (err) => err instanceof ApiError && err.statusCode === 403
    );

    assert.throws(
      () => authorize(actor, "room.join", privateResource),
      (err) => err instanceof ApiError && err.statusCode === 403
    );

    assert.throws(
      () => authorize(actor, "attachment.sign", privateResource),
      (err) => err instanceof ApiError && err.statusCode === 403
    );
  });

  test("Moderators and Admins as non-participants are strictly denied reading conversations", () => {
    const privilegedActors = [
      { userId: "mod_1", sessionId: "sess_mod", role: "moderator", status: "active" },
      { userId: "admin_1", sessionId: "sess_admin", role: "admin", status: "active" }
    ];

    const privateConv = {
      type: "conversation",
      id: "conv_private",
      isParticipant: false
    };

    for (const actor of privilegedActors) {
      assert.throws(
        () => authorize(actor, "conversation.read", privateConv),
        (err) => err instanceof ApiError && err.statusCode === 403,
        `Expected non-participant ${actor.role} to be denied reading private conversation`
      );

      assert.throws(
        () => authorize(actor, "conversation.write", privateConv),
        (err) => err instanceof ApiError && err.statusCode === 403,
        `Expected non-participant ${actor.role} to be denied writing to private conversation`
      );
    }
  });

  test("Active participant is granted conversation access", () => {
    const actor = {
      userId: "user_alice",
      sessionId: "sess_alice",
      role: "member",
      status: "active"
    };

    const participantConv = {
      type: "conversation",
      id: "conv_shared",
      isParticipant: true
    };

    assert.doesNotThrow(() => authorize(actor, "conversation.read", participantConv));
    assert.doesNotThrow(() => authorize(actor, "conversation.write", participantConv));
    assert.doesNotThrow(() => authorize(actor, "room.join", participantConv));
  });

  test("Administrative privileges: members denied, admins granted", () => {
    const member = {
      userId: "user_alice",
      sessionId: "sess_alice",
      role: "member",
      status: "active"
    };

    const admin = {
      userId: "user_admin",
      sessionId: "sess_admin",
      role: "admin",
      status: "active"
    };

    // Member denied admin usage and audit view
    assert.throws(
      () => authorize(member, "admin.read_usage"),
      (err) => err instanceof ApiError && err.statusCode === 403
    );
    assert.throws(
      () => authorize(member, "admin.view_audit"),
      (err) => err instanceof ApiError && err.statusCode === 403
    );

    // Admin allowed
    assert.doesNotThrow(() => authorize(admin, "admin.read_usage"));
    assert.doesNotThrow(() => authorize(admin, "admin.view_audit"));
    assert.doesNotThrow(() => authorize(admin, "admin.manage_settings"));
  });
});
