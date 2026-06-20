"use client";

import type { ReactNode } from "react";
import { GlitchedText } from "@/components/GlitchedText";
import { glitchConfigSignature, sliceGlitchConfigForSourceRange } from "@/lib/glitch-fields";
import { parseStoryMarkupSourceRanges, storyTextHasMarkup } from "@/lib/story-text";
import type { FieldGlitchConfig } from "@/lib/types";
import type { CharacterDetailSection } from "@/lib/zone-links";
import { cn } from "@/utils/cn";

interface StoryFormattedTextProps {
  text: string;
  className?: string;
  preserveWhitespace?: boolean;
  glitch?: FieldGlitchConfig;
  linkContext?: {
    section: CharacterDetailSection;
    characterId: string;
  };
  onZoneLinkClick?: (target: import("@/lib/types").ZoneLinkTarget) => void;
}

function renderStyledSegment(
  segment: ReturnType<typeof parseStoryMarkupSourceRanges>[number],
  key: number,
  children?: ReactNode,
) {
  const content = children ?? segment.text;

  switch (segment.type) {
    case "bold":
      return <strong key={key}>{content}</strong>;
    case "italic":
      return <em key={key}>{content}</em>;
    case "boldItalic":
      return (
        <strong key={key}>
          <em>{content}</em>
        </strong>
      );
    case "boldQuote":
      return (
        <strong key={key}>
          <span className="story-inline-quote">{content}</span>
        </strong>
      );
    case "quote":
      return (
        <span key={key} className="story-inline-quote">
          {content}
        </span>
      );
    default:
      return <span key={key}>{content}</span>;
  }
}

export function StoryFormattedText({
  text,
  className,
  preserveWhitespace = false,
  glitch,
  linkContext,
  onZoneLinkClick,
}: StoryFormattedTextProps) {
  const hasGlitch = Boolean(glitch && glitchConfigSignature(text, glitch));
  const segments = parseStoryMarkupSourceRanges(text);

  if (hasGlitch && !storyTextHasMarkup(text)) {
    return (
      <GlitchedText
        text={text}
        glitch={glitch}
        className={cn(className, preserveWhitespace && "whitespace-pre-line")}
        preserveWhitespace={preserveWhitespace}
        linkContext={linkContext}
        onZoneLinkClick={onZoneLinkClick}
      />
    );
  }

  return (
    <span
      className={cn(className, preserveWhitespace && "whitespace-pre-line")}
      data-text-corruptor-ignore
    >
      {segments.map((segment, index) => {
        const segmentGlitch =
          hasGlitch && glitch
            ? sliceGlitchConfigForSourceRange(
                text,
                glitch,
                segment.sourceStart,
                segment.sourceEnd,
                segment.text,
              )
            : undefined;
        const segmentHasGlitch = Boolean(segmentGlitch && glitchConfigSignature(segment.text, segmentGlitch));

        if (segmentHasGlitch && segmentGlitch) {
          const glitched = (
            <GlitchedText
              text={segment.text}
              glitch={segmentGlitch}
              preserveWhitespace
              linkContext={linkContext}
              onZoneLinkClick={onZoneLinkClick}
            />
          );

          if (segment.type === "plain") {
            return <span key={index}>{glitched}</span>;
          }

          return renderStyledSegment(segment, index, glitched);
        }

        return renderStyledSegment(segment, index);
      })}
    </span>
  );
}
