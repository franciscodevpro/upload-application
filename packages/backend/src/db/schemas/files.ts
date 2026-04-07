import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const files = sqliteTable("files", {
  id: text(),
  originalName: text(),
  newName: text(),
  extension: text(),
  size: integer(),
  type: text(),
  uploadAt: text(),
  path: text(),
  parent: text(), // Foreign key to directories table
  status: text().default("active"), // active, deleted, archived
});
