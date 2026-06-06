import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { UploadFilesService } from "../services/upload-files-service";

export const uploadFilesController = (expressServer: Express) => {
  expressServer.all("/api/upload/*", authMiddleware, (req, res) => {
    const userId = (req as any).userId;
    console.log(`Usuário ${userId} está fazendo upload...`);
    new UploadFilesService(fileRepository).handle(req, res);
  });
};
