import { pruneExpiredSessions } from "./sessions.ts";
import { getCoreDb } from "./db.ts";

export interface MaintenanceResults {
  prunedSessions: number;
}

/**
 * Runs scheduled cron maintenance jobs on mirach-core.
 */
export async function runScheduledMaintenance(
  env: unknown,
  nowMs: number = Date.now()
): Promise<MaintenanceResults> {
  const coreDb = getCoreDb(env);
  const pruned = await pruneExpiredSessions(coreDb, nowMs);
  return {
    prunedSessions: pruned
  };
}
