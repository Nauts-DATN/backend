import type { Types } from "mongoose";
import { DocumentModel, type IDocument } from "../models/document.model.js";

export type CreateDocumentInput = {
  title: string;
  description?: string;
  uploadedBy: string;
  category?: string;
  course?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
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

  /** Lấy tất cả (admin) */
  async findAll(limit = 100): Promise<DocumentDoc[]> {
    const docs = await DocumentModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as DocumentDoc[];
  }

  /** Lấy theo người upload */
  async findByUser(userId: string, limit = 100): Promise<DocumentDoc[]> {
    const docs = await DocumentModel.find({ uploadedBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as DocumentDoc[];
  }

  /** Lấy theo category */
  async findByCategory(categoryId: string, limit = 100): Promise<DocumentDoc[]> {
    const docs = await DocumentModel.find({ category: categoryId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as DocumentDoc[];
  }

  /** Lấy theo course */
  async findByCourse(courseId: string, limit = 100): Promise<DocumentDoc[]> {
    const docs = await DocumentModel.find({ course: courseId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs as unknown as DocumentDoc[];
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

  async deleteById(id: string): Promise<boolean> {
    const r = await DocumentModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
