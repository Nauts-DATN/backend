import mongoose, { Schema, type Types } from "mongoose";

export const RAG_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
] as const;
export type RagStatus = (typeof RAG_STATUSES)[number];

export interface IDocument {
  title: string;
  description?: string;
  uploadedBy: Types.ObjectId;
  category?: Types.ObjectId;
  course?: Types.ObjectId;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Bản tóm tắt AI — lưu sau khi gọi POST /summarize. */
  summary?: string;
  /** Thời điểm tóm tắt lần cuối. */
  summarizedAt?: Date;
  ragStatus?: RagStatus;
  ragIndexedAt?: Date;
  ragError?: string;
  ragChunkCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      index: true,
      default: null,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
      default: null,
    },
    fileKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    summary: { type: String, default: null },
    summarizedAt: { type: Date, default: null },
    ragStatus: {
      type: String,
      enum: RAG_STATUSES,
      default: "pending",
      index: true,
    },
    ragIndexedAt: { type: Date, default: null },
    ragError: { type: String, default: null },
    ragChunkCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const DocumentModel =
  mongoose.models.Document ??
  mongoose.model<IDocument>("Document", documentSchema);
