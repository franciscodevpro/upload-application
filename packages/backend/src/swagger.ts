import { Express } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
const swaggerDefinition = require("./swagger-definition.json");

const swaggerOptions = {
  definition: {
    ...swaggerDefinition,
    servers: [
      {
        url: process?.env?.API_BASE_PATH as string | "http://127.0.0.1:1080",
        description: "Servidor local",
      },
    ],
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app: Express): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
