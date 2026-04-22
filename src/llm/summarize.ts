import { getGenAI } from "./genai.js";
import { SUMMARIZE_DOCUMENT_PROMPT } from "./prompts.js";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

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
            { text: SUMMARIZE_DOCUMENT_PROMPT },
          ],
        },
      ],
    });

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
