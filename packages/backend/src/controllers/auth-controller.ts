import { Express } from "express";
import bcryptjs from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  directoryRepository,
  fileRepository,
  userRepository,
} from "../repository/sqlite";
import { generateTokens, verifyRefreshToken } from "../auth";
import { authMiddleware } from "../middleware";
import path from "node:path";
import fs from "node:fs";
import { deleteFileFromPath } from "../utils/delete-files-utils";

export const authController = (expressServer: Express) => {
  // 1. Register
  expressServer.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validação
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email e senha são obrigatórios" });
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
  expressServer.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validação
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email e senha são obrigatórios" });
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
  expressServer.post("/api/auth/refresh", async (req, res) => {
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
  expressServer.post("/api/auth/logout", authMiddleware, async (req, res) => {
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
  expressServer.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

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

  expressServer.delete(
    "/api/auth/delete-account",
    authMiddleware,
    async (req, res) => {
      try {
        const userId = (req as any).userId;

        if (!userId) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }

        const files = await fileRepository.listAllEvenNotActiveByUserId(userId);

        await fileRepository.deleteByUserId(userId);
        await directoryRepository.deleteByUserId(userId);

        // Deletar usuário do banco
        await userRepository.delete(userId);

        for (const file of files) {
          if (file.path) {
            await deleteFileFromPath(file.path);
          }
        }

        res.json({ message: "Conta deletada com sucesso" });
      } catch (error) {
        console.error("Erro ao deletar conta:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );
};
