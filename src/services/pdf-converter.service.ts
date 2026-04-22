import { existsSync } from "node:fs";
import mammoth from "mammoth";
import puppeteer from "puppeteer-core";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Danh sách đường dẫn Chrome/Chromium phổ biến theo nền tảng. */
const CHROME_PATHS: string[] = [
  // Windows
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

function findChrome(): string {
  const fromEnv = process.env.CHROME_EXECUTABLE_PATH;
  if (fromEnv) return fromEnv;

  const found = CHROME_PATHS.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "Không tìm thấy Chrome/Chromium để convert PDF. " +
        "Đặt biến môi trường CHROME_EXECUTABLE_PATH để chỉ đường dẫn.",
    );
  }
  return found;
}

const PREVIEW_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
  }
  body { padding: 24mm 20mm; }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.2em;
    margin-bottom: 0.4em;
    font-weight: 700;
    line-height: 1.25;
    color: #111;
  }
  h1 { font-size: 1.8em; border-bottom: 2px solid #ccc; padding-bottom: 0.2em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.15em; }
  h3 { font-size: 1.15em; }
  p { margin-bottom: 0.8em; }
  ul, ol { margin: 0 0 0.8em 1.8em; }
  li { margin-bottom: 0.3em; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
  td, th { border: 1px solid #bbb; padding: 5px 9px; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  img { max-width: 100%; height: auto; display: block; margin: 0.5em 0; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  a { color: #1d4ed8; text-decoration: underline; }
  pre, code {
    font-family: "Cascadia Code", Consolas, monospace;
    background: #f8fafc;
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 0.9em;
  }
  pre { padding: 1em; overflow-x: auto; }
  blockquote {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 3px solid #94a3b8;
    color: #475569;
    background: #f8fafc;
  }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.2em 0; }
`;

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${PREVIEW_CSS}</style>
</head>
<body>${body}</body>
</html>`;
}

export class PdfConverterService {
  isDocxFile(mimeType: string, fileName: string): boolean {
    return mimeType === DOCX_MIME || /\.docx$/i.test(fileName);
  }

  /**
   * Chuyển .docx buffer → PDF buffer:
   * mammoth (DOCX → HTML) → puppeteer-core (HTML → PDF qua Chrome cài sẵn).
   */
  async convertDocxToPdf(buffer: Buffer): Promise<Buffer> {
    const { value: bodyHtml, messages } = await mammoth.convertToHtml({
      buffer,
    });

    if (messages.length > 0) {
      const warns = messages
        .filter((m) => m.type === "warning")
        .map((m) => m.message);
      if (warns.length) console.warn("[PdfConverter] mammoth warns:", warns);
    }

    const html = wrapHtml(bodyHtml);

    const browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
