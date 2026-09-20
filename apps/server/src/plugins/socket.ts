import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { Server as SocketServer } from "socket.io";

import type { ServerEnv } from "../config/env.js";

export interface SocketPluginOptions {
  env: ServerEnv;
}

declare module "fastify" {
  interface FastifyInstance {
    io: SocketServer;
  }
}

// Attaches Socket.IO to Fastify's underlying Node http server so both share one port
// (docs/09: PORT is "HTTP + Socket.IO port"). The namespace is /match per docs/07-api-contract.md.
const socketPlugin: FastifyPluginAsync<SocketPluginOptions> = async (app, options) => {
  const io = new SocketServer(app.server, {
    cors: { origin: options.env.CORS_ORIGINS === "*" ? "*" : options.env.CORS_ORIGINS.split(",") },
  });

  const matchNamespace = io.of("/match");

  matchNamespace.on("connection", (socket) => {
    app.log.info({ socketId: socket.id }, "socket connected to /match");

    // SKELETON ONLY (A3): a smoke signal proving the namespace is reachable. `hello` is not in
    // docs/07-api-contract.md and is removed when D4 wires the real events (see OQ-12).
    socket.emit("hello", { namespace: "/match" });
  });

  app.decorate("io", io);

  // Close every socket before Fastify closes the http server, or app.close() hangs on open connections.
  app.addHook("onClose", async () => {
    await io.close();
  });
};

export default fastifyPlugin(socketPlugin, { name: "socket" });
