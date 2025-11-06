import "dotenv/config";
import { Server } from "socket.io";
import { createServer } from "http";
import { logger } from "hono/logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { setupSocketHandlers } from "./socket-handlers";
import { cors } from "hono/cors";
import usersRouter from "./routes/users";
import contactsRouter from "./routes/contacts";
import conversationsRouter from "./routes/conversations";

const app = new OpenAPIHono();

app.use(logger());
app.use("/*", cors({ origin: "*" }));

app.get("/", (c) => {
  return c.json({ status: "OK", message: "BioSync API Server" });
});

// Register REST API routes
app.route("/users", usersRouter);
app.route("/contacts", contactsRouter);
app.route("/conversations", conversationsRouter);

app.get("/scalar", Scalar({ url: "/doc" }));

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "BioSync API",
    description: "Real-time chat API with Socket.IO support",
  },
});

const PORT = parseInt(process.env.PORT || "3000");
const SOCKET_PORT = 3002;

// Create HTTP server for Socket.IO
const httpServer = createServer();

// Setup Socket.IO server attached to HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Setup socket handlers
setupSocketHandlers(io);

// Start Socket.IO server
httpServer.listen(SOCKET_PORT, () => {
  console.log(`� Socket.IO server running on http://localhost:${SOCKET_PORT}`);
});

console.log(`� HTTP Server running on http://localhost:${PORT}`);
console.log(`📖 API Documentation: http://localhost:${PORT}/scalar`);

export default {
  port: PORT,
  fetch: app.fetch,
};
