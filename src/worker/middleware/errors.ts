import type { ErrorCode } from "./types.ts";

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Checks whether an error represents a D1 or Cloudflare daily quota exhaustion.
 */
export function isQuotaExhaustedError(err: unknown): boolean {
  if (err instanceof ApiError && err.code === "QUOTA_EXHAUSTED") {
    return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("quota exceeded") ||
      msg.includes("rate limit exceeded") ||
      msg.includes("daily limit") ||
      msg.includes("d1_error: storage limit") ||
      msg.includes("exceeded daily quota")
    );
  }
  return false;
}

/**
 * Formats standard JSON error response per Architecture §15.3 & §19.3.
 */
export function formatErrorResponse(
  error: unknown,
  requestId: string
): Response {
  if (isQuotaExhaustedError(error)) {
    return new Response(
      JSON.stringify({
        error: {
          code: "QUOTA_EXHAUSTED",
          message: "Mirach has reached today's limit. Try again after midnight UTC.",
          requestId
        }
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
          "Retry-After": "3600"
        }
      }
    );
  }

  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.details
        }
      }),
      {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId
        }
      }
    );
  }

  // Generic fallback for unhandled exceptions (redacts internal details)
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again later.",
        requestId
      }
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId
      }
    }
  );
}
