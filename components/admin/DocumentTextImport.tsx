"use client";

import { useRef, useState } from "react";
import {
  SUPPORTED_DOCUMENT_ACCEPT,
  extractTextFromDocument,
  type DocumentImportResult,
} from "@/lib/document-text-extract";
import { cn } from "@/utils/cn";

interface DocumentTextImportProps {
  disabled?: boolean;
  onImported: (result: DocumentImportResult) => void;
  onNotice?: (message: string) => void;
  className?: string;
}

export function DocumentTextImport({
  disabled = false,
  onImported,
  onNotice,
  className,
}: DocumentTextImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setIsExtracting(true);
      const result = await extractTextFromDocument(file);
      onImported(result);
      onNotice?.(`「${result.fileName}」에서 텍스트를 불러왔어요. 내용을 확인한 뒤 저장해주세요.`);
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "문서에서 텍스트를 읽지 못했어요.");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div
      className={cn(
        "grid gap-2 rounded border border-dashed border-emerald-100/20 bg-black/20 p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-50">문서에서 텍스트 불러오기</p>
          <p className="mt-1 text-xs text-emerald-100/55">
            PDF, DOCX, TXT, MD 파일을 올리면 줄바꿈·굵게·기울임·대사 구분을 살려 본문에 채워요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || isExtracting}
            onClick={() => inputRef.current?.click()}
            className="bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
          >
            {isExtracting ? "텍스트 추출 중..." : "문서 업로드"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={SUPPORTED_DOCUMENT_ACCEPT}
            disabled={disabled || isExtracting}
            className="sr-only"
            onChange={(event) => void handleFileChange(event)}
          />
        </div>
      </div>
    </div>
  );
}
