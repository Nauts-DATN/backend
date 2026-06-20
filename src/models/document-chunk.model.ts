import mongoose, { Schema, type Types } from "mongoose";

export interface IDocumentChunk {
  document: Types.ObjectId;
  user: Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true },
);

documentChunkSchema.index({ document: 1, chunkIndex: 1 }, { unique: true });

export const DocumentChunkModel =
  mongoose.models.DocumentChunk ??
  mongoose.model<IDocumentChunk>("DocumentChunk", documentChunkSchema);
