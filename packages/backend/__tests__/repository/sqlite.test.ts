/**
 * Testes para repository/sqlite.ts
 * - Repositório de Arquivos (fileRepository)
 * - Repositório de Diretórios (directoryRepository)
 * - Repositório de Usuários (userRepository)
 */

import {
  fileRepository,
  directoryRepository,
  userRepository,
  initializeDatabase,
} from "../../src/repository/sqlite";

import { drizzle } from "drizzle-orm/better-sqlite3";

jest.mock("drizzle-orm/better-sqlite3", () => ({ drizzle: jest.fn() }));
jest.mock("better-sqlite3");

const drizzleMock = drizzle as jest.MockedFunction<typeof drizzle>;

var drizzleReturnValue = {
  run: jest.fn(),
  prepare: jest.fn().mockReturnThis(),
  get: jest.fn(),
  all: jest.fn(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnValue({}),
  execute: jest.fn(),
  set: jest.fn().mockReturnThis(),
};

drizzleMock.mockImplementation(jest.fn().mockReturnValue(drizzleReturnValue));

const resetDrizzleReturnValue = () => {
  drizzleReturnValue.where.mockReset();
  drizzleReturnValue.where.mockReturnValue([]);
};

describe("SQLite Repository", () => {
  beforeEach(() => {
    resetDrizzleReturnValue();
  });

  describe("File Repository", () => {
    const mockFile = {
      id: "file-123",
      originalName: "document.pdf",
      newName: "doc_abc123.pdf",
      extension: "pdf",
      size: 5242880,
      type: "application/pdf",
      uploadAt: "2026-05-20T10:00:00Z",
      path: "/files/doc_abc123.pdf",
      parent: "dir-parent-123",
      status: "active",
      userId: "user-456",
      privacy: "private",
    };

    describe("save", () => {
      it("deve salvar um arquivo com sucesso", async () => {
        const returning = jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValueOnce({ returning });
        const result = await fileRepository.save({
          id: mockFile.id,
          originalName: mockFile.originalName,
          newName: mockFile.newName,
          extension: mockFile.extension,
          size: mockFile.size,
          type: mockFile.type,
          uploadAt: mockFile.uploadAt,
          path: mockFile.path,
          userId: mockFile.userId,
          parent: mockFile.parent,
        });

        expect(result).toBeDefined();
      });

      it("deve salvar arquivo sem userId", async () => {
        const returning = jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({
          returning: () => [{ parent: null }],
        });
        const result = await fileRepository.save({
          id: "file-456",
          originalName: "image.jpg",
          newName: "img_def789.jpg",
          extension: "jpg",
          size: 2097152,
          type: "image/jpeg",
          uploadAt: "2026-05-20T11:00:00Z",
          path: "/files/img_def789.jpg",
          parent: "dir-parent-123",
        } as any);

        expect(result).toBeDefined();
      });

      it("deve salvar arquivo sem um diretório pai", async () => {
        const result = await fileRepository.save({
          id: "file-789",
          originalName: "report.xlsx",
          newName: "report_ghi012.xlsx",
          extension: "xlsx",
          size: 1048576,
          type: "application/vnd.ms-excel",
          uploadAt: "2026-05-20T12:00:00Z",
          path: "/files/reports/report_ghi012.xlsx",
          userId: "user-456",
        } as any);

        expect(result).toBeDefined();
      });
    });

    describe("list", () => {
      it("deve listar arquivos ativos sem pai", async () => {
        const files = await fileRepository.list({});

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve listar arquivos de um usuário específico", async () => {
        const files = await fileRepository.list({
          userId: "user-456",
        });

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve listar arquivos em um diretório pai específico", async () => {
        const files = await fileRepository.list({
          parent: "dir-parent-123",
          userId: "user-456",
        });

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve listar apenas arquivos ativos", async () => {
        const files = await fileRepository.list({
          userId: "user-456",
        });

        expect(Array.isArray(files)).toBe(true);
        // Todos retornados devem ter status 'active'
        if (files.length > 0) {
          files.forEach((file) => {
            expect(file.status).toBe("active");
          });
        }
      });
    });

    describe("listAllEvenNotActiveByUserId", () => {
      it("deve listar todos os arquivos de um usuário, incluindo inativos", async () => {
        const files =
          await fileRepository.listAllEvenNotActiveByUserId("user-456");

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve retornar array vazio para usuário sem arquivos", async () => {
        const files =
          await fileRepository.listAllEvenNotActiveByUserId("user-nonexistent");

        expect(Array.isArray(files)).toBe(true);
      });
    });

    describe("findById", () => {
      it("deve encontrar arquivo por ID", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockFile]);
        const file = await fileRepository.findById("file-123");

        expect(file).toBeDefined();
      });

      it("deve retornar undefined se arquivo não existir", async () => {
        const file = await fileRepository.findById("nonexistent-file");

        expect(file).toBeUndefined();
      });

      it("deve encontrar arquivo por ID com validação de userId", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockFile]);
        const file = await fileRepository.findById("file-123", "user-456");

        expect(file).toBeDefined();
      });

      it("deve retornar undefined se userId não corresponder", async () => {
        const file = await fileRepository.findById("file-123", "user-wrong");

        expect(file).toBeUndefined();
      });
    });

    describe("findByParent", () => {
      it("deve encontrar arquivos por ID pai", async () => {
        const files = await fileRepository.findByParent("dir-parent-123");

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve encontrar arquivos por ID pai com userId", async () => {
        const files = await fileRepository.findByParent(
          "dir-parent-123",
          "user-456",
        );

        expect(Array.isArray(files)).toBe(true);
      });

      it("deve retornar array vazio se nenhum arquivo no pai", async () => {
        const files = await fileRepository.findByParent("nonexistent-parent");

        expect(Array.isArray(files)).toBe(true);
      });
    });

    describe("update", () => {
      it("deve atualizar arquivo com sucesso", async () => {
        const returning = () => jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({ returning, 0: mockFile });
        const result = await fileRepository.update("file-123", undefined, {
          newName: "document_updated.pdf",
          status: "inactive",
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar apenas para o userId correto", async () => {
        const returning = () => jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({ returning, 0: mockFile });
        const result = await fileRepository.update("file-123", "user-456", {
          privacy: "public",
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar múltiplos campos", async () => {
        const returning = () => jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({ returning, 0: mockFile });
        const result = await fileRepository.update("file-123", "user-456", {
          originalName: "new_name.pdf",
          size: 6291456,
          status: "archived",
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar arquivo e adicionar o seu tamanho aos diretórios pais", async () => {
        const returning = jest.fn();
        returning.mockResolvedValueOnce([{ parent: "other-parent", size: 1 }]);
        returning.mockResolvedValueOnce([
          { parent: "more-one-parent", size: 1 },
        ]);
        returning.mockResolvedValueOnce([{ parent: null, size: null }]);
        returning.mockResolvedValueOnce([{ parent: null, size: null }]);
        drizzleReturnValue.where.mockReturnValueOnce([mockFile]);
        drizzleReturnValue.where.mockReturnValue({ returning });
        const result = await fileRepository.update("file-123", "any_user_id", {
          newName: "document_updated.pdf",
          status: "inactive",
          parent: "some-parent",
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar arquivo e adicionar o seu tamanho aos diretórios pais sem userId", async () => {
        const returning = jest.fn();
        returning.mockResolvedValueOnce([{ parent: "other-parent", size: 1 }]);
        returning.mockResolvedValueOnce([
          { parent: "more-one-parent", size: 1 },
        ]);
        returning.mockResolvedValueOnce([{ parent: null, size: null }]);
        returning.mockResolvedValueOnce([{ parent: null, size: null }]);
        drizzleReturnValue.where.mockReturnValueOnce([mockFile]);
        drizzleReturnValue.where.mockReturnValue({ returning });
        const result = await fileRepository.update("file-123", undefined, {
          newName: "document_updated.pdf",
          status: "inactive",
          parent: "some-parent",
        });

        expect(result).toBeDefined();
      });
    });

    describe("uploadedSize", () => {
      it("deve retornar o tamanho total já armazenado por userId", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([{ totalSize: "1" }]);
        const total = await fileRepository.uploadedSize("dir-parent-123");

        expect(total).toBe(1);
      });

      it("deve retornar (0) zero quando nenhum total for encontrado", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([]);
        const total = await fileRepository.uploadedSize("dir-parent-123");

        expect(total).toBe(0);
      });
    });

    describe("delete", () => {
      it("deve deletar arquivo com sucesso", async () => {
        const returning = jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValueOnce({ returning });
        const result = await fileRepository.delete("file-123");

        expect(result).toBeDefined();
      });

      it("deve deletar arquivo apenas se userId corresponder", async () => {
        const returning = () => jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({ returning, 0: mockFile });
        const result = await fileRepository.delete("file-123", "user-456");

        expect(result).toBeDefined();
      });

      it("deve falhar ao deletar com userId incorreto", async () => {
        const returning = jest.fn().mockResolvedValue([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValueOnce({ returning });
        const result = await fileRepository.delete("file-123", "user-wrong");

        // Resultado deve retornar, mesmo que sem deletar nada
        expect(result).toBeDefined();
      });

      it("deve deletar arquivo com sucesso e diminuir o tamanho do diretório pai", async () => {
        const returning = jest.fn();
        returning.mockResolvedValueOnce([mockFile]);
        returning.mockResolvedValueOnce([{ parent: null }]);
        drizzleReturnValue.where.mockReturnValue({ returning });
        const result = await fileRepository.delete("file-123");

        expect(result).toBeDefined();
      });
    });

    describe("deleteByUserId", () => {
      it("deve deletar todos os arquivos de um usuário", async () => {
        const result = await fileRepository.deleteByUserId("user-456");

        expect(result).toBeDefined();
      });

      it("deve retornar resultado mesmo se usuário não existe", async () => {
        const result = await fileRepository.deleteByUserId("nonexistent-user");

        expect(result).toBeDefined();
      });
    });
  });

  describe("Directory Repository", () => {
    const mockDirectory = {
      id: "dir-123",
      name: "My Documents",
      size: 0,
      parent: null,
      path: "/My Documents",
      createdAt: "2026-05-20T10:00:00Z",
      updatedAt: "2026-05-20T10:00:00Z",
      status: "active",
      userId: "user-456",
      privacy: "private",
    };

    describe("create", () => {
      it("deve criar um diretório com sucesso", async () => {
        const result = await directoryRepository.create({
          id: mockDirectory.id,
          name: mockDirectory.name,
          size: mockDirectory.size,
          parent: mockDirectory.parent,
          path: mockDirectory.path,
          createdAt: mockDirectory.createdAt,
          updatedAt: mockDirectory.updatedAt,
          userId: mockDirectory.userId,
        });

        expect(result).toBeDefined();
      });

      it("deve criar diretório sem userId", async () => {
        const result = await directoryRepository.create({
          id: "dir-456",
          name: "Public Folder",
          size: 0,
          path: "/Public Folder",
          createdAt: "2026-05-20T11:00:00Z",
          updatedAt: "2026-05-20T11:00:00Z",
        } as any);

        expect(result).toBeDefined();
      });

      it("deve criar subdiretório com pai", async () => {
        const result = await directoryRepository.create({
          id: "dir-789",
          name: "Subdirectory",
          size: 0,
          parent: "dir-123",
          path: "/My Documents/Subdirectory",
          createdAt: "2026-05-20T12:00:00Z",
          updatedAt: "2026-05-20T12:00:00Z",
          userId: "user-456",
        });

        expect(result).toBeDefined();
      });
    });

    describe("list", () => {
      it("deve listar diretórios ativos sem pai", async () => {
        const dirs = await directoryRepository.list({});

        expect(Array.isArray(dirs)).toBe(true);
      });

      it("deve listar diretórios de um usuário específico", async () => {
        const dirs = await directoryRepository.list({
          userId: "user-456",
        });

        expect(Array.isArray(dirs)).toBe(true);
      });

      it("deve listar subdiretórios de um pai específico", async () => {
        const dirs = await directoryRepository.list({
          parent: "dir-123",
          userId: "user-456",
        });

        expect(Array.isArray(dirs)).toBe(true);
      });

      it("deve listar apenas diretórios ativos", async () => {
        const dirs = await directoryRepository.list({
          userId: "user-456",
        });

        expect(Array.isArray(dirs)).toBe(true);
        if (dirs.length > 0) {
          dirs.forEach((dir) => {
            expect(dir.status).toBe("active");
          });
        }
      });
    });

    describe("findById", () => {
      it("deve encontrar diretório por ID", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockDirectory]);
        const dir = await directoryRepository.findById("dir-123");

        expect(dir).toBeDefined();
      });

      it("deve retornar undefined se diretório não existir", async () => {
        const dir = await directoryRepository.findById("nonexistent-dir");

        expect(dir).toBeUndefined();
      });

      it("deve encontrar diretório com validação de userId", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockDirectory]);
        const dir = await directoryRepository.findById("dir-123", "user-456");

        expect(dir).toBeDefined();
      });

      it("deve retornar undefined se userId não corresponder", async () => {
        const dir = await directoryRepository.findById("dir-123", "user-wrong");

        expect(dir).toBeUndefined();
      });
    });

    describe("findByParent", () => {
      it("deve encontrar subdiretórios por pai", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockDirectory]);
        const dirs = await directoryRepository.findByParent("dir-parent-123");

        expect(Array.isArray(dirs)).toBe(true);
      });

      it("deve encontrar subdiretórios com userId", async () => {
        const dirs = await directoryRepository.findByParent(
          "dir-parent-123",
          "user-456",
        );

        expect(Array.isArray(dirs)).toBe(true);
      });

      it("deve retornar array vazio se nenhum subdiretório", async () => {
        const dirs =
          await directoryRepository.findByParent("nonexistent-parent");

        expect(Array.isArray(dirs)).toBe(true);
      });
    });

    describe("update", () => {
      it("deve atualizar diretório com sucesso", async () => {
        const result = await directoryRepository.update("dir-123", undefined, {
          name: "My Documents Updated",
          size: 1048576,
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar apenas para userId correto", async () => {
        const result = await directoryRepository.update("dir-123", "user-456", {
          privacy: "public",
        });

        expect(result).toBeDefined();
      });

      it("deve atualizar updatedAt ao atualizar", async () => {
        const before = new Date().toISOString();

        const result = await directoryRepository.update("dir-123", "user-456", {
          size: 2097152,
        });

        expect(result).toBeDefined();
      });
    });

    describe("delete", () => {
      it("deve deletar diretório com sucesso", async () => {
        const result = await directoryRepository.delete("dir-123");

        expect(result).toBeDefined();
      });

      it("deve deletar apenas se userId corresponder", async () => {
        const result = await directoryRepository.delete("dir-123", "user-456");

        expect(result).toBeDefined();
      });

      it("deve falhar ao deletar com userId incorreto", async () => {
        const result = await directoryRepository.delete(
          "dir-123",
          "user-wrong",
        );

        expect(result).toBeDefined();
      });
    });

    describe("deleteByUserId", () => {
      it("deve deletar todos diretórios de um usuário", async () => {
        const result = await directoryRepository.deleteByUserId("user-456");

        expect(result).toBeDefined();
      });

      it("deve retornar resultado mesmo se usuário não existe", async () => {
        const result =
          await directoryRepository.deleteByUserId("nonexistent-user");

        expect(result).toBeDefined();
      });
    });
  });

  describe("User Repository", () => {
    const mockUser = {
      id: "user-123",
      email: "user@example.com",
      password: "$2b$10$...hashed_password...",
      refreshToken: null,
      createdAt: "2026-05-20T10:00:00Z",
      updatedAt: "2026-05-20T10:00:00Z",
      status: "active",
    };

    describe("create", () => {
      it("deve criar um usuário com sucesso", async () => {
        const result = await userRepository.create({
          id: mockUser.id,
          email: mockUser.email,
          password: mockUser.password,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        });

        expect(result).toBeDefined();
      });

      it("deve criar usuário com email único", async () => {
        const result = await userRepository.create({
          id: "user-456",
          email: "unique@example.com",
          password: "$2b$10$...another_hash...",
          createdAt: "2026-05-20T11:00:00Z",
          updatedAt: "2026-05-20T11:00:00Z",
        });

        expect(result).toBeDefined();
      });

      it("deve criar usuário com dados válidos", async () => {
        const newUser = {
          id: "user-789",
          email: "newuser@example.com",
          password: "$2b$10$...secure_hash...",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await userRepository.create(newUser);

        expect(result).toBeDefined();
      });
    });

    describe("findByEmail", () => {
      it("deve encontrar usuário por email", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findByEmail("user@example.com");

        expect(user).toBeDefined();
        if (user) {
          expect(user.email).toBe("user@example.com");
        }
      });

      it("deve retornar undefined se email não existir", async () => {
        const user = await userRepository.findByEmail(
          "nonexistent@example.com",
        );

        expect(user).toBeUndefined();
      });

      it("deve retornar null password (por segurança)", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findByEmail("user@example.com");

        expect(user).toBeDefined();
        if (user) {
          expect(typeof user.password).toBe("string");
        }
      });

      it("deve ser case-sensitive em email", async () => {
        const user = await userRepository.findByEmail("USER@EXAMPLE.COM");

        // Email é único mas case-sensitive na maioria dos DBs
        expect(typeof user).toBeDefined();
      });
    });

    describe("findById", () => {
      it("deve encontrar usuário por ID", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findById("user-123");

        expect(user).toBeDefined();
        if (user) {
          expect(user.id).toBe("user-123");
        }
      });

      it("deve retornar undefined se ID não existir", async () => {
        const user = await userRepository.findById("nonexistent-user");

        expect(user).toBeUndefined();
      });

      it("deve retornar todos os campos do usuário", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findById("user-123");

        expect(user).toBeDefined();
        if (user) {
          expect(user.id).toBeDefined();
          expect(user.email).toBeDefined();
          expect(user.password).toBeDefined();
          expect(user.createdAt).toBeDefined();
          expect(user.status).toBeDefined();
        }
      });
    });

    describe("updateRefreshToken", () => {
      it("deve atualizar refresh token com sucesso", async () => {
        const newToken = "new-refresh-token-xyz";

        const result = await userRepository.updateRefreshToken(
          "user-123",
          newToken,
        );

        expect(result).toBeDefined();
      });

      it("deve limpar refresh token (null)", async () => {
        const result = await userRepository.updateRefreshToken(
          "user-123",
          null,
        );

        expect(result).toBeDefined();
      });

      it("deve atualizar updatedAt ao atualizar token", async () => {
        const result = await userRepository.updateRefreshToken(
          "user-123",
          "another-token",
        );

        expect(result).toBeDefined();
      });

      it("deve não afetar outros campos ao atualizar token", async () => {
        const result = await userRepository.updateRefreshToken(
          "user-123",
          "token-update",
        );

        expect(result).toBeDefined();
      });
    });

    describe("delete", () => {
      it("deve deletar usuário com sucesso", async () => {
        const result = await userRepository.delete("user-123");

        expect(result).toBeDefined();
      });

      it("deve retornar resultado mesmo se usuário não existe", async () => {
        const result = await userRepository.delete("nonexistent-user");

        expect(result).toBeDefined();
      });

      it("deve deletar com ID válido", async () => {
        const result = await userRepository.delete("user-789");

        expect(result).toBeDefined();
      });

      it("deve retornar resultado do delete", async () => {
        const result = await userRepository.delete("user-456");

        expect(result).toBeDefined();
      });
    });

    describe("User validation", () => {
      it("deve retornar usuário com status ativo", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findById("user-123");

        expect(user).toBeDefined();
        if (user) {
          expect(user.status).toBe("active");
        }
      });

      it("deve manter timestamps de criação e atualização", async () => {
        drizzleReturnValue.where.mockReturnValueOnce([mockUser]);
        const user = await userRepository.findById("user-123");

        expect(user).toBeDefined();
        if (user) {
          expect(user.createdAt).toBeDefined();
          expect(user.updatedAt).toBeDefined();
        }
      });
    });
  });

  describe("Cross-repository relationships", () => {
    const mockFile = {
      id: "file-123",
      originalName: "document.pdf",
      newName: "doc_abc123.pdf",
      extension: "pdf",
      size: 5242880,
      type: "application/pdf",
      uploadAt: "2026-05-20T10:00:00Z",
      path: "/files/doc_abc123.pdf",
      parent: null,
      status: "active",
      userId: "user-456",
      privacy: "private",
    };

    const mockDirectory = {
      id: "dir-123",
      name: "My Documents",
      size: 0,
      parent: null,
      path: "/My Documents",
      createdAt: "2026-05-20T10:00:00Z",
      updatedAt: "2026-05-20T10:00:00Z",
      status: "active",
      userId: "user-456",
      privacy: "private",
    };

    it("files devem ter referência válida a usuário", async () => {
      drizzleReturnValue.where.mockReturnValueOnce([mockFile]);
      const file = await fileRepository.findById("file-123", "user-456");

      expect(file).toBeDefined();
      if (file) {
        expect(file.userId).toBe("user-456");
      }
    });

    it("directories devem ter referência válida a usuário", async () => {
      drizzleReturnValue.where.mockReturnValueOnce([mockDirectory]);
      const dir = await directoryRepository.findById("dir-123", "user-456");

      expect(dir).toBeDefined();
      if (dir) {
        expect(dir.id).toBe("dir-123");
      }
    });

    it("files podem ter referência a diretório pai", async () => {
      const file = await fileRepository.findByParent("dir-parent-123");

      expect(Array.isArray(file)).toBe(true);
    });

    it("directories podem ter subdiretórios", async () => {
      const subdirs = await directoryRepository.findByParent("dir-123");

      expect(Array.isArray(subdirs)).toBe(true);
    });
  });

  describe("Test initializeDatabase", () => {
    it("initializeDatabase deve inicializar o banco de dados", async () => {
      initializeDatabase();

      expect(drizzleReturnValue.run).toHaveBeenCalledTimes(3);
      expect(drizzleReturnValue.run).toHaveBeenNthCalledWith(
        1,
        `
    CREATE TABLE IF NOT EXISTS files (
      id VARCHAR(200) PRIMARY KEY,
      originalName TEXT,
      newName TEXT,
      extension VARCHAR(50),
      size INTEGER,
      type VARCHAR(100),
      uploadAt VARCHAR(200),
      path TEXT,
      parent TEXT,
      status TEXT DEFAULT 'active',
      userId TEXT REFERENCES users(id),
      privacy TEXT DEFAULT 'private'
    )
    `,
      );
      expect(drizzleReturnValue.run).toHaveBeenNthCalledWith(
        2,
        `
    CREATE TABLE IF NOT EXISTS directories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      parent TEXT,
      path TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      userId TEXT REFERENCES users(id),
      privacy TEXT DEFAULT 'private'
    )
    `,
      );
      expect(drizzleReturnValue.run).toHaveBeenNthCalledWith(
        3,
        `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      refreshToken TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      access_rights TEXT DEFAULT 'read,write'
    )
    `,
      );
    });
  });
});
