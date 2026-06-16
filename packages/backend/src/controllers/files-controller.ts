import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { FilesService } from "../services/files-service";
import { NotFoundError } from "../errors/not-found-error";
import {
  validateUserCanUploadPublicFiles,
  validateUserCanWrite,
} from "../utils/user-rights-validator";
import { logger } from "../utils/logger-utils";

export const filesController = (expressServer: Express) => {
  const filesService = new FilesService(fileRepository);

  expressServer.get("/api/files", authMiddleware, async (req, res) => {
    try {
      const result = await filesService.findAll({
        parent: req.query.parent as string,
        userId: (req as any).userId,
      });
      res.json(
        result.map((file) => ({
          ...file,
          name: file.originalName,
          date: file.uploadAt,
        })),
      );
    } catch (error) {
      logger.error("Error listing file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.get("/api/files/limit", authMiddleware, async (req, res) => {
    try {
      const result = await filesService.findLimitAndSize({
        userId: (req as any).userId,
      });
      res.json(result);
    } catch (error) {
      logger.error("Error finding limit size:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.put("/api/files/:id", authMiddleware, async (req, res) => {
    if (!validateUserCanWrite((req as any).userRights)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      req.body.privacy &&
      !validateUserCanUploadPublicFiles((req as any).userRights)
    ) {
      return res.status(403).json({ error: "Forbidden to set public privacy" });
    }

    try {
      const { id } = req.params;
      const { parent, originalName } = req.body;

      const updatedFile = await filesService.update({
        id,
        parent,
        originalName,
        userId: (req as any).userId,
        privacy: req.body.privacy,
      });

      res.json(updatedFile);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }

      logger.error("Error updating file:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.delete("/api/files/:id", authMiddleware, async (req, res) => {
    if (!validateUserCanWrite((req as any).userRights)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const result = await filesService.delete({
        id: req.params.id,
        userId: (req as any).userId,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      logger.error("Error deleting file:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};
