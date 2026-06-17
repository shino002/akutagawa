"use client";

import type { GlitchZoneStyle } from "@/lib/types";
import type { ZoneLinkTarget } from "@/lib/types";
import { resolveGlitchZonePresentation } from "@/lib/glitch-style";
import { cn } from "@/utils/cn";

interface GlitchZoneMarkProps {
  text: string;
  original: string;
  zoneStyle?: GlitchZoneStyle;
  className?: string;
  linkTarget?: ZoneLinkTarget;
  onLinkClick?: (target: ZoneLinkTarget) => void;
}

function decorationClassName(
  decoration: { underline: boolean; linkUnderline: boolean; strikethrough: boolean },
) {
  return cn(
    decoration.underline && "glitch-zone-has-underline",
    decoration.linkUnderline && "glitch-zone-has-link-underline",
    decoration.strikethrough && "glitch-zone-has-strikethrough",
  );
}

export function GlitchZoneMark({
  text,
  original,
  zoneStyle,
  className,
  linkTarget,
  onLinkClick,
}: GlitchZoneMarkProps) {
  const isLink = Boolean(linkTarget && onLinkClick);
  const { inlineStyle, decoration } = resolveGlitchZonePresentation(zoneStyle, {
    linkUnderline: isLink,
  });
  const markClassName = cn(
    "glitch-zone-mark",
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
      >
        {text}
      </button>
    );
  }

  return (
    <span className={markClassName} style={inlineStyle} title={`원문: ${original}`}>
      {text}
    </span>
  );
}
