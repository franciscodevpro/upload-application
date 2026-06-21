/**
 * Testes de integração para endpoints de arquivos
 * - GET /v1/download
 */

import request from "supertest";
import express, { Express } from "express";
import { fileRepository } from "../../src/repository/sqlite";
import path from "path";
import fs from "node:fs";
import { uploadFilesController } from "../../src/controllers/upload-files-controller";
import { UploadFilesService } from "../../src/services/upload-files-service";

// Mock do banco de dados
jest.mock("../../src/repository/sqlite");
jest.mock("path");
jest.mock("node:fs");
jest.mock("@tus/server", () => ({
  Server: class {
    spyedServerParams: {
      path: string;
      namingFunction: (req: any, metadata: any) => string;
      datastore: any;
      onUploadFinish: (req: any, res: any, upload: any) => Promise<any>;
      maxSize?: (req: any, res: any) => Promise<number>;
    };
    maxSize?: (req: any, res: any) => Promise<number>;

    constructor(serverParams: {
      path: string;
      namingFunction: (req: any, metadata: any) => string;
      datastore: any;
      onUploadFinish: (req: any, res: any, upload: any) => Promise<any>;
      maxSize?: (req: any, res: any) => Promise<number>;
    }) {
      this.spyedServerParams = serverParams;
      this.maxSize = serverParams.maxSize;
    }

    handle(req: any, res: any) {
      const metadata = {
        filename: "any_filename",
        filetype: "any_filetype",
        parentId: req.userId ? "any_parentId" : undefined,
      };
      const upload = {
        metadata,
        id: "any_id",
        size: 1,
        storage: { path: this.spyedServerParams.path },
      };
      this.spyedServerParams.namingFunction(req, metadata);
      this.spyedServerParams.onUploadFinish(req, res, upload);
      return res
        .status(200)
        .json({ message: "Mocked server success response" });
    }
  },
}));
jest.mock("@tus/file-store", () => ({
  FileStore: class {
    constructor(fileServerParams: { directory: string }) {}
  },
}));

const mockedFileRepository = fileRepository as jest.Mocked<
  typeof fileRepository
