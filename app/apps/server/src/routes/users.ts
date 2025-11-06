import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../db/connections";
import { usersTable } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/clerk-sdk-node";

const usersRouter = new OpenAPIHono();

// Schema definitions
const UserResponseSchema = z.object({
  clerkId: z.string(),
  isParalyzed: z.boolean(),
  status: z.enum(["online", "offline"]),
  createdAt: z.string(),
});

const CreateUserRequestSchema = z.object({
  isParalyzed: z.boolean().openapi({
    description: "Whether the user is paralyzed and needs eye-tracking UI",
    example: false,
  }),
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

// GET /users/me route
const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  summary: "Get current user profile",
  description: "Returns user profile or null if user doesn't exist (first-time user)",
  request: {
    headers: HeadersSchema,
  },
  responses: {
    200: {
      description: "User profile retrieved successfully or null for new users",
      content: {
        "application/json": {
          schema: z.union([UserResponseSchema, z.null()]),
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

usersRouter.openapi(getMeRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  // Try to find user in DB
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  // Return null if user doesn't exist (first-time user - needs onboarding)
  if (!user) {
    return c.json(null, 200);
  }

  // Update status to online when they access the app
  const [updatedUser] = await db
    .update(usersTable)
    .set({ status: "online" })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!updatedUser) {
    return c.json(null, 200);
  }

  return c.json({
    clerkId: updatedUser.clerkId,
    isParalyzed: updatedUser.isParalyzed,
    status: updatedUser.status as "online" | "offline",
    createdAt: updatedUser.createdAt.toISOString(),
  }, 200);
});

// POST /users - Create new user with isParalyzed preference
const createUserRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Users"],
  summary: "Create user profile",
  description: "Create user profile with isParalyzed preference (onboarding)",
  request: {
    headers: HeadersSchema,
    body: {
      content: {
        "application/json": {
          schema: CreateUserRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: UserResponseSchema,
        },
      },
    },
    400: {
      description: "User already exists",
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
  },
});

usersRouter.openapi(createUserRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  const { isParalyzed } = await c.req.json();

  // Check if user already exists
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "User already exists" }, 400);
  }

  // Create new user
  const [user] = await db
    .insert(usersTable)
    .values({
      clerkId,
      status: "online",
      isParalyzed,
    })
    .returning();

  if (!user) {
    return c.json({ error: "Failed to create user" }, 400);
  }

  return c.json({
    clerkId: user.clerkId,
    isParalyzed: user.isParalyzed,
    status: user.status as "online" | "offline",
    createdAt: user.createdAt.toISOString(),
  }, 200);
});

// GET /users/search?q=username - Search users by username
const searchUsersRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Users"],
  summary: "Search users by username",
  description: "Search for users to add as contacts",
  request: {
    headers: HeadersSchema,
    query: z.object({
      q: z.string().min(1).openapi({
        description: "Search query (username)",
        example: "john",
      }),
    }),
  },
  responses: {
    200: {
      description: "List of matching users",
      content: {
        "application/json": {
          schema: z.object({
            users: z.array(UserResponseSchema.extend({
              username: z.string(),
              email: z.string(),
              fullName: z.string().nullable(),
              profileImage: z.string().nullable(),
            })),
          }),
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

usersRouter.openapi(searchUsersRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");
  const query = c.req.query("q");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  if (!query) {
    return c.json({ users: [] }, 200);
  }

  try {
    // Search users via Clerk API
    const clerkUsers = await clerkClient.users.getUserList({
      query: query,
      limit: 10,
    });

    // Filter out current user and get their status from our DB
    const userIds = clerkUsers.data
      .filter((user) => user.id !== clerkId)
      .map((user) => user.id);

    // Get user status from our database for all found users
    const dbUsers = userIds.length > 0 
      ? await db
          .select()
          .from(usersTable)
          .where(inArray(usersTable.clerkId, userIds))
      : [];

    const dbUsersMap = new Map(
      dbUsers.map((user) => [user.clerkId, user])
    );

    const users = clerkUsers.data
      .filter((user) => user.id !== clerkId)
      .map((user) => {
        const dbUser = dbUsersMap.get(user.id);
        return {
          clerkId: user.id,
          username: user.username || user.emailAddresses[0]?.emailAddress || "unknown",
          email: user.emailAddresses[0]?.emailAddress || "",
          fullName: user.fullName,
          profileImage: user.imageUrl,
          isParalyzed: dbUser?.isParalyzed ?? false,
          status: (dbUser?.status as "online" | "offline") ?? "offline",
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        };
      });

    return c.json({ users }, 200);
  } catch (error) {
    console.error("Error searching users:", error);
    return c.json({ users: [] }, 200);
  }
});

export default usersRouter;
