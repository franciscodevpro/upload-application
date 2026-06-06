import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { UploadFilesService } from "../services/upload-files-service";
import { validateUserCanWrite } from "../utils/user-rights-validator";
import { logger } from "../utils/logger-utils";

export const uploadFilesController = (expressServer: Express) => {
  expressServer.all("/api/upload/*", authMiddleware, (req, res) => {
    const accessRights = (req as any).userRights || null;

    if (!validateUserCanWrite(accessRights)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userId = (req as any).userId;

    logger.info(`Usuário ${userId} está fazendo upload...`);
    new UploadFilesService(fileRepository).handle(req, res);
  });
};
