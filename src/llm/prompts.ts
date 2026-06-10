/** Prompt tóm tắt tài liệu học tập bằng tiếng Việt. */
export const SUMMARIZE_DOCUMENT_PROMPT = `Bạn là trợ lý giáo dục. Hãy đọc tài liệu đính kèm, yêu cầu bổ sung của người dùng và tóm tắt bằng tiếng Việt theo cấu trúc sau:

Tổng quan
Viết 2–3 câu mô tả chủ đề chính và mục đích.

Nội dung chính
Liệt kê 5–8 ý chính dưới dạng bullet points, mỗi ý 1–2 câu.

Từ khóa
Liệt kê 5–10 từ khóa hoặc cụm từ quan trọng, cách nhau bằng dấu phẩy.

Chỉ trả lời theo đúng cấu trúc trên, không thêm nội dung khác.`;

export function buildSummarizePrompt(additionalPrompt?: string): string {
  const additionalInstruction = additionalPrompt?.trim()
    ? `

Yêu cầu bổ sung của người dùng:
${additionalPrompt.trim()}

Nếu có yêu cầu bổ sung, hãy ưu tiên yêu cầu này khi chọn phạm vi nội dung để tóm tắt. Nếu yêu cầu bổ sung mâu thuẫn với tài liệu, vẫn phải bám sát nội dung có trong tài liệu và không tự bịa thông tin.`
    : "";

  return `${SUMMARIZE_DOCUMENT_PROMPT}${additionalInstruction}`;
}

/**
 * Tạo prompt tạo quiz từ tài liệu PDF.
 * @param count        - Số câu hỏi cần tạo.
 * @param questionType - "multiple_choice" | "essay".
 */
export function buildQuizPrompt(
  count: number,
  questionType: "multiple_choice" | "essay",
  additionalPrompt?: string,
): string {
  const additionalInstruction = additionalPrompt?.trim()
    ? `

Yêu cầu bổ sung của người dùng:
${additionalPrompt.trim()}

Hãy ưu tiên yêu cầu bổ sung này khi chọn phạm vi nội dung để tạo câu hỏi. Nếu yêu cầu bổ sung mâu thuẫn với tài liệu, vẫn phải bám sát nội dung có trong tài liệu và không tự bịa thông tin.`
    : "";

  if (questionType === "multiple_choice") {
    const example = JSON.stringify(
      {
        id: "q1",
        type: "multiple_choice",
        text: "Nội dung câu hỏi trắc nghiệm?",
        options: ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
        answer: 0,
        explanation: "Giải thích tại sao đáp án A đúng (có thể bỏ qua).",
      },
      null,
      2,
    );

    return `Bạn là trợ lý giáo dục. Hãy đọc toàn bộ tài liệu đính kèm và tạo ${count} câu hỏi trắc nghiệm bằng tiếng Việt để kiểm tra hiểu biết người học.${additionalInstruction}

Quy tắc bắt buộc:
1. Câu hỏi phải bám sát nội dung tài liệu, không đặt câu ngoài phạm vi.
2. Trả về đúng một JSON array, không thêm bất kỳ văn bản, markdown hay chú thích nào.
3. Tất cả câu hỏi phải có field "type" = "multiple_choice" — KHÔNG dùng giá trị nào khác.

Cấu trúc mỗi object:
- id:          string    — "q1", "q2", …
- type:        "multiple_choice"
- text:        string    — nội dung câu hỏi
- options:     string[4] — đúng 4 lựa chọn
- answer:      number    — index 0–3 của đáp án đúng trong "options"
- explanation: string    — giải thích ngắn (có thể bỏ qua)

Ví dụ đúng định dạng:
[ ${example} ]`;
  }

  // essay
  const example = JSON.stringify(
    {
      id: "q1",
      type: "essay",
      text: "Nội dung câu hỏi tự luận?",
      sampleAnswer: "Gợi ý trả lời mẫu ngắn gọn (2–4 câu).",
    },
    null,
    2,
  );

  return `Bạn là trợ lý giáo dục. Hãy đọc toàn bộ tài liệu đính kèm và tạo ${count} câu hỏi tự luận bằng tiếng Việt để kiểm tra hiểu biết người học.${additionalInstruction}

Quy tắc bắt buộc:
1. Câu hỏi phải bám sát nội dung tài liệu, không đặt câu ngoài phạm vi.
2. Trả về đúng một JSON array, không thêm bất kỳ văn bản, markdown hay chú thích nào.
3. Tất cả câu hỏi phải có field "type" = "essay" — KHÔNG dùng giá trị nào khác.

Cấu trúc mỗi object:
- id:           string  — "q1", "q2", …
- type:         "essay"
- text:         string  — nội dung câu hỏi
- sampleAnswer: string  — gợi ý trả lời mẫu 2–4 câu

Ví dụ đúng định dạng:
[ ${example} ]`;
}
