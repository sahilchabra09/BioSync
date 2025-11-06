import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../db/connections";
import { conversationsTable, messagesTable } from "../db/schema";
import { eq, or, and, desc } from "drizzle-orm";

const conversationsRouter = new OpenAPIHono();

// Schema definitions
const ConversationSchema = z.object({
  id: z.number(),
  otherUserClerkId: z.string(),
  createdAt: z.string(),
  lastMessageAt: z.string().nullable(),
});

const ConversationsResponseSchema = z.object({
  conversations: z.array(ConversationSchema),
});

const MessageSchema = z.object({
  id: z.number(),
  fromClerkId: z.string(),
  toClerkId: z.string(),
  content: z.string(),
  messageType: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  isMine: z.boolean(),
});

const MessagesResponseSchema = z.object({
  conversationId: z.number(),
  messages: z.array(MessageSchema),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const HeadersSchema = z.object({
  "x-clerk-id": z.string().openapi({
    description: "Clerk user ID from authentication",
    example: "user_123456",
  }),
});

const ConversationIdParamSchema = z.object({
  conversationId: z.string().openapi({
    param: {
      name: "conversationId",
      in: "path",
    },
    description: "Conversation ID",
    example: "5",
  }),
});

const MessageQuerySchema = z.object({
  limit: z.string().optional().openapi({
    description: "Number of messages to fetch",
    example: "50",
  }),
  offset: z.string().optional().openapi({
    description: "Pagination offset",
    example: "0",
  }),
});

// GET /conversations route
const getConversationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Conversations"],
  summary: "Get all conversations for current user",
  description: "Returns list of conversations where user is a participant",
  request: {
    headers: HeadersSchema,
  },
  responses: {
    200: {
      description: "Conversations retrieved successfully",
      content: {
        "application/json": {
          schema: ConversationsResponseSchema,
        },
      },
    },
    401: {
      description: "Missing authentication",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

conversationsRouter.openapi(getConversationsRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  // Get all conversations where user is participant
  const conversations = await db
    .select({
      id: conversationsTable.id,
      user1ClerkId: conversationsTable.user1ClerkId,
      user2ClerkId: conversationsTable.user2ClerkId,
      createdAt: conversationsTable.createdAt,
      lastMessageAt: conversationsTable.lastMessageAt,
    })
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.user1ClerkId, clerkId),
        eq(conversationsTable.user2ClerkId, clerkId)
      )
    )
    .orderBy(desc(conversationsTable.lastMessageAt));

  return c.json({
    conversations: conversations.map((conv) => ({
      id: conv.id,
      otherUserClerkId:
        conv.user1ClerkId === clerkId ? conv.user2ClerkId : conv.user1ClerkId,
      createdAt: conv.createdAt.toISOString(),
      lastMessageAt: conv.lastMessageAt?.toISOString() || null,
    })),
  }, 200);
});

// GET /conversations/:conversationId/messages route
const getMessagesRoute = createRoute({
  method: "get",
  path: "/{conversationId}/messages",
  tags: ["Conversations"],
  summary: "Get messages in a conversation",
  description: "Returns paginated messages in a specific conversation",
  request: {
    headers: HeadersSchema,
    params: ConversationIdParamSchema,
    query: MessageQuerySchema,
  },
  responses: {
    200: {
      description: "Messages retrieved successfully",
      content: {
        "application/json": {
          schema: MessagesResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid conversation ID",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Missing authentication",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Conversation not found or access denied",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

conversationsRouter.openapi(getMessagesRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");
  const conversationId = parseInt(c.req.param("conversationId"));

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  if (isNaN(conversationId)) {
    return c.json({ error: "Invalid conversation ID" }, 400);
  }

  // Verify user is part of this conversation
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        or(
          eq(conversationsTable.user1ClerkId, clerkId),
          eq(conversationsTable.user2ClerkId, clerkId)
        )
      )
    )
    .limit(1);

  if (!conversation) {
    return c.json({ error: "Conversation not found or access denied" }, 404);
  }

  // Get optional pagination params
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  // Get messages
  const messages = await db
    .select({
      id: messagesTable.id,
      fromClerkId: messagesTable.fromClerkId,
      toClerkId: messagesTable.toClerkId,
      content: messagesTable.content,
      messageType: messagesTable.messageType,
      isRead: messagesTable.isRead,
      readAt: messagesTable.readAt,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    conversationId,
    messages: messages.map((msg) => ({
      id: msg.id,
      fromClerkId: msg.fromClerkId,
      toClerkId: msg.toClerkId,
      content: msg.content,
      messageType: msg.messageType,
      isRead: msg.isRead,
      readAt: msg.readAt?.toISOString() || null,
      createdAt: msg.createdAt.toISOString(),
      isMine: msg.fromClerkId === clerkId,
    })),
  }, 200);
});

export default conversationsRouter;
