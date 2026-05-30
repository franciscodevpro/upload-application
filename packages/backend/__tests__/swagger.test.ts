/**
 * Testes para middleware de autenticação (middleware.ts)
 * - Validação de token no header
 * - Extração de dados do token
 * - Tratamento de erros
 */
import request from "supertest";
import express from "express";
import { setupSwagger } from "../src/swagger";

describe("Swagger Resource", () => {
  let app = express();

  beforeEach(() => {
    app.use(express.json());

    app.use((req, res, next) => {
      (req as any).userId = undefined;
      next();
    });

    setupSwagger(app);
  });

  describe("GET /api-docs", () => {
    it("deve retornar um html com o swagger", async () => {
      const response = await request(app).get("/api-docs").redirects(1);

      expect(response.status).toBe(200);
      expect(response.type).toContain("text/html");
      expect(response.text).toContain("Swagger UI");
    });
  });
});
