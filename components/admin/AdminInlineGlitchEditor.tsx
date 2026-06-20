"use client";

import type { FieldGlitchConfig } from "@/lib/types";
import { cn } from "@/utils/cn";

export type GlitchFieldBindings = {
  "data-glitch-field": string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
  onKeyUp?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
  onMouseUp?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
};

interface AdminInlineGlitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  glitch?: FieldGlitchConfig;
  onGlitchChange?: (config: FieldGlitchConfig | undefined) => void;
  glitchBindings: GlitchFieldBindings;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
}

export function AdminInlineGlitchEditor({
  value,
  onChange,
  glitchBindings,
  placeholder,
  className,
  minHeightClass = "min-h-24",
}: AdminInlineGlitchEditorProps) {
  return (
    <div className="admin-inline-glitch-editor">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...glitchBindings}
        className={cn("admin-inline-glitch-editor-body auth-input", minHeightClass, className)}
        data-text-corruptor-ignore
        data-admin-interactive
      />
    </div>
  );
}
