import { Type } from "@google/genai";
import { getGenAI } from "./genai.js";
import { buildQuizPrompt } from "./prompts.js";

const GEMINI_MODEL = "gemini-2.5-flash";

export type QuestionType = "multiple_choice" | "essay";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  sourceChunkIds?: string[];
  /** Chá»‰ cÃ³ vá»›i tráº¯c nghiá»‡m â€” 4 lá»±a chá»n. */
  options?: string[];
  /** Chá»‰ cÃ³ vá»›i tráº¯c nghiá»‡m â€” index Ä‘Ã¡p Ã¡n Ä‘Ãºng (0â€“3). */
  answer?: number;
  /** Giáº£i thÃ­ch Ä‘Ã¡p Ã¡n (tuá»³ chá»n). */
  explanation?: string;
  /** Chá»‰ cÃ³ vá»›i tá»± luáº­n â€” gá»£i Ã½ tráº£ lá»i máº«u. */
  sampleAnswer?: string;
};

export type GenerateQuizOptions = {
  questionType: QuestionType;
  /** Sá»‘ cÃ¢u há»i cáº§n táº¡o. Máº·c Ä‘á»‹nh 5, tá»‘i Ä‘a 20. */
  count?: number;
  additionalPrompt?: string;
  existingQuestions?: string[];
};

/**
 * Táº¡o JSON Schema Ä‘á»™ng cho Gemini.
 * - field "type" bá»‹ giá»›i háº¡n báº±ng enum Ä‘Ãºng loáº¡i.
 * - required fields khÃ¡c nhau theo loáº¡i Ä‘á»ƒ Gemini buá»™c pháº£i Ä‘iá»n ná»™i dung thá»±c,
 *   trÃ¡nh sinh placeholder thay cho giÃ¡ trá»‹.
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
            description: 'ID cÃ¢u há»i, vÃ­ dá»¥ "q1", "q2"',
          },
          type: {
            type: Type.STRING,
            enum: ["multiple_choice"],
          },
          text: {
            type: Type.STRING,
            description: "Ná»™i dung cÃ¢u há»i tráº¯c nghiá»‡m",
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Máº£ng Ä‘Ãºng 4 chuá»—i lá»±a chá»n",
          },
          answer: {
            type: Type.INTEGER,
            description: "Index (0â€“3) cá»§a Ä‘Ã¡p Ã¡n Ä‘Ãºng trong options",
          },
          explanation: {
            type: Type.STRING,
            description: "Giáº£i thÃ­ch ngáº¯n táº¡i sao Ä‘Ã¡p Ã¡n Ä‘Ãºng",
          },
          sourceChunkIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Danh sÃ¡ch chunk nguá»“n náº¿u cÃ¢u há»i Ä‘Æ°á»£c táº¡o tá»« RAG context",
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
          description: 'ID cÃ¢u há»i, vÃ­ dá»¥ "q1", "q2"',
        },
        type: {
          type: Type.STRING,
          enum: ["essay"],
        },
        text: {
          type: Type.STRING,
          description: "Ná»™i dung cÃ¢u há»i tá»± luáº­n",
        },
        sampleAnswer: {
          type: Type.STRING,
          description:
            "CÃ¢u tráº£ lá»i máº«u Ä‘áº§y Ä‘á»§ 2â€“4 cÃ¢u báº±ng tiáº¿ng Viá»‡t, dá»±a trÃªn ná»™i dung tÃ i liá»‡u",
        },
        sourceChunkIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Danh sÃ¡ch chunk nguá»“n náº¿u cÃ¢u há»i Ä‘Æ°á»£c táº¡o tá»« RAG context",
        },
      },
      required: ["id", "type", "text", "sampleAnswer"],
    },
  };
}

/**
 * Táº¡o bá»™ cÃ¢u há»i tá»« file PDF qua Gemini Files API.
 *
 * @param pdfBuffer   - Buffer file PDF.
 * @param fileName    - TÃªn file hiá»ƒn thá»‹ khi upload lÃªn Gemini.
 * @param options     - Loáº¡i cÃ¢u há»i vÃ  sá»‘ lÆ°á»£ng.
 * @param apiKey      - Gemini API key.
 * @returns           - Máº£ng cÃ¢u há»i Ä‘Ã£ Ä‘Æ°á»£c parse.
 */
