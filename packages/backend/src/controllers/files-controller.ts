import { Express } from "express";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";

export const filesController = (expressServer: Express) => {
  expressServer.get("/api/files", authMiddleware, async (req, res) => {
    const parent = (req.query.parent as string) || null; // Garantir que seja null se não fornecido
    const result = await fileRepository.list({
      parent,
      userId: (req as any).userId || null,
    });
    res.json(
      result.map((file) => ({
        ...file,
        name: file.originalName,
        date: file.uploadAt,
      })),
    );
  });

  // 3. Update File
  expressServer.put("/api/files/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { parent, originalName } = req.body;

      const filedata = await fileRepository.findById(id);
      if (!filedata) {
        return res.status(404).json({ error: "File not found" });
      }

      const updates: any = {};
      if (parent !== undefined) updates.parent = parent;
      if (originalName !== undefined) {
        // Preserve the extension
        const extension = filedata.extension;
        updates.originalName = extension
          ? `${originalName}.${extension}`
          : originalName;
      }

      await fileRepository.update(id, (req as any).userId || null, updates);
      const updatedFile = await fileRepository.findById(id);
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 4. Delete File (Mark as deleted)
  expressServer.delete("/api/files/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      const filedata = await fileRepository.findById(
        id,
        (req as any).userId || null,
      );
      if (!filedata) {
        return res.status(404).json({ error: "File not found" });
      }

      await fileRepository.delete(id, (req as any).userId || null);
      res.json({ message: "File deleted successfully", id });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};
