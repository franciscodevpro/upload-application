import fs from "node:fs";
import path from "path";
import archiver from "archiver";
import { fileRepository as FileRepository } from "../repository/sqlite";
import { BadRequestError } from "../errors/bad-request-error";
import { NotFoundError } from "../errors/not-found-error";
import { Response } from "express";

export class DownloadFilesService {
  constructor(private readonly fileRepository: typeof FileRepository) {}

  storagePath = path.resolve(__dirname, "files");

  async get(files: string[], userId: string | undefined, res: Response) {
    if (!files || files.length === 0 || !files[0])
      throw new BadRequestError("No file selected");

    if (files.length === 1) {
      // Download de arquivo único (Stream direto)
      const filedata = await this.fileRepository.findById(files[0], userId);
      if (!filedata || !filedata.originalName)
        throw new NotFoundError("File not found");

      const filePath = path.join(this.storagePath, files[0]);
      return res.download(filePath, filedata.originalName, undefined);
    } else {
      // Download múltiplo (Cria ZIP on-the-fly)
      const archive = archiver("zip", { zlib: { level: 5 } });
      res.attachment("download_em_lote.zip");

      archive.pipe(res);
      await Promise.all(
        files.map(async (id) => {
          const filedata = await this.fileRepository.findById(id, userId);
          if (!filedata || !filedata.originalName) return;
          const filePath = path.join(this.storagePath, id);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: filedata.originalName });
          }
        }),
      );
      archive.finalize();
    }
  }
}
