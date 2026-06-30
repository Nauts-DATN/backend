import { env } from "../config/env.js";

const baseUrl =
  env.apiPublicUrl || `http://localhost:${env.port}`;
;
const bearer = {
  type: "http" as const,
  scheme: "bearer" as const,
  bearerFormat: "JWT",
  description:
    "Nhận token từ `POST /auth/login`. Header: `Authorization: Bearer <accessToken>`.",
};

/** Tạo schema ApiResponse<T> để dùng trong responses. */
function wrap(dataSchema: object, nullable = false) {
  return {
    type: "object",
    properties: {
      status: { type: "integer", example: 200 },
      error: { type: "string", nullable: true, example: null },
      isSuccess: { type: "boolean", example: true },
      data: nullable
        ? { ...dataSchema, nullable: true }
        : dataSchema,
    },
  };
}

/** ApiResponse cho lỗi */
const errorResponse = {
  type: "object",
  properties: {
    status: { type: "integer", example: 400 },
    error: { type: "string", example: "Mô tả lỗi" },
    isSuccess: { type: "boolean", example: false },
    data: { type: "object", nullable: true, example: null },
  },
};

function errContent() {
  return {
    "application/json": {
      schema: errorResponse,
    },
  };
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "EduAI API",
    version: "1.0.0",
    description: `REST API — MongoDB (Mongoose) + object storage S3-compatible (MinIO).

**Base URL:** \`${baseUrl}/api\`

**Tài liệu JSON:** [\`/api/openapi.json\`](${baseUrl}/api/openapi.json)

**Tất cả response** (kể cả lỗi) đều theo cấu trúc \`ApiResponse<T>\`:
\`\`\`json
{ "status": 200, "error": null, "isSuccess": true, "data": { ... } }
\`\`\`

**Auth:** Đăng ký → email xác thực (link + mã 6 số) → đăng nhập → JWT.

**Role:** \`admin\` | \`user\``,
    contact: { name: "EduAI" },
    license: { name: "MIT" },
  },
  externalDocs: {
    description: "OpenAPI JSON",
    url: `${baseUrl}/api/openapi.json`,
  },
  servers: [{ url: `${baseUrl}/api`, description: "API (prefix /api)" }],
  tags: [
    { name: "health", description: "Kiểm tra MongoDB và MinIO/S3." },
    {
      name: "auth",
      description:
        "Đăng ký, đăng nhập, xác thực email. `GET /auth/me` cần Bearer token.",
    },
    {
      name: "users",
      description:
        "`GET /users` chỉ **admin**. Các route còn lại: chính mình hoặc admin.",
    },
    {
      name: "documents",
      description:
        "Upload / tải tài liệu. User thấy tài liệu của chính mình; admin thấy tất cả.",
    },
    {
      name: "categories",
      description:
        "Danh mục tài liệu. `GET` cần Bearer token. `POST / PATCH / DELETE` chỉ **admin**.",
    },
    {
      name: "courses",
      description:
        "Môn học / khoá học. `GET` cần Bearer token. `POST / PATCH / DELETE` chỉ **admin**.",
    },
    {
      name: "notes",
      description:
        "Ghi chú gắn với document. Mỗi document có thể có nhiều ghi chú. User chỉ thao tác ghi chú của chính mình; admin thao tác tất cả.",
    },
    {
      name: "roadmaps",
      description:
        "Lộ trình học tập gồm nhiều task. Progress tự tính bằng completedTasks / totalTasks * 100.",
    },
    {
      name: "ai",
      description:
        "Tính năng AI — tóm tắt nội dung tài liệu bằng **Gemini 2.5 Flash**. Yêu cầu cấu hình `GEMINI_API_KEY` trên server. Chỉ hỗ trợ file **PDF**.",
    },
  ],
  paths: {
    // ── health ──────────────────────────────────────────────────────────────
    "/health": {
      get: {
        tags: ["health"],
        summary: "Health check",
        description:
          "Trả `mongo` và `s3` là `ok` hoặc `down`. HTTP 200 nếu cả hai ok, 503 nếu có dịch vụ lỗi.",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/HealthData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: { mongo: "ok", s3: "ok" },
                },
              },
            },
          },
          "503": {
            description: "Ít nhất một dịch vụ lỗi",
            content: {
              "application/json": {
                schema: errorResponse,
                example: {
                  status: 503,
                  error: { mongo: "ok", s3: "down" },
                  isSuccess: false,
                  data: null,
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── auth ─────────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Đăng ký",
        description:
          "Tạo tài khoản role **user**. Email gửi mã 6 số + liên kết xác thực — **không** trả `accessToken`.",
        operationId: "register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterBody" },
              examples: {
                default: {
                  value: {
                    email: "user@example.com",
                    name: "Nguyễn Văn A",
                    password: "secret12",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo user — kiểm tra email để xác thực",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RegisterData" }),
              },
            },
          },
          "400": { description: "Thiếu field hoặc mật khẩu < 6 ký tự", content: errContent() },
          "409": { description: "Email đã tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Đăng nhập",
        description: "Trả `accessToken` JWT và thông tin user.",
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginBody" },
              examples: {
                default: {
                  value: { email: "user@example.com", password: "secret12" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/AuthData" }),
              },
            },
          },
          "400": { description: "Thiếu email hoặc password", content: errContent() },
          "401": { description: "Sai email hoặc mật khẩu", content: errContent() },
          "403": { description: "Chưa xác thực email", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/verify-email": {
      get: {
        tags: ["auth"],
        summary: "Xác thực email (link)",
        description: "Query `token` gửi qua email.",
        operationId: "verifyEmail",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Lọc theo Category ObjectId",
          },
          {
            name: "course",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Lọc theo Course ObjectId",
          },
        ],
        responses: {
          "200": {
            description: "Đã xác thực",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/VerifyEmailData" }),
              },
            },
          },
          "400": { description: "Token thiếu / sai / hết hạn", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/verify-email-code": {
      post: {
        tags: ["auth"],
        summary: "Xác thực email bằng mã 6 số",
        operationId: "verifyEmailCode",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailCodeBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "Đã xác thực",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/VerifyEmailData" }),
              },
            },
          },
          "400": { description: "Thiếu field / sai mã / hết hạn", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        tags: ["auth"],
        summary: "Gửi lại email xác thực",
        description: "Luôn trả 200 (không leak email tồn tại hay không).",
        operationId: "resendVerification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResendVerificationBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
              },
            },
          },
          "400": { description: "Thiếu email", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Thông tin user hiện tại",
        description: "Cần Bearer token. User lấy theo `sub` trong JWT.",
        operationId: "me",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/UserData" }),
              },
            },
          },
          "401": { description: "Thiếu / sai / hết hạn token", content: errContent() },
          "404": { description: "User không còn trong DB", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── users ────────────────────────────────────────────────────────────────
    "/users": {
      get: {
        tags: ["users"],
        summary: "Danh sách user",
        description: "Chỉ **admin**. Cần Bearer token.",
        operationId: "listUsers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({
                  type: "array",
                  items: { $ref: "#/components/schemas/UserPublic" },
                }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["users"],
        summary: "Chi tiết user theo id",
        description: "Chỉ **chính user** hoặc **admin**.",
        operationId: "getUserById",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/UserPublic" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy user", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/users/{id}/avatar": {
      post: {
        tags: ["users"],
        summary: "Upload avatar",
        description:
          "Multipart field **`file`** (PNG/JPEG, tối đa 5 MB). Chính user hoặc admin.",
        operationId: "uploadAvatar",
        security: [{ bearerAuth: [] }],
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
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload thành công",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/AvatarUploadData" }),
              },
            },
          },
          "400": { description: "Thiếu file", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "User không tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── categories ───────────────────────────────────────────────────────────
    "/categories": {
      get: {
        tags: ["categories"],
        summary: "Danh sách category",
        description: "Trả tất cả category, sắp xếp theo tên. Cần Bearer token.",
        operationId: "listCategories",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CategoryListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        tags: ["categories"],
        summary: "Tạo category",
        description: "Chỉ **admin**.",
        operationId: "createCategory",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CategoryBody" },
              examples: {
                default: { value: { name: "Toán học", description: "Tài liệu toán" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CategoryData" }),
              },
            },
          },
          "400": { description: "Thiếu name", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "409": { description: "Tên đã tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/categories/{id}": {
      get: {
        tags: ["categories"],
        summary: "Chi tiết category",
        operationId: "getCategoryById",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CategoryData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      patch: {
        tags: ["categories"],
        summary: "Cập nhật category",
        description: "Chỉ **admin**. Chỉ truyền các field cần cập nhật.",
        operationId: "updateCategory",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CategoryBodyPartial" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CategoryData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "409": { description: "Tên đã tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["categories"],
        summary: "Xóa category",
        description: "Chỉ **admin**.",
        operationId: "deleteCategory",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Đã xóa",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── courses ───────────────────────────────────────────────────────────────
    "/courses": {
      get: {
        tags: ["courses"],
        summary: "Danh sách course",
        description: "Trả tất cả course, sắp xếp theo tên. Cần Bearer token.",
        operationId: "listCourses",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CourseListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      post: {
        tags: ["courses"],
        summary: "Tạo course",
        description: "Chỉ **admin**.",
        operationId: "createCourse",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CourseBody" },
              examples: {
                default: { value: { name: "Giải tích", description: "Toán cao cấp" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CourseData" }),
              },
            },
          },
          "400": { description: "Thiếu name", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "409": { description: "Tên đã tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/courses/{id}": {
      get: {
        tags: ["courses"],
        summary: "Chi tiết course",
        operationId: "getCourseById",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CourseData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      patch: {
        tags: ["courses"],
        summary: "Cập nhật course",
        description: "Chỉ **admin**. Chỉ truyền các field cần cập nhật.",
        operationId: "updateCourse",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CourseBodyPartial" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/CourseData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "409": { description: "Tên đã tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["courses"],
        summary: "Xóa course",
        description: "Chỉ **admin**.",
        operationId: "deleteCourse",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Đã xóa",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── documents ────────────────────────────────────────────────────────────
    "/documents": {
      post: {
        tags: ["documents"],
        summary: "Upload document",
        description:
          "Multipart `file` (tối đa **15 MB**) + `title` (bắt buộc) + `description`, `category`, `course` (tuỳ chọn). Cần Bearer token.",
        operationId: "uploadDocument",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "title"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "File cần upload (PDF, DOCX, …)",
                  },
                  title: {
                    type: "string",
                    example: "Báo cáo tháng 1",
                  },
                  description: {
                    type: "string",
                    example: "Mô tả ngắn về tài liệu",
                  },
                  category: {
                    type: "string",
                    description: "ObjectId của Category (tuỳ chọn)",
                    example: "674a000000000000000000bb",
                  },
                  course: {
                    type: "string",
                    description: "ObjectId của Course (tuỳ chọn)",
                    example: "674a000000000000000000cc",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Upload thành công",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/DocumentData" }),
                example: {
                  status: 201,
                  error: null,
                  isSuccess: true,
                  data: {
                    document: {
                      id: "674a1b2c3d4e5f6789abcdef",
                      title: "Báo cáo tháng 1",
                      description: "Mô tả ngắn",
                      uploadedBy: "674a000000000000000000aa",
                      category: "674a000000000000000000bb",
                      course: "674a000000000000000000cc",
                      fileName: "report.pdf",
                      fileSize: 102400,
                      mimeType: "application/pdf",
                      downloadUrl: "http://minio:9000/bucket/documents/userId/uuid_report.pdf",
                      presignedUrl: "http://minio:9000/bucket/documents/...?X-Amz-Algorithm=...&X-Amz-Expires=900&X-Amz-Signature=...",
                      presignedExpiresIn: 900,
                      createdAt: "2025-01-01T00:00:00.000Z",
                      updatedAt: "2025-01-01T00:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Thiếu file hoặc thiếu title", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      get: {
        tags: ["documents"],
        summary: "Danh sách document",
        description:
          "User thường chỉ thấy tài liệu của **chính mình**. **Admin** thấy tất cả.",
        operationId: "listDocuments",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Từ khóa tìm theo tiêu đề",
          },
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Lọc theo Category ObjectId",
          },
          {
            name: "course",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Lọc theo Course ObjectId",
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/DocumentListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/documents/{id}": {
      get: {
        tags: ["documents"],
        summary: "Chi tiết document",
        description:
          "Trả metadata + `downloadUrl`. Chỉ **owner** hoặc **admin**.",
        operationId: "getDocumentById",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/DocumentData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải owner và không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["documents"],
        summary: "Xóa document",
        description:
          "Xóa bản ghi MongoDB **và** file trên S3. Chỉ **owner** hoặc **admin**.",
        operationId: "deleteDocument",
        security: [{ bearerAuth: [] }],
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
            description: "Đã xóa",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/documents/{id}/presigned-url": {
      get: {
        tags: ["documents"],
        summary: "Lấy presigned URL",
        description:
          "Trả về URL có chữ ký tạm thời để client tải file **trực tiếp từ S3/MinIO** mà không cần qua backend. Chỉ **owner** hoặc **admin**.\n\n- `expiresIn`: thời gian hiệu lực (giây), min 60 — max 3600, mặc định **900** (15 phút).",
        operationId: "getDocumentPresignedUrl",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "expiresIn",
            in: "query",
            required: false,
            description: "Thời gian hiệu lực URL (giây). Min 60, max 3600. Mặc định 900.",
            schema: { type: "integer", minimum: 60, maximum: 3600, default: 900, example: 900 },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/PresignedUrlData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: {
                    url: "http://minio:9000/bucket/documents/...?X-Amz-Algorithm=...&X-Amz-Expires=900&X-Amz-Signature=...",
                    fileName: "report.pdf",
                    expiresIn: 900,
                  },
                },
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không phải owner và không phải admin", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/documents/{id}/summary": {
      get: {
        tags: ["ai", "documents"],
        summary: "Lấy bản tóm tắt AI đã lưu",
        description:
          "Trả về bản tóm tắt đã được lưu trong database. **Không gọi lại AI.** Trả 404 nếu document chưa được tóm tắt lần nào.",
        operationId: "getCachedSummary",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "Trả về bản tóm tắt đã lưu",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/SummaryData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền truy cập document", content: errContent() },
          "404": {
            description: "Document không tồn tại hoặc chưa được tóm tắt",
            content: errContent(),
          },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/documents/{id}/summarize": {
      post: {
        tags: ["ai", "documents"],
        summary: "Tóm tắt tài liệu bằng AI",
        description: `Tải file PDF từ S3, upload lên **Gemini Files API**, gọi \`gemini-2.5-flash\` để đọc toàn bộ nội dung, trả về bản tóm tắt tiếng Việt có cấu trúc và **lưu vào database**:

- **Tổng quan** — 2–3 câu mô tả chủ đề và mục đích tài liệu.
- **Nội dung chính** — 5–8 ý chính dạng bullet points.
- **Từ khóa** — danh sách từ khóa quan trọng.

> **Lưu ý:** Chỉ hỗ trợ file **PDF**. Nếu server chưa cấu hình \`GEMINI_API_KEY\` sẽ trả 503.
> File được xóa khỏi Gemini ngay sau khi tóm tắt xong. Dùng \`GET /summary\` để lấy lại bản đã lưu mà không tốn quota.`,
        operationId: "summarizeDocument",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "Tóm tắt thành công",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/SummaryData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: {
                    documentId: "674a1b2c3d4e5f6789abcdef",
                    documentTitle: "Giáo trình Giải tích",
                    summary:
                      "## Tổng quan\nTài liệu trình bày các khái niệm cơ bản của Giải tích...\n\n## Nội dung chính\n- Giới hạn và liên tục\n- Đạo hàm và vi phân\n...\n\n## Từ khóa\nGiải tích, đạo hàm, tích phân, giới hạn",
                  },
                },
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền truy cập document", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "422": { description: "File không phải PDF", content: errContent() },
          "502": { description: "Gemini trả về lỗi hoặc nội dung rỗng", content: errContent() },
          "503": { description: "GEMINI_API_KEY chưa được cấu hình", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/documents/{id}/quiz": {
      post: {
        tags: ["ai", "documents"],
        summary: "Tạo bộ câu hỏi từ tài liệu bằng AI",
        description: `Tải file PDF từ S3, upload lên **Gemini Files API**, gọi \`gemini-2.5-flash-lite\` để tạo bộ câu hỏi kiểm tra theo loại được yêu cầu.

- **multiple_choice** — câu hỏi trắc nghiệm, 4 lựa chọn, 1 đáp án đúng.
- **essay** — câu hỏi tự luận, kèm gợi ý trả lời mẫu.

> **Lưu ý:** Chỉ hỗ trợ file **PDF**. Nếu server chưa cấu hình \`GEMINI_API_KEY\` sẽ trả 503.
> File được xóa khỏi Gemini ngay sau khi tạo quiz xong.`,
        operationId: "generateQuiz",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuizBody" },
              example: { questionType: "multiple_choice", count: 5 },
            },
          },
        },
        responses: {
          "200": {
            description: "Tạo quiz thành công",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/QuizData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: {
                    documentId: "674a1b2c3d4e5f6789abcdef",
                    documentTitle: "Giáo trình Giải tích",
                    questionType: "multiple_choice",
                    questions: [
                      {
                        id: "q1",
                        type: "multiple_choice",
                        text: "Giới hạn của hàm số f(x) = x² khi x → 2 là bao nhiêu?",
                        options: ["2", "4", "8", "16"],
                        answer: 1,
                        explanation: "f(2) = 2² = 4",
                      },
                    ],
                  },
                },
              },
            },
          },
          "400": { description: "questionType không hợp lệ", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền truy cập document", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "422": { description: "File không phải PDF", content: errContent() },
          "502": { description: "Gemini trả về lỗi hoặc nội dung rỗng", content: errContent() },
          "503": { description: "GEMINI_API_KEY chưa được cấu hình", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/documents/{id}/quizzes": {
      get: {
        tags: ["ai", "documents"],
        summary: "Danh sách quiz của document",
        description: "Trả tất cả quiz đã tạo cho document, sắp xếp theo `createdAt` giảm dần. Chỉ **owner** hoặc **admin**.",
        operationId: "listQuizzesByDocument",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "OK — mảng quiz (rỗng nếu chưa có)",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/QuizListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/quizzes": {
      get: {
        tags: ["ai"],
        summary: "Danh sách tất cả quiz của tôi",
        description:
          "Trả về tất cả quiz mà người dùng hiện tại đã tạo, sắp xếp theo `createdAt` giảm dần. **Admin** thấy quiz của mọi người dùng.",
        operationId: "listMyQuizzes",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/QuizListData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: {
                    quizzes: [
                      {
                        id: "674a000000000000000000ee",
                        documentId: "674a1b2c3d4e5f6789abcdef",
                        createdBy: "674a000000000000000000aa",
                        questionType: "multiple_choice",
                        questions: [],
                        createdAt: "2026-05-01T08:30:00.000Z",
                        updatedAt: "2026-05-01T08:30:00.000Z",
                      },
                    ],
                  },
                },
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/quizzes/{id}": {
      get: {
        tags: ["ai"],
        summary: "Lấy chi tiết một quiz",
        operationId: "getQuizById",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của quiz",
            schema: { type: "string", example: "674a000000000000000000ee" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/QuizPublicData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy quiz", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["ai"],
        summary: "Xóa một quiz",
        operationId: "deleteQuiz",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của quiz",
            schema: { type: "string", example: "674a000000000000000000ee" },
          },
        ],
        responses: {
          "200": { description: "Xóa thành công" },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy quiz", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/documents/{id}/note": {
      get: {
        tags: ["notes", "documents"],
        summary: "Danh sách ghi chú của document",
        description:
          "Trả **tất cả** ghi chú gắn với document chỉ định, sắp xếp theo `updatedAt` giảm dần. Chỉ **owner** hoặc **admin**.",
        operationId: "listNotesByDocument",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của document",
            schema: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          },
        ],
        responses: {
          "200": {
            description: "OK — trả mảng (rỗng nếu chưa có ghi chú nào)",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/NoteListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền truy cập document", content: errContent() },
          "404": { description: "Document không tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/documents/{id}/download": {
      get: {
        tags: ["documents"],
        summary: "Tải file document",
        description:
          "Stream file trực tiếp từ S3 về client. Response là binary (không phải JSON). Header `Content-Disposition: attachment`.",
        operationId: "downloadDocument",
        security: [{ bearerAuth: [] }],
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
            description: "File binary",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
              "application/pdf": {
                schema: { type: "string", format: "binary" },
              },
            },
            headers: {
              "Content-Disposition": {
                description: "attachment; filename=\"<tên file>\"",
                schema: { type: "string" },
              },
              "Content-Length": {
                description: "Kích thước file (bytes)",
                schema: { type: "integer" },
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── roadmaps ─────────────────────────────────────────────────────────────
    "/roadmaps": {
      post: {
        tags: ["roadmaps"],
        summary: "Tạo roadmap",
        operationId: "createRoadmap",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapBody" },
              example: {
                title: "Learn React in 14 days",
                description: "Lộ trình học React cơ bản đến hooks",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapData" }),
              },
            },
          },
          "400": { description: "Thiếu title", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      get: {
        tags: ["roadmaps"],
        summary: "Danh sách roadmap của user hiện tại",
        operationId: "listRoadmaps",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/roadmaps/{id}": {
      get: {
        tags: ["roadmaps"],
        summary: "Chi tiết roadmap kèm tasks",
        operationId: "getRoadmapById",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000100" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapDetailData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy roadmap", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      patch: {
        tags: ["roadmaps"],
        summary: "Cập nhật roadmap",
        operationId: "updateRoadmap",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000100" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapBodyPartial" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapData" }),
              },
            },
          },
          "400": { description: "Dữ liệu không hợp lệ", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy roadmap", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["roadmaps"],
        summary: "Xóa roadmap và toàn bộ tasks",
        operationId: "deleteRoadmap",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000100" },
          },
        ],
        responses: {
          "200": {
            description: "Đã xóa",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy roadmap", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/roadmaps/{id}/tasks": {
      post: {
        tags: ["roadmaps"],
        summary: "Thêm task vào roadmap",
        operationId: "addRoadmapTask",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000100" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapTaskBody" },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo task",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapTaskMutationData" }),
              },
            },
          },
          "400": { description: "Thiếu title", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy roadmap/document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/roadmaps/tasks/{taskId}": {
      patch: {
        tags: ["roadmaps"],
        summary: "Cập nhật task",
        operationId: "updateRoadmapTask",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000101" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapTaskBodyPartial" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapTaskMutationData" }),
              },
            },
          },
          "400": { description: "Dữ liệu không hợp lệ", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy task/document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["roadmaps"],
        summary: "Xóa task",
        operationId: "deleteRoadmapTask",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000101" },
          },
        ],
        responses: {
          "200": {
            description: "Đã xóa task",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy task", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/roadmaps/tasks/{taskId}/complete": {
      patch: {
        tags: ["roadmaps"],
        summary: "Đánh dấu hoàn thành/chưa hoàn thành task",
        operationId: "completeRoadmapTask",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000101" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapTaskCompleteBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapTaskMutationData" }),
              },
            },
          },
          "400": { description: "Thiếu hoặc sai isCompleted", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy task", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    "/roadmaps/tasks/{taskId}/document": {
      patch: {
        tags: ["roadmaps"],
        summary: "Gắn hoặc bỏ document khỏi task",
        description: "Truyền `documentId: null` để bỏ liên kết document.",
        operationId: "attachDocumentToRoadmapTask",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a00000000000000000101" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoadmapTaskDocumentBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/RoadmapTaskMutationData" }),
              },
            },
          },
          "400": { description: "Thiếu documentId", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy task/document", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },

    // ── notes ────────────────────────────────────────────────────────────────
    "/notes": {
      post: {
        tags: ["notes"],
        summary: "Tạo ghi chú",
        description:
          "Tạo ghi chú cho document. Một document có thể có **nhiều** ghi chú. Cần Bearer token.",
        operationId: "createNote",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NoteBody" },
              examples: {
                default: {
                  value: {
                    title: "Tóm tắt chương 1",
                    content: "Nội dung ghi chú...",
                    documentId: "674a1b2c3d4e5f6789abcdef",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đã tạo",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/NoteData" }),
                example: {
                  status: 201,
                  error: null,
                  isSuccess: true,
                  data: {
                    note: {
                      id: "674a000000000000000000dd",
                      title: "Tóm tắt chương 1",
                      content: "Nội dung ghi chú...",
                      documentId: "674a1b2c3d4e5f6789abcdef",
                      createdBy: "674a000000000000000000aa",
                      createdAt: "2025-01-01T00:00:00.000Z",
                      updatedAt: "2025-01-01T00:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Thiếu title hoặc documentId", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền truy cập document", content: errContent() },
          "404": { description: "Document không tồn tại", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      get: {
        tags: ["notes"],
        summary: "Danh sách ghi chú của tôi",
        description:
          "Trả tất cả ghi chú do user hiện tại tạo, sắp xếp theo `updatedAt` giảm dần. Cần Bearer token.",
        operationId: "listNotes",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/NoteListData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/notes/{id}": {
      get: {
        tags: ["notes"],
        summary: "Chi tiết ghi chú",
        description: "Chỉ **owner** hoặc **admin**.",
        operationId: "getNoteById",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId của note",
            schema: { type: "string", example: "674a000000000000000000dd" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/NoteData" }),
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy ghi chú", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      put: {
        tags: ["notes"],
        summary: "Cập nhật ghi chú",
        description:
          "Cập nhật `title` và/hoặc `content`. Chỉ **owner** hoặc **admin**.",
        operationId: "updateNote",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a000000000000000000dd" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NoteBodyPartial" },
              examples: {
                default: {
                  value: {
                    title: "Tiêu đề mới",
                    content: "Nội dung đã chỉnh sửa",
                  },
                },
                contentOnly: {
                  summary: "Chỉ cập nhật content",
                  value: { content: "Nội dung mới" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/NoteData" }),
              },
            },
          },
          "400": { description: "title không được để trống", content: errContent() },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy ghi chú", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
      delete: {
        tags: ["notes"],
        summary: "Xóa ghi chú",
        description:
          "Xóa ghi chú và tự động xóa liên kết `note` trong document. Chỉ **owner** hoặc **admin**.",
        operationId: "deleteNote",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "674a000000000000000000dd" },
          },
        ],
        responses: {
          "200": {
            description: "Đã xóa",
            content: {
              "application/json": {
                schema: wrap({ $ref: "#/components/schemas/MessageData" }),
                example: {
                  status: 200,
                  error: null,
                  isSuccess: true,
                  data: { message: "Đã xóa ghi chú" },
                },
              },
            },
          },
          "401": { description: "Thiếu hoặc sai token", content: errContent() },
          "403": { description: "Không có quyền", content: errContent() },
          "404": { description: "Không tìm thấy ghi chú", content: errContent() },
          "500": { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },

  // ── components ──────────────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      bearerAuth: bearer,
    },
    responses: {
      InternalError: {
        description: "Lỗi máy chủ",
        content: {
          "application/json": {
            schema: errorResponse,
            example: {
              status: 500,
              error: "Internal Server Error",
              isSuccess: false,
              data: null,
            },
          },
        },
      },
    },
    schemas: {
      // ── generic ─────────────────────────────────────────────────────────────
      MessageData: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },

      // ── health ───────────────────────────────────────────────────────────────
      HealthData: {
        type: "object",
        properties: {
          mongo: { type: "string", enum: ["ok", "down"] },
          s3: { type: "string", enum: ["ok", "down"] },
        },
      },

      // ── user ────────────────────────────────────────────────────────────────
      UserPublic: {
        type: "object",
        description: "User public (không có password)",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          avatar: { type: "string", nullable: true, description: "S3 object key" },
          role: { type: "string", enum: ["admin", "user"] },
          emailVerified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        example: {
          id: "674a1b2c3d4e5f6789abcdef",
          email: "user@example.com",
          name: "Nguyễn Văn A",
          avatar: null,
          role: "user",
          emailVerified: true,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      },
      UserData: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserPublic" },
        },
      },
      AvatarUploadData: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserPublic" },
          objectKey: { type: "string" },
          publicUrl: { type: "string" },
        },
      },

      // ── auth ────────────────────────────────────────────────────────────────
      RegisterBody: {
        type: "object",
        required: ["email", "name", "password"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string" },
          password: { type: "string", minLength: 6 },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      VerifyEmailCodeBody: {
        type: "object",
        required: ["email", "code"],
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string", example: "123456" },
        },
      },
      ResendVerificationBody: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      RegisterData: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserPublic" },
          emailVerificationRequired: { type: "boolean", example: true },
          message: { type: "string" },
        },
      },
      AuthData: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserPublic" },
          accessToken: { type: "string" },
        },
      },
      VerifyEmailData: {
        type: "object",
        properties: {
          message: { type: "string" },
          verified: { type: "boolean", example: true },
        },
      },

      // ── category ─────────────────────────────────────────────────────────────
      CategoryPublic: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          name: { type: "string", example: "Toán học" },
          description: { type: "string", nullable: true, example: "Tài liệu toán" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CategoryData: {
        type: "object",
        properties: {
          category: { $ref: "#/components/schemas/CategoryPublic" },
        },
      },
      CategoryListData: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: { $ref: "#/components/schemas/CategoryPublic" },
          },
        },
      },
      CategoryBody: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Toán học" },
          description: { type: "string", example: "Tài liệu toán" },
        },
      },
      CategoryBodyPartial: {
        type: "object",
        properties: {
          name: { type: "string", example: "Toán học nâng cao" },
          description: { type: "string", example: "Mô tả mới" },
        },
      },

      // ── course ───────────────────────────────────────────────────────────────
      CoursePublic: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          name: { type: "string", example: "Giải tích" },
          description: { type: "string", nullable: true, example: "Toán cao cấp" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CourseData: {
        type: "object",
        properties: {
          course: { $ref: "#/components/schemas/CoursePublic" },
        },
      },
      CourseListData: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: { $ref: "#/components/schemas/CoursePublic" },
          },
        },
      },
      CourseBody: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Giải tích" },
          description: { type: "string", example: "Toán cao cấp" },
        },
      },
      CourseBodyPartial: {
        type: "object",
        properties: {
          name: { type: "string", example: "Giải tích nâng cao" },
          description: { type: "string", example: "Mô tả mới" },
        },
      },

      // ── document ─────────────────────────────────────────────────────────────
      DocumentPublic: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          title: { type: "string", example: "Bao cao thang 1" },
          description: { type: "string", nullable: true, example: "Mo ta ngan" },
          uploadedBy: {
            type: "string",
            description: "userId (ObjectId string)",
            example: "674a000000000000000000aa",
          },
          category: {
            type: "string",
            nullable: true,
            description: "CategoryId (ObjectId string)",
            example: "674a000000000000000000bb",
          },
          course: {
            type: "string",
            nullable: true,
            description: "CourseId (ObjectId string)",
            example: "674a000000000000000000cc",
          },
          fileName: { type: "string", example: "report.pdf" },
          fileSize: { type: "integer", description: "Bytes", example: 102400 },
          mimeType: { type: "string", example: "application/pdf" },
          downloadUrl: {
            type: "string",
            description: "URL tĩnh S3/MinIO (public bucket)",
            example: "http://minio:9000/bucket/documents/userId/uuid_report.pdf",
          },
          presignedUrl: {
            type: "string",
            description: "Presigned URL tạm thời để tải file trực tiếp từ S3 (hết hạn sau `presignedExpiresIn` giây)",
            example: "http://minio:9000/bucket/documents/...?X-Amz-Algorithm=...&X-Amz-Expires=900&X-Amz-Signature=...",
          },
          presignedExpiresIn: {
            type: "integer",
            description: "Thời gian hiệu lực của presignedUrl (giây)",
            example: 900,
          },
          summary: {
            type: "string",
            nullable: true,
            description: "Bản tóm tắt AI (null nếu chưa tóm tắt)",
            example: "## Tổng quan\n...",
          },
          summarizedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Thời điểm tóm tắt lần cuối (null nếu chưa tóm tắt)",
            example: "2026-05-01T08:30:00.000Z",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PresignedUrlData: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Presigned URL có hiệu lực trong `expiresIn` giây",
          },
          fileName: { type: "string", example: "report.pdf" },
          expiresIn: { type: "integer", description: "Giây", example: 900 },
        },
      },
      DocumentData: {
        type: "object",
        properties: {
          document: { $ref: "#/components/schemas/DocumentPublic" },
        },
      },
      DocumentListData: {
        type: "object",
        properties: {
          documents: {
            type: "array",
            items: { $ref: "#/components/schemas/DocumentPublic" },
          },
        },
      },

      // ── ai ───────────────────────────────────────────────────────────────────
      SummaryData: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "ObjectId của document được tóm tắt",
            example: "674a1b2c3d4e5f6789abcdef",
          },
          documentTitle: {
            type: "string",
            description: "Tiêu đề document",
            example: "Giáo trình Giải tích",
          },
          summary: {
            type: "string",
            description:
              "Bản tóm tắt tiếng Việt có cấu trúc: ## Tổng quan, ## Nội dung chính, ## Từ khóa",
            example:
              "## Tổng quan\nTài liệu trình bày...\n\n## Nội dung chính\n- ...\n\n## Từ khóa\n...",
          },
          summarizedAt: {
            type: "string",
            format: "date-time",
            description: "Thời điểm tóm tắt (ISO 8601)",
            example: "2026-05-01T08:30:00.000Z",
          },
        },
      },

      QuizBody: {
        type: "object",
        properties: {
          questionType: {
            type: "string",
            enum: ["multiple_choice", "essay"],
            default: "multiple_choice",
            description: "Loại câu hỏi: trắc nghiệm hoặc tự luận",
          },
          count: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            default: 5,
            description: "Số câu hỏi cần tạo (mặc định 5, tối đa 20)",
          },
        },
      },

      QuizQuestion: {
        type: "object",
        description: "Một câu hỏi trong bộ quiz",
        required: ["id", "type", "text"],
        properties: {
          id: {
            type: "string",
            description: 'ID câu hỏi, dạng "q1", "q2", …',
            example: "q1",
          },
          type: {
            type: "string",
            enum: ["multiple_choice", "essay"],
            description: "Loại câu hỏi",
          },
          text: {
            type: "string",
            description: "Nội dung câu hỏi",
            example: "Giới hạn của hàm số f(x) = x² khi x → 2 là bao nhiêu?",
          },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
            description: "4 lựa chọn (chỉ có với multiple_choice)",
            example: ["2", "4", "8", "16"],
            nullable: true,
          },
          answer: {
            type: "integer",
            minimum: 0,
            maximum: 3,
            description: "Index đáp án đúng 0–3 (chỉ có với multiple_choice)",
            example: 1,
            nullable: true,
          },
          explanation: {
            type: "string",
            description: "Giải thích đáp án ngắn gọn (tuỳ chọn)",
            example: "f(2) = 2² = 4",
            nullable: true,
          },
          sampleAnswer: {
            type: "string",
            description: "Gợi ý trả lời mẫu (chỉ có với essay)",
            example: "Đạo hàm là giới hạn của tỉ số gia số...",
            nullable: true,
          },
        },
      },

      QuizPublic: {
        type: "object",
        description: "Quiz đã lưu trong database",
        properties: {
          id: { type: "string", example: "674a000000000000000000ee" },
          documentId: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          createdBy: { type: "string", example: "674a000000000000000000aa" },
          questionType: {
            type: "string",
            enum: ["multiple_choice", "essay"],
          },
          questions: {
            type: "array",
            items: { $ref: "#/components/schemas/QuizQuestion" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },

      QuizPublicData: {
        type: "object",
        properties: {
          quiz: { $ref: "#/components/schemas/QuizPublic" },
        },
      },

      QuizListData: {
        type: "object",
        properties: {
          quizzes: {
            type: "array",
            items: { $ref: "#/components/schemas/QuizPublic" },
          },
        },
      },

      /** Trả về từ POST /documents/:id/quiz — có thêm documentTitle */
      QuizData: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a000000000000000000ee" },
          documentId: { type: "string", example: "674a1b2c3d4e5f6789abcdef" },
          documentTitle: { type: "string", example: "Giáo trình Giải tích" },
          createdBy: { type: "string", example: "674a000000000000000000aa" },
          questionType: {
            type: "string",
            enum: ["multiple_choice", "essay"],
            description: "Loại câu hỏi đã yêu cầu",
          },
          questions: {
            type: "array",
            items: { $ref: "#/components/schemas/QuizQuestion" },
            description: "Danh sách câu hỏi",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },

      // ── roadmap ──────────────────────────────────────────────────────────────
      RoadmapPublic: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a00000000000000000100" },
          userId: { type: "string", example: "674a000000000000000000aa" },
          title: { type: "string", example: "Learn React in 14 days" },
          description: {
            type: "string",
            example: "Lộ trình học React cơ bản đến hooks",
          },
          progress: {
            type: "number",
            minimum: 0,
            maximum: 100,
            example: 33,
            description: "completedTasks / totalTasks * 100",
          },
          status: {
            type: "string",
            enum: ["in_progress", "completed"],
            example: "in_progress",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RoadmapTaskPublic: {
        type: "object",
        properties: {
          id: { type: "string", example: "674a00000000000000000101" },
          roadmapId: { type: "string", example: "674a00000000000000000100" },
          documentId: {
            type: "string",
            nullable: true,
            example: "674a1b2c3d4e5f6789abcdef",
          },
          title: { type: "string", example: "Learn JSX" },
          description: {
            type: "string",
            example: "Đọc tài liệu JSX và làm ví dụ nhỏ",
          },
          isCompleted: { type: "boolean", example: false },
          completedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RoadmapData: {
        type: "object",
        properties: {
          roadmap: { $ref: "#/components/schemas/RoadmapPublic" },
        },
      },
      RoadmapListData: {
        type: "object",
        properties: {
          roadmaps: {
            type: "array",
            items: { $ref: "#/components/schemas/RoadmapPublic" },
          },
        },
      },
      RoadmapDetailData: {
        type: "object",
        properties: {
          roadmap: {
            allOf: [
              { $ref: "#/components/schemas/RoadmapPublic" },
              {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: { $ref: "#/components/schemas/RoadmapTaskPublic" },
                  },
                },
              },
            ],
          },
        },
      },
      RoadmapTaskMutationData: {
        type: "object",
        properties: {
          task: { $ref: "#/components/schemas/RoadmapTaskPublic" },
          roadmap: { $ref: "#/components/schemas/RoadmapPublic" },
        },
      },
      RoadmapBody: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Learn React in 14 days" },
          description: {
            type: "string",
            example: "Lộ trình học React cơ bản đến hooks",
          },
        },
      },
      RoadmapBodyPartial: {
        type: "object",
        properties: {
          title: { type: "string", example: "Learn React in 21 days" },
          description: { type: "string", example: "Cập nhật mô tả" },
          status: {
            type: "string",
            enum: ["in_progress", "completed"],
            example: "in_progress",
          },
        },
      },
      RoadmapTaskBody: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Learn JSX" },
          description: {
            type: "string",
            example: "Đọc tài liệu JSX và làm ví dụ nhỏ",
          },
          documentId: {
            type: "string",
            example: "674a1b2c3d4e5f6789abcdef",
          },
        },
      },
      RoadmapTaskBodyPartial: {
        type: "object",
        properties: {
          title: { type: "string", example: "Learn JSX deeply" },
          description: { type: "string", example: "Cập nhật mô tả task" },
          documentId: {
            type: "string",
            nullable: true,
            example: "674a1b2c3d4e5f6789abcdef",
          },
          isCompleted: { type: "boolean", example: true },
        },
      },
      RoadmapTaskCompleteBody: {
        type: "object",
        required: ["isCompleted"],
        properties: {
          isCompleted: { type: "boolean", example: true },
        },
      },
      RoadmapTaskDocumentBody: {
        type: "object",
        required: ["documentId"],
        properties: {
          documentId: {
            type: "string",
            nullable: true,
            description: "ObjectId của document; truyền null để bỏ liên kết",
            example: "674a1b2c3d4e5f6789abcdef",
          },
        },
      },

      // ── note ─────────────────────────────────────────────────────────────────
      NotePublic: {
        type: "object",
        description: "Ghi chú của một document",
        properties: {
          id: {
            type: "string",
            description: "ObjectId của note",
            example: "674a000000000000000000dd",
          },
          title: { type: "string", example: "Tóm tắt chương 1" },
          content: {
            type: "string",
            description: "Nội dung ghi chú (có thể rỗng)",
            example: "Nội dung ghi chú...",
          },
          documentId: {
            type: "string",
            description: "ObjectId của document gắn với ghi chú này",
            example: "674a1b2c3d4e5f6789abcdef",
          },
          createdBy: {
            type: "string",
            description: "userId (ObjectId string)",
            example: "674a000000000000000000aa",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        example: {
          id: "674a000000000000000000dd",
          title: "Tóm tắt chương 1",
          content: "Nội dung ghi chú...",
          documentId: "674a1b2c3d4e5f6789abcdef",
          createdBy: "674a000000000000000000aa",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      },
      NoteData: {
        type: "object",
        properties: {
          note: { $ref: "#/components/schemas/NotePublic" },
        },
      },
      NoteListData: {
        type: "object",
        properties: {
          notes: {
            type: "array",
            items: { $ref: "#/components/schemas/NotePublic" },
          },
        },
      },
      NoteBody: {
        type: "object",
        required: ["title", "documentId"],
        properties: {
          title: { type: "string", example: "Tóm tắt chương 1" },
          content: {
            type: "string",
            description: "Nội dung ghi chú (tuỳ chọn, mặc định rỗng)",
            example: "Nội dung ghi chú...",
          },
          documentId: {
            type: "string",
            description: "ObjectId của document cần tạo ghi chú",
            example: "674a1b2c3d4e5f6789abcdef",
          },
        },
      },
      NoteBodyPartial: {
        type: "object",
        description: "Truyền ít nhất một field",
        properties: {
          title: { type: "string", example: "Tiêu đề mới" },
          content: { type: "string", example: "Nội dung đã chỉnh sửa" },
        },
      },
    },
  },
};
