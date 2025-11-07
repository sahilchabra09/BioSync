import { integer, pgTable, serial, text, timestamp, varchar, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    userClerkId: varchar("user_clerk_id", { length: 255 })
      .notNull()
      .references(() => usersTable.clerkId),
    contactClerkId: varchar("contact_clerk_id", { length: 255 })
      .notNull()
      .references(() => usersTable.clerkId),
    nickname: varchar("nickname", { length: 255 }),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at"),
    unreadCount: integer("unread_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: Can't add same person twice
    uniqueUserContact: unique("unique_user_contact").on(table.userClerkId, table.contactClerkId),
    // Indexes for performance
    userClerkIdIdx: index("idx_user_clerk_id").on(table.userClerkId),
    lastMessageAtIdx: index("idx_last_message_at").on(table.lastMessageAt),
  })
);
