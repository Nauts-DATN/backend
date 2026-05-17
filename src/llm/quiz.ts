import { Type } from "@google/genai";
import { getGenAI } from "./genai.js";
import { buildQuizPrompt } from "./prompts.js";

const GEMINI_MODEL = "gemini-2.5-flash";

export type QuestionType = "multiple_choice" | "essay";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  /** Chỉ có với trắc nghiệm — 4 lựa chọn. */
  options?: string[];
  /** Chỉ có với trắc nghiệm — index đáp án đúng (0–3). */
  answer?: number;
  /** Giải thích đáp án (tuỳ chọn). */
  explanation?: string;
  /** Chỉ có với tự luận — gợi ý trả lời mẫu. */
  sampleAnswer?: string;
};

export type GenerateQuizOptions = {
  questionType: QuestionType;
  /** Số câu hỏi cần tạo. Mặc định 5, tối đa 20. */
  count?: number;
};

/**
 * Tạo JSON Schema động cho Gemini.
 * - field "type" bị giới hạn bằng enum đúng loại.
 * - required fields khác nhau theo loại để Gemini buộc phải điền nội dung thực,
 *   tránh sinh placeholder thay cho giá trị.
 */
function buildResponseSchema(questionType: QuestionType) {
  if (questionType === "multiple_choice") {
    return {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'ID câu hỏi, ví dụ "q1", "q2"',
          },
          type: {
            type: Type.STRING,
            enum: ["multiple_choice"],
          },
          text: {
            type: Type.STRING,
            description: "Nội dung câu hỏi trắc nghiệm",
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Mảng đúng 4 chuỗi lựa chọn",
          },
          answer: {
            type: Type.INTEGER,
            description: "Index (0–3) của đáp án đúng trong options",
          },
          explanation: {
            type: Type.STRING,
            description: "Giải thích ngắn tại sao đáp án đúng",
          },
        },
        required: ["id", "type", "text", "options", "answer"],
      },
    };
  }

  // essay
  return {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: 'ID câu hỏi, ví dụ "q1", "q2"',
        },
        type: {
          type: Type.STRING,
          enum: ["essay"],
        },
        text: {
          type: Type.STRING,
          description: "Nội dung câu hỏi tự luận",
        },
        sampleAnswer: {
          type: Type.STRING,
          description:
            "Câu trả lời mẫu đầy đủ 2–4 câu bằng tiếng Việt, dựa trên nội dung tài liệu",
        },
      },
      required: ["id", "type", "text", "sampleAnswer"],
    },
  };
}

/**
 * Tạo bộ câu hỏi từ file PDF qua Gemini Files API.
 *
 * @param pdfBuffer   - Buffer file PDF.
 * @param fileName    - Tên file hiển thị khi upload lên Gemini.
 * @param options     - Loại câu hỏi và số lượng.
 * @param apiKey      - Gemini API key.
 * @returns           - Mảng câu hỏi đã được parse.
 */
export async function generateQuizFromPdf(
  pdfBuffer: Buffer,
  fileName: string,
  options: GenerateQuizOptions,
  apiKey: string,
): Promise<QuizQuestion[]> {
  const count = Math.min(Math.max(options.count ?? 5, 1), 20);
  const questionType = options.questionType;

  const ai = getGenAI(apiKey);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });

  let uploadedFile: Awaited<ReturnType<typeof ai.files.upload>> | null = null;

  try {
    uploadedFile = await ai.files.upload({
      file: blob,
      config: { mimeType: "application/pdf", displayName: fileName },
    });

    const fileUri = uploadedFile.uri;
    if (!fileUri) {
      throw Object.assign(
        new Error("Gemini Files API không trả về URI."),
        { status: 502 },
      );
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { fileData: { fileUri, mimeType: "application/pdf" } },
            { text: buildQuizPrompt(count, questionType) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(questionType),
      },
    });

    const raw = response.text?.trim() ?? "";
    if (!raw) {
      throw Object.assign(
        new Error("Gemini không trả về dữ liệu quiz."),
        { status: 502 },
      );
    }

    const parsed = JSON.parse(raw) as QuizQuestion[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw Object.assign(
        new Error("Gemini trả về quiz không hợp lệ."),
        { status: 502 },
      );
    }

    // Lớp lọc hậu xử lý — loại bỏ câu hỏi sai loại phòng trường hợp model bỏ qua enum
    const questions = parsed.filter((q) => q.type === questionType);

    if (questions.length === 0) {
      throw Object.assign(
        new Error("Gemini không tạo được câu hỏi đúng loại yêu cầu."),
        { status: 502 },
      );
    }

    return questions;
  } finally {
    if (uploadedFile?.name) {
      await ai.files
        .delete({ name: uploadedFile.name })
        .catch((err: unknown) =>
          console.warn("[llm/quiz] Không xóa được file Gemini:", err),
        );
    }
  }
}
