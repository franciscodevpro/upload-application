import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  password: text().notNull(),
  refreshToken: text(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  status: text().default("active"), // active, deleted
});
