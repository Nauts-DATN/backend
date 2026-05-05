import mongoose, { Schema, type Types } from "mongoose";

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
  },
  { timestamps: true },
);

export const DocumentModel =
  mongoose.models.Document ??
  mongoose.model<IDocument>("Document", documentSchema);
