import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import type { Types } from "mongoose";
import type { IDocument } from "../models/document.model.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { NoteRepository } from "../repositories/note.repository.js";
import type { QuizRepository } from "../repositories/quiz.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";
import type { PdfConverterService } from "./pdf-converter.service.js";

const DEFAULT_PRESIGNED_EXPIRES = 1500;

export type PublicDocument = {
  id: string;
  title: string;
  description?: string;
  uploadedBy: string;
  category?: string;
  course?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  presignedUrl: string;
  presignedExpiresIn: number;
  summary: string | null;
  summarizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadDocumentInput = {
  title: string;
  description?: string;
  uploadedBy: string;
  category?: string;
  course?: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export type DocumentListFilters = {
  search?: string;
  category?: string;
  course?: string;
};

function makeErr(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

export class DocumentService {
  constructor(
    documentRepository: DocumentRepository,
    s3Storage: S3StorageService,
    pdfConverterService: PdfConverterService,
    noteRepository: NoteRepository,
    quizRepository: QuizRepository,
  ) {
    this.documentRepository = documentRepository;
    this.s3Storage = s3Storage;
    this.pdfConverterService = pdfConverterService;
    this.noteRepository = noteRepository;
    this.quizRepository = quizRepository;
  }

  private readonly documentRepository: DocumentRepository;
  private readonly s3Storage: S3StorageService;
  private readonly pdfConverterService: PdfConverterService;
  private readonly noteRepository: NoteRepository;
  private readonly quizRepository: QuizRepository;

  private async toPublic(
    doc: IDocument & { _id: Types.ObjectId },
    expiresIn = DEFAULT_PRESIGNED_EXPIRES,
  ): Promise<PublicDocument> {
    const presignedUrl = await this.s3Storage.getPresignedUrl(doc.fileKey, expiresIn);
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      uploadedBy: doc.uploadedBy.toString(),
      category: doc.category?.toString(),
      course: doc.course?.toString(),
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      downloadUrl: `${this.s3Storage.getPublicBaseUrl()}/${doc.fileKey}`,
      presignedUrl,
      presignedExpiresIn: expiresIn,
      summary: doc.summary ?? null,
      summarizedAt: doc.summarizedAt?.toISOString() ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async upload(input: UploadDocumentInput): Promise<PublicDocument> {
    if (this.pdfConverterService.isWordFile(input.mimeType, input.originalName)) {
      try {
        input.buffer = await this.pdfConverterService.convertWordToPdf(
          input.buffer,
          input.originalName,
          input.mimeType,
        );
        input.originalName = input.originalName.replace(/\.docx?$/i, ".pdf");
        input.mimeType = "application/pdf";
      } catch (err) {
        console.error("[DocumentService] Word to PDF failed, storing original:", err);
      }
    }

    const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `documents/${input.uploadedBy}/${randomUUID()}_${safeName}`;

    await this.s3Storage.putObject(key, input.buffer, input.mimeType);

    const doc = await this.documentRepository.create({
      title: input.title,
      description: input.description,
      uploadedBy: input.uploadedBy,
      category: input.category,
      course: input.course,
      fileKey: key,
      fileName: input.originalName,
      fileSize: input.buffer.byteLength,
      mimeType: input.mimeType,
    });

    return this.toPublic(doc);
  }

  async list(
    requesterId: string,
    filters: DocumentListFilters = {},
  ): Promise<PublicDocument[]> {
    const docs = await this.documentRepository.findMany({
      uploadedBy: requesterId,
      search: filters.search,
      category: filters.category,
      course: filters.course,
      limit: 100,
    });
    return Promise.all(docs.map((d) => this.toPublic(d)));
  }

  async getById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicDocument> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Khong tim thay document", 404);
    if (requesterRole !== "admin" && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Khong co quyen", 403);
    }
    return this.toPublic(doc);
  }

  async getPresignedUrl(
    id: string,
    requesterId: string,
    requesterRole: string,
    expiresIn = DEFAULT_PRESIGNED_EXPIRES,
  ): Promise<{ url: string; fileName: string; expiresIn: number }> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Khong tim thay document", 404);
    if (requesterRole !== "admin" && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Khong co quyen", 403);
    }
    const url = await this.s3Storage.getPresignedUrl(doc.fileKey, expiresIn);
    return { url, fileName: doc.fileName, expiresIn };
  }

  async getStream(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<{
    stream: Readable;
    contentType: string;
    contentLength?: number;
    fileName: string;
  }> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Khong tim thay document", 404);
    if (requesterRole !== "admin" && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Khong co quyen", 403);
    }
    const { body, contentType, contentLength } =
      await this.s3Storage.getObject(doc.fileKey);
    return { stream: body, contentType, contentLength, fileName: doc.fileName };
  }

  async deleteById(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Khong tim thay document", 404);
    if (requesterRole !== "admin" && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Khong co quyen", 403);
    }
    await this.s3Storage.deleteObject(doc.fileKey).catch(() => undefined);
    await Promise.all([
      this.noteRepository.deleteByDocument(id),
      this.quizRepository.deleteByDocument(id),
    ]);
    await this.documentRepository.deleteById(id);
  }
}
