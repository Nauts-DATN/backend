import type { Types } from "mongoose";
import {
  DocumentChunkModel,
  type IDocumentChunk,
} from "../models/document-chunk.model.js";

export type CreateDocumentChunkInput = {
  documentId: string;
  userId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

export type DocumentChunkDoc = IDocumentChunk & { _id: Types.ObjectId };

export class DocumentChunkRepository {
  async replaceForDocument(
    documentId: string,
    chunks: CreateDocumentChunkInput[],
  ): Promise<void> {
    await DocumentChunkModel.deleteMany({ document: documentId }).exec();
    if (chunks.length === 0) return;

    await DocumentChunkModel.insertMany(
      chunks.map((chunk) => ({
        document: chunk.documentId,
        user: chunk.userId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: chunk.embedding,
      })),
      { ordered: false },
    );
  }

  async findByDocument(documentId: string): Promise<DocumentChunkDoc[]> {
    const chunks = await DocumentChunkModel.find({ document: documentId })
      .sort({ chunkIndex: 1 })
      .lean()
      .exec();
    return chunks as unknown as DocumentChunkDoc[];
  }

  async deleteByDocument(documentId: string): Promise<number> {
    const result = await DocumentChunkModel.deleteMany({
      document: documentId,
    }).exec();
    return result.deletedCount ?? 0;
  }
}
