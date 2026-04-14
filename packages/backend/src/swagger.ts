import { Express } from "express";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Upload Application API",
    version: "1.0.0",
    description:
      "Documentacao da API para upload, listagem e gerenciamento de arquivos e diretorios.",
  },
  servers: [
    {
      url: "http://127.0.0.1:1080",
      description: "Servidor local",
    },
  ],
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      File: {
        type: "object",
        properties: {
          id: { type: "string" },
          originalName: { type: "string" },
          newName: { type: "string" },
          extension: { type: "string" },
          size: { type: "number" },
          type: { type: "string" },
          uploadAt: { type: "string", format: "date-time" },
          path: { type: "string" },
          parent: { type: ["string", "null"] },
          status: { type: "string" },
        },
      },
      Directory: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          size: { type: "number" },
          parent: { type: ["string", "null"] },
          path: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          status: { type: "string" },
        },
      },
      DirectoryAddressItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      DirectoryWithAddress: {
        allOf: [
          { $ref: "#/components/schemas/Directory" },
          {
            type: "object",
            properties: {
              address: {
                type: "array",
                items: { $ref: "#/components/schemas/DirectoryAddressItem" },
                description:
                  "Lista ordenada da raiz ate o diretorio solicitado, contendo id e name de cada diretorio.",
              },
            },
          },
        ],
      },
      UpdateFileRequest: {
        type: "object",
        properties: {
          parent: { type: ["string", "null"] },
          originalName: { type: "string" },
        },
      },
      CreateDirectoryRequest: {
        type: "object",
        required: ["name", "path"],
        properties: {
          name: { type: "string" },
          parent: { type: ["string", "null"] },
          path: { type: "string" },
        },
      },
      UpdateDirectoryRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          path: { type: "string" },
          size: { type: "number" },
        },
      },
    },
  },
  paths: {
    "/api/files": {
      get: {
        summary: "Lista os arquivos",
        tags: ["Files"],
        responses: {
          200: {
            description: "Lista de arquivos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/File" },
                },
              },
            },
          },
        },
      },
    },
    "/api/files/{id}": {
      put: {
        summary: "Atualiza um arquivo",
        tags: ["Files"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateFileRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Arquivo atualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/File" },
              },
            },
          },
          404: {
            description: "Arquivo nao encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Inativa um arquivo",
        tags: ["Files"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Arquivo removido",
          },
          404: {
            description: "Arquivo nao encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/download": {
      get: {
        summary: "Baixa um ou varios arquivos",
        tags: ["Download"],
        parameters: [
          {
            name: "files",
            in: "query",
            required: true,
            description: "IDs dos arquivos para download",
            schema: {
              oneOf: [
                { type: "string" },
                {
                  type: "array",
                  items: { type: "string" },
                },
              ],
            },
          },
        ],
        responses: {
          200: {
            description: "Arquivo unico ou ZIP para download",
          },
          400: {
            description: "Nenhum arquivo selecionado",
          },
          404: {
            description: "Arquivo nao encontrado",
          },
        },
      },
    },
    "/api/directories": {
      post: {
        summary: "Cria um diretorio",
        tags: ["Directories"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDirectoryRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Diretorio criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Directory" },
              },
            },
          },
          400: {
            description: "Dados invalidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        summary: "Lista todos os diretorios",
        tags: ["Directories"],
        parameters: [
          {
            name: "parent",
            in: "query",
            required: false,
            description:
              "Filtra por parent. Quando nao informado, retorna somente diretorios raiz (parent nulo).",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Lista de diretorios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Directory" },
                },
              },
            },
          },
        },
      },
    },
    "/api/directories/{id}": {
      get: {
        summary: "Busca diretorio por ID",
        tags: ["Directories"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Diretorio encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DirectoryWithAddress" },
              },
            },
          },
          404: {
            description: "Diretorio nao encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      put: {
        summary: "Atualiza diretorio",
        tags: ["Directories"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateDirectoryRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Diretorio atualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Directory" },
              },
            },
          },
          404: {
            description: "Diretorio nao encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Inativa diretorio",
        tags: ["Directories"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Diretorio removido",
          },
          404: {
            description: "Diretorio nao encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/directories/{parentId}/subdirectories": {
      get: {
        summary: "Lista subdiretorios por parentId",
        tags: ["Directories"],
        parameters: [
          {
            name: "parentId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Lista de subdiretorios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Directory" },
                },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupSwagger = (app: Express): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
