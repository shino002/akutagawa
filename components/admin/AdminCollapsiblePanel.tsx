"use client";

import { useState, type ReactNode } from "react";

interface AdminCollapsiblePanelProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AdminCollapsiblePanel({
  title,
  description,
  defaultOpen = false,
  children,
}: AdminCollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-emerald-100/10 bg-black/25">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-emerald-50">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-emerald-100/50">{description}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-emerald-100/45">{isOpen ? "접기" : "펼치기"}</span>
      </button>
      {isOpen ? <div className="border-t border-emerald-100/10 p-4 pt-3">{children}</div> : null}
    </div>
  );
}
