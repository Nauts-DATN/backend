import { env } from "../config/env.js";

const baseUrl =
  process.env.PUBLIC_API_URL?.replace(/\/$/, "") ??
  `http://localhost:${env.port}`;

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "EduAI API",
    version: "1.0.0",
    description: "REST API — MongoDB + S3 (MinIO).",
  },
  servers: [{ url: `${baseUrl}/api`, description: "API" }],
  tags: [
    { name: "health", description: "Kiểm tra dịch vụ" },
    { name: "users", description: "Người dùng" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["health"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "503": {
            description: "Một hoặc nhiều dịch vụ phụ thuộc lỗi",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/users": {
      get: {
        tags: ["users"],
        summary: "Danh sách user",
        operationId: "listUsers",
        responses: {
          "200": {
            description: "Danh sách",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["users"],
        summary: "Tạo user",
        operationId: "createUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserBody" },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": {
            description: "Thiếu tham số",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "409": {
            description: "Email trùng",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["users"],
        summary: "Chi tiết user",
        operationId: "getUserById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "404": {
            description: "Không tìm thấy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
    "/users/{id}/avatar": {
      post: {
        tags: ["users"],
        summary: "Upload avatar (multipart)",
        operationId: "uploadAvatar",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Ảnh (field name: file)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Đã upload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AvatarUploadResponse" },
              },
            },
          },
          "400": {
            description: "Thiếu file",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
          "404": {
            description: "User không tồn tại",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorMessage" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          mongo: { type: "string", enum: ["ok", "down"] },
          s3: { type: "string", enum: ["ok", "down"] },
        },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          avatarKey: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateUserBody: {
        type: "object",
        required: ["email", "name"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      },
      ErrorMessage: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      AvatarUploadResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          objectKey: { type: "string" },
          publicUrl: { type: "string" },
        },
      },
    },
  },
};