>;
const mockedPath = path as jest.Mocked<typeof path>;
//const mockedArchiver = archiver as jest.Mocked<typeof archiver>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Upload Files Controller - HTTP Endpoints", () => {
  let app: Express;
  const testFile = {
    id: "file-123",
    originalName: "Test file.txt",
    newName: "file-123.txt",
    extension: "txt",
    size: 1024,
    type: "texto",
    parent: null,
    path: "/test-file",
    uploadAt: new Date().toISOString(),
    status: "active",
    userId: null,
    privacy: null,
  };

  const testUserId = "user-123";

  const initAppGeneric = (userId: string | undefined, userRights: string) => {
    app = express();
    app.use(express.json());

    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      (req as any).userId = userId;
      (req as any).userRights = userRights;
      next();
    });

    uploadFilesController(app);
  };

  beforeEach(() => {
    initAppGeneric(testUserId, "read,write");
    mockedPath.resolve.mockReturnValue("any_storagePath");
    mockedPath.extname.mockReturnValue("any");
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /v1/upload/file", () => {
    it("deve realizar o upload de um arquivo com sucesso", async () => {
      mockedFileRepository.save.mockResolvedValue(testFile);
      mockedPath.join.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(true);

      const response = await request(app).post(`/v1/upload/file`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Mocked server success response");
      expect(mockedFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "any_id",
          originalName: "any_filename",
          newName: "any_id",
          extension: "any",
          size: 1,
          type: "any_filetype",
          uploadAt: expect.anything(),
          path: "/v1/upload",
          parent: "any_parentId",
          userId: testUserId,
        }),
      );
    });

    it("deve realizar o upload de um arquivo com sucesso mesmo com erro ao salvar", async () => {
      mockedFileRepository.save.mockRejectedValue(new Error());
      mockedPath.join.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(true);

      const response = await request(app).post(`/v1/upload/file`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Mocked server success response");
      expect(mockedFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "any_id",
          originalName: "any_filename",
          newName: "any_id",
          extension: "any",
          size: 1,
          type: "any_filetype",
          uploadAt: expect.anything(),
          path: "/v1/upload",
          parent: "any_parentId",
          userId: testUserId,
        }),
      );
    });

    it("deve realizar o upload de um arquivo com sucesso sem userId e parentId", async () => {
      mockedFileRepository.save.mockRejectedValue(new Error());
      mockedPath.join.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(true);
      initAppGeneric(undefined, "read,write");

      const response = await request(app).post(`/v1/upload/file`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Mocked server success response");
      expect(mockedFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "any_id",
          originalName: "any_filename",
          newName: "any_id",
          extension: "any",
          size: 1,
          type: "any_filetype",
          uploadAt: expect.anything(),
          path: "/v1/upload",
          parent: null,
          userId: null,
        }),
      );
    });

    it("deve retornar 403 caso o usuário não tenha permissão para fazer upload", async () => {
      initAppGeneric(testUserId, undefined as any);
      const response = await request(app).post(`/v1/upload/file`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Forbidden");
    });
  });

  describe("maxSize calculation", () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = { userId: testUserId };
      mockRes = {};
      // Clear environment variable before each test
      delete process.env.UPLOAD_DEFAULT_LIMIT;
    });

    afterEach(() => {
      delete process.env.UPLOAD_DEFAULT_LIMIT;
    });

    it("deve retornar o limite máximo padrão quando não há UPLOAD_DEFAULT_LIMIT configurado", async () => {
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(null);

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      const defaultLimit = 500 * 1024 * 1024;
      expect(result).toBe(defaultLimit);
      expect(mockedFileRepository.uploadedSize).toHaveBeenCalledWith(
        testUserId,
      );
    });

    it("deve usar UPLOAD_DEFAULT_LIMIT quando configurado no ambiente", async () => {
      const customLimit = 100 * 1024 * 1024;
      process.env.UPLOAD_DEFAULT_LIMIT = customLimit.toString();
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(null);

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      expect(result).toBe(customLimit);
    });

    it("deve retornar espaço disponível quando usuário tem armazenamento utilizado", async () => {
      const maxUploadLimit = 500 * 1024 * 1024;
      const userStoredSize = 200 * 1024 * 1024;
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(
        userStoredSize,
      );

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      const expectedAvailable = maxUploadLimit - userStoredSize;
      expect(result).toBe(expectedAvailable);
    });

    it("deve retornar 1 quando usuário ultrapassou o limite de armazenamento", async () => {
      const maxUploadLimit = 500 * 1024 * 1024;
      const userStoredSize = 600 * 1024 * 1024; // Acima do limite
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(
        userStoredSize,
      );

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      expect(result).toBe(1);
    });

    it("deve retornar 0 quando usuário atingiu exatamente o limite de armazenamento", async () => {
      const maxUploadLimit = 500 * 1024 * 1024;
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(
        maxUploadLimit,
      );

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      expect(result).toBe(0);
    });

    it("deve calcular corretamente com limite customizado e armazenamento utilizado", async () => {
      const customLimit = 1000 * 1024 * 1024;
      const userStoredSize = 300 * 1024 * 1024;
      process.env.UPLOAD_DEFAULT_LIMIT = customLimit.toString();
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(
        userStoredSize,
      );

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      const expectedAvailable = customLimit - userStoredSize;
      expect(result).toBe(expectedAvailable);
    });

    it("deve retornar o limite máximo quando uploadedSize retorna zero", async () => {
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(0);

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      const result = await maxSizeFunction(mockReq, mockRes);

      const defaultLimit = 500 * 1024 * 1024;
      expect(result).toBe(defaultLimit);
    });

    it("deve chamar uploadedSize com o userId correto", async () => {
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(null);
      const customUserId = "user-custom-456";
      mockReq.userId = customUserId;

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      await maxSizeFunction(mockReq, mockRes);

      expect(mockedFileRepository.uploadedSize).toHaveBeenCalledWith(
        customUserId,
      );
    });

    it("deve chamar uploadedSize com userId undefined quando não autenticado", async () => {
      (mockedFileRepository.uploadedSize as jest.Mock).mockResolvedValue(null);
      mockReq.userId = undefined;

      const uploadService = new UploadFilesService(fileRepository);
      const maxSizeFunction = uploadService.tusServer.maxSize;

      await maxSizeFunction(mockReq, mockRes);

      expect(mockedFileRepository.uploadedSize).toHaveBeenCalledWith(undefined);
    });
  });
});
