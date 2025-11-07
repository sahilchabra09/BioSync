import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../db/connections";
import { conversationsTable, messagesTable } from "../db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { clerkClient } from "@clerk/clerk-sdk-node";

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

const OtherUserSchema = z.object({
  clerkId: z.string(),
  username: z.string().nullable(),
  fullName: z.string().nullable(),
  profileImage: z.string().nullable(),
  nickname: z.string().nullable(),
});

const MessagesResponseSchema = z.object({
  conversationId: z.number(),
  otherUser: OtherUserSchema.nullable(),
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

  // Determine the other user's Clerk ID
  const contactId = conversation.user1ClerkId === clerkId 
    ? conversation.user2ClerkId 
    : conversation.user1ClerkId;

  // Fetch contact's user data from Clerk
  let otherUser = null;
  try {
    const clerkUser = await clerkClient.users.getUser(contactId);
    otherUser = {
      clerkId: clerkUser.id,
      username: clerkUser.username,
      fullName: clerkUser.fullName || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      profileImage: clerkUser.imageUrl,
      nickname: clerkUser.username || clerkUser.firstName || clerkUser.fullName || null,
    };
  } catch (error) {
    console.error("Failed to fetch contact user data:", error);
    // Continue without user data
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
    otherUser,
    messages: messages
      .reverse()
      .map((msg) => ({
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

// GET /conversations/with/:contactId/messages - Get messages with a specific contact
const getMessagesByContactRoute = createRoute({
  method: "get",
  path: "/with/{contactId}/messages",
  tags: ["Conversations"],
  summary: "Get messages with a specific contact",
  description: "Returns messages with a contact (creates conversation if doesn't exist)",
  request: {
    headers: HeadersSchema,
    params: z.object({
      contactId: z.string().openapi({
        param: {
          name: "contactId",
          in: "path",
        },
        description: "Contact's Clerk ID",
        example: "user_789xyz",
      }),
    }),
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

conversationsRouter.openapi(getMessagesByContactRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");
  const contactId = c.req.param("contactId");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  // Get optional pagination params
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  // Fetch contact's user data from Clerk
  let otherUser = null;
  try {
    const clerkUser = await clerkClient.users.getUser(contactId);
    otherUser = {
      clerkId: clerkUser.id,
      username: clerkUser.username,
      fullName: clerkUser.fullName || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      profileImage: clerkUser.imageUrl,
      nickname: clerkUser.username || clerkUser.firstName || clerkUser.fullName || null,
    };
  } catch (error) {
    console.error("Failed to fetch contact user data:", error);
    // Continue without user data
  }

  // Find or create conversation between these two users
  let conversation = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(
          eq(conversationsTable.user1ClerkId, clerkId),
          eq(conversationsTable.user2ClerkId, contactId)
        ),
        and(
          eq(conversationsTable.user1ClerkId, contactId),
          eq(conversationsTable.user2ClerkId, clerkId)
        )
      )
    )
    .limit(1)
    .then(rows => rows[0]);

  // Create conversation if it doesn't exist
  if (!conversation) {
    const [newConversation] = await db
      .insert(conversationsTable)
      .values({
        user1ClerkId: clerkId,
        user2ClerkId: contactId,
      })
      .returning();
    conversation = newConversation!;
  }

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
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    conversationId: conversation.id,
    otherUser,
    messages: messages
      .reverse()
      .map((msg) => ({
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
