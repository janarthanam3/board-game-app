import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { Server as SocketServer } from "socket.io";

import type { ServerEnv } from "../config/env.js";
import { createMatchStore, type MatchStore } from "../match/store.js";
import { registerMatchNamespace } from "../sockets/match.js";

export interface SocketPluginOptions {
  env: ServerEnv;
}

declare module "fastify" {
  interface FastifyInstance {
    io: SocketServer;
    /** The live match store, shared by the socket namespace and the match REST routes. */
    matchStore: MatchStore;
  }
}

// Attaches Socket.IO to Fastify's underlying Node http server so both share one port
// (docs/09: PORT is "HTTP + Socket.IO port"). The namespace is /match per docs/07-api-contract.md, and
// its handlers live in src/sockets/match.ts — this plugin only wires the dependencies in.
const socketPlugin: FastifyPluginAsync<SocketPluginOptions> = async (app, options) => {
  const io = new SocketServer(app.server, {
    cors: { origin: options.env.CORS_ORIGINS === "*" ? "*" : options.env.CORS_ORIGINS.split(",") },
  });

  const store = createMatchStore(app.redis, options.env.MATCH_STATE_TTL);

  registerMatchNamespace(io.of("/match"), {
    pg: app.pg,
    redis: app.redis,
    store,
    log: app.log,
    // The only clock read in the match path: everything under src/match and src/sockets takes time as
    // data, so the edge supplies it (and a test can supply a fixed one).
    now: () => Date.now(),
    verifyAccess: app.verifyAccess,
  });

  app.decorate("io", io);
  app.decorate("matchStore", store);

  // Close every socket before Fastify closes the http server, or app.close() hangs on open connections.
  app.addHook("onClose", async () => {
    await io.close();
  });
};

// Depends on datastores for app.pg / app.redis and on auth for app.verifyAccess — the handshake needs
// the same token verification the REST routes use.
export default fastifyPlugin(socketPlugin, { name: "socket", dependencies: ["datastores", "auth"] });
