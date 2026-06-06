import { randomUUID } from "node:crypto";
import { BadRequestError } from "../errors/bad-request-error";
import { NotFoundError } from "../errors/not-found-error";
import {
  directoryRepository as DirectoryRepository,
  fileRepository as FileRepository,
} from "../repository/sqlite";
import { deleteFileFromPath } from "../utils/delete-files-utils";

export class DirectoryService {
  constructor(
    private readonly directoryRepository: typeof DirectoryRepository,
    private readonly fileRepository: typeof FileRepository,
  ) {}

  async create(params: {
    name: string;
    parent?: string | null;
    path?: string | null;
    userId: string | null;
  }) {
    const { name, parent, path: dirPath, userId } = params;

    if (!name) {
      throw new BadRequestError("Name is required");
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.directoryRepository.create({
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath || (null as any),
      createdAt: now,
      updatedAt: now,
      userId: userId || null,
    });

    return {
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath || (null as any),
      createdAt: now,
      updatedAt: now,
      userId: userId || null,
    };
  }

  // 6. List All Directories
  async getAll(params: {
    parent?: string | null;
    userId: string | null;
  }): Promise<any> {
    const { parent, userId } = params;
    const directories = await this.directoryRepository.list({
      parent,
      userId: userId || null,
    });
    return directories;
  }

  // 7. Get Directory by ID
  async getOne(params: { id: string; userId: string | null }) {
    const { id, userId } = params;
    const directory = await this.directoryRepository.findById(
      id,
      userId || null,
    );

    if (!directory) {
      throw new NotFoundError("Directory not found");
    }

    const visited = new Set<string>();
    const address: Array<{ id: string; name: string }> = [];
    let current: typeof directory | undefined = directory;

    while (current) {
      const currentId = current.id;
      if (!currentId || visited.has(currentId)) break;

      visited.add(currentId);
      address.unshift({
        id: currentId,
        name: current.name ?? "",
      });

      if (!current.parent) break;
      const parentDirectory = await this.directoryRepository.findById(
        current.parent,
        userId || null,
      );
      if (!parentDirectory) break;
      current = parentDirectory;
    }

    return {
      ...directory,
      address,
    };
  }

  // 8. Get Subdirectories by Parent ID
  async getSubdirectories(params: {
    parentId: string;
    userId: string | null;
  }): Promise<any> {
    const { parentId, userId } = params;
    const subdirectories = await this.directoryRepository.findByParent(
      parentId,
      userId || null,
    );
    return subdirectories;
  }

  // 9. Update Directory
  async update(params: {
    id: string;
    name?: string;
    path?: string;
    size?: number;
    userId: string | null;
  }): Promise<any> {
    const { id, name, path: dirPath, size, userId } = params;

    const directory = await this.directoryRepository.findById(
      id,
      userId || null,
    );
    if (!directory) {
      throw new NotFoundError("Directory not found");
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (dirPath !== undefined) updates.path = dirPath;
    if (size !== undefined) updates.size = size;

    await this.directoryRepository.update(id, userId || null, updates);

    const updatedDirectory = await this.directoryRepository.findById(id);
    return updatedDirectory;
  }

  async deleteFilesInDirectory(directoryId: string, userId: string | null) {
    const files = await this.fileRepository.findByParent(directoryId);
    for (const file of files) {
      if (file.id) {
        await this.fileRepository.delete(file.id, userId);
      }
      if (file.path) {
        await deleteFileFromPath(file.path);
      }
    }
  }

  async deleteDirectories(
    directoryId: string,
    userId: string | null,
  ): Promise<void> {
    const subdirectories = await this.directoryRepository.findByParent(
      directoryId,
      userId,
    );

    if (subdirectories.length > 0) {
      for (const subdir of subdirectories) {
        if (subdir.id) {
          await this.deleteDirectories(subdir.id, userId);
        }
      }
    }

    await this.directoryRepository.delete(directoryId, userId);
    await this.deleteFilesInDirectory(directoryId, userId);
  }

  // 10. Delete (Invalidate) Directory
  async delete(params: { id: string; userId: string | null }) {
    const { id, userId } = params;

    const directory = await this.directoryRepository.findById(
      id,
      userId || null,
    );
    if (!directory) {
      throw new NotFoundError("Directory not found");
    }

    await this.deleteDirectories(id, userId);

    return { message: "Directory deleted successfully", id };
  }
}
