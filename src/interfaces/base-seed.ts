/**
 * Seed theo `name`, ghi nhận trong `_seed_records` khi hoàn tất.
 *
 * Trả về `{ record: false }` nếu **chưa** nên ghi DB (vd. thiếu env) — lần sau vẫn pending.
 */
export interface BaseSeed {
  name: string;
  run: () => Promise<{ record: boolean } | void>;
}
