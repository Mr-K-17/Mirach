/**
 * GameRoom Durable Object.
 * Manages turn serialization and move legality for real-time multiplayer games (Rules §15).
 * Browser never decides winners or scores.
 */
export class GameRoom {
  protected state: DurableObjectState;
  protected env: unknown;

  constructor(state: DurableObjectState, env: unknown) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/status") {
      return Response.json({ status: "ready" });
    }

    return new Response("GameRoom OK", { status: 200 });
  }
}
