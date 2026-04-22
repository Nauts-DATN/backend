import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = join(__dirname, "migrations");
const SEEDS_DIR = join(__dirname, "seeds");
const MIGRATIONS_INDEX = join(MIGRATIONS_DIR, "index.ts");
const SEEDS_INDEX = join(SEEDS_DIR, "index.ts");

function normalizeSlug(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error("Thiếu tên (slug). Ví dụ: migration:create add_posts");
  }
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function slugToPascal(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function nextPrefix(dir: string): string {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".ts") && f !== "index.ts" && /^\d{3}_/.test(f),
  );
  let max = 0;
  for (const f of files) {
    const n = Number.parseInt(f.slice(0, 3), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(3, "0");
}

function appendToIndex(
  indexPath: string,
  exportName: string,
  baseFilename: string,
  arrayName: "migrations" | "seeds",
): void {
  let content = readFileSync(indexPath, "utf8");
  if (content.includes(`from "./${baseFilename}.js"`)) {
    throw new Error(`Đã có import cho ./${baseFilename}.ts trong index`);
  }

  const lines = content.split(/\r?\n/);
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImportIdx = i;
  }
  if (lastImportIdx === -1) {
    throw new Error(`Không tìm thấy import trong ${indexPath}`);
  }

  lines.splice(
    lastImportIdx + 1,
    0,
    `import { ${exportName} } from "./${baseFilename}.js";`,
  );
  content = lines.join("\n");

  const arrayRegex =
    arrayName === "migrations"
      ? /export const migrations: BaseMigration\[\] = \[([\s\S]*?)\];/
      : /export const seeds: BaseSeed\[\] = \[([\s\S]*?)\];/;

  const m = content.match(arrayRegex);
  if (!m) {
    throw new Error(
      `Không parse được mảng ${arrayName} trong ${indexPath} (cần dạng export const ... = [ ... ];)`,
    );
  }

  const items = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith("//") && !s.startsWith("*"));

  if (items.includes(exportName)) {
    throw new Error(`Export ${exportName} đã có trong mảng`);
  }
  items.push(exportName);

  const prefix =
    arrayName === "migrations"
      ? "export const migrations: BaseMigration[] = "
      : "export const seeds: BaseSeed[] = ";

  const newBlock = `${prefix}[\n  ${items.join(",\n  ")},\n];`;

  content = content.replace(arrayRegex, newBlock);
  writeFileSync(indexPath, content, "utf8");
}

export function createMigrationFile(slugRaw: string | undefined): void {
  const slug = normalizeSlug(slugRaw);
  if (!slug) {
    throw new Error("Slug không hợp lệ (chỉ chữ thường, số, gạch dưới)");
  }

  const prefix = nextPrefix(MIGRATIONS_DIR);
  const baseFilename = `${prefix}_${slug}`;
  const filePath = join(MIGRATIONS_DIR, `${baseFilename}.ts`);
  if (existsSync(filePath)) {
    throw new Error(`File đã tồn tại: ${filePath}`);
  }

  const pascal = slugToPascal(slug);
  const exportName = `migration${prefix}${pascal}`;
  const migrationName = `${prefix}_${slug}`;

  const body = `import type { BaseMigration } from "../../interfaces/base-migration.js";

export const ${exportName}: BaseMigration = {
  name: "${migrationName}",
  async up() {
    // TODO: thay đổi schema / index / dữ liệu
  },
};
`;

  writeFileSync(filePath, body, "utf8");
  appendToIndex(MIGRATIONS_INDEX, exportName, baseFilename, "migrations");

  console.log(`[migration:create] Đã tạo ${filePath}`);
  console.log(
    `[migration:create] Đã cập nhật migrations/index.ts (${exportName})`,
  );
}

export function createSeedFile(slugRaw: string | undefined): void {
  const slug = normalizeSlug(slugRaw);
  if (!slug) {
    throw new Error("Slug không hợp lệ (chỉ chữ thường, số, gạch dưới)");
  }

  const prefix = nextPrefix(SEEDS_DIR);
  const baseFilename = `${prefix}_${slug}`;
  const filePath = join(SEEDS_DIR, `${baseFilename}.ts`);
  if (existsSync(filePath)) {
    throw new Error(`File đã tồn tại: ${filePath}`);
  }

  const pascal = slugToPascal(slug);
  const exportName = `seed${prefix}${pascal}`;
  const seedName = `${prefix}_${slug}`;

  const body = `import type { BaseSeed } from "../../interfaces/base-seed.js";

export const ${exportName}: BaseSeed = {
  name: "${seedName}",
  async run() {
    // TODO: dữ liệu mẫu / bootstrap
    return { record: true };
  },
};
`;

  writeFileSync(filePath, body, "utf8");
  appendToIndex(SEEDS_INDEX, exportName, baseFilename, "seeds");

  console.log(`[seed:create] Đã tạo ${filePath}`);
  console.log(`[seed:create] Đã cập nhật seeds/index.ts (${exportName})`);
}
