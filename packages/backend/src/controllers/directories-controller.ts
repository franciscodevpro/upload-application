import { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { directoryRepository, fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";

export const directoriesController = (expressServer: Express) => {
  // 5. Create Directory
  expressServer.post("/api/directories", authMiddleware, async (req, res) => {
    try {
      const { name, parent, path: dirPath } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const id = randomUUID();
      const now = new Date().toISOString();

      await directoryRepository.create({
        id,
        name,
        size: 0,
        parent: parent || null,
        path: dirPath || null,
        createdAt: now,
        updatedAt: now,
        userId: (req as any).userId || null,
      });

      res.status(201).json({
        id,
        name,
        size: 0,
        parent: parent || null,
        path: dirPath || null,
        createdAt: now,
        updatedAt: now,
        status: "active",
      });
    } catch (error) {
      console.error("Error creating directory:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 6. List All Directories
  expressServer.get("/api/directories", authMiddleware, async (req, res) => {
    try {
      const parentQuery = req.query.parent;
      const parent = typeof parentQuery === "string" ? parentQuery : null;
      const directories = await directoryRepository.list({
        parent,
        userId: (req as any).userId || null,
      });
      res.json(directories);
    } catch (error) {
      console.error("Error listing directories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 7. Get Directory by ID
  expressServer.get(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;
        const directory = await directoryRepository.findById(
          id,
          (req as any).userId || null,
        );

        if (!directory) {
          return res.status(404).json({ error: "Directory not found" });
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
          const parentDirectory = await directoryRepository.findById(
            current.parent,
          );
          if (!parentDirectory) break;
          current = parentDirectory;
        }

        res.json({
          ...directory,
          address,
        });
      } catch (error) {
        console.error("Error fetching directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // 8. Get Subdirectories by Parent ID
  expressServer.get(
    "/api/directories/:parentId/subdirectories",
    authMiddleware,
    async (req, res) => {
      try {
        const { parentId } = req.params;
        const subdirectories = await directoryRepository.findByParent(
          parentId,
          (req as any).userId || null,
        );
        res.json(subdirectories);
      } catch (error) {
        console.error("Error fetching subdirectories:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // 9. Update Directory
  expressServer.put(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { name, path: dirPath, size } = req.body;

        const directory = await directoryRepository.findById(
          id,
          (req as any).userId || null,
        );
        if (!directory) {
          return res.status(404).json({ error: "Directory not found" });
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (dirPath !== undefined) updates.path = dirPath;
        if (size !== undefined) updates.size = size;

        await directoryRepository.update(
          id,
          (req as any).userId || null,
          updates,
        );

        const updatedDirectory = await directoryRepository.findById(id);
        res.json(updatedDirectory);
      } catch (error) {
        console.error("Error updating directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  const deleteFileFromPath = async (filePath: string) => {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  };

  const deleteFilesInDirectory = async (
    directoryId: string,
    userId: string | null,
  ) => {
    const files = await fileRepository.findByParent(directoryId);
    for (const file of files) {
      if (file.id) {
        await fileRepository.delete(file.id, userId);
      }
      if (file.path) {
        await deleteFileFromPath(file.path);
      }
    }
  };

  const deleteDirectories = async (
    directoryId: string,
    userId: string | null,
  ): Promise<void> => {
    const subdirectories = await directoryRepository.findByParent(
      directoryId,
      userId,
    );

    if (subdirectories.length > 0) {
      for (const subdir of subdirectories) {
        if (subdir.id) {
          await deleteDirectories(subdir.id, userId);
        }
      }
    }

    await directoryRepository.delete(directoryId, userId);
    await deleteFilesInDirectory(directoryId, userId);
  };

  // 10. Delete (Invalidate) Directory
  expressServer.delete(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;

        const directory = await directoryRepository.findById(
          id,
          (req as any).userId || null,
        );
        if (!directory) {
          return res.status(404).json({ error: "Directory not found" });
        }

        await deleteDirectories(id, (req as any).userId || null);

        res.json({ message: "Directory deleted successfully", id });
      } catch (error) {
        console.error("Error deleting directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );
};
