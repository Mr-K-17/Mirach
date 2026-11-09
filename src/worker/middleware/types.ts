export type MemberRole = "owner" | "admin" | "moderator" | "member";
export type MemberStatus = "pending" | "active" | "suspended" | "deleted";

export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  role?: MemberRole;
  status?: MemberStatus;
  sessionId?: string;
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CSRF_DETECTED"
  | "RATE_LIMITED"
  | "QUOTA_EXHAUSTED"
  | "INTERNAL_ERROR";
