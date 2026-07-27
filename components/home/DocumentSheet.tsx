"use client";

import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

type DocumentSheetProps = {
  children: ReactNode;
  className?: string;
  /**
   * 모달 서류 상단 탭 라벨.
   */
  tabLabel?: string;
};

/**
 * 책상 위 대형 서류 시트. 공개 모달 공통 프레임.
 */
export function DocumentSheet({ children, className, tabLabel = "DOC" }: DocumentSheetProps) {
  return (
    <div
      className={cn("document-sheet dossier-viewer", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="document-sheet-tab" aria-hidden="true">
        {tabLabel}
      </span>
      {children}
    </div>
  );
}
