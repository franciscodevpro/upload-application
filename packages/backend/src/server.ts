// server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { setupSwagger } from "./swagger";
import { authController } from "./controllers/auth-controller";
import { directoriesController } from "./controllers/directories-controller";
import { filesController } from "./controllers/files-controller";
import { uploadFilesController } from "./controllers/upload-files-controller";
import { downloadFilesController } from "./controllers/download-files-controller";
import { initializeDatabase } from "./repository/sqlite";
import { logger } from "./utils/logger-utils";

const app = express();
app.use(cors());
app.use(express.json());
setupSwagger(app);

const host = "127.0.0.1"; // Acessível na rede
const port = 1080;

initializeDatabase(); // Inicializa o banco de dados e cria as tabelas

// FILE UPLOAD ENDPOINTS
uploadFilesController(app);

// FILE DOWNLOAD ENDPOINTS
downloadFilesController(app);

// FILE ENDPOINTS
filesController(app);

// DIRECTORY ENDPOINTS
directoriesController(app);

// AUTH ENDPOINTS
authController(app);

app.listen(port, () => {
  logger.info(`Servidor rodando em http://${host}:${port}`);
});
