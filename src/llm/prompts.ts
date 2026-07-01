/** Prompt tóm tắt tài liệu học tập bằng tiếng Việt. */
export const SUMMARIZE_DOCUMENT_PROMPT = `Bạn là trợ lý giáo dục. Hãy đọc tài liệu đính kèm và tóm tắt bằng tiếng Việt theo cấu trúc sau:

Tổng quan
Viết 2-3 câu mô tả chủ đề chính và mục đích.

Nội dung chính
Liệt kê 5-8 ý chính, mỗi ý 1-2 câu.

Từ khóa
Liệt kê 5-10 từ khóa hoặc cụm từ quan trọng, cách nhau bằng dấu phẩy.

Chỉ trả lời theo đúng cấu trúc trên, không thêm nội dung khác.`;

export function buildSummarizePrompt(additionalPrompt?: string): string {
  const additionalInstruction = additionalPrompt?.trim()
    ? `

PHẠM VI TÓM TẮT DO NGƯỜI DÙNG YÊU CẦU:
${additionalPrompt.trim()}

Quy tắc bắt buộc khi có phạm vi tóm tắt:
1. Chỉ tóm tắt nội dung thuộc phạm vi người dùng yêu cầu ở trên.
2. Không tóm tắt toàn bộ tài liệu nếu người dùng đã chỉ định một phạm vi hẹp, ví dụ: "chương đầu tiên", "chương 2", "phần React Hooks".
3. Nếu yêu cầu là "chương đầu tiên", hãy xác định chương/chủ đề đầu tiên trong tài liệu và chỉ tóm tắt phần đó.
4. Nếu không xác định được phạm vi yêu cầu trong tài liệu, hãy nói rõ "Không xác định được phạm vi yêu cầu trong tài liệu" trong phần Tổng quan, sau đó tóm tắt những nội dung gần nhất với yêu cầu. Không chuyển sang tóm tắt toàn bộ tài liệu.
5. Vẫn phải bám sát nội dung có trong tài liệu, không tự bịa thông tin.`
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
  existingQuestions: string[] = [],
): string {
  let additionalInstruction = additionalPrompt?.trim()
    ? `

Yêu cầu bổ sung của người dùng:
${additionalPrompt.trim()}

Hãy ưu tiên yêu cầu bổ sung này khi chọn phạm vi nội dung để tạo câu hỏi. Nếu yêu cầu bổ sung mâu thuẫn với tài liệu, vẫn phải bám sát nội dung có trong tài liệu và không tự bịa thông tin.`
    : "";

  if (additionalPrompt?.trim()) {
    additionalInstruction += `

Neu yeu cau bo sung khong lien quan den noi dung tai lieu, khong co trong tai lieu, hoac la chuoi vo nghia nhu "abc", "123", "asdef", hay tra ve JSON array rong [].
Khong duoc bo qua yeu cau bo sung de tao cau hoi theo mot phan khac cua tai lieu.`;
  }

  const existingQuestionInstruction = existingQuestions.length
    ? `

CÁC CÂU HỎI ĐÃ TỒN TẠI CỦA TÀI LIỆU NÀY:
${existingQuestions.map((q, index) => `${index + 1}. ${q}`).join("\n")}

Yêu cầu bắt buộc để tránh trùng lặp:
1. Không tạo lại câu hỏi giống hoặc gần giống các câu hỏi đã tồn tại ở trên.
2. Không chỉ đổi cách diễn đạt nhưng giữ nguyên ý hỏi.
3. Hãy ưu tiên khía cạnh, chi tiết, ví dụ hoặc góc hỏi khác trong tài liệu.`
    : "";
  additionalInstruction += existingQuestionInstruction;

  const qualityInstruction = `

Tiêu chí chất lượng câu hỏi:
1. Tập trung vào kiến thức trọng tâm, bản chất vấn đề, khái niệm quan trọng, nguyên nhân, hệ quả, ý nghĩa, so sánh, mối quan hệ giữa các sự kiện/khái niệm, hoặc khả năng vận dụng kiến thức.
2. Không tạo câu hỏi hình thức, câu hỏi chỉ kiểm tra tiêu đề hoặc cấu trúc tài liệu, ví dụ: "Chương 1 có tên gọi là gì?", "Nội dung nào thuộc phần ôn tập và thảo luận?", "Một trong những điều cần phân tích là gì?".
3. Không hỏi về mục lục, tên chương, số chương, yêu cầu ôn tập, câu hỏi thảo luận, danh sách đầu mục, hoặc các câu mang tính ghi nhớ máy móc nếu chúng không kiểm tra kiến thức chuyên môn.
4. Nếu tài liệu có phần "ôn tập", "thảo luận", "câu hỏi cuối chương", chỉ dùng các phần đó để hiểu trọng tâm, không biến nguyên văn đầu mục ôn tập thành câu hỏi.
5. Mỗi câu hỏi phải có giá trị học tập: người học cần hiểu nội dung tài liệu mới trả lời được, không chỉ nhìn tiêu đề hoặc liệt kê bề mặt.
6. Với câu trắc nghiệm, các phương án nhiễu phải hợp lý, cùng loại kiến thức với đáp án đúng và không quá lộ liễu.
7. Nếu nội dung phù hợp không đủ để tạo đủ số lượng câu hỏi chất lượng, hãy tạo ít câu hơn thay vì tạo câu hỏi kém giá trị.`;
  additionalInstruction += qualityInstruction;

  const strictQuestionInstruction = `

Bắt buộc tự kiểm tra chất lượng trước khi trả về:
1. Trước khi đưa một câu hỏi vào JSON, hãy tự hỏi: "Câu này có kiểm tra một kiến thức trọng tâm của tài liệu không?". Nếu câu trả lời là không, hãy bỏ câu hỏi đó.
2. Không tạo câu hỏi mà đáp án chỉ là tên chương, tên bài, tên mục, số thứ tự, mục lục, danh sách đầu dòng, hoặc nội dung yêu cầu ôn tập/thảo luận.
3. Không tạo các mẫu câu chung chung như:
   - "Chương này có tên là gì?"
   - "Nội dung nào dưới đây thuộc phần ôn tập và thảo luận?"
   - "Một trong những điều cần phân tích là gì?"
   - "Theo nội dung ôn tập, cần trình bày vấn đề nào?"
   - "Tài liệu đề cập đến nội dung nào?"
4. Mỗi câu hỏi nên rơi vào ít nhất một nhóm sau:
   - Giải thích một khái niệm, sự kiện, quá trình hoặc lập luận quan trọng.
   - Phân tích nguyên nhân, bối cảnh, điều kiện, hệ quả hoặc ý nghĩa.
   - So sánh hai khái niệm/sự kiện/quan điểm có trong tài liệu.
   - Xác định mối quan hệ giữa các ý kiến thức.
   - Vận dụng nội dung tài liệu để nhận định một tình huống hoặc kết luận.
5. Nếu tạo trắc nghiệm, đáp án đúng phải dựa trên một ý kiến thức rõ ràng trong tài liệu; các đáp án sai phải hợp lý, không được vô nghĩa, không được quá khác loại, và không được chỉ là biến thể hình thức của đáp án đúng.
6. Nếu chỉ có thể tạo câu hỏi hình thức hoặc câu hỏi kém giá trị, hãy giảm số lượng câu hỏi. Không cố lập tạo đủ số lượng bằng câu hỏi kém chất lượng.`;
  additionalInstruction += strictQuestionInstruction;

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
3. Tất cả câu hỏi phải có field "type" = "multiple_choice" - KHÔNG dùng giá trị nào khác.

Cấu trúc mỗi object:
- id:          string    - "q1", "q2", ...
- type:        "multiple_choice"
- text:        string    - nội dung câu hỏi
- options:     string[4] - đúng 4 lựa chọn
- answer:      number    - index 0-3 của đáp án đúng trong "options"
- explanation: string    - giải thích ngắn (có thể bỏ qua)

Ví dụ đúng định dạng:
[ ${example} ]`;
  }

  const example = JSON.stringify(
    {
      id: "q1",
      type: "essay",
      text: "Nội dung câu hỏi tự luận?",
      sampleAnswer: "Gợi ý trả lời mẫu ngắn gọn (2-4 câu).",
    },
    null,
    2,
  );

  return `Bạn là trợ lý giáo dục. Hãy đọc toàn bộ tài liệu đính kèm và tạo ${count} câu hỏi tự luận bằng tiếng Việt để kiểm tra hiểu biết người học.${additionalInstruction}

Quy tắc bắt buộc:
1. Câu hỏi phải bám sát nội dung tài liệu, không đặt câu ngoài phạm vi.
2. Trả về đúng một JSON array, không thêm bất kỳ văn bản, markdown hay chú thích nào.
3. Tất cả câu hỏi phải có field "type" = "essay" - KHÔNG dùng giá trị nào khác.

Cấu trúc mỗi object:
- id:           string  - "q1", "q2", ...
- type:         "essay"
- text:         string  - nội dung câu hỏi
- sampleAnswer: string  - gợi ý trả lời mẫu 2-4 câu

Ví dụ đúng định dạng:
[ ${example} ]`;
}
