/**
 * Testes de integração para endpoints de diretórios
 * - POST /v1/directories
 * - GET /v1/directories/:id
 * - DELETE /v1/directories/:id
 */

import request from "supertest";
import express, { Express } from "express";
import {
  directoryRepository,
  fileRepository,
} from "../../src/repository/sqlite";
import { directoriesController } from "../../src/controllers/directories-controller";
import jestOpenAPI from "jest-openapi";
import path from "path";

const swaggerURL = path.join(__dirname, "../../src/swagger-definition.json");

jestOpenAPI(swaggerURL);

// Mock do banco de dados
jest.mock("../../src/repository/sqlite");
jest.mock("../../src/utils/delete-files-utils", () => ({
  deleteFileFromPath: jest.fn(),
}));

const mockedDirectoryRepository = directoryRepository as jest.Mocked<
  typeof directoryRepository
>;
const mockedFileRepository = fileRepository as jest.Mocked<
  typeof fileRepository
>;

describe("Directories Controller - HTTP Endpoints", () => {
  let app: Express;
  const testDirectory = {
    id: "dir-123",
    name: "Test Directory",
    size: 0,
    parent: null,
    path: "/test-directory",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
  };

  const testUserId = "user-123";

  const initAppGeneric = (userId?: string, userRights?: string) => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      (req as any).userId = userId;
      (req as any).userRights = userRights;
      next();
    });

    directoriesController(app);
  };

  beforeEach(() => {
    initAppGeneric(testUserId, "read,write");

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe("POST /v1/directories", () => {
    it("deve criar um novo diretório com nome válido", async () => {
      mockedDirectoryRepository.create.mockResolvedValue(undefined);

      const response = await request(app).post("/v1/directories").send({
        name: testDirectory.name,
        parent: null,
        path: testDirectory.path,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", testDirectory.name);
      expect(response.body).toHaveProperty("size", 0);
      expect(mockedDirectoryRepository.create).toHaveBeenCalledWith({
        id: expect.any(String),
        size: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        name: testDirectory.name,
        parent: null,
        path: testDirectory.path,
        userId: testUserId,
      });

      expect(response).toSatisfyApiSpec();
    });

    it("deve criar um novo diretório sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      mockedDirectoryRepository.create.mockResolvedValue(undefined);

      const response = await request(app).post("/v1/directories").send({
        name: testDirectory.name,
        parent: "parent-dir-123",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", testDirectory.name);
      expect(response.body).toHaveProperty("size", 0);
      expect(mockedDirectoryRepository.create).toHaveBeenCalledWith({
        id: expect.any(String),
        size: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        name: testDirectory.name,
        parent: "parent-dir-123",
        path: null,
        userId: null,
      });

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 403 caso o usuário não tenha permissão de escrita", async () => {
      initAppGeneric(undefined, "read");
      const response = await request(app).post("/v1/directories").send({
        path: testDirectory.path,
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Forbidden");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se o nome não for fornecido", async () => {
      const response = await request(app).post("/v1/directories").send({
        path: testDirectory.path,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Name is required");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.create.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).post("/v1/directories").send({
        name: testDirectory.name,
        parent: null,
        path: testDirectory.path,
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");

      expect(response).toSatisfyApiSpec();
    });

    it("deve criar diretório com parent válido", async () => {
      mockedDirectoryRepository.create.mockResolvedValue(undefined);

      const response = await request(app).post("/v1/directories").send({
        name: "Subdirectory",
        parent: "parent-dir-123",
        path: "/parent/subdirectory",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("parent", "parent-dir-123");
      expect(mockedDirectoryRepository.create).toHaveBeenCalled();

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("GET /v1/directories/:parentId/subdirectories", () => {
    it("deve retornar a lista de subdiretórios", async () => {
      mockedDirectoryRepository.findByParent.mockResolvedValue([testDirectory]);

      const response = await request(app).get(
        "/v1/directories/parent-dir-123/subdirectories",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testDirectory.id);
      expect(response.body[0]).toHaveProperty("name", testDirectory.name);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar a lista de subdiretórios sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      mockedDirectoryRepository.findByParent.mockResolvedValue([testDirectory]);

      const response = await request(app).get(
        "/v1/directories/parent-dir-123/subdirectories",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testDirectory.id);
      expect(response.body[0]).toHaveProperty("name", testDirectory.name);
      expect(mockedDirectoryRepository.findByParent).toHaveBeenCalledWith(
        "parent-dir-123",
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar um array vazio se não houver subdiretórios", async () => {
      mockedDirectoryRepository.findByParent.mockResolvedValue([]);

      const response = await request(app).get(
        "/v1/directories/parent-dir-123/subdirectories",
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.findByParent.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).get(
        "/v1/directories/parent-dir-123/subdirectories",
      );

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("GET /v1/directories", () => {
    it("deve retornar a lista de diretórios", async () => {
      mockedDirectoryRepository.list.mockResolvedValue([testDirectory]);

      const response = await request(app).get(
        "/v1/directories?parent=parent-dir-123",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testDirectory.id);
      expect(response.body[0]).toHaveProperty("name", testDirectory.name);
      expect(mockedDirectoryRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: "parent-dir-123",
          userId: testUserId,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar os diretórios sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      mockedDirectoryRepository.list.mockResolvedValue([testDirectory]);

      const response = await request(app).get(
        "/v1/directories?parent=parent-dir-123",
      );

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("id", testDirectory.id);
      expect(response.body[0]).toHaveProperty("name", testDirectory.name);
      expect(mockedDirectoryRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: "parent-dir-123",
          userId: null,
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar um array vazio se não houver diretórios", async () => {
      mockedDirectoryRepository.list.mockResolvedValue([]);

      const response = await request(app).get("/v1/directories");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.list.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).get("/v1/directories");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("GET /v1/directories/:id", () => {
    it("deve retornar um diretório pelo ID", async () => {
      mockedDirectoryRepository.findById.mockResolvedValueOnce({
        ...testDirectory,
        parent: testDirectory.id,
      });

      const response = await request(app).get(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", testDirectory.id);
      expect(response.body).toHaveProperty("name", testDirectory.name);
      expect(response.body).toHaveProperty("address");
      expect(Array.isArray(response.body.address)).toBe(true);
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        1,
        testDirectory.id,
        testUserId,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar um diretório sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      mockedDirectoryRepository.findById.mockResolvedValueOnce(testDirectory);

      const response = await request(app).get(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(response.status).toBe(200);
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        1,
        testDirectory.id,
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 se diretório não existir", async () => {
      mockedDirectoryRepository.findById.mockResolvedValue(undefined);

      const response = await request(app).get("/v1/directories/invalid-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Directory not found");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.findById.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).get(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(mockedDirectoryRepository.findById).toHaveBeenCalledWith(
        testDirectory.id,
        expect.anything(),
      );
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");

      expect(response).toSatisfyApiSpec();
    });

    it("deve construir o caminho (address) corretamente para subdiretórios", async () => {
      const parentDirectory = {
        id: "parent-123",
        name: "Parent Directory",
        size: 0,
        parent: null,
        path: "/parent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      const firstChildDirectory = {
        ...testDirectory,
        id: "child-12",
        name: "First Child Directory",
        parent: "parent-123",
        path: "/parent/child",
      };

      const secondChildDirectory = {
        ...testDirectory,
        id: "child-123",
        name: "Second Child Directory",
        parent: "child-12",
        path: "/parent/child",
      };

      mockedDirectoryRepository.findById
        .mockResolvedValueOnce(secondChildDirectory)
        .mockResolvedValueOnce(firstChildDirectory)
        .mockResolvedValueOnce(parentDirectory);

      const response = await request(app).get("/v1/directories/child-123");

      expect(response.status).toBe(200);
      expect(response.body.address).toHaveLength(3);
      expect(response.body.address[0]).toHaveProperty("id", "parent-123");
      expect(response.body.address[1]).toHaveProperty("id", "child-12");
      expect(response.body.address[2]).toHaveProperty("id", "child-123");

      expect(response).toSatisfyApiSpec();
    });

    it("deve construir o caminho (address) corretamente para subdiretórios sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      const parentDirectory = {
        id: "parent-123",
        name: "Parent Directory",
        size: 0,
        parent: null,
        path: "/parent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      const firstChildDirectory = {
        ...testDirectory,
        id: "child-12",
        name: undefined,
        parent: "parent-123",
        path: "/parent/child",
      } as any;

      const secondChildDirectory = {
        ...testDirectory,
        id: "child-123",
        name: "Second Child Directory",
        parent: "child-12",
        path: "/parent/child",
      };

      mockedDirectoryRepository.findById
        .mockResolvedValueOnce(secondChildDirectory)
        .mockResolvedValueOnce(firstChildDirectory)
        .mockResolvedValueOnce(parentDirectory);

      const response = await request(app).get("/v1/directories/child-123");

      expect(response.status).toBe(200);
      expect(response.body.address).toHaveLength(3);
      expect(response.body.address[0]).toHaveProperty("id", "parent-123");
      expect(response.body.address[0]).toHaveProperty(
        "name",
        "Parent Directory",
      );
      expect(response.body.address[1]).toHaveProperty("id", "child-12");
      expect(response.body.address[1]).toHaveProperty("name", "");
      expect(response.body.address[2]).toHaveProperty("id", "child-123");
      expect(response.body.address[2]).toHaveProperty(
        "name",
        "Second Child Directory",
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        1,
        "child-123",
        null,
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        2,
        "child-12",
        null,
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        3,
        "parent-123",
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve construir o caminho (address) e não repetir diretórios", async () => {
      initAppGeneric(undefined, "read,write");

      const firstChildDirectory = {
        ...testDirectory,
        id: "child-123",
        name: undefined,
        parent: "child-1234",
        path: "/parent/child",
      } as any;

      const secondChildDirectory = {
        ...testDirectory,
        id: "child-123",
        name: "Second Child Directory",
        parent: "child-12",
        path: "/parent/child",
      };

      mockedDirectoryRepository.findById
        .mockResolvedValueOnce(secondChildDirectory)
        .mockResolvedValueOnce(firstChildDirectory);

      const response = await request(app).get("/v1/directories/child-123");

      expect(response.status).toBe(200);
      expect(response.body.address).toHaveLength(1);
      expect(response.body.address[0]).toHaveProperty("id", "child-123");
      expect(response.body.address[0]).toHaveProperty(
        "name",
        "Second Child Directory",
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        1,
        "child-123",
        null,
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenNthCalledWith(
        2,
        "child-12",
        null,
      );
      expect(mockedDirectoryRepository.findById).toHaveBeenCalledTimes(2);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("PUT /v1/directories", () => {
    it("deve atualizar um diretório com nome válido", async () => {
      mockedDirectoryRepository.findById
        .mockResolvedValueOnce(testDirectory)
        .mockResolvedValueOnce({
          ...testDirectory,
          name: "Updated Directory Name",
          parent: null,
        });

      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        size: 0,
        path: testDirectory.path,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Updated Directory Name");
      expect(response.body).toHaveProperty("size", 0);
      expect(mockedDirectoryRepository.update).toHaveBeenCalledWith(
        "test-id",
        expect.anything(),
        {
          name: "Updated Directory Name",
          size: 0,
          path: testDirectory.path,
        },
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve atualizar o diretório com privacidade pública", async () => {
      initAppGeneric(testUserId, "read,write,write-public");
      mockedDirectoryRepository.findById
        .mockResolvedValueOnce(testDirectory)
        .mockResolvedValueOnce({
          ...testDirectory,
          name: "Updated Directory Name",
          parent: null,
        });

      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        size: 0,
        path: testDirectory.path,
        privacy: "public",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Updated Directory Name");
      expect(response.body).toHaveProperty("size", 0);
      expect(mockedDirectoryRepository.update).toHaveBeenCalledWith(
        "test-id",
        testUserId,
        {
          name: "Updated Directory Name",
          size: 0,
          path: testDirectory.path,
          privacy: "public",
        },
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve atualizar um diretório publico sem userId", async () => {
      initAppGeneric(undefined, "read,write");

      mockedDirectoryRepository.findById.mockResolvedValue(testDirectory);

      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
      });

      expect(response.status).toBe(200);
      expect(mockedDirectoryRepository.findById).toHaveBeenCalledWith(
        "test-id",
        null,
      );
      expect(mockedDirectoryRepository.update).toHaveBeenCalledWith(
        "test-id",
        null,
        {
          name: "Updated Directory Name",
        },
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 403 caso o usuário não tenha permissão de escrita", async () => {
      initAppGeneric(undefined, "read");
      mockedDirectoryRepository.findById.mockResolvedValue(undefined);
      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        size: 0,
        path: testDirectory.path,
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Forbidden");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 403 caso o usuário não tenha permissão para escrever conteudo publico", async () => {
      mockedDirectoryRepository.findById.mockResolvedValue(undefined);
      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        size: 0,
        path: testDirectory.path,
        privacy: "public",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Forbidden to set public privacy");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 caso o diretório não exista", async () => {
      mockedDirectoryRepository.findById.mockResolvedValue(undefined);
      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        size: 0,
        path: testDirectory.path,
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Directory not found");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.findById.mockResolvedValue(testDirectory);
      mockedDirectoryRepository.update.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).put("/v1/directories/test-id").send({
        name: "Updated Directory Name",
        parent: null,
        path: testDirectory.path,
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("DELETE /v1/directories/:id", () => {
    it("deve deletar um diretório com sucesso", async () => {
      const firstChildDirectory = {
        ...testDirectory,
        id: "child-12",
        name: "First Child Directory",
        parent: "parent-123",
        path: "/parent/child",
      };

      const secondChildDirectory = {
        ...testDirectory,
        id: "child-123",
        name: "Second Child Directory",
        parent: "parent-123",
        path: "/parent/child",
      };

      const fileInDirectory = {
        id: "file-123",
        originalName: "document.pdf",
        newName: "doc_abc123.pdf",
        extension: "pdf",
        size: 5242880,
        type: "application/pdf",
        uploadAt: "2026-05-20T10:00:00Z",
        path: "/files/doc_abc123.pdf",
        parent: "parent-123",
        status: "active",
        userId: "user-456",
        privacy: "private",
      };

      mockedDirectoryRepository.findById.mockResolvedValue(testDirectory);
      mockedDirectoryRepository.findByParent.mockResolvedValueOnce([
        firstChildDirectory,
        secondChildDirectory,
      ]);
      mockedDirectoryRepository.findByParent.mockResolvedValue([]);
      mockedFileRepository.findByParent.mockResolvedValue([fileInDirectory]);
      mockedDirectoryRepository.delete.mockResolvedValue(undefined);

      const response = await request(app).delete(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Directory deleted successfully",
      );
      expect(response.body).toHaveProperty("id", testDirectory.id);
      expect(mockedDirectoryRepository.delete).toHaveBeenCalled();

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 se diretório não existir", async () => {
      mockedDirectoryRepository.findById.mockResolvedValue(undefined);

      const response = await request(app).delete("/v1/directories/invalid-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Directory not found");

      expect(response).toSatisfyApiSpec();
    });

    it("deve deletar subdiretórios recursivamente", async () => {
      const subDirectory = {
        id: "subdir-123",
        name: "Subdirectory",
        size: 0,
        parent: testDirectory.id,
        path: "/test/subdir",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      mockedDirectoryRepository.findById.mockResolvedValue(testDirectory);
      mockedDirectoryRepository.findByParent
        .mockResolvedValueOnce([subDirectory])
        .mockResolvedValueOnce([]);
      mockedFileRepository.findByParent.mockResolvedValue([]);
      mockedDirectoryRepository.delete.mockResolvedValue(undefined);

      const response = await request(app).delete(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(response.status).toBe(200);
      expect(mockedDirectoryRepository.delete).toHaveBeenCalledTimes(2);

      expect(response).toSatisfyApiSpec();
    });

    it("deve deletar subdiretórios recursivamente sem usuário", async () => {
      initAppGeneric(undefined, "read,write");
      const subDirectory = {
        id: "subdir-123",
        name: "Subdirectory",
        size: 0,
        parent: testDirectory.id,
        path: "/test/subdir",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      mockedDirectoryRepository.findById.mockResolvedValue(testDirectory);
      mockedDirectoryRepository.findByParent
        .mockResolvedValueOnce([subDirectory])
        .mockResolvedValueOnce([]);
      mockedFileRepository.findByParent.mockResolvedValue([]);
      mockedDirectoryRepository.delete.mockResolvedValue(undefined);

      const response = await request(app).delete(
        `/v1/directories/${testDirectory.id}`,
      );

      expect(response.status).toBe(200);
      expect(mockedDirectoryRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockedDirectoryRepository.findById).toHaveBeenCalledWith(
        testDirectory.id,
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 403 caso o usuário não tenha permissão de escrita", async () => {
      initAppGeneric(undefined, "read");

      const response = await request(app).delete(
        "/v1/directories/parent-dir-123",
      );

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Forbidden");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 se ocorrer um erro interno", async () => {
      mockedDirectoryRepository.findById.mockRejectedValue(
        new Error("Internal server error"),
      );

      const response = await request(app).delete(
        "/v1/directories/parent-dir-123",
      );

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Internal server error");
      expect(mockedDirectoryRepository.findById).toHaveBeenCalledWith(
        "parent-dir-123",
        testUserId,
      );

      expect(response).toSatisfyApiSpec();
    });
  });
});
