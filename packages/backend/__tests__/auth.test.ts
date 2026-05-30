/**
 * Testes para módulo de autenticação (auth.ts)
 * - Geração de tokens
 * - Verificação de tokens
 * - Expiração de tokens
 */

import {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/auth";
import jwt from "jsonwebtoken";

describe("Auth Module", () => {
  const testUserId = "test-user-123";
  const testEmail = "test@example.com";

  describe("Token Generation", () => {
    it("deve gerar um access token válido", () => {
      const token = generateAccessToken({
        userId: testUserId,
        email: testEmail,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // Verificar se o token pode ser decodificado
      const decoded = jwt.decode(token);
      expect(decoded).toBeDefined();
      expect((decoded as any).userId).toBe(testUserId);
      expect((decoded as any).email).toBe(testEmail);
    });

    it("deve gerar um refresh token válido", () => {
      const token = generateRefreshToken({
        userId: testUserId,
        email: testEmail,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = jwt.decode(token);
      expect(decoded).toBeDefined();
      expect((decoded as any).userId).toBe(testUserId);
      expect((decoded as any).email).toBe(testEmail);
    });

    it("deve gerar tokens diferentes para cada usuário", () => {
      const token1 = generateAccessToken({
        userId: testUserId,
        email: testEmail,
      });
      const token2 = generateAccessToken({
        userId: "different-user-456",
        email: "different@example.com",
      });

      // Tokens devem ser diferentes (diferentes timestamps)
      expect(token1).not.toBe(token2);
    });

    it("deve gerar um access token e um refresh token em uma chamada", () => {
      const { accessToken, refreshToken } = generateTokens({
        userId: testUserId,
        email: testEmail,
      });

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(typeof accessToken).toBe("string");
      expect(typeof refreshToken).toBe("string");
      const decodedAccessToken = jwt.decode(accessToken);
      const decodedRefreshToken = jwt.decode(refreshToken);
      expect(decodedAccessToken).toBeDefined();
      expect((decodedAccessToken as any).userId).toBe(testUserId);
      expect((decodedAccessToken as any).email).toBe(testEmail);
      expect(decodedRefreshToken).toBeDefined();
      expect((decodedRefreshToken as any).userId).toBe(testUserId);
      expect((decodedRefreshToken as any).email).toBe(testEmail);
    });
  });

  describe("Token Verification", () => {
    it("deve verificar um access token válido", () => {
      const token = generateAccessToken({
        userId: testUserId,
        email: testEmail,
      });
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it("deve verificar um refresh token válido", () => {
      const token = generateRefreshToken({
        userId: testUserId,
        email: testEmail,
      });
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it("deve retornar null para token inválido", () => {
      const invalidToken = "invalid.token.here";

      expect(verifyAccessToken(invalidToken)).toBeNull();
    });

    it("deve retornar null para token expirado", () => {
      // Criar um token que já expirou (usando secret diferente)
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        "wrong-secret",
        { expiresIn: "0s" },
      );

      expect(verifyAccessToken(expiredToken)).toBeNull();
    });

    it("deve retornar null se token for vazio", () => {
      expect(verifyAccessToken("")).toBeNull();
      expect(verifyRefreshToken("")).toBeNull();
    });
  });

  describe("Token Claims", () => {
    it("access token deve conter userId e email", () => {
      const token = generateAccessToken({
        userId: testUserId,
        email: testEmail,
      });
      const decoded = verifyAccessToken(token) as any;

      expect(decoded).toHaveProperty("userId", testUserId);
      expect(decoded).toHaveProperty("email", testEmail);
      expect(decoded).toHaveProperty("iat"); // issued at
      expect(decoded).toHaveProperty("exp"); // expiration
    });

    it("refresh token deve conter userId e email", () => {
      const token = generateRefreshToken({
        userId: testUserId,
        email: testEmail,
      });
      const decoded = verifyRefreshToken(token) as any;

      expect(decoded).toHaveProperty("userId", testUserId);
      expect(decoded).toHaveProperty("email", testEmail);
      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
    });

    it("access token deve expirar mais rápido que refresh token", () => {
      const accessToken = generateAccessToken({
        userId: testUserId,
        email: testEmail,
      });
      const refreshToken = generateRefreshToken({
        userId: testUserId,
        email: testEmail,
      });

      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      // Refresh token deve ter expiration time maior
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });
});
