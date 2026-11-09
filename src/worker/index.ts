import { UserHub } from "./do/UserHub.ts";
import { ConversationRoom } from "./do/ConversationRoom.ts";
import { PresenceRegistry } from "./do/PresenceRegistry.ts";
import { GameRoom } from "./do/GameRoom.ts";
import { validateOriginAndCsrf } from "./middleware/csrf.ts";
import { checkMemoryRateLimit } from "./middleware/rateLimiter.ts";
import { formatErrorResponse, ApiError } from "./middleware/errors.ts";
import { logRequest } from "./middleware/logger.ts";
import { authorize } from "./policy/authorize.ts";
import { runScheduledMaintenance } from "./data/maintenance.ts";

export { UserHub, ConversationRoom, PresenceRegistry, GameRoom };

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string;
  USER_HUB?: DurableObjectNamespace;
  CONVERSATION_ROOM?: DurableObjectNamespace;
  PRESENCE_REGISTRY?: DurableObjectNamespace;
  GAME_ROOM?: DurableObjectNamespace;
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const startTime = performance.now();
    let statusCode = 200;
    let errorCode: string | undefined;

    // Apply strict pipeline to /api/* routes
    if (url.pathname.startsWith("/api/")) {
      try {
        // 1. Origin & CSRF check
        validateOriginAndCsrf(request, env.ALLOWED_ORIGIN);

        // 2. IP-based sliding window rate limit
        const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
        checkMemoryRateLimit(`ip:${clientIp}`, 120, 60000);

        // 3. API Routes Dispatch
        if (url.pathname === "/api/health") {
          if (request.method !== "GET") {
            const res405 = new Response(
              JSON.stringify({
                error: {
                  code: "BAD_REQUEST",
                  message: "Method Not Allowed",
                  requestId
                }
              }),
              {
                status: 405,
                headers: {
                  "Allow": "GET",
                  "Content-Type": "application/json",
                  "Cache-Control": "no-store",
                  "X-Request-Id": requestId
                }
              }
            );

            logRequest({
              requestId,
              method: request.method,
              pathname: url.pathname,
              statusCode: 405,
              errorCode: "BAD_REQUEST",
              durationMs: performance.now() - startTime
            });

            return res405;
          }

          const responseData = {
            status: "ok",
            environment: env.ENVIRONMENT || "development",
            timestamp: Date.now()
          };

          const response = new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "X-Request-Id": requestId,
              "X-Content-Type-Options": "nosniff"
            }
          });

          logRequest({
            requestId,
            method: request.method,
            pathname: url.pathname,
            statusCode: 200,
            durationMs: performance.now() - startTime
          });

          return response;
        }

        // Admin usage stub (Architecture §17.6)
        if (url.pathname === "/api/admin/usage") {
          if (request.method !== "GET") {
            throw new ApiError(405, "BAD_REQUEST", "Method Not Allowed");
          }

          // In Phase 2 this validates policy using actor context
          const mockActor = {
            userId: request.headers.get("X-User-Id") || undefined,
            sessionId: request.headers.get("X-Session-Id") || undefined,
            role: (request.headers.get("X-User-Role") as "owner" | "admin" | "member") || "member",
            status: (request.headers.get("X-User-Status") as "active" | "suspended") || "active"
          };

          authorize(mockActor, "admin.read_usage");

          const responseData = {
            status: "ok",
            limits: {
              d1DailyWrites: 100000,
              d1DailyReads: 5000000,
              workersDailyRequests: 100000
            }
          };

          return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "X-Request-Id": requestId
            }
          });
        }

        throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          statusCode = err.statusCode;
          errorCode = err.code;
        } else {
          statusCode = 500;
          errorCode = "INTERNAL_ERROR";
        }

        const errorResponse = formatErrorResponse(err, requestId);
        statusCode = errorResponse.status;

        logRequest({
          requestId,
          method: request.method,
          pathname: url.pathname,
          statusCode,
          errorCode,
          durationMs: performance.now() - startTime
        });

        return errorResponse;
      }
    }

    // Static Assets fallback via binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
        "X-Request-Id": requestId
      }
    });
  },

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      runScheduledMaintenance(env, Date.now()).catch((err) => {
        console.error("Scheduled maintenance failed:", err);
      })
    );
  }
};
