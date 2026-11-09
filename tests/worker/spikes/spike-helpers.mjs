import { Miniflare, convertV4MiniflareOptions } from "miniflare";

/**
 * Creates a local Miniflare test harness with simulated D1 databases and Durable Objects.
 */
export async function createSpikeHarness(databases = ["DB_CORE"], durableObjects = []) {
  const doBindings = durableObjects.map(name => ({
    name,
    className: name
  }));

  const opts = convertV4MiniflareOptions({
    modules: true,
    script: `
      export class UserHub {
        constructor(state, env) {
          this.state = state;
          this.env = env;
          this.alarmCount = 0;
        }
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname === "/alarm") {
            await this.state.storage.setAlarm(Date.now() + 50);
            return new Response("alarm scheduled");
          }
          if (url.pathname === "/alarm-count") {
            const count = (await this.state.storage.get("alarmCount")) || 0;
            return Response.json({ count });
          }
          return new Response("UserHub OK");
        }
        async alarm() {
          const count = ((await this.state.storage.get("alarmCount")) || 0) + 1;
          await this.state.storage.put("alarmCount", count);
        }
      }

      export class ConversationRoom {
        constructor(state, env) {
          this.state = state;
          this.env = env;
        }
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname === "/ws") {
            const pair = new WebSocketPair();
            this.state.acceptWebSocket(pair[1], ["chat"]);
            return new Response(null, { status: 101, webSocket: pair[0] });
          }
          if (url.pathname === "/subrequest-test") {
            // Count subrequests when making subrequest
            return Response.json({ ok: true });
          }
          return new Response("ConversationRoom OK");
        }
        async webSocketMessage(ws, message) {
          ws.send("echo:" + message);
        }
        async webSocketClose(ws, code, reason) {
          ws.close(code, "closed");
        }
      }

      export class PresenceRegistry {
        async fetch() { return new Response("Presence OK"); }
      }

      export class GameRoom {
        async fetch() { return new Response("GameRoom OK"); }
      }

      export default {
        async fetch(request, env) {
          const url = new URL(request.url);
          if (url.pathname.startsWith("/call-do")) {
            const id = env.CONVERSATION_ROOM.idFromName("test-room");
            const stub = env.CONVERSATION_ROOM.get(id);
            const res = await stub.fetch("http://do/subrequest-test");
            return Response.json(await res.json());
          }
          return new Response("Worker Root OK");
        }
      };
    `,
    d1Databases: databases,
    durableObjects: doBindings.length > 0 ? {
      USER_HUB: "UserHub",
      CONVERSATION_ROOM: "ConversationRoom",
      PRESENCE_REGISTRY: "PresenceRegistry",
      GAME_ROOM: "GameRoom"
    } : undefined
  });

  const mf = new Miniflare(opts);
  return mf;
}

/**
 * Splits and executes multi-statement SQL strings statement by statement.
 */
export async function executeSql(db, sqlScript) {
  // Strip block comments and line comments
  const cleanSql = sqlScript
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");

  const statements = cleanSql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}
