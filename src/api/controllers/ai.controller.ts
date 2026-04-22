import type { Request, Response } from "express";
import type { AiService } from "../../services/ai.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class AiController {
  constructor(aiService: AiService) {
    this.aiService = aiService;
  }

  private readonly aiService: AiService;

  /** POST /documents/:id/summarize */
  summarizeDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.aiService.summarizeDocument(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };
}
