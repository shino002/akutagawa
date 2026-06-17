"use client";

import type { KeyboardEvent, MouseEvent, SyntheticEvent } from "react";
import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { glitchConfigSignature } from "@/lib/glitch-fields";
import type { FieldGlitchConfig } from "@/lib/types";
import { cn } from "@/utils/cn";

type GlitchFieldBindings = {
  "data-glitch-field": string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onMouseUp?: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

interface AdminGlitchTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  glitch?: FieldGlitchConfig;
  glitchBindings: GlitchFieldBindings;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
  storyPreview?: boolean;
  previewLabel?: string;
}

export function AdminGlitchTextField({
  value,
  onChange,
  glitch,
  glitchBindings,
  placeholder,
  className,
  minHeightClass = "min-h-24",
  storyPreview = false,
  previewLabel = "본 페이지 미리보기",
}: AdminGlitchTextFieldProps) {
  const hasGlitch = Boolean(glitch && glitchConfigSignature(value, glitch));
  const showPreview = hasGlitch || value.trim().length > 0;

  return (
    <div className="admin-glitch-text-field grid gap-2">
      {showPreview && (
        <div className="admin-glitch-live-preview" data-text-corruptor-ignore>
          <p className="admin-glitch-live-preview-label">{previewLabel}</p>
          <div className="admin-glitch-live-preview-body">
            {storyPreview ? (
              <StoryFormattedText text={value} glitch={glitch} preserveWhitespace />
            ) : (
              <GlitchedText text={value} glitch={glitch} preserveWhitespace animate />
            )}
          </div>
        </div>
      )}

      <div className="grid gap-1">
        <p className="text-[11px] text-emerald-100/45">원문 편집 · 드래그로 구간 선택</p>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          {...glitchBindings}
          className={cn("auth-input", minHeightClass, className)}
          data-text-corruptor-ignore
        />
      </div>
    </div>
  );
}
