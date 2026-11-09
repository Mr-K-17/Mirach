import type { AuditLogRecord } from "./types.ts";

export interface CreateAuditLogParams {
  actorId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * Appends an entry to the append-only audit_logs table.
 * Must never include message bodies, credentials, tokens, or personal identifiers.
 */
export async function insertAuditLog(
  db: D1Database,
  params: CreateAuditLogParams
): Promise<void> {
  const metadataJson = JSON.stringify(params.metadata || {});

  await db
    .prepare(
      "INSERT INTO audit_logs (actor_id, action, subject_type, subject_id, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    )
    .bind(
      params.actorId,
      params.action,
      params.subjectType,
      params.subjectId,
      metadataJson,
      params.createdAt
    )
    .run();
}

/**
 * Lists recent audit log records with pagination (for operator/admin review).
 */
export async function listAuditLogs(
  db: D1Database,
  limit: number,
  beforeCreatedAt?: number
): Promise<AuditLogRecord[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  if (beforeCreatedAt) {
    const res = await db
      .prepare(
        "SELECT id, actor_id, action, subject_type, subject_id, metadata, created_at FROM audit_logs WHERE created_at < ?1 ORDER BY created_at DESC LIMIT ?2"
      )
      .bind(beforeCreatedAt, safeLimit)
      .all<AuditLogRecord>();
    return res.results;
  }

  const res = await db
    .prepare(
      "SELECT id, actor_id, action, subject_type, subject_id, metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?1"
    )
    .bind(safeLimit)
    .all<AuditLogRecord>();
  return res.results;
}
