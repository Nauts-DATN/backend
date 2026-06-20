import { PDFParse } from "pdf-parse";
import { env } from "../config/env.js";
import { getGenAI } from "../llm/genai.js";
import type {
  CreateDocumentChunkInput,
  DocumentChunkDoc,
  DocumentChunkRepository,
} from "../repositories/document-chunk.repository.js";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 250;
const MIN_CONTEXT_CHARS = 900;
const DEFAULT_TOP_K = 8;

export type RetrievedContext = {
  chunks: Array<{
    id: string;
    chunkIndex: number;
    text: string;
    score: number;
  }>;
  contextText: string;
  totalChars: number;
  isEnough: boolean;
  suggestedQuestionCount: number;
};

export type IndexPdfResult = {
  chunkCount: number;
  skippedReason?: "scanned_pdf" | "empty_text";
};

function normalizeText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function splitIntoChunks(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const hardEnd = Math.min(start + CHUNK_SIZE, normalized.length);
    let end = hardEnd;

    const paragraphBreak = normalized.lastIndexOf("\n\n", hardEnd);
    if (paragraphBreak > start + CHUNK_SIZE * 0.5) {
      end = paragraphBreak;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length >= 120) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

function isUsefulExtractedText(text: string): boolean {
  const normalized = normalizeText(text);
  const compact = normalized.replace(/\s+/g, "");
  if (compact.length < 300) return false;

  const letterMatches = compact.match(/\p{L}/gu) ?? [];
  const digitMatches = compact.match(/\p{N}/gu) ?? [];
  const letterRatio = letterMatches.length / compact.length;
  const digitRatio = digitMatches.length / compact.length;
  const pageMarkerCount = (normalized.match(/--\s*\d+\s+of\s+\d+\s*--/gi) ?? [])
    .length;

  if (pageMarkerCount >= 3 && letterMatches.length < 200) return false;
  if (letterRatio < 0.35 && digitRatio > 0.2) return false;

  return true;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function estimateQuestionCapacity(totalChars: number): number {
  if (totalChars < MIN_CONTEXT_CHARS) return 0;
  return Math.max(1, Math.min(20, Math.floor(totalChars / 700)));
}

export class RagService {
  constructor(documentChunkRepository: DocumentChunkRepository) {
    this.documentChunkRepository = documentChunkRepository;
  }

  private readonly documentChunkRepository: DocumentChunkRepository;

  async extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return normalizeText(result.text ?? "");
    } finally {
      await parser.destroy();
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required for RAG embeddings.");
    }

    const ai = getGenAI(env.geminiApiKey);
    const response = await ai.models.embedContent({
      model: env.geminiEmbeddingModel,
      contents: text,
    });
    const values = response.embeddings?.[0]?.values;
    if (!values?.length) {
      throw new Error("Gemini embedding response is empty.");
    }
    return values;
  }

  async indexPdfDocument(input: {
    documentId: string;
    userId: string;
    buffer: Buffer;
  }): Promise<IndexPdfResult> {
    if (!env.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required for RAG indexing.");
    }

    const text = await this.extractPdfText(input.buffer);
    if (!text) {
      await this.documentChunkRepository.replaceForDocument(input.documentId, []);
      return { chunkCount: 0, skippedReason: "empty_text" };
    }
    if (!isUsefulExtractedText(text)) {
      await this.documentChunkRepository.replaceForDocument(input.documentId, []);
      return { chunkCount: 0, skippedReason: "scanned_pdf" };
    }

    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      await this.documentChunkRepository.replaceForDocument(input.documentId, []);
      return { chunkCount: 0 };
    }

    const records: CreateDocumentChunkInput[] = [];
    for (const [chunkIndex, chunkText] of chunks.entries()) {
      const embedding = await this.embedText(chunkText);
      records.push({
        documentId: input.documentId,
        userId: input.userId,
        chunkIndex,
        text: chunkText,
        embedding,
      });
    }

    await this.documentChunkRepository.replaceForDocument(
      input.documentId,
      records,
    );
    return { chunkCount: records.length };
  }

  async retrieve(input: {
    documentId: string;
    query: string;
    topK?: number;
  }): Promise<RetrievedContext | null> {
    const query = input.query.trim();
    if (!query || !env.geminiApiKey) return null;

    const chunks = await this.documentChunkRepository.findByDocument(
      input.documentId,
    );
    if (chunks.length === 0) return null;

    const queryEmbedding = await this.embedText(query);
    const ranked = chunks
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK ?? DEFAULT_TOP_K);

    const selected = ranked
      .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex)
      .map(({ chunk, score }) => this.toContextChunk(chunk, score));
    const contextText = selected
      .map(
        (chunk) =>
          `[chunk_${chunk.chunkIndex} | score=${chunk.score.toFixed(3)}]\n${chunk.text}`,
      )
      .join("\n\n---\n\n");
    const totalChars = selected.reduce((sum, chunk) => sum + chunk.text.length, 0);
    const suggestedQuestionCount = estimateQuestionCapacity(totalChars);

    return {
      chunks: selected,
      contextText,
      totalChars,
      isEnough: totalChars >= MIN_CONTEXT_CHARS,
      suggestedQuestionCount,
    };
  }

  private toContextChunk(chunk: DocumentChunkDoc, score: number) {
    return {
      id: chunk._id.toString(),
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      score,
    };
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.documentChunkRepository.deleteByDocument(documentId);
  }
}
