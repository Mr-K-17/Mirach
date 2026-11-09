/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Mirach Cloudflare Worker Environment definition stub.
 * Populated in Phase 1 as bindings are defined.
 */
export interface Env {
  // Static assets binding (Cloudflare Workers Static Assets)
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };

  // Database bindings (Cloudflare D1 - Phase 2)
  DB_CORE?: unknown;
  DB_CHAT?: unknown;
  DB_ACTIVITY?: unknown;

  // Environment variables
  ENVIRONMENT?: string;
  FIREBASE_PROJECT_ID?: string;
  ALLOWED_ORIGIN?: string;
}
