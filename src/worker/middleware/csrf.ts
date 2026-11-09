import { ApiError } from "./errors.ts";

/**
 * Validates Origin and Sec-Fetch-Site headers on state-mutating requests (POST, PUT, DELETE, PATCH).
 * Rejects cross-origin requests to prevent CSRF.
 */
export function validateOriginAndCsrf(
  request: Request,
  allowedOrigin?: string
): void {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return;
  }

  const originHeader = request.headers.get("Origin");
  const secFetchSite = request.headers.get("Sec-Fetch-Site");

  // 1. Check Sec-Fetch-Site if provided by modern browsers
  if (secFetchSite && secFetchSite === "cross-site") {
    throw new ApiError(
      403,
      "CSRF_DETECTED",
      "Cross-site requests are strictly prohibited"
    );
  }

  // 2. Validate Origin if present
  if (originHeader) {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(originHeader);

    // Allow same origin (scheme + host + port)
    if (originUrl.origin === requestUrl.origin) {
      return;
    }

    // Allow configured allowedOrigin (e.g. localhost during dev or custom domain)
    if (allowedOrigin && originUrl.origin === allowedOrigin) {
      return;
    }

    // Allow local development origins (localhost:5173, 127.0.0.1:5173)
    if (
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1"
    ) {
      return;
    }

    throw new ApiError(
      403,
      "CSRF_DETECTED",
      "Request origin does not match allowed origin"
    );
  }
}
