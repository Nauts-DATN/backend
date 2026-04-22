import { GoogleGenAI } from "@google/genai";

let _instance: GoogleGenAI | null = null;

/**
 * Trả về singleton GoogleGenAI.
 * Ném lỗi nếu apiKey rỗng để tránh khởi tạo client vô nghĩa.
 */
export function getGenAI(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY chưa được cấu hình trên server."),
      { status: 503 },
    );
  }
  if (!_instance) {
    _instance = new GoogleGenAI({ apiKey });
  }
  return _instance;
}
