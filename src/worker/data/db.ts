/**
 * Data layer database binding accessors.
 * Per Rules §10 and ESLint configuration, only files in src/worker/data are permitted
 * to directly reference env.DB_* bindings.
 */

export interface WorkerEnvWithDatabases {
  DB_CORE: D1Database;
  DB_CHAT: D1Database;
  [key: string]: unknown;
}

export function getCoreDb(env: unknown): D1Database {
  const typedEnv = env as WorkerEnvWithDatabases;
  if (!typedEnv.DB_CORE) {
    throw new Error("DB_CORE binding not found in environment");
  }
  return typedEnv.DB_CORE;
}

export function getChatDb(env: unknown): D1Database {
  const typedEnv = env as WorkerEnvWithDatabases;
  if (!typedEnv.DB_CHAT) {
    throw new Error("DB_CHAT binding not found in environment");
  }
  return typedEnv.DB_CHAT;
}
