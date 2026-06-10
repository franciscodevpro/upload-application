/**
 * Testes de integração para endpoints de autenticação
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - POST /api/auth/logout
 * - GET /api/auth/me
 */

import request from "supertest";
import express, { Express } from "express";
import {
  userRepository,
  fileRepository,
  directoryRepository,
} from "../../src/repository/sqlite"; // Importar para ativar o mock
import { authController } from "../../src/controllers/auth-controller";
import * as auth from "../../src/auth";
import bcryptjs from "bcryptjs";
import jestOpenAPI from "jest-openapi";
import path from "path";
import * as verifyRecaptchaUtils from "../../src/utils/verify-recaptcha-utils";

const swaggerURL = path.join(__dirname, "../../src/swagger-definition.json");

jestOpenAPI(swaggerURL);

// Mock do banco de dados
jest.mock("../../src/repository/sqlite");
jest.mock("../../src/auth");
jest.mock("bcryptjs");
jest.mock("../../src/utils/delete-files-utils", () => ({
  deleteFileFromPath: jest.fn(),
}));
jest.mock("../../src/utils/verify-recaptcha-utils");

const mockedUserRepository = userRepository as jest.Mocked<
  typeof userRepository
>;
const mockedFileRepository = fileRepository as jest.Mocked<
  typeof fileRepository
>;
const mockedAuth = auth as jest.Mocked<typeof auth>;
const mockedBcryptjs = bcryptjs as jest.Mocked<typeof bcryptjs>;
const mockedVerifyRecaptchaUtils = verifyRecaptchaUtils as jest.Mocked<
  typeof verifyRecaptchaUtils
>;

