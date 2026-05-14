// server.ts
import fs from "node:fs";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import path from "path";
import express from "express";
import cors from "cors";
import archiver from "archiver";
import { randomUUID } from "node:crypto";
import bcryptjs from "bcryptjs";
import {
  fileRepository,
  directoryRepository,
  userRepository,
} from "./repository/sqlite";
import { setupSwagger } from "./swagger";
import { authMiddleware } from "./middleware";
import { generateTokens, verifyRefreshToken } from "./auth";

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
    return randomUUID() + path.extname((metadata as any).filename);
  },
  datastore: new FileStore({ directory: storagePath }),
  onUploadFinish(req, res, upload) {
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
        }
      }),
    );
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

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await directoryRepository.create({
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath || null,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });

    res.status(201).json({
      id,
      name,
      size: 0,
      parent: parent || null,
      path: dirPath || null,
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
    const parentQuery = req.query.parent;
    const parent = typeof parentQuery === "string" ? parentQuery : null;
    const directories = await directoryRepository.list(parent);
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

    const visited = new Set<string>();
    const address: Array<{ id: string; name: string }> = [];
    let current: typeof directory | undefined = directory;

    while (current) {
      const currentId = current.id;
      if (!currentId || visited.has(currentId)) break;

      visited.add(currentId);
      address.unshift({
        id: currentId,
        name: current.name ?? "",
      });

      if (!current.parent) break;
      const parentDirectory = await directoryRepository.findById(
        current.parent,
      );
      if (!parentDirectory) break;
      current = parentDirectory;
    }

    res.json({
      ...directory,
      address,
    });
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

// ============================================
// AUTH ENDPOINTS
// ============================================

// 1. Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }

    // Verificar se usuário já existe
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    // Hash da senha
    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = randomUUID();
    const now = new Date().toISOString();

    // Criar usuário
    await userRepository.create({
      id: userId,
      email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      userId,
      email,
    });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 2. Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação
    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    // Buscar usuário
    const user = await userRepository.findByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Verificar senha
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id!,
      email: user.email!,
    });

    // Salvar refresh token no banco
    await userRepository.updateRefreshToken(user.id!, refreshToken);

    res.json({
      message: "Login realizado com sucesso",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 3. Refresh Token
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token é obrigatório" });
    }

    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res
        .status(401)
        .json({ error: "Refresh token inválido ou expirado" });
    }

    // Buscar usuário
    const user = await userRepository.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: "Refresh token não corresponde" });
    }

    // Gerar novos tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens({
        userId: user.id!,
        email: user.email!,
      });

    // Salvar novo refresh token
    await userRepository.updateRefreshToken(user.id!, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 4. Logout
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    // Limpar refresh token do banco
    await userRepository.updateRefreshToken(userId, null);

    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 5. Get Current User (exemplo de endpoint protegido)
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://${host}:${port}`);
});
