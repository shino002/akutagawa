"use client";

import { GlitchedText } from "@/components/GlitchedText";
import { glitchConfigSignature } from "@/lib/glitch-fields";
import { parseStoryMarkup } from "@/lib/story-text";
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
  segment: ReturnType<typeof parseStoryMarkup>[number],
  key: number,
) {
  switch (segment.type) {
    case "bold":
      return <strong key={key}>{segment.text}</strong>;
    case "italic":
      return <em key={key}>{segment.text}</em>;
    case "boldItalic":
      return (
        <strong key={key}>
          <em>{segment.text}</em>
        </strong>
      );
    case "boldQuote":
      return (
        <strong key={key}>
          <span className="story-inline-quote">{segment.text}</span>
        </strong>
      );
    case "quote":
      return (
        <span key={key} className="story-inline-quote">
          {segment.text}
        </span>
      );
    default:
      return <span key={key}>{segment.text}</span>;
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
  const segments = parseStoryMarkup(text);
  const hasGlitch = Boolean(glitch && glitchConfigSignature(text, glitch));

  return (
    <span
      className={cn(className, preserveWhitespace && "whitespace-pre-line")}
      data-text-corruptor-ignore
    >
      {segments.map((segment, index) => {
        if (hasGlitch && segment.type === "plain") {
          return (
            <GlitchedText
              key={index}
              text={segment.text}
              glitch={glitch}
              preserveWhitespace
              linkContext={linkContext}
              onZoneLinkClick={onZoneLinkClick}
            />
          );
        }

        return renderStyledSegment(segment, index);
      })}
    </span>
  );
}
