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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:3002";

// Parse ports from URLs
const apiUrlParts = new URL(API_URL);
const PORT = parseInt(apiUrlParts.port || "3000");

const socketUrlParts = new URL(SOCKET_URL);
const SOCKET_PORT = parseInt(socketUrlParts.port || "3002");

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
  console.log(`🔌 Socket.IO server running on ${SOCKET_URL}`);
});

console.log(`🚀 HTTP Server running on ${API_URL}`);
console.log(`📖 API Documentation: ${API_URL}/scalar`);

export default {
  port: PORT,
  fetch: app.fetch,
};
