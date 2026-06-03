/**
 * Một migration chạy một lần theo thứ tự `name` (nên dùng prefix số: 001_, 002_).
 * Ghi nhận trong collection `_migration_records`.
 */
export interface BaseMigration {
  /** Tên duy nhất, dùng để so sánh đã chạy hay chưa */
  name: string;
  /** Áp dụng thay đổi schema / index / dữ liệu */
  up: () => Promise<void>;
  /** Tuỳ chọn — rollback (CLI có thể mở rộng sau) */
  down?: () => Promise<void>;
}
