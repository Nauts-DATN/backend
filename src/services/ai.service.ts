import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { summarizeFromContext, summarizePdf } from "../llm/summarize.js";
import {
  generateQuizFromContext,
  generateQuizFromPdf,
  type GenerateQuizOptions,
  type QuestionType,
  type QuizQuestion,
} from "../llm/quiz.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { QuizRepository } from "../repositories/quiz.repository.js";
import type { QuizAttemptRepository } from "../repositories/quiz-attempt.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";
import type { RagService } from "./rag.service.js";
import type {
  QuizAttemptAnswer,
  IQuizAttempt,
} from "../models/quiz-attempt.model.js";
import type { Types } from "mongoose";

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export type SummaryResult = {
  summary: string;
  documentId: string;
  documentTitle: string;
  summarizedAt: string;
};

export type PublicQuiz = {
  id: string;
  documentId: string;
  /** Tiêu đề document — có khi list (populate), không có khi getById. */
  documentTitle?: string;
  createdBy: string;
  questionType: QuestionType;
  questions: QuizQuestion[];
  latestAttempt?: PublicQuizAttempt | null;
  createdAt: string;
  updatedAt: string;
};

export type QuizResult = PublicQuiz & { documentTitle: string };

export type PublicQuizAttempt = {
  id: string;
  quizId: string;
  userId: string;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  answers: QuizAttemptAnswer[];
  createdAt: string;
  updatedAt: string;
};

export type SubmitQuizAttemptInput = {
  score?: number | null;
  correctCount?: number | null;
  totalQuestions: number;
  answers?: QuizAttemptAnswer[];
};

type QuizAttemptDoc = IQuizAttempt & { _id: Types.ObjectId };

export class AiService {
  constructor(
    documentRepository: DocumentRepository,
    s3Storage: S3StorageService,
    quizRepository: QuizRepository,
    quizAttemptRepository: QuizAttemptRepository,
    ragService: RagService,
  ) {
    this.documentRepository = documentRepository;
    this.s3Storage = s3Storage;
    this.quizRepository = quizRepository;
    this.quizAttemptRepository = quizAttemptRepository;
    this.ragService = ragService;
  }

  private readonly documentRepository: DocumentRepository;
  private readonly s3Storage: S3StorageService;
  private readonly quizRepository: QuizRepository;
  private readonly quizAttemptRepository: QuizAttemptRepository;
  private readonly ragService: RagService;

  private toPublicAttempt(attempt: QuizAttemptDoc): PublicQuizAttempt {
    return {
      id: attempt._id.toString(),
      quizId: attempt.quiz.toString(),
      userId: attempt.user.toString(),
      score: attempt.score ?? null,
      correctCount: attempt.correctCount ?? null,
      totalQuestions: attempt.totalQuestions,
      answers: attempt.answers ?? [],
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    };
  }

  async summarizeDocument(
    documentId: string,
    requesterId: string,
    requesterRole: string,
    additionalPrompt?: string,
  ): Promise<SummaryResult> {
    if (!env.geminiApiKey) {
      throw makeErr("GEMINI_API_KEY chưa được cấu hình trên server.", 503);
    }

    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }

    if (doc.mimeType !== "application/pdf") {
      throw makeErr(
        `Chỉ hỗ trợ tóm tắt file PDF. File này có định dạng: ${doc.mimeType}`,
        422,
      );
    }

    let summary: string;
    const requestedScope = additionalPrompt?.trim();

    if (
      requestedScope &&
      doc.ragStatus &&
      doc.ragStatus !== "completed" &&
      doc.ragStatus !== "skipped"
    ) {
      if (doc.ragStatus === "failed") {
        throw makeErr(
          `Không thể dùng RAG cho tài liệu này: ${doc.ragError ?? "indexing failed"}`,
          422,
        );
      }
      throw makeErr(
        "Tài liệu đang được xử lý nội dung. Vui lòng thử lại sau.",
        409,
      );
    }

    const ragContext =
      requestedScope && doc.ragStatus === "completed"
        ? await this.ragService.retrieve({
            documentId: doc._id.toString(),
            query: requestedScope,
          })
        : null;

