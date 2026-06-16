import type { GlitchZoneStyle } from "@/lib/types";
import { resolveGlitchZonePresentation } from "@/lib/glitch-style";
import { cn } from "@/utils/cn";

interface GlitchZoneMarkProps {
  text: string;
  original: string;
  zoneStyle?: GlitchZoneStyle;
  className?: string;
}

export function GlitchZoneMark({
  text,
  original,
  zoneStyle,
  className,
}: GlitchZoneMarkProps) {
  const { inlineStyle } = resolveGlitchZonePresentation(zoneStyle);

  return (
    <span
      className={cn("glitch-zone-mark", className)}
      style={inlineStyle}
      title={`원문: ${original}`}
    >
      {text}
    </span>
  );
}
