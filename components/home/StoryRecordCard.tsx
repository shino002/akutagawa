"use client";

import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { resolveStoryExcerpt } from "@/lib/story-text";
import type { FieldGlitchConfig, SettingSection } from "@/lib/types";
import { cn } from "@/utils/cn";

interface StoryRecordCardProps {
  section: SettingSection;
  index: number;
  onOpen: () => void;
  className?: string;
  excerptGlitch?: FieldGlitchConfig;
  titleGlitch?: FieldGlitchConfig;
}

/**
 * Record 목록의 스토리 파일 행. 클릭하면 로그 모달을 엽니다.
 */
export function StoryRecordCard({
  section,
  index,
  onOpen,
  className,
  excerptGlitch,
  titleGlitch,
}: StoryRecordCardProps) {
  const customExcerpt = section.excerpt?.trim();
  const excerpt = customExcerpt || resolveStoryExcerpt(section);
  const title = section.title?.trim() || `STORY ${String(index + 1).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("record-row record-row--file", className)}
      aria-label={`${title} 기록 열람`}
    >
      <span className="record-row-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="record-row-main">
        <span className="record-row-title whitespace-pre-line">
          {section.title ? (
            <GlitchedText text={section.title} glitch={titleGlitch} preserveWhitespace />
          ) : (
            title
          )}
        </span>
        {excerpt ? (
          <span className={cn("record-row-hint", customExcerpt && "record-row-hint--rich")}>
            <StoryFormattedText
              text={customExcerpt || excerpt}
              glitch={customExcerpt ? excerptGlitch : undefined}
            />
          </span>
        ) : null}
      </span>
      <span className="record-row-action" aria-hidden="true">
        →
      </span>
    </button>
  );
}
