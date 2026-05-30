import { Express } from "express";
import fs from "node:fs";
import path from "path";
import archiver from "archiver";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";

export const downloadFilesController = (expressServer: Express) => {
  // Onde os arquivos serão salvos no seu sistema Linux
  const storagePath = path.resolve(__dirname, "files");

  // 3. Rota para Download (Unitário ou Múltiplo em ZIP)
  expressServer.get("/api/download", authMiddleware, async (req, res) => {
    const filenames = req.query.files as string | string[];
    const files = Array.isArray(filenames) ? filenames : [filenames];

    if (!files || files.length === 0 || !files[0])
      return res.status(400).json({ error: "No file selected" });

    if (files.length === 1) {
      // Download de arquivo único (Stream direto)
      const filedata = await fileRepository.findById(files[0]);
      if (!filedata || !filedata.originalName)
        return res.status(404).json({ error: "File not found" });
      const filePath = path.join(storagePath, files[0]);
      return res.download(filePath, filedata.originalName, undefined);
    } else {
      // Download múltiplo (Cria ZIP on-the-fly)
      const archive = archiver("zip", { zlib: { level: 5 } });
      res.attachment("download_em_lote.zip");

      archive.pipe(res);
      await Promise.all(
        files.map(async (id) => {
          const filedata = await fileRepository.findById(id);
          if (!filedata || !filedata.originalName) return;
          const filePath = path.join(storagePath, id);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: filedata.originalName });
          }
        }),
      );
      archive.finalize();
    }
  });
};
