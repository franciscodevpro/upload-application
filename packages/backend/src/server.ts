// server.ts
import express from "express";
import cors from "cors";
import { setupSwagger } from "./swagger";
import { authController } from "./controllers/auth-controller";
import { directoriesController } from "./controllers/directories-controller";
import { filesController } from "./controllers/files-controller";
import { uploadFilesController } from "./controllers/upload-files-controller";
import { downloadFilesController } from "./controllers/download-files-controller";

const app = express();
app.use(cors());
app.use(express.json());
setupSwagger(app);

const host = "127.0.0.1"; // Acessível na rede
const port = 1080;

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
  console.log(`Servidor rodando em http://${host}:${port}`);
});
