import { ApiError } from "../middleware/errors.ts";
import type { MemberRole, MemberStatus } from "../middleware/types.ts";

export interface PolicyActor {
  userId?: string;
  role?: MemberRole;
  status?: MemberStatus;
  sessionId?: string;
}

export type PolicyAction =
  | "directory.search"
  | "conversation.read"
  | "conversation.write"
  | "room.join"
  | "attachment.sign"
  | "admin.read_usage"
  | "admin.manage_settings"
  | "admin.view_audit"
  | "reports.moderate"
  | "export.request";

export interface PolicyResource {
  type: "conversation" | "user" | "setting" | "audit" | "report" | "export";
  id?: string;
  isParticipant?: boolean;
  targetUserId?: string;
}

/**
 * Central authorization policy engine for Mirach.
 * Enforces role hierarchy, active status gates, and strict non-participant denial (even for admins).
 */
export function authorize(
  actor: PolicyActor,
  action: PolicyAction,
  resource?: PolicyResource
): void {
  // 1. Signed-out actor check
  if (!actor.userId || !actor.sessionId) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  // 2. Status gate: Only active members can access system resources
  if (actor.status !== "active") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      `Access denied: member status is ${actor.status || "unverified"}`
    );
  }

  // 3. Conversation & Realtime Room Rules
  if (
    action === "conversation.read" ||
    action === "conversation.write" ||
    action === "room.join" ||
    action === "attachment.sign"
  ) {
    // Non-participants are strictly denied (even admins/moderators have no conversation read policy)
    if (resource?.isParticipant !== true) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Access denied: you are not an active member of this conversation"
      );
    }
    return;
  }

  // 4. Admin & Operational Controls
  if (action === "admin.read_usage" || action === "admin.manage_settings") {
    if (actor.role !== "owner" && actor.role !== "admin") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Access denied: requires administrator or owner role"
      );
    }
    return;
  }

  if (action === "admin.view_audit") {
    if (actor.role !== "owner" && actor.role !== "admin") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Access denied: audit log inspection is restricted to administrators"
      );
    }
    return;
  }

  // 5. Moderation Reports
  if (action === "reports.moderate") {
    if (
      actor.role !== "owner" &&
      actor.role !== "admin" &&
      actor.role !== "moderator"
    ) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Access denied: moderation privileges required"
      );
    }
    return;
  }

  // 6. Directory Search
  if (action === "directory.search") {
    // Any active member can search the directory
    return;
  }

  // 7. Exports
  if (action === "export.request") {
    // Members can request their own export
    if (resource?.targetUserId && resource.targetUserId !== actor.userId && actor.role !== "owner") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Access denied: members may only export their own data"
      );
    }
    return;
  }
}