describe("Auth Controller - HTTP Endpoints", () => {
  let app: Express;
  const testUser = {
    id: "test-123",
    email: "test@example.com",
    password: "password123",
    userRights: "read,write",
  };

  const initAppWithoutUserId = () => {
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      (req as any).userId = undefined;
      next();
    });

    authController(app);
  };

  const initAppWithUserId = () => {
    app = express();
    app.use(express.json());

    // Mock do middleware de autenticação
    app.use((req, res, next) => {
      (req as any).userId = testUser.id;
      next();
    });

    authController(app);
  };

  beforeEach(() => {
    initAppWithUserId();
    mockedVerifyRecaptchaUtils.verifyRecaptcha.mockResolvedValue(true);

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("deve registrar um novo usuário com email e senha válidos", async () => {
      mockedUserRepository.findByEmail.mockResolvedValue(undefined);
      mockedUserRepository.create.mockResolvedValue({ id: testUser.id });
      mockedBcryptjs.hash.mockReturnValue(
        Promise.resolve("hashed_password") as any,
      );

      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("userId");
      expect(response.body).toHaveProperty("email", testUser.email);
      expect(mockedUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.anything(),
          email: testUser.email,
          password: "hashed_password",
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        }),
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se der erro ao validar o captcha", async () => {
      mockedVerifyRecaptchaUtils.verifyRecaptcha.mockResolvedValue(false);
      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("reCAPTCHA verification failed");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se email estiver vazio", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "",
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se senha estiver vazia", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: "",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se senha for muito curta", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: "12345", // Menos de 6 caracteres
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("6 caracteres");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 409 se email já existe", async () => {
      mockedUserRepository.findByEmail.mockResolvedValue({
        ...testUser,
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("Email já cadastrado");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 no caso de erro interno", async () => {
      mockedUserRepository.findByEmail.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app).post("/api/auth/register").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(mockedUserRepository.findByEmail).toHaveBeenCalledWith(
        testUser.email,
      );

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("POST /api/auth/login", () => {
    it("deve fazer login com credenciais válidas", async () => {
      const hashedPassword = "$2a$10$abcdefghijklmnopqrstuvwxyz"; // Senha hash fake
      mockedBcryptjs.compare.mockImplementation(() => {
        return Promise.resolve(true);
      });
      mockedAuth.generateTokens.mockReturnValue({
        accessToken: "any_newAccessToken",
        refreshToken: "any_newRefreshToken",
      } as any);
      mockedUserRepository.findByEmail.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: hashedPassword,
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(mockedAuth.generateTokens).toHaveBeenCalledWith({
        userId: testUser.id!,
        email: testUser.email!,
        userRights: testUser.userRights!,
      });
      expect(userRepository.findByEmail).toHaveBeenCalledWith(testUser.email);
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        testUser.id!,
        "any_newRefreshToken",
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 se senha estiver incorreta", async () => {
      const hashedPassword = "$2a$10$abcdefghijklmnopqrstuvwxyz"; // Senha hash fake
      mockedBcryptjs.compare.mockImplementation(() => {
        return Promise.resolve(false);
      });
      mockedUserRepository.findByEmail.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: hashedPassword,
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Credenciais inválidas");
      expect(userRepository.findByEmail).toHaveBeenCalledWith(testUser.email);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se der erro ao validar o captcha", async () => {
      mockedVerifyRecaptchaUtils.verifyRecaptcha.mockResolvedValue(false);
      const response = await request(app).post("/api/auth/login").send({
        email: "",
        password: testUser.password,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("reCAPTCHA verification failed");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se email estiver vazio", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "",
        password: testUser.password,
      });

      expect(response.status).toBe(400);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se senha estiver vazia", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: "",
      });

      expect(response.status).toBe(400);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 se usuário não existir", async () => {
      mockedUserRepository.findByEmail.mockResolvedValue(undefined);

      const response = await request(app).post("/api/auth/login").send({
        email: "naoexiste@example.com",
        password: testUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Credenciais inválidas");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 no caso de erro interno", async () => {
      mockedUserRepository.findByEmail.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(mockedUserRepository.findByEmail).toHaveBeenCalledWith(
        testUser.email,
      );

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("deve realizar o refresh do token com sucesso", async () => {
      mockedAuth.verifyRefreshToken.mockReturnValue({
        userId: testUser.id,
      } as any);
      mockedAuth.generateTokens.mockReturnValue({
        accessToken: "any_newAccessToken",
        refreshToken: "any_newRefreshToken",
      } as any);

      mockedUserRepository.findById.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: "any_hashed",
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "existing-refresh-token",
      });

      expect(response.status).toBe(200);
      expect(mockedAuth.verifyRefreshToken).toHaveBeenCalledWith(
        "existing-refresh-token",
      );
      expect(userRepository.findById).toHaveBeenCalledWith(testUser.id);
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        testUser.id!,
        "any_newRefreshToken",
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 400 se não existir refreshToken", async () => {
      const response = await request(app).post("/api/auth/refresh").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Refresh token é obrigatório");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 se refreshToken for invalido", async () => {
      mockedAuth.verifyRefreshToken.mockReturnValue(null);

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "existing-refresh-token",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain(
        "Refresh token inválido ou expirado",
      );
      expect(mockedAuth.verifyRefreshToken).toHaveBeenCalledWith(
        "existing-refresh-token",
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 se refreshToken for diferente do registrado na base", async () => {
      mockedAuth.verifyRefreshToken.mockReturnValue({
        userId: testUser.id,
      } as any);

      mockedUserRepository.findById.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: "any_hashed",
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "any_invalid_refreshToken",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Refresh token não corresponde");
      expect(mockedAuth.verifyRefreshToken).toHaveBeenCalledWith(
        "any_invalid_refreshToken",
      );
      expect(userRepository.findById).toHaveBeenCalledWith(testUser.id);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 no caso de erro interno", async () => {
      mockedAuth.verifyRefreshToken.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app).post("/api/auth/refresh").send({
        refreshToken: "any_invalid_refreshToken",
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(mockedAuth.verifyRefreshToken).toHaveBeenCalledWith(
        "any_invalid_refreshToken",
      );

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("deve realizar o logout com sucesso", async () => {
      const response = await request(app).post("/api/auth/logout").send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Logout realizado com sucesso");
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        testUser.id!,
        null,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 no caso de erro interno", async () => {
      mockedUserRepository.updateRefreshToken.mockImplementation(() => {
        throw new Error();
      });

      const response = await request(app).post("/api/auth/logout").send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(
        testUser.id!,
        null,
      );

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("GET /api/auth/me", () => {
    it("deve retornar os dados do usuário logado", async () => {
      const hashedPassword = "$2a$10$abcdefghijklmnopqrstuvwxyz";
      mockedUserRepository.findById.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: hashedPassword,
        refreshToken: "existing-refresh-token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        access_rights: "read,write",
      });

      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
          createdAt: expect.anything(),
        }),
      );
      expect(mockedUserRepository.findById).toHaveBeenCalledWith(testUser.id);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 sem token", async () => {
      initAppWithoutUserId();
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Usuário não autenticado");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 com token inválido", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBe(401);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 404 se usuário não existir", async () => {
      mockedUserRepository.findById.mockResolvedValue(undefined);

      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Usuário não encontrado");
      expect(mockedUserRepository.findById).toHaveBeenCalledWith(testUser.id);

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 em caso de erro interno", async () => {
      mockedUserRepository.findById.mockRejectedValue(new Error());

      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(mockedUserRepository.findById).toHaveBeenCalledWith(testUser.id);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe("DELETE /api/auth/delete-account", () => {
    it("deve deletar os dados do usuário logado", async () => {
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
      mockedFileRepository.listAllEvenNotActiveByUserId.mockResolvedValue([
        testFile,
      ]);

      const response = await request(app).delete("/api/auth/delete-account");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: "Conta deletada com sucesso",
        }),
      );
      expect(
        mockedFileRepository.listAllEvenNotActiveByUserId,
      ).toHaveBeenCalledWith(testUser.id);
      expect(mockedFileRepository.deleteByUserId).toHaveBeenCalledWith(
        testUser.id,
      );
      expect(directoryRepository.deleteByUserId).toHaveBeenCalledWith(
        testUser.id,
      );

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 401 sem token", async () => {
      initAppWithoutUserId();
      const response = await request(app).delete("/api/auth/delete-account");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Usuário não autenticado");

      expect(response).toSatisfyApiSpec();
    });

    it("deve retornar erro 500 em caso de erro interno", async () => {
      mockedFileRepository.listAllEvenNotActiveByUserId.mockRejectedValue(
        new Error(),
      );

      const response = await request(app).delete("/api/auth/delete-account");

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Erro interno do servidor");
      expect(
        mockedFileRepository.listAllEvenNotActiveByUserId,
      ).toHaveBeenCalledWith(testUser.id);

      expect(response).toSatisfyApiSpec();
    });
  });
});
