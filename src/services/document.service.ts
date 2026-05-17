import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { S3StorageService } from "../storage/s3-storage.service.js";
import type { PdfConverterService } from "./pdf-converter.service.js";
import type { IDocument } from "../models/document.model.js";
import type { Types } from "mongoose";

const DEFAULT_PRESIGNED_EXPIRES = 1500;

export type PublicDocument = {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  uploadedBy: string;
  category?: string;
  course?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** URL tĩnh S3/MinIO (public bucket). */
  downloadUrl: string;
  /** Presigned URL tạm thời để tải file trực tiếp từ S3 (hết hạn sau `presignedExpiresIn` giây). */
  presignedUrl: string;
  presignedExpiresIn: number;
  /** Bản tóm tắt AI (null nếu chưa tóm tắt). */
  summary: string | null;
  /** Thời điểm tóm tắt lần cuối (null nếu chưa tóm tắt). */
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
  isPublic?: boolean;
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
  ) {
    this.documentRepository = documentRepository;
    this.s3Storage = s3Storage;
    this.pdfConverterService = pdfConverterService;
  }

  private readonly documentRepository: DocumentRepository;
  private readonly s3Storage: S3StorageService;
  private readonly pdfConverterService: PdfConverterService;

  private async toPublic(
    doc: IDocument & { _id: Types.ObjectId },
    expiresIn = DEFAULT_PRESIGNED_EXPIRES,
  ): Promise<PublicDocument> {
    const presignedUrl = await this.s3Storage.getPresignedUrl(doc.fileKey, expiresIn);
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      isPublic: doc.isPublic,
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
    // Tự động convert DOCX → PDF trước khi lưu
    if (this.pdfConverterService.isDocxFile(input.mimeType, input.originalName)) {
      try {
        input.buffer = await this.pdfConverterService.convertDocxToPdf(input.buffer);
        input.originalName = input.originalName.replace(/\.docx$/i, ".pdf");
        input.mimeType = "application/pdf";
      } catch (err) {
        console.error("[DocumentService] DOCX→PDF failed, storing original:", err);
      }
    }

    const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `documents/${input.uploadedBy}/${randomUUID()}_${safeName}`;

    await this.s3Storage.putObject(key, input.buffer, input.mimeType);

    const doc = await this.documentRepository.create({
      title: input.title,
      description: input.description,
      isPublic: input.isPublic ?? false,
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
    requesterRole: string,
    filters: DocumentListFilters = {},
  ): Promise<PublicDocument[]> {
    const docs = await this.documentRepository.findMany({
      uploadedBy: requesterRole === "admin" ? undefined : requesterId,
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
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (requesterRole !== "admin" && !doc.isPublic && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Không có quyền", 403);
    }
    return this.toPublic(doc);
  }

  /** Tạo presigned URL riêng với thời gian tuỳ chỉnh. */
  async getPresignedUrl(
    id: string,
    requesterId: string,
    requesterRole: string,
    expiresIn = DEFAULT_PRESIGNED_EXPIRES,
  ): Promise<{ url: string; fileName: string; expiresIn: number }> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (requesterRole !== "admin" && !doc.isPublic && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Không có quyền", 403);
    }
    const url = await this.s3Storage.getPresignedUrl(doc.fileKey, expiresIn);
    return { url, fileName: doc.fileName, expiresIn };
  }

  /** Trả về stream để download file trực tiếp qua backend. */
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
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (requesterRole !== "admin" && !doc.isPublic && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Không có quyền", 403);
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
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (
      requesterRole !== "admin" &&
      doc.uploadedBy.toString() !== requesterId
    ) {
      throw makeErr("Không có quyền", 403);
    }
    await this.s3Storage.deleteObject(doc.fileKey).catch(() => undefined);
    await this.documentRepository.deleteById(id);
  }

  /** Danh sách tài liệu public cho cộng đồng. */
  async listCommunity(filters: DocumentListFilters = {}): Promise<PublicDocument[]> {
    const docs = await this.documentRepository.findPublic({
      search: filters.search,
      category: filters.category,
      course: filters.course,
      limit: 200,
    });
    return Promise.all(docs.map((d) => this.toPublic(d)));
  }

  /** Chủ sở hữu/admin đổi trạng thái public/private. */
  async setVisibility(
    id: string,
    isPublic: boolean,
    requesterId: string,
    requesterRole: string,
  ): Promise<PublicDocument> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) throw makeErr("Không tìm thấy document", 404);
    if (requesterRole !== "admin" && doc.uploadedBy.toString() !== requesterId) {
      throw makeErr("Không có quyền", 403);
    }
    const updated = await this.documentRepository.setVisibility(id, isPublic);
    if (!updated) throw makeErr("Cập nhật trạng thái thất bại", 500);
    return this.toPublic(updated);
  }
}
