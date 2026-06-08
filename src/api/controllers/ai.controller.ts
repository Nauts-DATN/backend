import type { Request, Response } from "express";
import type { AiService } from "../../services/ai.service.js";
import type { GenerateQuizOptions } from "../../llm/quiz.js";
import type { SubmitQuizAttemptInput } from "../../services/ai.service.js";
import { sendOk, sendFail } from "../../utils/response.js";

const ALLOWED_QUESTION_TYPES = new Set(["multiple_choice", "essay"]);

export class AiController {
  constructor(aiService: AiService) {
    this.aiService = aiService;
  }

  private readonly aiService: AiService;

  /** GET /documents/:id/summary — lấy tóm tắt đã lưu, không gọi AI */
  getCachedSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.aiService.getCachedSummary(
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
      const { questionType = "multiple_choice", count, additionalPrompt } = req.body as {
        questionType?: string;
        count?: number;
        additionalPrompt?: string;
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
        additionalPrompt:
          typeof additionalPrompt === "string"
            ? additionalPrompt.trim()
            : undefined,
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

  /** GET /documents/:id/quizzes */
  listQuizzesByDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const quizzes = await this.aiService.listQuizzesByDocument(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { quizzes });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };


  /** GET /quizzes */
  listQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
      const quizzes = await this.aiService.listQuizzes(
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { quizzes });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  /** GET /quizzes/:id */
  getQuizById = async (req: Request, res: Response): Promise<void> => {
    try {
      const quiz = await this.aiService.getQuizById(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, { quiz });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  /** POST /quizzes/:id/attempts */
  submitQuizAttempt = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as SubmitQuizAttemptInput;
      const attempt = await this.aiService.submitQuizAttempt(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
        body,
      );
      sendOk(res, { attempt }, 201);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  /** DELETE /quizzes/:id */
  deleteQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.aiService.deleteQuiz(
        req.params.id,
        req.auth!.userId,
        req.auth!.role,
      );
      sendOk(res, null);
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
