import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optionalUrl(name: string): string | undefined {
  const value = process.env[name]?.trim().replace(/\/$/, "");
  return value || undefined;
}

const port = Number(process.env.PORT) || 4000;

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: required("MONGODB_URI"),
  /** Base URL API (Swagger, link xác thực email). */
  apiPublicUrl:
    process.env.PUBLIC_API_URL?.replace(/\/$/, "") ??
    `http://localhost:${port}`,
  frontendPublicUrl:
    process.env.FRONTEND_PUBLIC_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
  mail: {
    from: process.env.EMAIL_FROM ?? "EduAI <noreply@localhost>",
    smtpHost: process.env.SMTP_HOST?.trim() || "",
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER || undefined,
    smtpPass: process.env.SMTP_PASS || undefined,
    verificationExpiresHours:
      Number(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS) || 24,
  },
  db: {
    /** Chạy pending migrations ngay sau khi connect (server hoặc CLI) */
    runMigrationsOnStartup:
      process.env.RUN_MIGRATIONS_ON_STARTUP === "true",
    /** Chạy pending seeds sau migrations khi khởi động server */
    runSeedsOnStartup: process.env.RUN_SEEDS_ON_STARTUP === "true",
  },
  /** Tuỳ chọn — seed `001_admin_bootstrap` */
  adminBootstrap: {
    email: process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || undefined,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD || undefined,
    name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Admin",
  },
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? required("JWT_SECRET"),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  s3: {
    publicUrl: optionalUrl("S3_PUBLIC_URL"),
    endpoint: required("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    accessKeyId: required("S3_ACCESS_KEY"),
    secretAccessKey: required("S3_SECRET_KEY"),
    bucket: required("S3_BUCKET"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  },
  /** Google Gemini API key — lấy từ https://aistudio.google.com/apikey */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
};