export async function generateQuizFromPdf(
  pdfBuffer: Buffer,
  fileName: string,
  options: GenerateQuizOptions,
  apiKey: string,
): Promise<QuizQuestion[]> {
  const count = Math.min(Math.max(options.count ?? 5, 1), 20);
  const questionType = options.questionType;
  const additionalPrompt = options.additionalPrompt?.trim();
  const existingQuestions = options.existingQuestions ?? [];

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
        new Error("Gemini Files API khÃ´ng tráº£ vá» URI."),
        { status: 502 },
      );
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { fileData: { fileUri, mimeType: "application/pdf" } },
            {
              text: buildQuizPrompt(
                count,
                questionType,
                additionalPrompt,
                existingQuestions,
              ),
            },
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
        new Error("Gemini khÃ´ng tráº£ vá» dá»¯ liá»‡u quiz."),
        { status: 502 },
      );
    }

    const parsed = JSON.parse(raw) as QuizQuestion[];
    if (!Array.isArray(parsed)) {
      throw Object.assign(
        new Error("Gemini tráº£ vá» quiz khÃ´ng há»£p lá»‡."),
        { status: 502 },
      );
    }


    if (parsed.length === 0) {
      return [];
    }
    // Lá»›p lá»c háº­u xá»­ lÃ½ â€” loáº¡i bá» cÃ¢u há»i sai loáº¡i phÃ²ng trÆ°á»ng há»£p model bá» qua enum
    const questions = parsed.filter((q) => q.type === questionType);

    return questions;
  } finally {
    if (uploadedFile?.name) {
      await ai.files
        .delete({ name: uploadedFile.name })
        .catch((err: unknown) =>
          console.warn("[llm/quiz] KhÃ´ng xÃ³a Ä‘Æ°á»£c file Gemini:", err),
        );
    }
  }
}

export async function generateQuizFromContext(
  contextText: string,
  options: GenerateQuizOptions,
  apiKey: string,
): Promise<QuizQuestion[]> {
  const count = Math.min(Math.max(options.count ?? 5, 1), 20);
  const questionType = options.questionType;
  const additionalPrompt = options.additionalPrompt?.trim();
  const existingQuestions = options.existingQuestions ?? [];
  const ai = getGenAI(apiKey);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        parts: [
          { text: `CONTEXT TRÃCH XUáº¤T Tá»ª TÃ€I LIá»†U:\n${contextText}` },
          {
            text: buildQuizPrompt(
              count,
              questionType,
              additionalPrompt,
              existingQuestions,
            ),
          },
          {
            text:
              "Chá»‰ táº¡o cÃ¢u há»i dá»±a trÃªn CONTEXT á»Ÿ trÃªn. Náº¿u context chá»©a nhiá»u pháº§n khÃ¡c nhau, chá»‰ dÃ¹ng pháº§n liÃªn quan trá»±c tiáº¿p Ä‘áº¿n yÃªu cáº§u ngÆ°á»i dÃ¹ng. KhÃ´ng dÃ¹ng ná»™i dung thuá»™c pháº§n khÃ¡c dÃ¹ náº±m trong cÃ¹ng context. Náº¿u pháº§n liÃªn quan quÃ¡ Ã­t Ä‘á»ƒ táº¡o cÃ¢u há»i cháº¥t lÆ°á»£ng, hÃ£y táº¡o Ã­t cÃ¢u hÆ¡n hoáº·c tráº£ vá» máº£ng JSON rá»—ng []. KhÃ´ng tráº£ vá» giáº£i thÃ­ch ngoÃ i JSON.",
          },
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
    throw Object.assign(new Error("Gemini khÃ´ng tráº£ vá» dá»¯ liá»‡u quiz."), {
      status: 502,
    });
  }

  const parsed = JSON.parse(raw) as QuizQuestion[];
  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error("Gemini tráº£ vá» quiz khÃ´ng há»£p lá»‡."), {
      status: 502,
    });
  }

  if (parsed.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  return parsed
    .filter((q) => q.type === questionType)
    .filter((q) => {
      const key = q.text.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
