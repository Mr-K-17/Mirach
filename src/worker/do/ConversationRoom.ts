/**
 * ConversationRoom Durable Object.
 * Manages active conversation room membership, ephemeral typing indicators,
 * and debounced alarm-based cursor flushing (Architecture §19.2 & ADR-023).
 */
export class ConversationRoom {
  private state: DurableObjectState;
  protected env: unknown;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      this.state.acceptWebSocket(server, ["room-chat"]);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    // Schedule debounced flush alarm for cursor batching
    if (url.pathname === "/schedule-flush") {
      const currentAlarm = await this.state.storage.getAlarm();
      if (!currentAlarm) {
        // Flush in 2000 ms to coalesce multiple cursor updates into 1 D1 write
        await this.state.storage.setAlarm(Date.now() + 2000);
      }
      return Response.json({ status: "scheduled" });
    }

    return new Response("ConversationRoom OK", { status: 200 });
  }

  async alarm(): Promise<void> {
    // Flush debounced read/delivered cursors to D1
    // In Phase 5 this calls src/worker/data to write coalesced member cursors
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message) as { type: string; payload?: unknown };
        // Broadcast ephemeral typing events to all other sockets in room
        if (parsed.type === "typing") {
          const sockets = this.state.getWebSockets("room-chat");
          for (const recipient of sockets) {
            if (recipient !== ws) {
              recipient.send(JSON.stringify({ type: "typing", payload: parsed.payload }));
            }
          }
        }
      } catch {
        // Ignore unparseable raw messages
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);
  }
}
