import type { SessionRecord } from "./types.ts";

/**
 * Computes HMAC-SHA256 hash of a session token using the server-side pepper.
 * Raw session tokens are never stored in D1.
 */
export async function hashSessionToken(token: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(pepper);
  const messageData = encoder.encode(token);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Inserts a new session into the sessions table.
 */
export async function createSession(
  db: D1Database,
  session: {
    id: string;
    userId: string;
    tokenHash: string;
    createdAt: number;
    expiresAt: number;
    userAgentSummary?: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, token_hash, created_at, last_used_at, expires_at, reauth_at, user_agent_summary, revoked_at) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?6, NULL)"
    )
    .bind(
      session.id,
      session.userId,
      session.tokenHash,
      session.createdAt,
      session.expiresAt,
      session.userAgentSummary || null
    )
    .run();
}

/**
 * Looks up an active, unrevoked session by its token hash.
 */
export async function findSessionByHash(
  db: D1Database,
  tokenHash: string,
  nowMs: number
): Promise<SessionRecord | null> {
  const result = await db
    .prepare(
      "SELECT id, user_id, token_hash, created_at, last_used_at, expires_at, reauth_at, user_agent_summary, revoked_at FROM sessions WHERE token_hash = ?1 AND revoked_at IS NULL AND expires_at > ?2"
    )
    .bind(tokenHash, nowMs)
    .first<SessionRecord>();

  return result || null;
}

/**
 * Throttled update of last_used_at (at most once per hour to protect D1 write budget).
 */
export async function touchSession(
  db: D1Database,
  sessionId: string,
  nowMs: number
): Promise<boolean> {
  // 3600000 ms = 1 hour cooldown
  const result = await db
    .prepare(
      "UPDATE sessions SET last_used_at = ?1 WHERE id = ?2 AND (?1 - last_used_at >= 3600000) AND revoked_at IS NULL AND expires_at > ?1"
    )
    .bind(nowMs, sessionId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Revokes a single session by its ID.
 */
export async function revokeSession(
  db: D1Database,
  sessionId: string,
  nowMs: number
): Promise<void> {
  await db
    .prepare(
      "UPDATE sessions SET revoked_at = ?1 WHERE id = ?2 AND revoked_at IS NULL"
    )
    .bind(nowMs, sessionId)
    .run();
}

/**
 * Revokes all active sessions for a user (e.g. global sign out or account suspension).
 */
export async function revokeAllUserSessions(
  db: D1Database,
  userId: string,
  nowMs: number
): Promise<void> {
  await db
    .prepare(
      "UPDATE sessions SET revoked_at = ?1 WHERE user_id = ?2 AND revoked_at IS NULL"
    )
    .bind(nowMs, userId)
    .run();
}

/**
 * Enforces maximum active sessions per user (default <= 10).
 * Revokes the oldest sessions if limit exceeded.
 */
export async function enforceMaxSessionsPerUser(
  db: D1Database,
  userId: string,
  maxSessions: number,
  nowMs: number
): Promise<void> {
  const activeSessions = await db
    .prepare(
      "SELECT id FROM sessions WHERE user_id = ?1 AND revoked_at IS NULL AND expires_at > ?2 ORDER BY created_at DESC"
    )
    .bind(userId, nowMs)
    .all<{ id: string }>();

  if (activeSessions.results.length > maxSessions) {
    const toRevoke = activeSessions.results.slice(maxSessions);
    for (const session of toRevoke) {
      await revokeSession(db, session.id, nowMs);
    }
  }
}

/**
 * Deletes sessions older than 30 days after expiry or revocation (Architecture §7.4).
 */
export async function pruneExpiredSessions(
  db: D1Database,
  nowMs: number
): Promise<number> {
  // 30 days in ms = 2,592,000,000
  const retentionCutoff = nowMs - 2592000000;
  const result = await db
    .prepare(
      "DELETE FROM sessions WHERE (expires_at < ?1) OR (revoked_at IS NOT NULL AND revoked_at < ?1)"
    )
    .bind(retentionCutoff)
    .run();

  return result.meta?.changes ?? 0;
}
