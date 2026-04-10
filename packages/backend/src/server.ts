// server.ts
import fs from "node:fs";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import express from "express";
import cors from "cors";
import archiver from "archiver";
import { randomUUID } from "node:crypto";
import { fileRepository, directoryRepository } from "./repository/sqlite";
import { setupSwagger } from "./swagger";

const app = express();
app.use(cors());
app.use(express.json());
setupSwagger(app);

const host = "127.0.0.1"; // Acessível na rede
const port = 1080;

// Onde os arquivos serão salvos no seu sistema Linux
const storagePath = path.resolve(__dirname, "files");

const tusServer = new Server({
  path: "/upload",
  namingFunction: (req, metadata) => {
    console.log("Naming file");
    console.log({ metadata });
    console.log(randomUUID() + path.extname((metadata as any).filename));
    return randomUUID() + path.extname((metadata as any).filename);
  },
  datastore: new FileStore({ directory: storagePath }),
  onUploadFinish(req, res, upload) {
    console.log({ upload });
    saveFiledataIfDoNotExists({
      id: upload.id,
      name: (upload.metadata as any).filename,
      type: (upload.metadata as any).filetype,
      size: upload.size as number,
      path: (upload.storage as any).path,
      parent: (upload.metadata as any).parentId || null,
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
    status: "active",
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

app.all("/upload/*", (req, res) => {
  tusServer.handle(req, res);
});

app.get("/api/files", async (req, res) => {
  /*fs.readdir(storagePath, (err, files) => {
    if (err) return res.status(500).json({ error: "Erro ao ler diretório" });

    // Filtra arquivos temporários do TUS (terminados em .info ou sem extensão)
    const fileList = files
      .filter((f) => !f.endsWith(".info"))
      .map((name) => ({
        name,
        size: fs.statSync(path.join(storagePath, name)).size,
        date: fs.statSync(path.join(storagePath, name)).mtime,
      }));

    res.json(fileList);
  }); */
  const parent = (req.query.parent as string) || null; // Garantir que seja null se não fornecido
  const result = await fileRepository.list(parent);
  console.log(result);
  res.json(
    result.map((file) => ({
      ...file,
      name: file.originalName,
      date: file.uploadAt,
    })),
  );
});

// 3. Rota para Download (Unitário ou Múltiplo em ZIP)
app.get("/api/download", async (req, res) => {
  const filenames = req.query.files as string | string[];
  const files = Array.isArray(filenames) ? filenames : [filenames];

  if (!files || files.length === 0)
    return res.status(400).send("Nenhum arquivo selecionado");

  if (files.length === 1) {
    // Download de arquivo único (Stream direto)
    const filedata = await fileRepository.findById(files[0]);
    if (!filedata || !filedata.originalName)
      return res.status(404).send("Nenhum arquivo encontrado");
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
          console.log(
            "Adding: ",
            filedata.originalName,
            filedata.size,
            filePath,
          );
        }
      }),
    );
    console.log("Finalize...");
    archive.finalize();
  }
});

// ============================================
// FILE ENDPOINTS
// ============================================

// 3. Update File
app.put("/api/files/:id", async (req, res) => {
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

    await fileRepository.update(id, updates);
    const updatedFile = await fileRepository.findById(id);
    res.json(updatedFile);
  } catch (error) {
    console.error("Error updating file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Delete File (Mark as deleted)
app.delete("/api/files/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const filedata = await fileRepository.findById(id);
    if (!filedata) {
      return res.status(404).json({ error: "File not found" });
    }

    await fileRepository.delete(id);
    res.json({ message: "File deleted successfully", id });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// DIRECTORY ENDPOINTS
// ============================================

// 5. Create Directory
app.post("/api/directories", async (req, res) => {
  try {
    const { name, parent, path: dirPath } = req.body;

    if (!name || !dirPath) {
      return res.status(400).json({ error: "Name and path are required" });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await directoryRepository.create({
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });

    res.status(201).json({
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });
  } catch (error) {
    console.error("Error creating directory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. List All Directories
app.get("/api/directories", async (req, res) => {
  try {
    const directories = await directoryRepository.list();
    res.json(directories);
  } catch (error) {
    console.error("Error listing directories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. Get Directory by ID
app.get("/api/directories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const directory = await directoryRepository.findById(id);

    if (!directory) {
      return res.status(404).json({ error: "Directory not found" });
    }

    res.json(directory);
  } catch (error) {
    console.error("Error fetching directory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. Get Subdirectories by Parent ID
app.get("/api/directories/:parentId/subdirectories", async (req, res) => {
  try {
    const { parentId } = req.params;
    const subdirectories = await directoryRepository.findByParent(parentId);
    res.json(subdirectories);
  } catch (error) {
    console.error("Error fetching subdirectories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Update Directory
app.put("/api/directories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path: dirPath, size } = req.body;

    const directory = await directoryRepository.findById(id);
    if (!directory) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (dirPath !== undefined) updates.path = dirPath;
    if (size !== undefined) updates.size = size;

    await directoryRepository.update(id, updates);

    const updatedDirectory = await directoryRepository.findById(id);
    res.json(updatedDirectory);
  } catch (error) {
    console.error("Error updating directory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 10. Delete (Invalidate) Directory
app.delete("/api/directories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const directory = await directoryRepository.findById(id);
    if (!directory) {
      return res.status(404).json({ error: "Directory not found" });
    }

    await directoryRepository.delete(id);

    res.json({ message: "Directory deleted successfully", id });
  } catch (error) {
    console.error("Error deleting directory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://${host}:${port}`);
});
