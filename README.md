# EduAI Backend

Backend API cho hệ thống EduAI: quản lý tài liệu học tập, ghi chú, quiz, tóm tắt tài liệu bằng AI, xác thực người dùng và chia sẻ tài liệu cộng đồng.

## Tech Stack

- Node.js 20+
- TypeScript, ESM
- Express
- MongoDB + Mongoose
- Awilix dependency injection
- JWT authentication
- S3-compatible object storage, ví dụ MinIO
- Google Gemini qua `@google/genai`
- Swagger UI

## Cấu Trúc Thư Mục

```text
src/
  api/
    controllers/    # Xử lý HTTP request/response
    routes/         # Khai báo route
  config/           # Env và cấu hình hạ tầng
  db/               # Mongo client, migrations, seeds
  di/               # Awilix container
  llm/              # Prompt và Gemini helpers
  middleware/       # Auth, error handling
  models/           # Mongoose schemas
  repositories/     # Data access layer
  services/         # Business logic
  storage/          # S3/MinIO storage service
  swagger/          # OpenAPI spec
  utils/            # Helper chung
```

Luồng xử lý chính:

```text
Route -> Controller -> Service -> Repository/Storage/LLM -> Response
```

## Cài Đặt

```bash
npm install
```

## Biến Môi Trường

Tạo file `.env` trong thư mục `backend`.

```env
PORT=4000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/eduai

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

PUBLIC_API_URL=http://localhost:4000

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=eduai
S3_FORCE_PATH_STYLE=true

GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

EMAIL_FROM="EduAI <noreply@localhost>"
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_VERIFICATION_EXPIRES_HOURS=24

RUN_MIGRATIONS_ON_STARTUP=false
RUN_SEEDS_ON_STARTUP=false

ADMIN_BOOTSTRAP_EMAIL=
ADMIN_BOOTSTRAP_PASSWORD=
ADMIN_BOOTSTRAP_NAME=Admin
```

Các biến bắt buộc khi khởi động server:

- `MONGODB_URI`
- `JWT_SECRET`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`

`GEMINI_API_KEY` chỉ bắt buộc khi dùng tính năng AI như tóm tắt PDF hoặc tạo quiz.

## Chạy Hạ Tầng Local

Repo có sẵn `docker-compose.yml` cho MongoDB và MinIO.

```bash
docker compose up -d
```

MinIO console mặc định:

- API: `http://localhost:9000`
- Console: `http://localhost:9001`

Thông tin đăng nhập MinIO lấy từ `S3_ACCESS_KEY` và `S3_SECRET_KEY`.

## Chạy Ứng Dụng

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production:

```bash
npm start
```

Mặc định API chạy tại:

```text
http://localhost:4000
```

Swagger UI:

```text
http://localhost:4000/api/docs
```

OpenAPI JSON:

```text
http://localhost:4000/api/openapi.json
```

## Scripts

```bash
npm run dev                  # Chạy server bằng tsx watch
npm run build                # Compile TypeScript ra dist
npm start                    # Chạy dist/server.js
npm run lint                 # Type-check bằng tsc --noEmit
npm run cli                  # Chạy CLI nội bộ
npm run db:migrate           # Chạy pending migrations
npm run db:seed              # Chạy pending seeds
npm run db:migrate:status    # Xem trạng thái migrations
npm run db:seed:status       # Xem trạng thái seeds
npm run db:migration:create  # Tạo migration mới
npm run db:seed:create       # Tạo seed mới
```

## API Chính

Tất cả route nghiệp vụ nằm dưới prefix `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify-email`
- `POST /api/auth/verify-email-code`
- `POST /api/auth/resend-verification`
- `GET /api/auth/me`

### Users

- `GET /api/users`
- `GET /api/users/:id`
- Route upload avatar được khai báo trong user routes.

### Documents

- `POST /api/documents`
- `GET /api/documents`
- `GET /api/documents/community`
- `GET /api/documents/:id`
- `GET /api/documents/:id/presigned-url`
- `GET /api/documents/:id/download`
- `PATCH /api/documents/:id`
- `PATCH /api/documents/:id/visibility`
- `DELETE /api/documents/:id`

Upload document dùng `multipart/form-data` với field file là `file`.

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/documents/:id/note`

### AI

- `GET /api/documents/:id/summary`
- `POST /api/documents/:id/summarize`
- `POST /api/documents/:id/quiz`
- `GET /api/documents/:id/quizzes`
- `GET /api/quizzes`
- `GET /api/quizzes/:id`
- `DELETE /api/quizzes/:id`

AI hiện hỗ trợ file PDF. Khi upload DOCX, backend sẽ cố gắng convert sang PDF trước khi lưu.

### Categories Và Courses

- `GET /api/categories`
- `POST /api/categories`
- `GET /api/categories/:id`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`

### Health

- `GET /api/health`

## Authentication

Các route cần đăng nhập dùng JWT bearer token:

```http
Authorization: Bearer <accessToken>
```

Role hiện có:

- `user`
- `admin`

## Response Format

API trả về format thống nhất:

```json
{
  "status": 200,
  "error": null,
  "isSuccess": true,
  "data": {}
}
```

Khi lỗi:

```json
{
  "status": 400,
  "error": "Message",
  "isSuccess": false,
  "data": null
}
```

## Ghi Chú Phát Triển

- Không đưa `GEMINI_API_KEY`, `JWT_SECRET`, SMTP password hoặc S3 secret lên client.
- Web app nên gọi API qua `/api` khi dev để dùng Vite proxy.
- Nếu bật `RUN_MIGRATIONS_ON_STARTUP=true`, server sẽ chạy pending migrations sau khi kết nối Mongo.
- Nếu bật `RUN_SEEDS_ON_STARTUP=true`, server sẽ chạy pending seeds sau migrations.
- Bucket S3/MinIO sẽ được kiểm tra/tạo khi server khởi động.
