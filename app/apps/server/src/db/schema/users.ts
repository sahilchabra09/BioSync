import { boolean, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  clerkId: varchar("clerk_id", { length: 255 }).primaryKey(),
  isParalyzed: boolean("is_paralyzed").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("online").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
