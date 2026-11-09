/**
 * UserHub Durable Object.
 * Manages per-user ephemeral websocket connections, device multiplexing, and live session eviction.
 * Uses Cloudflare WebSocket Hibernation API to conserve CPU and memory.
 */
export class UserHub {
  private state: DurableObjectState;
  protected env: unknown;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade endpoint
    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      // Accept websocket with tag for hibernation
      this.state.acceptWebSocket(server, ["user-hub"]);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    // Live session eviction (e.g. on password change, suspension, or remote sign out)
    if (url.pathname === "/evict") {
      const sockets = this.state.getWebSockets("user-hub");
      for (const ws of sockets) {
        ws.close(1008, "Session revoked");
      }
      return Response.json({ evictedCount: sockets.length });
    }

    return new Response("UserHub OK", { status: 200 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Ephemeral ping-pong
    if (message === "ping") {
      ws.send("pong");
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("UserHub WebSocket error:", error);
    ws.close(1011, "WebSocket error");
  }
}
