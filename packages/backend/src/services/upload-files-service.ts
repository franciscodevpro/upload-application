import { Request, Response } from "express";
import path from "path";
import fs from "node:fs";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import { randomUUID } from "node:crypto";
import { fileRepository as FileRepository } from "../repository/sqlite";
import { logger as Logger } from "../utils/logger-utils";

export class UploadFilesService {
  tusServer: any;

  logger: typeof Logger = Logger;

  constructor(private readonly fileRepository: typeof FileRepository) {
    const saveFiledataIfDoNotExists = async (filedata: {
      id: string;
      name: string;
      type: string;
      size: number;
      path: string;
      parent: string | null;
      userId: string | null;
    }): Promise<void> => {
      // Informações para o seu relatório/banco de dados
      const fileInfo = {
        id: filedata.id,
        originalName: filedata.name,
        newName: filedata.id,
        extension: path.extname(filedata.name),
        size: filedata.size,
        type: filedata.type,
        uploadAt: new Date().toISOString(),
        path: filedata.path,
        parent: filedata.parent,
        userId: filedata.userId,
      };

      try {
        await this.fileRepository.save(fileInfo);
      } catch (err) {
        this.logger.error("Erro ao processar finalização de arquivo:", err);
      }
    };

    const backendUrl = process.env.BACKEND_URL || "http://localhost:1080";

    this.tusServer = new Server({
      //maxSize: 1 * 1024 * 1024 /*Megabytes*/,
      respectForwardedHeaders: true,
      maxSize: async (req, res) => {
        const maxUploadLimit = process.env?.UPLOAD_DEFAULT_LIMIT
          ? Number(process.env.UPLOAD_DEFAULT_LIMIT)
          : 500 * 1024 * 1024;

        const userStoredSize = await fileRepository.uploadedSize(
          (req as any).userId,
        );

        return userStoredSize
          ? userStoredSize > maxUploadLimit
            ? 1
            : maxUploadLimit - userStoredSize
          : maxUploadLimit;
      },
      path: "/v1/upload",
      generateUrl: (_req, { id }) => {
        return `${backendUrl}/v1/upload/${id}`;
      },
      namingFunction: (req, metadata) => {
        return randomUUID() + path.extname((metadata as any).filename);
      },
      datastore: new FileStore({ directory: this.storagePath }),
      onUploadFinish(req, res, upload) {
        saveFiledataIfDoNotExists({
          id: upload.id,
          name: (upload.metadata as any).filename,
          type: (upload.metadata as any).filetype,
          size: upload.size as number,
          path: (upload.storage as any).path,
          parent: (upload.metadata as any).parentId || null,
          userId: (req as any).userId || null,
        });
        const jsonMetadataFile = path.resolve(
          (upload.storage as any).path + ".json",
        );
        if (fs.existsSync(jsonMetadataFile)) {
          fs.unlinkSync(jsonMetadataFile);
        }
        return Promise.resolve(res);
      },
    });
  }

  storagePath = path.resolve(__dirname, "..", "files");

  async handle(req: Request, res: Response) {
    await this.tusServer.handle(req, res);
  }
}
