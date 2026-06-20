"use client";

import type { GlitchZoneStyle } from "@/lib/types";
import type { ZoneLinkTarget } from "@/lib/types";
import { hasCombiningMarks, sanitizeErrorMessageText } from "@/lib/glitch-display";
import { glitchZoneHasCustomTextColor, resolveGlitchZonePresentation } from "@/lib/glitch-style";
import { cn } from "@/utils/cn";

interface GlitchZoneMarkProps {
  text: string;
  original: string;
  zoneStyle?: GlitchZoneStyle;
  className?: string;
  linkTarget?: ZoneLinkTarget;
  onLinkClick?: (target: ZoneLinkTarget) => void;
}

function decorationClassName(decoration: {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  linkUnderline: boolean;
  strikethrough: boolean;
}) {
  return cn(
    decoration.bold && "glitch-zone-has-bold",
    decoration.italic && "glitch-zone-has-italic",
    decoration.underline && "glitch-zone-has-underline",
    decoration.linkUnderline && "glitch-zone-has-link-underline",
    decoration.strikethrough && "glitch-zone-has-strikethrough",
  );
}

export function GlitchZoneMark({
  text,
  zoneStyle,
  className,
  linkTarget,
  onLinkClick,
  original,
}: GlitchZoneMarkProps) {
  const displayText = sanitizeErrorMessageText(text);
  const isChaos = hasCombiningMarks(displayText);
  const isLink = Boolean(linkTarget && onLinkClick);
  const { inlineStyle, decoration } = resolveGlitchZonePresentation(zoneStyle, {
    linkUnderline: isLink,
  });
  const markClassName = cn(
    "glitch-zone-mark",
    isChaos && "glitch-zone-chaos",
    zoneStyle?.storyQuote && "story-inline-quote",
    glitchZoneHasCustomTextColor(zoneStyle) && "glitch-zone-has-custom-color",
    decorationClassName(decoration),
    className,
  );

  if (isLink && linkTarget) {
    return (
      <button
        type="button"
        onClick={() => onLinkClick?.(linkTarget)}
        className={cn(
          markClassName,
          "glitch-zone-link inline border-0 bg-transparent p-0 text-left align-baseline",
          "relative z-[1] cursor-pointer",
        )}
        style={inlineStyle}
        title={`이동: ${original}`}
        data-text-corruptor-ignore
      >
        {displayText}
      </button>
    );
  }

  return (
    <span
      className={markClassName}
      style={inlineStyle}
      title={`원문: ${original}`}
      data-text-corruptor-ignore
    >
      {displayText}
    </span>
  );
}
