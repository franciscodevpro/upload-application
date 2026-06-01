/**
 * Testes de integração para endpoints de arquivos
 * - PUT /api/files
 * - GET /api/files/:id
 * - DELETE /api/files/:id
 */

import request from "supertest";
import express, { Express } from "express";
import { fileRepository } from "../../src/repository/sqlite";
import { filesController } from "../../src/controllers/files-controller";
import jestOpenAPI from "jest-openapi";
import path from "path";

const swaggerURL = path.join(__dirname, "../../src/swagger-definition.json");

jestOpenAPI(swaggerURL);

// Mock do banco de dados
jest.mock("../../src/repository/sqlite");
jest.mock("../../src/utils/delete-files-utils", () => ({
  deleteFileFromPath: jest.fn(),
}));

const mockedFileRepository = fileRepository as jest.Mocked<
  typeof fileRepository
>;

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

  const initAppWithoutUserId = () => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      (req as any).userId = undefined;
      next();
    });

    filesController(app);
  };

  const initAppWithUserId = () => {
    app = express();
    app.use(express.json());

    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      (req as any).userId = testUserId;
      next();
    });

    filesController(app);
  };

  beforeEach(() => {
    initAppWithUserId();

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe("GET /api/files", () => {
    it("deve retornar a lista de arquivos", async () => {
      mockedFileRepository.list.mockResolvedValue([testFile]);

      const response = await request(app).get(
        "/api/files?parent=parent-dir-123",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testFile.id);
      expect(response.body[0]).toHaveProperty(
        "originalName",
        testFile.originalName,
      );
      expect(mockedFileRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: "parent-dir-123",
          userId: testUserId,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar os arquivos sem usuário", async () => {
      initAppWithoutUserId();
      mockedFileRepository.list.mockResolvedValue([testFile]);

      const response = await request(app).get(
        "/api/files?parent=parent-dir-123",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testFile.id);
      expect(response.body[0]).toHaveProperty(
        "originalName",
        testFile.originalName,
      );
      expect(mockedFileRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: "parent-dir-123",
          userId: null,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar um array vazio se não houver arquivos", async () => {
      mockedFileRepository.list.mockResolvedValue([]);

      const response = await request(app).get("/api/files?parent=test-parent");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
      expect(mockedFileRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: "test-parent",
          userId: testUserId,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedFileRepository.list.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).get("/api/files");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");
      expect(mockedFileRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: null,
          userId: testUserId,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("PUT /api/files", () => {
    it("deve atualizar um arquivo com nome válido", async () => {
      mockedFileRepository.findById
        .mockResolvedValueOnce(testFile)
        .mockResolvedValueOnce({
          ...testFile,
          originalName: "Updated File Name",
          parent: null,
        });

      const response = await request(app).put("/api/files/test-id").send({
        originalName: "Updated File Name",
        parent: testFile.parent,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("originalName", "Updated File Name");
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        1,
        "test-id",
      );
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        2,
        "test-id",
      );
      expect(mockedFileRepository.update).toHaveBeenCalledWith(
        "test-id",
        expect.anything(),
        {
          originalName: "Updated File Name" + "." + testFile.extension,
          parent: testFile.parent,
        },
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve atualizar um arquivo publico sem userId", async () => {
      initAppWithoutUserId();

      mockedFileRepository.findById.mockResolvedValue({
        ...testFile,
        extension: null,
      });

      const response = await request(app).put("/api/files/test-id").send({
        originalName: "Updated File Name",
      });

      expect(response.status).toBe(200);
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        1,
        "test-id",
      );
      expect(mockedFileRepository.findById).toHaveBeenNthCalledWith(
        2,
        "test-id",
      );
      expect(mockedFileRepository.update).toHaveBeenCalledWith(
        "test-id",
        null,
        {
          originalName: "Updated File Name",
        },
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 caso o arquivo não exista", async () => {
      mockedFileRepository.findById.mockResolvedValue(undefined);
      const response = await request(app).put("/api/files/test-id").send({
        originalName: "Updated File Name",
        path: testFile.path,
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("File not found");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith("test-id");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedFileRepository.findById.mockResolvedValue(testFile);
      mockedFileRepository.update.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).put("/api/files/test-id").send({
        originalname: "Updated File Name",
        path: testFile.path,
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith("test-id");

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("DELETE /api/files/:id", () => {
    it("deve deletar um arquivo com sucesso", async () => {
      mockedFileRepository.findById.mockResolvedValue(testFile);
      mockedFileRepository.delete.mockResolvedValue(undefined);

      const response = await request(app).delete(`/api/files/${testFile.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "File deleted successfully",
      );
      expect(response.body).toHaveProperty("id", testFile.id);
      expect(mockedFileRepository.findById).toHaveBeenCalledWith(
        testFile.id,
        testUserId,
      );
      expect(mockedFileRepository.delete).toHaveBeenCalledWith(
        testFile.id,
        testUserId,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 se arquivo não existir", async () => {
      mockedFileRepository.findById.mockResolvedValue(undefined);

      const response = await request(app).delete("/api/files/invalid-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("File not found");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith(
        "invalid-id",
        testUserId,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve deletar um arquivo com sucesso sem usuário", async () => {
      initAppWithoutUserId();
      mockedFileRepository.findById.mockResolvedValue(testFile);
      mockedFileRepository.delete.mockResolvedValue(undefined);

      const response = await request(app).delete(`/api/files/${testFile.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "File deleted successfully",
      );
      expect(response.body).toHaveProperty("id", testFile.id);
      expect(mockedFileRepository.findById).toHaveBeenCalledWith(
        testFile.id,
        null,
      );
      expect(mockedFileRepository.delete).toHaveBeenCalledWith(
        testFile.id,
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedFileRepository.findById.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).delete("/api/files/file-123");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");
      expect(mockedFileRepository.findById).toHaveBeenCalledWith(
        "file-123",
        testUserId,
      );

      expect(response).toSatisfyApiSpec();
    });
  });
});
