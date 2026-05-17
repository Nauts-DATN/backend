import type { Types } from "mongoose";
import { DocumentModel, type IDocument } from "../models/document.model.js";

export type CreateDocumentInput = {
  title: string;
  description?: string;
  isPublic?: boolean;
  uploadedBy: string;
  category?: string;
  course?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type FindDocumentsOptions = {
  uploadedBy?: string;
  isPublic?: boolean;
  search?: string;
  category?: string;
  course?: string;
  limit?: number;
};

export type DocumentDoc = IDocument & { _id: Types.ObjectId };

export class DocumentRepository {
  async create(data: CreateDocumentInput): Promise<DocumentDoc> {
    const doc = await DocumentModel.create(data);
    return doc.toObject() as DocumentDoc;
  }

  async findById(id: string): Promise<DocumentDoc | null> {
    const doc = await DocumentModel.findById(id).lean().exec();
    return doc as DocumentDoc | null;
  }

  async findMany(options: FindDocumentsOptions = {}): Promise<DocumentDoc[]> {
    const limit = options.limit ?? 100;
    const search = options.search?.trim();
    const filter: Record<string, unknown> = {};

    if (options.uploadedBy) filter.uploadedBy = options.uploadedBy;
    if (options.isPublic !== undefined) filter.isPublic = options.isPublic;
    if (options.category) filter.category = options.category;
    if (options.course) filter.course = options.course;
    if (search) filter.title = { $regex: search, $options: "i" };

    const docs = await DocumentModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as DocumentDoc[];
  }

  /** Lấy tất cả document, dùng cho admin. */
  async findAll(limit = 100): Promise<DocumentDoc[]> {
    return this.findMany({ limit });
  }

  /** Lấy document theo người upload. */
  async findByUser(userId: string, limit = 100): Promise<DocumentDoc[]> {
    return this.findMany({ uploadedBy: userId, limit });
  }

  /** Lấy tài liệu public cho cộng đồng. */
  async findPublic(options?: {
    search?: string;
    category?: string;
    course?: string;
    limit?: number;
  }): Promise<DocumentDoc[]> {
    return this.findMany({
      isPublic: true,
      search: options?.search,
      category: options?.category,
      course: options?.course,
      limit: options?.limit,
    });
  }

  /** Lấy theo category. */
  async findByCategory(categoryId: string, limit = 100): Promise<DocumentDoc[]> {
    return this.findMany({ category: categoryId, limit });
  }

  /** Lấy theo course. */
  async findByCourse(courseId: string, limit = 100): Promise<DocumentDoc[]> {
    return this.findMany({ course: courseId, limit });
  }

  /** Lưu bản tóm tắt AI vào document. */
  async setSummary(id: string, summary: string): Promise<DocumentDoc | null> {
    const doc = await DocumentModel.findByIdAndUpdate(
      id,
      { summary, summarizedAt: new Date() },
      { new: true },
    )
      .lean()
      .exec();
    return doc as DocumentDoc | null;
  }

  /** Đổi trạng thái public/private của document. */
  async setVisibility(
    id: string,
    isPublic: boolean,
  ): Promise<DocumentDoc | null> {
    const doc = await DocumentModel.findByIdAndUpdate(
      id,
      { isPublic },
      { new: true },
    )
      .lean()
      .exec();
    return doc as DocumentDoc | null;
  }

  async deleteById(id: string): Promise<boolean> {
    const r = await DocumentModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
