import { getGenAI } from "./genai.js";
import { buildSummarizePrompt } from "./prompts.js";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Tóm tắt nội dung một file PDF qua Gemini Files API.
 *
 * - Upload buffer lên Gemini Files API.
 * - Gọi generateContent với file URI và prompt.
 * - Xóa file Gemini sau khi xong (dù thành công hay lỗi).
 *
 * @param pdfBuffer - Nội dung file PDF dưới dạng Buffer.
 * @param fileName  - Tên hiển thị khi upload lên Gemini.
 * @param apiKey    - Gemini API key.
 * @returns         - Chuỗi tóm tắt tiếng Việt.
 */
export async function summarizePdf(
  pdfBuffer: Buffer,
  fileName: string,
  apiKey: string,
  additionalPrompt?: string,
): Promise<string> {
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
            { text: buildSummarizePrompt(additionalPrompt) },
          ],
        },
      ],
    });
    console.log("promptTokenCount", response.usageMetadata?.promptTokenCount);
    const text = response.text?.trim() ?? "";
    if (!text) {
      throw Object.assign(
        new Error("Gemini không trả về nội dung tóm tắt."),
        { status: 502 },
      );
    }

    return text;
  } finally {
    if (uploadedFile?.name) {
      await ai.files
        .delete({ name: uploadedFile.name })
        .catch((err: unknown) =>
          console.warn("[llm/summarize] Không xóa được file Gemini:", err),
        );
    }
  }
}

export async function summarizeFromContext(
  contextText: string,
  apiKey: string,
  additionalPrompt: string,
): Promise<string> {
  const ai = getGenAI(apiKey);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        parts: [
          { text: `CONTEXT TRÍCH XUẤT TỪ TÀI LIỆU:\n${contextText}` },
          { text: buildSummarizePrompt(additionalPrompt) },
          {
            text:
              "Chỉ tóm tắt dựa trên CONTEXT ở trên. Không tóm tắt ngoài phạm vi context. Nếu context không đủ thông tin, hãy nói rõ trong phần Tổng quan và không bịa thêm.",
          },
        ],
      },
    ],
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw Object.assign(
      new Error("Gemini không trả về nội dung tóm tắt từ context."),
      { status: 502 },
    );
  }

  return text;
}
