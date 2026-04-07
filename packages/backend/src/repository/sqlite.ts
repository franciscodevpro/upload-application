import Database from "better-sqlite3";
import { eq, Table } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { files } from "../db/schemas/files";
import { directories } from "../db/schemas/directories";

const sqlite = new Database("./files_database.db");
const db = drizzle({ client: sqlite });

// Open a database file (or create if it doesn't exist)
//const db = new Database("files_database.db");

// Create a table
db.run(`
  CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(200) PRIMARY KEY,
    originalName TEXT,
    newName TEXT,
    extension VARCHAR(50),
    size INTEGER,
    type VARCHAR(100),
    uploadAt VARCHAR(200),
    path TEXT,
    parent TEXT,
    status TEXT DEFAULT 'active'
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS directories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    parent TEXT,
    path TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    status TEXT DEFAULT 'active'
  )
`);

interface IFiles {
  id: string | null;
  originalName: string | null;
  newName: string | null;
  extension: string | null;
  size: number | null;
  type: string | null;
  uploadAt: string | null;
  path: string | null;
  parent: string | null;
  status: string | null;
}

interface IDirectory {
  id: string;
  name: string;
  size: number;
  parent: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface IDirectoryNullable {
  id: string | null;
  name: string | null;
  size: number | null;
  parent: string | null;
  path: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  status: string | null;
}

export const fileRepository = {
  async save({
    id,
    originalName,
    newName,
    extension,
    size,
    type,
    uploadAt,
    path,
    parent = null,
    status = "active",
  }: IFiles): Promise<any> {
    return db.insert(files).values({
      id,
      originalName,
      newName,
      extension,
      size,
      type,
      uploadAt,
      path,
      parent,
      status,
    });
  },

  async list(): Promise<IFiles[]> {
    return db.select().from(files).where(eq(files.status, "active"));
  },

  async findById(id: string): Promise<IFiles | undefined> {
    const data = await db.select().from(files).where(eq(files.id, id));
    return data.at(0);
  },

  async findByParent(parentId: string): Promise<IFiles[]> {
    return db.select().from(files).where(eq(files.parent, parentId));
  },

  async update(id: string, updates: Partial<Omit<IFiles, "id">>): Promise<any> {
    return db.update(files).set(updates).where(eq(files.id, id));
  },

  async delete(id: string): Promise<any> {
    return db.update(files).set({ status: "deleted" }).where(eq(files.id, id));
  },
};

export const directoryRepository = {
  async create({
    id,
    name,
    size,
    parent,
    path,
    createdAt,
    updatedAt,
    status,
  }: IDirectory): Promise<any> {
    return db.insert(directories).values({
      id,
      name,
      size,
      parent,
      path,
      createdAt,
      updatedAt,
      status,
    });
  },

  async list(): Promise<IDirectoryNullable[]> {
    return db
      .select()
      .from(directories)
      .where(eq(directories.status, "active"));
  },

  async findById(id: string): Promise<IDirectoryNullable | undefined> {
    const data = await db
      .select()
      .from(directories)
      .where(eq(directories.id, id));
    return data.at(0);
  },

  async findByParent(parentId: string): Promise<IDirectoryNullable[]> {
    return db
      .select()
      .from(directories)
      .where(eq(directories.parent, parentId));
  },

  async update(
    id: string,
    updates: Partial<Omit<IDirectory, "id">>,
  ): Promise<any> {
    return db
      .update(directories)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(directories.id, id));
  },

  async delete(id: string): Promise<any> {
    return db
      .update(directories)
      .set({
        status: "deleted",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(directories.id, id));
  },
};
