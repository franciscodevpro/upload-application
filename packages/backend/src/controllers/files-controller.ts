import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { FilesService } from "../services/files-service";
import { NotFoundError } from "../errors/not-found-error";

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
      console.error("Error listing file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.put("/api/files/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { parent, originalName } = req.body;

      const updatedFile = await filesService.update({
        id,
        parent,
        originalName,
        userId: (req as any).userId,
      });

      res.json(updatedFile);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }

      console.error("Error updating file:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  expressServer.delete("/api/files/:id", authMiddleware, async (req, res) => {
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
      console.error("Error deleting file:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};
