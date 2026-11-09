export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Route: /api/health
    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            "Allow": "GET",
            "Cache-Control": "no-store",
            "Content-Type": "text/plain"
          }
        });
      }

      const responseData = {
        status: "ok",
        environment: env.ENVIRONMENT || "development",
        timestamp: Date.now()
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    // Static Assets fallback via binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store"
      }
    });
  }
};
