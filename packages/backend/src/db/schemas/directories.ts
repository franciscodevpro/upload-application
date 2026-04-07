import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const directories = sqliteTable("directories", {
  id: text().primaryKey(),
  name: text().notNull(),
  size: integer().default(0),
  parent: text(), // Foreign key to another directory
  path: text().notNull(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  status: text().default("active"), // active, deleted, archived
});
