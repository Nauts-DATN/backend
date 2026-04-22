import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { summarizePdf } from "../llm/summarize.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
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
};

export class AiService {
  constructor(
    documentRepository: DocumentRepository,
    s3Storage: S3StorageService,
  ) {
    this.documentRepository = documentRepository;
    this.s3Storage = s3Storage;
  }

  private readonly documentRepository: DocumentRepository;
  private readonly s3Storage: S3StorageService;

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

    return {
      summary,
      documentId: doc._id.toString(),
      documentTitle: doc.title,
    };
  }
}
