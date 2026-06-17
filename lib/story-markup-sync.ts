import type { FieldGlitchConfig, GlitchZone, GlitchZoneStyle } from "@/lib/types";
import { reanchorZone } from "@/lib/glitch-fields";
import { zonesOverlap } from "@/lib/text-scramble";
import {
  parseStoryMarkupRanges,
  stripStoryMarkupPreserveLayout,
  storyTextHasMarkup,
  type StoryTextSegment,
} from "@/lib/story-text";

const STORY_QUOTE_COLOR = "rgba(255, 196, 196, 0.96)";

function createZoneId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function storySegmentToZoneStyle(type: StoryTextSegment["type"]): GlitchZoneStyle | undefined {
  switch (type) {
    case "bold":
      return { markdown: { bold: true } };
    case "italic":
      return { markdown: { italic: true } };
    case "boldItalic":
      return { markdown: { bold: true, italic: true } };
    case "quote":
      return { storyQuote: true, textColor: STORY_QUOTE_COLOR };
    case "boldQuote":
      return { storyQuote: true, textColor: STORY_QUOTE_COLOR, markdown: { bold: true } };
    default:
      return undefined;
  }
}

function buildMarkupZones(ranges: ReturnType<typeof parseStoryMarkupRanges>): GlitchZone[] {
  const zones: GlitchZone[] = [];

  for (const range of ranges) {
    if (range.type === "plain" || !range.text) {
      continue;
    }

    const style = storySegmentToZoneStyle(range.type);
    if (!style) {
      continue;
    }

    zones.push({
      id: createZoneId(),
      start: range.strippedStart,
      end: range.strippedEnd,
      original: range.text,
      style,
      errorMessageSource: "none",
    });
  }

  return zones;
}

function mergeMarkupZonesWithManualZones(
  strippedText: string,
  markupZones: GlitchZone[],
  existingZones: GlitchZone[] = [],
): GlitchZone[] {
  const manualZones = existingZones
    .map((zone) => reanchorZone(strippedText, zone))
    .filter((zone): zone is GlitchZone => zone !== null)
    .filter((zone) => !markupZones.some((markupZone) => zonesOverlap(markupZone, zone)));

  return [...markupZones, ...manualZones].sort((left, right) => left.start - right.start);
}

function wrapZoneAsStoryMarkup(text: string, style: GlitchZoneStyle): string {
  const bold = style.markdown?.bold;
  const italic = style.markdown?.italic;
  const quote = style.storyQuote;

  if (bold && italic) {
    return `***${text}***`;
  }

  if (bold && quote) {
    return `**$${text}$**`;
  }

  if (bold) {
    return `**${text}**`;
  }

  if (italic) {
    return `*${text}*`;
  }

  if (quote) {
    return `$${text}$`;
  }

  return text;
}

function isStoryMarkupDerivedZone(zone: GlitchZone): boolean {
  const style = zone.style;
  if (!style) {
    return false;
  }

  if (style.storyQuote) {
    return true;
  }

  const markdown = style.markdown;
  if (!markdown) {
    return false;
  }

  if (markdown.underline || markdown.strikethrough) {
    return false;
  }

  if (style.textColor) {
    return false;
  }

  return Boolean(markdown.bold || markdown.italic);
}

export function reconstructStoryMarkupSource(text: string, glitch?: FieldGlitchConfig): string {
  if (!text || storyTextHasMarkup(text)) {
    return text;
  }

  const zones = (glitch?.zones ?? [])
    .filter(isStoryMarkupDerivedZone)
    .sort((left, right) => right.start - left.start);

  if (zones.length === 0) {
    return text;
  }

  let result = text;

  for (const zone of zones) {
    const start = Math.max(0, Math.min(zone.start, result.length));
    const end = Math.max(start, Math.min(zone.end, result.length));

    if (end <= start || !zone.style) {
      continue;
    }

    const inner = result.slice(start, end);
    const wrapped = wrapZoneAsStoryMarkup(inner, zone.style);
    result = `${result.slice(0, start)}${wrapped}${result.slice(end)}`;
  }

  return result;
}

export function syncStoryMarkupToGlitch(
  text: string,
  glitch?: FieldGlitchConfig,
): { text: string; glitch?: FieldGlitchConfig; changed: boolean } {
  if (!storyTextHasMarkup(text)) {
    return { text, glitch, changed: false };
  }

  const stripped = stripStoryMarkupPreserveLayout(text);
  const ranges = parseStoryMarkupRanges(text);
  const markupZones = buildMarkupZones(ranges);

  if (markupZones.length === 0) {
    return { text: stripped, glitch, changed: stripped !== text };
  }

  const nextGlitch: FieldGlitchConfig = {
    wordPool: glitch?.wordPool ?? "",
    zones: mergeMarkupZonesWithManualZones(stripped, markupZones, glitch?.zones ?? []),
    ...(glitch?.scrambleMode ? { scrambleMode: glitch.scrambleMode } : {}),
    ...(glitch?.builtinScramble ? { builtinScramble: glitch.builtinScramble } : {}),
    ...(glitch?.errorDisplayMode ? { errorDisplayMode: glitch.errorDisplayMode } : {}),
    ...(glitch?.builtinTokens ? { builtinTokens: glitch.builtinTokens } : {}),
    ...(glitch?.tickMs ? { tickMs: glitch.tickMs } : {}),
    ...(glitch?.defaultStyle ? { defaultStyle: glitch.defaultStyle } : {}),
  };

  return {
    text: stripped,
    glitch: nextGlitch,
    changed: true,
  };
}
