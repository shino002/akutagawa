import type { CSSProperties } from "react";
import type { FieldGlitchConfig, GlitchMarkdown, GlitchZoneStyle } from "@/lib/types";
import { fieldConfigHasScrambleAlternation } from "@/lib/glitch-scramble-options";

export const DEFAULT_GLITCH_TICK_MS = 800;
export const MIN_GLITCH_TICK_MS = 100;
export const MAX_GLITCH_TICK_MS = 10000;
export const GLITCH_TICK_PULSE_MS = 100;

export const GLITCH_STYLE_PRESETS: Record<string, GlitchZoneStyle> = {
  inherit: {},
  error: {
    markdown: { bold: true },
  },
  muted: {
    markdown: { italic: true },
  },
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function clampGlitchTickMs(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GLITCH_TICK_MS;
  }

  return Math.min(MAX_GLITCH_TICK_MS, Math.max(MIN_GLITCH_TICK_MS, Math.round(value)));
}

export function normalizeColorInput(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === "inherit" || trimmed === "currentColor" || trimmed.startsWith("rgba(")) {
    return trimmed;
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX_COLOR_PATTERN.test(withHash) ? withHash : undefined;
}

function normalizeMarkdown(value: unknown): GlitchMarkdown | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const markdown = value as GlitchMarkdown;
  const next: GlitchMarkdown = {};

  if (markdown.bold) next.bold = true;
  if (markdown.italic) next.italic = true;

  return Object.keys(next).length > 0 ? next : undefined;
}

const LEGACY_ERROR_TEXT_COLORS = new Set(["#fecdd3"]);

export function normalizeGlitchZoneStyle(value: unknown): GlitchZoneStyle | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as GlitchZoneStyle & { backgroundColor?: string };
  const next: GlitchZoneStyle = {};
  const textColor = normalizeColorInput(raw.textColor);
  const markdown = normalizeMarkdown(raw.markdown);
  const hadLegacyPaint = Boolean(raw.backgroundColor?.trim());
  const isLegacyErrorColor = Boolean(
    textColor && LEGACY_ERROR_TEXT_COLORS.has(textColor.toLowerCase()),
  );

  if (textColor && !hadLegacyPaint && !isLegacyErrorColor) {
    next.textColor = textColor;
  }

  if (markdown) {
    next.markdown = markdown;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function mergeGlitchZoneStyles(
  zoneStyle?: GlitchZoneStyle,
  defaultStyle?: GlitchZoneStyle,
): GlitchZoneStyle {
  const normalizedZone = normalizeGlitchZoneStyle(zoneStyle);
  const normalizedDefault = normalizeGlitchZoneStyle(defaultStyle);

  if (!normalizedZone && !normalizedDefault) {
    return {};
  }

  if (!normalizedZone) {
    return normalizedDefault ?? {};
  }

  if (!normalizedDefault) {
    return normalizedZone;
  }

  return {
    ...normalizedDefault,
    ...normalizedZone,
    markdown: {
      ...normalizedDefault.markdown,
      ...normalizedZone.markdown,
    },
  };
}

export function resolveGlitchZonePresentation(zoneStyle?: GlitchZoneStyle) {
  const normalized = normalizeGlitchZoneStyle(zoneStyle);
  const markdown = normalized?.markdown;

  const inlineStyle: CSSProperties = {
    backgroundColor: "transparent",
    background: "none",
    boxShadow: "none",
    textShadow: "none",
  };

  if (normalized?.textColor) {
    inlineStyle.color = normalized.textColor;
  }

  if (markdown?.bold) {
    inlineStyle.fontWeight = 700;
  }

  if (markdown?.italic) {
    inlineStyle.fontStyle = "italic";
  }

  return {
    merged: normalized ?? {},
    inlineStyle,
  };
}

export function glitchScramblePhase(pulse: number, tickMs?: number) {
  return Math.floor((pulse * GLITCH_TICK_PULSE_MS) / clampGlitchTickMs(tickMs));
}

/** @deprecated Use glitchScramblePhase */
export const glitchScrambleGeneration = glitchScramblePhase;

export function hasGlitchPresentation(style?: GlitchZoneStyle): boolean {
  const normalized = normalizeGlitchZoneStyle(style);
  if (!normalized) {
    return false;
  }

  const markdown = normalized.markdown;
  return Boolean(
    normalized.textColor ||
      markdown?.bold ||
      markdown?.italic,
  );
}

export function fieldGlitchHasPresentation(config?: Pick<FieldGlitchConfig, "zones" | "defaultStyle">) {
  if (!config?.zones?.length) {
    return false;
  }

  if (hasGlitchPresentation(config.defaultStyle)) {
    return true;
  }

  return config.zones.some((zone) => hasGlitchPresentation(zone.style));
}

export function fieldGlitchHasScramble(
  config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones">,
) {
  return fieldConfigHasScrambleAlternation(config);
}

export function isValidFieldGlitchConfig(
  config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones" | "defaultStyle">,
) {
  return fieldGlitchHasScramble(config) || fieldGlitchHasPresentation(config);
}
