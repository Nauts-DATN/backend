import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { summarizePdf } from "../llm/summarize.js";
import {
  generateQuizFromPdf,
  type GenerateQuizOptions,
  type QuestionType,
  type QuizQuestion,
} from "../llm/quiz.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { QuizRepository } from "../repositories/quiz.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";

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
  createdAt: string;
  updatedAt: string;
};

export type QuizResult = PublicQuiz & { documentTitle: string };

export class AiService {
  constructor(
    documentRepository: DocumentRepository,
    s3Storage: S3StorageService,
    quizRepository: QuizRepository,
  ) {
    this.documentRepository = documentRepository;
    this.s3Storage = s3Storage;
    this.quizRepository = quizRepository;
  }

  private readonly documentRepository: DocumentRepository;
  private readonly s3Storage: S3StorageService;
  private readonly quizRepository: QuizRepository;

  async summarizeDocument(
    documentId: string,
    requesterId: string,
    requesterRole: string,
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

    const { body } = await this.s3Storage.getObject(doc.fileKey);
    const buffer = await streamToBuffer(body);

    const summary = await summarizePdf(buffer, doc.fileName, env.geminiApiKey);

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

    const { body } = await this.s3Storage.getObject(doc.fileKey);
    const buffer = await streamToBuffer(body);

    const questions = await generateQuizFromPdf(
      buffer,
      doc.fileName,
      options,
      env.geminiApiKey,
    );

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
    return quizzes.map((q) => ({
      id: q._id.toString(),
      documentId: q.document.toString(),
      createdBy: q.createdBy.toString(),
      questionType: q.questionType,
      questions: q.questions,
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
    return {
      id: quiz._id.toString(),
      documentId: quiz.document.toString(),
      createdBy: quiz.createdBy.toString(),
      questionType: quiz.questionType,
      questions: quiz.questions,
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: quiz.updatedAt.toISOString(),
    };
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
    await this.quizRepository.deleteById(quizId);
  }
}
