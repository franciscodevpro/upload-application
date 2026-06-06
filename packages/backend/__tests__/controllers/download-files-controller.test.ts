/**
 * Testes de integração para endpoints de arquivos
 * - GET /api/download
 */

import request from "supertest";
import express, { Express } from "express";
import { fileRepository } from "../../src/repository/sqlite";
import path from "path";
//import archiver from "archiver";
import fs from "node:fs";
import { downloadFilesController } from "../../src/controllers/download-files-controller";

// Mock do banco de dados
jest.mock("../../src/repository/sqlite");
jest.mock("path");
jest.mock("archiver", () =>
  jest.fn().mockReturnValue({
    expressRes: null,
    pipe(res: any) {
      this.expressRes = res;
    },
    finalize() {
      this.expressRes
        .status(200)
        .send({ message: "Download compactado mock realizado" });
    },
    file: jest.fn(),
  }),
);
jest.mock("node:fs");

const mockedFileRepository = fileRepository as jest.Mocked<
  typeof fileRepository
>;
const mockedPath = path as jest.Mocked<typeof path>;
//const mockedArchiver = archiver as jest.Mocked<typeof archiver>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Files Controller - HTTP Endpoints", () => {
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

  const initAMockedApp = () => {
    app = express();
    app.use(express.json());

    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      (req as any).userId = testUserId;
      (req as any).userRights = "read,write";
      next();
    });

    const mockedApp = {
      get(
        path: string,
        authMiddleware: any,
        callback: (req: any, res: any) => Promise<void>,
      ) {
        app.get(path, authMiddleware, async (req, res) => {
          await callback(req, {
            status: (status_param: number) => {
              res.status(status_param);
              return { send: (body_param: any) => res.send(body_param) };
            },
            download: jest.fn().mockImplementation(() => {
              res.status(200).send({ message: "Download mock realizado" });
            }),
            attachment: jest.fn(),
          });
        });
      },
    };

    downloadFilesController(mockedApp as Express);
  };

  const initAppWithUserId = () => {
    app = express();
    app.use(express.json());

    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      (req as any).userId = testUserId;
      (req as any).userRights = "read,write";
      next();
    });

    downloadFilesController(app);
  };

  beforeEach(() => {
    initAppWithUserId();
    mockedPath.resolve.mockReturnValue("any_storagePath");
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/download", () => {
    it("deve baixar um arquivo com sucesso", async () => {
      mockedFileRepository.findById.mockResolvedValue(testFile);
      mockedPath.join.mockReturnValue("any_filePath");
      initAMockedApp();

      const response = await request(app).get(
        `/api/download?files=${testFile.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Download mock realizado");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith(testFile.id);
      expect(mockedPath.join).toHaveBeenCalledWith(
        "any_storagePath",
        testFile.id,
      );
    });

    it("deve retornar erro 400 se nenhum arquivo for informado", async () => {
      const response = await request(app).get("/api/download");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("No file selected");
    });

    it("deve retornar erro 404 se arquivo não existir", async () => {
      mockedFileRepository.findById.mockResolvedValue(undefined);

      const response = await request(app).get("/api/download?files=invalid-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("File not found");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith("invalid-id");
    });

    it("deve baixar mais de um arquivo compactados com sucesso", async () => {
      mockedFileRepository.findById.mockResolvedValueOnce(testFile);
      mockedFileRepository.findById.mockResolvedValue(undefined);

      mockedPath.join.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(true);
      initAMockedApp();

      const response = await request(app).get(
        `/api/download?files=${testFile.id}&files=other-fileId`,
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toContain(
        "Download compactado mock realizado",
      );
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        1,
        testFile.id,
      );
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        2,
        "other-fileId",
      );
      expect(mockedPath.join).toHaveBeenCalledWith(
        "any_storagePath",
        testFile.id,
      );
      expect(fs.existsSync).toHaveBeenCalledWith("any_filePath");
      expect(mockedPath.join).toHaveBeenCalledTimes(1);
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
    });
  });
});
