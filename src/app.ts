import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import type { AwilixContainer } from "awilix";
import type { Cradle } from "./di/types.js";
import { registerRoutes } from "./api/routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { openApiSpec } from "./swagger/openapi.js";

export function createApp(container: AwilixContainer<Cradle>) {
  const app = express();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "EduAI API — Swagger",
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
        docExpansion: "list",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      },
    }),
  );

  app.use("/api", registerRoutes(container));

  app.use(errorMiddleware);

  return app;
}
