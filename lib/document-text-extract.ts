import { MAX_UPLOAD_SIZE } from "@/lib/r2-upload-client";
import { extractDocxText } from "@/lib/docx-text-extract";
import { layoutPdfTextContent } from "@/lib/pdf-layout-extract";

export const SUPPORTED_DOCUMENT_ACCEPT =
  ".pdf,.docx,.txt,.text,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const PLAIN_TEXT_EXTENSIONS = new Set([".txt", ".text", ".md", ".markdown"]);

export type DocumentImportResult = {
  text: string;
  fileName: string;
  suggestedTitle: string;
};

export function suggestTitleFromFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim();
  return baseName || "제목 없음";
}

export function isSupportedDocumentFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return true;
  }

  if (
    lowerName.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }

  if (file.type.startsWith("text/")) {
    return true;
  }

  const extension = lowerName.slice(lowerName.lastIndexOf("."));
  return PLAIN_TEXT_EXTENSIONS.has(extension);
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(file: File): Promise<string> {
  const { GlobalWorkerOptions, getDocument } = await import("pdfjs-dist");

  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const textItems = content.items.flatMap((item) => ("transform" in item ? [item] : []));
    const pageText = layoutPdfTextContent(textItems);

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  return normalizeExtractedText(pageTexts.join("\n\n"));
}

async function extractPlainText(file: File): Promise<string> {
  return normalizeExtractedText(await file.text());
}

export async function extractTextFromDocument(file: File): Promise<DocumentImportResult> {
  if (!isSupportedDocumentFile(file)) {
    throw new Error("PDF, DOCX, TXT, MD 파일만 업로드할 수 있어요.");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`파일 크기는 최대 ${Math.round(MAX_UPLOAD_SIZE / (1024 * 1024))}MB까지 가능해요.`);
  }

  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    lowerName.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const text = isPdf
    ? await extractPdfText(file)
    : isDocx
      ? await extractDocxText(file)
      : await extractPlainText(file);

  if (!text) {
    throw new Error(
      "문서에서 읽을 수 있는 텍스트가 없어요. 스캔본 PDF는 OCR이 필요할 수 있어요.",
    );
  }

  return {
    text,
    fileName: file.name,
    suggestedTitle: suggestTitleFromFileName(file.name),
  };
}
