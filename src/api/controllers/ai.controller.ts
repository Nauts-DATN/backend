import type { Request, Response } from "express";
import type { AiService } from "../../services/ai.service.js";
import type { GenerateQuizOptions } from "../../llm/quiz.js";
import { sendOk, sendFail } from "../../utils/response.js";

const ALLOWED_QUESTION_TYPES = new Set(["multiple_choice", "essay"]);

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

  /** POST /documents/:id/quiz */
  generateQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionType = "mixed", count } = req.body as {
        questionType?: string;
        count?: number;
      };

      if (!ALLOWED_QUESTION_TYPES.has(questionType)) {
        sendFail(
          res,
          400,
          'questionType phải là "multiple_choice" hoặc "essay".',
        );
        return;
      }

      const options: GenerateQuizOptions = {
        questionType: questionType as GenerateQuizOptions["questionType"],
        count: count !== undefined ? Number(count) : undefined,
      };

      const result = await this.aiService.generateQuiz(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
        options,
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
