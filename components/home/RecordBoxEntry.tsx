"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";
import { cn } from "@/utils/cn";

interface RecordBoxEntryProps {
  title: ReactNode;
  children: ReactNode;
  indexLabel?: string;
  hint?: string;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Record 목록의 접힘 항목. 스토리 행과 같은 파일-인덱스 톤을 씁니다.
 */
export function RecordBoxEntry({
  title,
  children,
  indexLabel,
  hint,
  defaultOpen = false,
  className,
}: RecordBoxEntryProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    setOpen(event.currentTarget.open);
  };

  return (
    <details
      className={cn("record-row record-row--fold", className)}
      open={open}
      onToggle={handleToggle}
    >
      <summary className="record-row-summary">
        {indexLabel ? <span className="record-row-index">{indexLabel}</span> : null}
        <span className="record-row-main">
          <span className="record-row-title">{title}</span>
          {hint ? <span className="record-row-hint">{hint}</span> : null}
        </span>
        <span className="record-row-action" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </summary>
      <div className="record-row-body">{children}</div>
    </details>
  );
}
