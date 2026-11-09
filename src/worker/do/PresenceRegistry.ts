/**
 * PresenceRegistry Durable Object.
 * Tracks ephemeral online/last-seen status in memory.
 * Preserves the 100k D1 daily write budget by NEVER writing presence heartbeats to D1.
 */
export class PresenceRegistry {
  protected state: DurableObjectState;
  protected env: unknown;
  private onlineUsers: Map<string, number> = new Map();

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/heartbeat" && request.method === "POST") {
      const { userId } = (await request.json()) as { userId: string };
      if (userId) {
        this.onlineUsers.set(userId, Date.now());
      }
      return Response.json({ ok: true });
    }

    if (url.pathname === "/status" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const lastSeen = userId ? this.onlineUsers.get(userId) : undefined;
      const isOnline = lastSeen ? Date.now() - lastSeen < 60000 : false;
      return Response.json({ isOnline, lastSeen: lastSeen || null });
    }

    return new Response("PresenceRegistry OK", { status: 200 });
  }
}
