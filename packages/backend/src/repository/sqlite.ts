import Database from "better-sqlite3";
import { and, eq, isNull, or } from "drizzle-orm";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { files } from "../db/schemas/files";
import { directories } from "../db/schemas/directories";
import { users } from "../db/schemas/users";
import { UserRightsEnum } from "../enums/user-rights-enum";

var db:
  | (BetterSQLite3Database<Record<string, never>> & {
      $client: Database.Database;
    })
  | null = null;

export const dbInstance = () => {
  if (!db) {
    const sqlite = new Database("./files_database.db");
    db = drizzle({ client: sqlite });
  }

  return db;
};

// Open a database file (or create if it doesn't exist)
//const db = new Database("files_database.db");

export const initializeDatabase = () => {
  // Create a table
  db = dbInstance();
  db.run(
    `
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
      status TEXT DEFAULT 'active',
      userId TEXT REFERENCES users(id),
      privacy TEXT DEFAULT 'private'
    )
    `,
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS directories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      parent TEXT,
      path TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      userId TEXT REFERENCES users(id),
      privacy TEXT DEFAULT 'private'
    )
    `,
  );

  db.run(
    `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      refreshToken TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      access_rights TEXT DEFAULT '${UserRightsEnum.READ},${UserRightsEnum.WRITE}'
    )
    `,
  );
};

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
  userId: string | null;
  privacy: string | null;
}

interface IDirectory {
  id: string;
  name: string;
  size: number;
  parent: string | null;
  path: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  userId: string | null;
  privacy: string;
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

interface IUser {
  id: string;
  email: string;
  password: string;
  refreshToken: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  access_rights: string;
}

interface IUserNullable {
  id: string | null;
  email: string | null;
  password: string | null;
  refreshToken: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  status: string | null;
  access_rights: string | null;
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
    userId = null,
  }: Omit<IFiles, "status" | "privacy">): Promise<any> {
    return dbInstance().insert(files).values({
      id,
      originalName,
      newName,
      extension,
      size,
      type,
      uploadAt,
      path,
      parent,
      status: "active",
      userId,
      privacy: "private",
    });
  },

  async list({
    parent = null,
    userId = null,
  }: {
    parent?: string | null;
    userId?: string | null;
  }): Promise<IFiles[]> {
    return dbInstance()
      .select()
      .from(files)
      .where(
        and(
          eq(files.status, "active"),
          parent ? eq(files.parent, parent) : isNull(files.parent),
          userId
            ? eq(files.userId, userId)
            : or(isNull(files.userId), eq(files.privacy, "public")),
        ),
      );
  },

  async listAllEvenNotActiveByUserId(userId: string): Promise<IFiles[]> {
    return dbInstance().select().from(files).where(eq(files.userId, userId));
  },

  async findById(
    id: string,
    userId: string | null = null,
  ): Promise<IFiles | undefined> {
    const data = await dbInstance()
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, id),
          userId
            ? eq(files.userId, userId)
            : or(isNull(files.userId), eq(files.privacy, "public")),
        ),
      );
    return data.at(0);
  },

  async findByParent(
    parentId: string,
    userId: string | null = null,
  ): Promise<IFiles[]> {
    return dbInstance()
      .select()
      .from(files)
      .where(
        and(
          eq(files.parent, parentId),
          userId
            ? eq(files.userId, userId)
            : or(isNull(files.userId), eq(files.privacy, "public")),
        ),
      );
  },

  async update(
    id: string,
    userId: string | null = null,
    updates: Partial<Omit<IFiles, "id">>,
  ): Promise<any> {
    return dbInstance()
      .update(files)
      .set(updates)
      .where(
        and(
          eq(files.id, id),
          userId ? eq(files.userId, userId) : isNull(files.userId),
        ),
      );
  },

  async delete(id: string, userId: string | null = null): Promise<any> {
    return dbInstance()
      .delete(files)
      .where(
        and(
          eq(files.id, id),
          userId ? eq(files.userId, userId) : isNull(files.userId),
        ),
      );
  },

  async deleteByUserId(userId: string): Promise<any> {
    return dbInstance().delete(files).where(eq(files.userId, userId));
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
    userId = null,
  }: Omit<IDirectory, "status" | "privacy">): Promise<any> {
    return dbInstance().insert(directories).values({
      id,
      name,
      size,
      parent,
      path,
      createdAt,
      updatedAt,
      status: "active",
      userId,
      privacy: "private",
    });
  },

  async list({
    parent = null,
    userId = null,
  }: {
    parent?: string | null;
    userId?: string | null;
  }): Promise<IDirectoryNullable[]> {
    return dbInstance()
      .select()
      .from(directories)
      .where(
        and(
          eq(directories.status, "active"),
          parent ? eq(directories.parent, parent) : isNull(directories.parent),
          userId
            ? eq(directories.userId, userId)
            : or(isNull(directories.userId), eq(directories.privacy, "public")),
        ),
      );
  },

  async findById(
    id: string,
    userId: string | null = null,
  ): Promise<IDirectoryNullable | undefined> {
    const data = await dbInstance()
      .select()
      .from(directories)
      .where(
        and(
          eq(directories.id, id),
          userId
            ? eq(directories.userId, userId)
            : or(isNull(directories.userId), eq(directories.privacy, "public")),
        ),
      );
    return data.at(0);
  },

  async findByParent(
    parentId: string,
    userId: string | null = null,
  ): Promise<IDirectoryNullable[]> {
    return dbInstance()
      .select()
      .from(directories)
      .where(
        and(
          eq(directories.parent, parentId),
          userId
            ? eq(directories.userId, userId)
            : or(isNull(directories.userId), eq(directories.privacy, "public")),
        ),
      );
  },

  async update(
    id: string,
    userId: string | null = null,
    updates: Partial<Omit<IDirectory, "id">>,
  ): Promise<any> {
    return dbInstance()
      .update(directories)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(directories.id, id),
          userId ? eq(directories.userId, userId) : isNull(directories.userId),
        ),
      );
  },

  async delete(id: string, userId: string | null = null): Promise<any> {
    return dbInstance()
      .delete(directories)
      .where(
        and(
          eq(directories.id, id),
          userId ? eq(directories.userId, userId) : isNull(directories.userId),
        ),
      );
  },

  async deleteByUserId(userId: string): Promise<any> {
    return dbInstance()
      .delete(directories)
      .where(eq(directories.userId, userId));
  },
};

export const userRepository = {
  async create({
    id,
    email,
    password,
    createdAt,
    updatedAt,
  }: Omit<IUser, "refreshToken" | "status" | "access_rights"> & {
    refreshToken?: string | null;
    access_rights?: string | null;
  }): Promise<any> {
    return dbInstance()
      .insert(users)
      .values({
        id,
        email,
        password,
        refreshToken: null,
        createdAt,
        updatedAt,
        status: "active",
        access_rights: UserRightsEnum.READ + "," + UserRightsEnum.WRITE,
      });
  },

  async findByEmail(email: string): Promise<IUserNullable | undefined> {
    const data = await dbInstance()
      .select()
      .from(users)
      .where(eq(users.email, email));
    return data.at(0);
  },

  async findById(id: string): Promise<IUserNullable | undefined> {
    const data = await dbInstance()
      .select()
      .from(users)
      .where(eq(users.id, id));
    return data.at(0);
  },

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<any> {
    return dbInstance()
      .update(users)
      .set({
        refreshToken,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id));
  },

  async delete(id: string): Promise<any> {
    return dbInstance().delete(users).where(eq(users.id, id));
  },
};
