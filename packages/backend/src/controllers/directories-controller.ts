import { Express } from "express";
import { directoryRepository, fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { DirectoryService } from "../services/directories-service";
import { BadRequestError } from "../errors/bad-request-error";
import { NotFoundError } from "../errors/not-found-error";

export const directoriesController = (expressServer: Express) => {
  const directoryService = new DirectoryService(
    directoryRepository,
    fileRepository,
  );

  expressServer.post("/api/directories", authMiddleware, async (req, res) => {
    try {
      const result = await directoryService.create({
        ...req.body,
        userId: (req as any).userId,
      });

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error creating directory:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.get("/api/directories", authMiddleware, async (req, res) => {
    try {
      const result = await directoryService.getAll({
        parent: req.query.parent as any,
        userId: (req as any).userId,
      });
      res.json(result);
    } catch (error) {
      console.error("Error listing directories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.get(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const result = await directoryService.getOne({
          id: req.params.id,
          userId: (req as any).userId,
        });

        res.json(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).json({ error: error.message });
        }
        console.error("Error fetching directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  expressServer.get(
    "/api/directories/:parentId/subdirectories",
    authMiddleware,
    async (req, res) => {
      try {
        const result = await directoryService.getSubdirectories({
          parentId: req.params.parentId,
          userId: (req as any).userId,
        });
        res.json(result);
      } catch (error) {
        console.error("Error fetching subdirectories:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  expressServer.put(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const result = await directoryService.update({
          ...req.body,
          id: req.params.id,
          userId: (req as any).userId,
        });
        res.json(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).json({ error: error.message });
        }
        console.error("Error updating directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  expressServer.delete(
    "/api/directories/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const result = await directoryService.delete({
          id: req.params.id,
          userId: (req as any).userId,
        });

        res.json(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return res.status(404).json({ error: error.message });
        }
        console.error("Error deleting directory:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );
};
