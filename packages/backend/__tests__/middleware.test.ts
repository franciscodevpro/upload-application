/**
 * Testes para middleware de autenticação (middleware.ts)
 * - Validação de token no header
 * - Extração de dados do token
 * - Tratamento de erros
 */

import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../src/middleware";
import { generateAccessToken } from "../src/auth";

describe("Auth Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mocked<NextFunction>;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe("Authorization Header", () => {
    it("deve chamar next() com token válido", () => {
      const token = generateAccessToken({
        userId: "user-123",
        email: "test@example.com",
      });
      req.headers = {
        authorization: `Bearer ${token}`,
      };

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).userId).toBe("user-123");
      expect((req as any).email).toBe("test@example.com");
    });

    it("deve chamar next() se header Authorization não existir", () => {
      req.headers = {};

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("deve retornar 401 se token estiver vazio", () => {
      req.headers = {
        authorization: "Bearer ",
      };

      authMiddleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("deve chamar next() se formato Bearer estiver incorreto", () => {
      req.headers = {
        authorization: "InvalidToken token123",
      };

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("deve retornar 401 se token for inválido", () => {
      req.headers = {
        authorization: "Bearer invalid.token.structure",
      };

      authMiddleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Token Data Extraction", () => {
    it("deve adicionar userId ao request", () => {
      const token = generateAccessToken({
        userId: "user-456",
        email: "user@test.com",
      });
      req.headers = {
        authorization: `Bearer ${token}`,
      };

      authMiddleware(req as Request, res as Response, next);

      expect((req as any).userId).toBe("user-456");
    });

    it("deve adicionar email ao request", () => {
      const token = generateAccessToken({
        userId: "user-456",
        email: "user@test.com",
      });
      req.headers = {
        authorization: `Bearer ${token}`,
      };

      authMiddleware(req as Request, res as Response, next);

      expect((req as any).email).toBe("user@test.com");
    });

    it("deve preservar dados do request", () => {
      const token = generateAccessToken({
        userId: "user-789",
        email: "test@app.com",
      });
      req.headers = {
        authorization: `Bearer ${token}`,
      };
      req.body = { data: "should be preserved" };

      authMiddleware(req as Request, res as Response, next);

      expect((req as any).body.data).toBe("should be preserved");
    });
  });

  describe("Error Handling", () => {
    it("deve retornar mensagem de erro consistente", () => {
      req.headers = {
        authorization: "Bearer invalid.token.structure",
      };

      authMiddleware(req as Request, res as Response, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty("error");
    });

    it("deve usar status 401 para todos os erros de auth", () => {
      req.headers = {
        authorization: "Bearer invalid.token.structure",
      };

      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);

      (res.status as jest.Mock).mockClear();

      // Teste com token inválido
      req.headers = { authorization: "Bearer invalid" };
      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("deve usar status 401 algum erro interno no processo de auth", () => {
      req.headers = undefined;

      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Falha na autenticação" });
    });
  });

  describe("Case Sensitivity", () => {
    it('deve aceitar "Bearer" com diferentes casos', () => {
      const token = generateAccessToken({
        userId: "user-123",
        email: "test@example.com",
      });

      // Teste com "bearer" (minúsculo)
      req.headers = {
        authorization: `bearer ${token}`,
      };

      authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).userId).toBe("user-123");
      expect((req as any).email).toBe("test@example.com");
    });
  });
});
