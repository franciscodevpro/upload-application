import { Express } from "express";
import {
  directoryRepository,
  fileRepository,
  userRepository,
} from "../repository/sqlite";
import { authMiddleware } from "../middleware";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { AuthService } from "../services/auth-service";
import { NotFoundError } from "../errors/not-found-error";
import { BadRequestError } from "../errors/bad-request-error";
import { ConflictError } from "../errors/conflict-error";
import { error } from "console";
import { logger } from "../utils/logger-utils";

export const authController = (expressServer: Express) => {
  const authService = new AuthService(
    userRepository,
    fileRepository,
    directoryRepository,
  );

  // 1. Register
  expressServer.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await authService.signin({ email, password });

      res.status(201).json({
        message: result.message,
        userId: result.userId,
        email: result.email,
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof ConflictError) {
        return res.status(409).json({ error: error.message });
      }
      logger.error("Erro ao registrar usuário:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 2. Login
  expressServer.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({ error: error.message });
      }
      logger.error("Erro ao fazer login:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 3. Refresh Token
  expressServer.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refresToken({ refreshToken });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({ error: error.message });
      }
      logger.error("Erro ao atualizar token:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 4. Logout
  expressServer.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;

      const result = await authService.logout({ userId });
      res.status(200).json({ message: result.message });
    } catch (error) {
      logger.error("Erro ao fazer logout:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // 5. Get Current User (exemplo de endpoint protegido)
  expressServer.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;

      const result = await authService.getMe({ userId });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({ error: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      logger.error("Erro ao buscar usuário:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  expressServer.delete(
    "/api/auth/delete-account",
    authMiddleware,
    async (req, res) => {
      try {
        const userId = (req as any).userId;

        const result = await authService.deleteAccount({ userId });
        res.status(200).json({ message: result.message });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          return res.status(401).json({ error: error.message });
        }
        logger.error("Erro ao deletar conta:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );
};
