import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1ClerkId: varchar("user1_clerk_id", { length: 255 })
    .notNull()
    .references(() => usersTable.clerkId),
  user2ClerkId: varchar("user2_clerk_id", { length: 255 })
    .notNull()
    .references(() => usersTable.clerkId),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),
});
