import type { Request, Response } from "express";
import type { HealthService } from "../../services/health.service.js";

export class HealthController {
  constructor(healthService: HealthService) {
    this.healthService = healthService;
  }

  private readonly healthService: HealthService;

  get = async (_req: Request, res: Response): Promise<void> => {
    const status = await this.healthService.getStatus();
    const ok = status.mongo === "ok" && status.s3 === "ok";
    res.status(ok ? 200 : 503).json({ ok, ...status });
  };
}
