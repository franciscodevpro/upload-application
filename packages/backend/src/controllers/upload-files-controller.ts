import { Express } from "express";
import path from "path";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import { randomUUID } from "node:crypto";
import { fileRepository } from "../repository/sqlite";
import { authMiddleware } from "../middleware";

export const uploadFilesController = (expressServer: Express) => {
  // Onde os arquivos serão salvos no seu sistema Linux
  const storagePath = path.resolve(__dirname, "..", "files");

  const tusServer = new Server({
    path: "/api/upload",
    namingFunction: (req, metadata) => {
      return randomUUID() + path.extname((metadata as any).filename);
    },
    datastore: new FileStore({ directory: storagePath }),
    onUploadFinish(req, res, upload) {
      console.log(
        `Upload finalizado: ${upload.id} (${upload.size} bytes) usuário: ${(req as any).userId || "desconecido"}`,
      );
      saveFiledataIfDoNotExists({
        id: upload.id,
        name: (upload.metadata as any).filename,
        type: (upload.metadata as any).filetype,
        size: upload.size as number,
        path: (upload.storage as any).path,
        parent: (upload.metadata as any).parentId || null,
        userId: (req as any).userId || null,
      });
      return Promise.resolve(res);
    },
  });

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
      await fileRepository.save(fileInfo);

      console.log(
        `Arquivo processado: ${filedata.name} (${filedata.size} bytes)`,
      );
    } catch (err) {
      console.error("Erro ao processar finalização de arquivo:", err);
    }
  };

  expressServer.all("/api/upload/*", authMiddleware, (req, res) => {
    const userId = (req as any).userId;
    console.log(`Usuário ${userId} está fazendo upload...`);
    tusServer.handle(req, res);
  });
};
