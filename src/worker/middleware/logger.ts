export interface SafeLogEntry {
  requestId: string;
  method: string;
  pathname: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  errorCode?: string;
  rowsRead?: number;
  rowsWritten?: number;
}

/**
 * Emits a structured log line conforming strictly to Rules §19.
 * Never logs credentials, session tokens, invitation codes, message bodies, or secrets.
 */
export function logRequest(entry: SafeLogEntry): void {
  // Safe sanitization
  const safeData = {
    rid: entry.requestId,
    m: entry.method,
    p: entry.pathname,
    s: entry.statusCode,
    dur: Math.round(entry.durationMs * 100) / 100,
    u: entry.userId || undefined,
    err: entry.errorCode || undefined,
    r_read: entry.rowsRead || 0,
    r_write: entry.rowsWritten || 0
  };

  // Structured console log
  console.log(JSON.stringify(safeData));
}
