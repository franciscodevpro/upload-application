import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { DownloadFilesService } from "../services/download-files-service";
import { NotFoundError } from "../errors/not-found-error";
import { BadRequestError } from "../errors/bad-request-error";

export const downloadFilesController = (expressServer: Express) => {
  const downloadFilesService = new DownloadFilesService(fileRepository);

  expressServer.get("/api/download", authMiddleware, async (req, res) => {
    const filenames = req.query.files as string | string[];
    const files = Array.isArray(filenames) ? filenames : [filenames];

    try {
      await downloadFilesService.get(files, (req as any).userId, res);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
    }
  });
};