    if (ragContext) {
      if (!ragContext.isEnough) {
        throw makeErr(
          "Nội dung tìm thấy không đủ để tóm tắt chất lượng cho yêu cầu này.",
          422,
        );
      }

      summary = await summarizeFromContext(
        ragContext.contextText,
        env.geminiApiKey,
        requestedScope ?? "",
      );
    } else {
      const { body } = await this.s3Storage.getObject(doc.fileKey);
      const buffer = await streamToBuffer(body);

      summary = await summarizePdf(
        buffer,
        doc.fileName,
        env.geminiApiKey,
        additionalPrompt,
      );
    }

    // Lưu vào DB (fire-and-forget lỗi không chặn response)
    await this.documentRepository.setSummary(doc._id.toString(), summary).catch(
      (err: unknown) => console.error("[AiService] Lưu summary thất bại:", err),
    );

    const summarizedAt = new Date().toISOString();
    return {
      summary,
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      summarizedAt,
    };
  }

  /** Lấy summary đã lưu trong DB, không gọi AI. */
  async getCachedSummary(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<SummaryResult> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    if (!doc.summary || !doc.summarizedAt) {
      throw makeErr("Document chưa được tóm tắt. Hãy gọi POST /summarize trước.", 404);
    }
    return {
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      summary: doc.summary,
      summarizedAt: doc.summarizedAt.toISOString(),
    };
  }

  async generateQuiz(
    documentId: string,
    requesterId: string,
    requesterRole: string,
    options: GenerateQuizOptions,
  ): Promise<QuizResult> {
    if (!env.geminiApiKey) {
      throw makeErr("GEMINI_API_KEY chưa được cấu hình trên server.", 503);
    }

    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }

    if (doc.mimeType !== "application/pdf") {
      throw makeErr(
        `Chỉ hỗ trợ tạo quiz từ file PDF. File này có định dạng: ${doc.mimeType}`,
        422,
      );
    }

    let questions: QuizQuestion[];
    const additionalPrompt = options.additionalPrompt?.trim();

    if (
      additionalPrompt &&
      doc.ragStatus &&
      doc.ragStatus !== "completed" &&
      doc.ragStatus !== "skipped"
    ) {
      if (doc.ragStatus === "failed") {
        throw makeErr(
          `Không thể dùng RAG cho tài liệu này: ${doc.ragError ?? "indexing failed"}`,
          422,
        );
      }
      throw makeErr(
        "Tài liệu đang được xử lý nội dung. Vui lòng thử lại sau.",
        409,
      );
    }

    const existingQuizzes = await this.quizRepository.findAllByDocument(
      doc._id.toString(),
    );
    const existingQuestions = existingQuizzes
      .filter((quiz) => quiz.questionType === options.questionType)
      .flatMap((quiz) => quiz.questions)
      .map((question) => question.text?.trim())
      .filter((text): text is string => Boolean(text))
      .slice(0, 30);

    const ragContext = additionalPrompt
      ? await this.ragService.retrieve({
          documentId: doc._id.toString(),
          query: additionalPrompt,
        })
      : null;

    if (ragContext) {
      if (!ragContext.isEnough || ragContext.suggestedQuestionCount < 1) {
        throw makeErr(
          "Nội dung tìm thấy không đủ để tạo câu hỏi chất lượng cho yêu cầu này.",
          422,
        );
      }

      const requestedCount = Math.min(Math.max(options.count ?? 5, 1), 20);
      const finalCount = Math.min(
        requestedCount,
        ragContext.suggestedQuestionCount,
      );

      questions = await generateQuizFromContext(
        ragContext.contextText,
        {
          ...options,
          count: finalCount,
          existingQuestions,
        },
        env.geminiApiKey,
      );
    } else {
      const { body } = await this.s3Storage.getObject(doc.fileKey);
      const buffer = await streamToBuffer(body);

      questions = await generateQuizFromPdf(
        buffer,
        doc.fileName,
        {
          ...options,
          existingQuestions,
        },
        env.geminiApiKey,
      );
    }

    if (questions.length === 0) {
      throw makeErr("Không tạo được câu hỏi phù hợp với yêu cầu.", 422);
    }

    const saved = await this.quizRepository.create({
      documentId: doc._id.toString(),
      createdBy: requesterId,
      questionType: options.questionType,
      questions,
    });

    return {
      id: saved._id.toString(),
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      createdBy: requesterId,
      questionType: options.questionType,
      questions,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
  /** Lấy tất cả quiz của người dùng hiện tại (admin thấy tất cả). */
  async listQuizzes(
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicQuiz[]> {
    const quizzes =
      requesterRole === "admin"
        ? await this.quizRepository.findAll()
        : await this.quizRepository.findAllByUser(requesterId);

    const latestAttempts =
      await this.quizAttemptRepository.findLatestByQuizIdsForUser(
        quizzes.map((q) => q._id.toString()),
        requesterId,
      );
    const latestAttemptByQuiz = new Map(
      latestAttempts.map((attempt) => [
        attempt.quiz.toString(),
        this.toPublicAttempt(attempt),
      ]),
    );

    return quizzes.map((q) => {
      // Sau populate, q.document có thể là object { _id, title }
      const populated = q.document as unknown as
        | { _id: { toString(): string }; title?: string }
        | string;

      const documentId =
        typeof populated === "string"
          ? populated
          : populated._id.toString();

      const documentTitle =
        typeof populated === "string" ? undefined : (populated.title ?? undefined);

      return {
        id: q._id.toString(),
        documentId,
        documentTitle,
        createdBy: q.createdBy.toString(),
        questionType: q.questionType,
        questions: q.questions,
        latestAttempt: latestAttemptByQuiz.get(q._id.toString()) ?? null,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      };
    });
  }

  /** Lấy danh sách quiz của một document. */
  async listQuizzesByDocument(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicQuiz[]> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    const quizzes = await this.quizRepository.findAllByDocument(documentId);
    const latestAttempts =
      await this.quizAttemptRepository.findLatestByQuizIdsForUser(
        quizzes.map((q) => q._id.toString()),
        requesterId,
      );
    const latestAttemptByQuiz = new Map(
      latestAttempts.map((attempt) => [
        attempt.quiz.toString(),
        this.toPublicAttempt(attempt),
      ]),
    );

    return quizzes.map((q) => ({
      id: q._id.toString(),
      documentId: q.document.toString(),
      createdBy: q.createdBy.toString(),
      questionType: q.questionType,
      questions: q.questions,
      latestAttempt: latestAttemptByQuiz.get(q._id.toString()) ?? null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));
  }

  /** Lấy chi tiết một quiz theo id. */
  async getQuizById(
    quizId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicQuiz> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw makeErr("Không tìm thấy quiz", 404);
    if (
      requesterRole !== "admin" &&
      quiz.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    const latestAttempts =
      await this.quizAttemptRepository.findLatestByQuizIdsForUser(
        [quizId],
        requesterId,
      );

    return {
      id: quiz._id.toString(),
      documentId: quiz.document.toString(),
      createdBy: quiz.createdBy.toString(),
      questionType: quiz.questionType,
      questions: quiz.questions,
      latestAttempt: latestAttempts[0]
        ? this.toPublicAttempt(latestAttempts[0])
        : null,
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: quiz.updatedAt.toISOString(),
    };
  }

  async submitQuizAttempt(
    quizId: string,
    requesterId: string,
    requesterRole: string,
    input: SubmitQuizAttemptInput,
  ): Promise<PublicQuizAttempt> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw makeErr("Khong tim thay quiz", 404);
    if (
      requesterRole !== "admin" &&
      quiz.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Khong co quyen", 403);
    }

    if (!Number.isFinite(input.totalQuestions) || input.totalQuestions < 1) {
      throw makeErr("totalQuestions khong hop le", 400);
    }

    const score =
      input.score === undefined || input.score === null
        ? null
        : Math.min(Math.max(Math.round(Number(input.score)), 0), 100);
    const correctCount =
      input.correctCount === undefined || input.correctCount === null
        ? null
        : Math.max(Math.round(Number(input.correctCount)), 0);

    const attempt = await this.quizAttemptRepository.create({
      quizId,
      userId: requesterId,
      score,
      correctCount,
      totalQuestions: Math.round(input.totalQuestions),
      answers: Array.isArray(input.answers) ? input.answers : [],
    });

    return this.toPublicAttempt(attempt);
  }

  /** Xóa một quiz. */
  async deleteQuiz(
    quizId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw makeErr("Không tìm thấy quiz", 404);
    if (
      requesterRole !== "admin" &&
      quiz.createdBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    await this.quizAttemptRepository.deleteByQuiz(quizId);
    await this.quizRepository.deleteById(quizId);
  }
}
