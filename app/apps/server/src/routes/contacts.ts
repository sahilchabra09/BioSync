import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { db } from "../db/connections";
import { contactsTable, usersTable } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { clerkClient } from "@clerk/clerk-sdk-node";

const contactsRouter = new OpenAPIHono();

// Schema definitions
const ContactSchema = z.object({
  id: z.number(),
  contactClerkId: z.string(),
  contactName: z.string().nullable(),
  nickname: z.string().nullable(),
  profileImage: z.string().nullable(),
  lastMessagePreview: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  unreadCount: z.number(),
  status: z.enum(["online", "offline"]),
  isParalyzed: z.boolean(),
});

const ContactsResponseSchema = z.object({
  contacts: z.array(ContactSchema),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const AddContactRequestSchema = z.object({
  contactClerkId: z.string().openapi({
    description: "Clerk ID of the user to add as contact",
    example: "user_789012",
  }),
  nickname: z.string().optional().openapi({
    description: "Optional nickname for the contact",
    example: "Best Friend",
  }),
});

const AddContactResponseSchema = z.object({
  success: z.boolean(),
  contact: ContactSchema,
});

const HeadersSchema = z.object({
  "x-clerk-id": z.string().openapi({
    description: "Clerk user ID from authentication",
    example: "user_123456",
  }),
});

// GET /contacts route
const getContactsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Contacts"],
  summary: "Get all contacts for current user",
  description: "Returns list of contacts with last message preview, unread count, and online status",
  request: {
    headers: HeadersSchema,
  },
  responses: {
    200: {
      description: "Contacts retrieved successfully",
      content: {
        "application/json": {
          schema: ContactsResponseSchema,
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

contactsRouter.openapi(getContactsRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  // Get all contacts with user details
  const contacts = await db
    .select({
      id: contactsTable.id,
      contactClerkId: contactsTable.contactClerkId,
      nickname: contactsTable.nickname,
      lastMessagePreview: contactsTable.lastMessagePreview,
      lastMessageAt: contactsTable.lastMessageAt,
      unreadCount: contactsTable.unreadCount,
      status: usersTable.status,
      isParalyzed: usersTable.isParalyzed,
    })
    .from(contactsTable)
    .leftJoin(usersTable, eq(contactsTable.contactClerkId, usersTable.clerkId))
    .where(eq(contactsTable.userClerkId, clerkId))
    .orderBy(desc(contactsTable.lastMessageAt));

  const uniqueContactIds = Array.from(new Set(contacts.map((contact) => contact.contactClerkId)));
  const clerkUserMap = new Map<string, Awaited<ReturnType<typeof clerkClient.users.getUser>>>();

  if (uniqueContactIds.length > 0) {
    const clerkUsersResults = await Promise.allSettled(
      uniqueContactIds.map((id) => clerkClient.users.getUser(id))
    );

    clerkUsersResults.forEach((result, index) => {
      const contactId = uniqueContactIds[index];
      if (!contactId) {
        return;
      }

      if (result.status === "fulfilled") {
        clerkUserMap.set(contactId, result.value);
      }
    });
  }

  return c.json({
    contacts: contacts.map((contact) => ({
      id: contact.id,
      contactClerkId: contact.contactClerkId,
      contactName:
        clerkUserMap.get(contact.contactClerkId)?.fullName ||
        clerkUserMap.get(contact.contactClerkId)?.username ||
        null,
      nickname: contact.nickname,
      profileImage: clerkUserMap.get(contact.contactClerkId)?.imageUrl || null,
      lastMessagePreview: contact.lastMessagePreview,
      lastMessageAt: contact.lastMessageAt?.toISOString() || null,
      unreadCount: contact.unreadCount,
      status: (contact.status || "offline") as "online" | "offline",
      isParalyzed: contact.isParalyzed || false,
    })),
  }, 200);
});

// POST /contacts route
const addContactRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Contacts"],
  summary: "Add a new contact",
  description: "Add a user as a contact by their Clerk ID",
  request: {
    headers: HeadersSchema,
    body: {
      content: {
        "application/json": {
          schema: AddContactRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Contact added successfully",
      content: {
        "application/json": {
          schema: AddContactResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request (e.g., user not found, already a contact)",
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

contactsRouter.openapi(addContactRoute, async (c) => {
  const clerkId = c.req.header("x-clerk-id");

  if (!clerkId) {
    return c.json({ error: "Missing Clerk ID" }, 401);
  }

  const { contactClerkId, nickname } = await c.req.json();

  try {
    // Check if user exists in Clerk
    const clerkUser = await clerkClient.users.getUser(contactClerkId);

    if (!clerkUser) {
      return c.json({ error: "User not found" }, 400);
    }

    // Check if already a contact
    const existing = await db
      .select()
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.userClerkId, clerkId),
          eq(contactsTable.contactClerkId, contactClerkId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "User is already a contact" }, 400);
    }

    // Get or create user in our DB to store status
    let [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, contactClerkId))
      .limit(1);

    if (!dbUser) {
      // Create user record with default values
      [dbUser] = await db
        .insert(usersTable)
        .values({
          clerkId: contactClerkId,
          status: "offline",
          isParalyzed: false,
        })
        .returning();
    }

    // Add contact
    const [newContact] = await db
      .insert(contactsTable)
      .values({
        userClerkId: clerkId,
        contactClerkId,
        nickname: nickname || null,
      })
      .returning();

    if (!newContact || !dbUser) {
      return c.json({ error: "Failed to add contact" }, 400);
    }

    return c.json(
      {
        success: true,
        contact: {
          id: newContact.id,
          contactClerkId: newContact.contactClerkId,
          contactName: clerkUser.fullName,
          nickname: newContact.nickname,
          profileImage: clerkUser.imageUrl,
          lastMessagePreview: null,
          lastMessageAt: null,
          unreadCount: 0,
          status: dbUser.status as "online" | "offline",
          isParalyzed: dbUser.isParalyzed,
        },
      },
      200
    );
  } catch (error) {
    console.error("Error adding contact:", error);
    return c.json({ error: "Failed to add contact" }, 400);
  }
});

export default contactsRouter;
