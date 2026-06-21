import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { UploadFilesService } from "../services/upload-files-service";
import { validateUserCanWrite } from "../utils/user-rights-validator";

export const uploadFilesController = (expressServer: Express) => {
  expressServer.all("/v1/upload/*", authMiddleware, (req, res) => {
    const accessRights = (req as any).userRights || null;

    if (!validateUserCanWrite(accessRights)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    new UploadFilesService(fileRepository).handle(req, res);
  });
};
