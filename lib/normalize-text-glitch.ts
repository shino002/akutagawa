import type { FieldGlitchConfig, GlitchZone } from "@/lib/types";
import { normalizeZoneLinkTarget } from "@/lib/zone-links";
import {
  normalizeErrorMessageSource,
  normalizeErrorDisplayMode,
  normalizeScrambleMode,
  ensureZoneErrorAlternation,
} from "@/lib/glitch-scramble-options";
import { normalizeBuiltinTokens } from "@/lib/text-scramble";
import { sanitizeErrorMessageText, sanitizePlainText } from "@/lib/glitch-display";
import {
  clampGlitchTickMs,
  isValidFieldGlitchConfig,
  normalizeGlitchZoneStyle,
} from "@/lib/glitch-style";

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
  ) as T;
}

function normalizeZone(zone: GlitchZone, fieldWordPool: string): GlitchZone {
  const style = normalizeGlitchZoneStyle(zone.style);
  const errorMessage =
    typeof zone.errorMessage === "string" ? sanitizeErrorMessageText(zone.errorMessage.trim()) : "";
  const explicitSource = normalizeErrorMessageSource(zone.errorMessageSource);
  const linkTarget = normalizeZoneLinkTarget(zone.linkTarget);
  const legacyLinkSubPageId =
    typeof zone.linkSubPageId === "string" && zone.linkSubPageId.trim()
      ? zone.linkSubPageId.trim()
      : undefined;
  const errorMessageSource = explicitSource ?? (errorMessage ? "custom" : "none");
  const zoneWordPool =
    typeof zone.wordPool === "string" ? sanitizePlainText(zone.wordPool.trim()) : "";
  const scrambleMode = zoneWordPool
    ? (normalizeScrambleMode(zone.scrambleMode) ?? "referenceOnly")
    : undefined;
  const builtinScramble = !zoneWordPool && zone.builtinScramble === true ? true : undefined;
  const builtinTokens = normalizeBuiltinTokens(zone.builtinTokens);
  const errorDisplayMode = normalizeErrorDisplayMode(zone.errorDisplayMode);

  const next: GlitchZone = {
    id: zone.id,
    start: zone.start,
    end: zone.end,
    original: zone.original,
    errorMessageSource,
  };

  if (linkTarget) {
    next.linkTarget = linkTarget;
  } else if (legacyLinkSubPageId) {
    next.linkSubPageId = legacyLinkSubPageId;
  }

  if (style) {
    next.style = style;
  }

  if (errorMessageSource === "custom" && errorMessage) {
    next.errorMessage = errorMessage;
  }

  if (zoneWordPool) {
    next.wordPool = zoneWordPool;
    if (scrambleMode) {
      next.scrambleMode = scrambleMode;
    }
  } else if (builtinScramble) {
    next.builtinScramble = true;
  } else if (!zoneWordPool && fieldWordPool.trim() && errorMessageSource === "auto") {
    // 레거시: 필드 공통 참조 단어만 있던 구간
  }

  if (builtinTokens) {
    next.builtinTokens = builtinTokens;
  }

  if (errorDisplayMode === "randomOnly") {
    next.errorDisplayMode = errorDisplayMode;
  }

  if (zone.tickMs !== undefined) {
    next.tickMs = clampGlitchTickMs(zone.tickMs);
  }

  return next;
}

function isGlitchZone(value: unknown): value is GlitchZone {
  if (!value || typeof value !== "object") {
    return false;
  }

  const zone = value as Partial<GlitchZone>;
  return (
    typeof zone.id === "string" &&
    typeof zone.start === "number" &&
    typeof zone.end === "number" &&
    typeof zone.original === "string"
  );
}

export function normalizeFieldGlitchConfig(config: unknown): FieldGlitchConfig | undefined {
  if (!config || typeof config !== "object") {
    return undefined;
  }

  const source = config as FieldGlitchConfig;
  const wordPool =
    typeof source.wordPool === "string" ? sanitizePlainText(source.wordPool.trim()) : "";
  const zones = Array.isArray(source.zones)
    ? ensureZoneErrorAlternation(
        source.zones.filter(isGlitchZone).map((zone) => normalizeZone(zone, wordPool)),
        { wordPool, builtinScramble: source.builtinScramble === true },
      )
    : [];
  const scrambleMode = wordPool
    ? (normalizeScrambleMode(source.scrambleMode) ?? "referenceOnly")
    : undefined;
  const builtinScramble = source.builtinScramble === true;
  const errorDisplayMode = normalizeErrorDisplayMode(source.errorDisplayMode);
  const builtinTokens = normalizeBuiltinTokens(source.builtinTokens);

  if (zones.length === 0) {
    return undefined;
  }

  const defaultStyle = normalizeGlitchZoneStyle(source.defaultStyle);
  const candidate: FieldGlitchConfig = {
    wordPool,
    zones,
    ...(builtinScramble ? { builtinScramble: true } : {}),
    defaultStyle,
    ...(errorDisplayMode === "randomOnly" ? { errorDisplayMode } : {}),
    ...(builtinTokens ? { builtinTokens } : {}),
    ...(scrambleMode ? { scrambleMode } : {}),
  };

  if (!isValidFieldGlitchConfig(candidate)) {
    return undefined;
  }

  const next: FieldGlitchConfig = {
    wordPool,
    zones,
    ...(builtinScramble ? { builtinScramble: true } : {}),
  };

  if (errorDisplayMode === "randomOnly") {
    next.errorDisplayMode = "randomOnly";
  }

  if (scrambleMode) {
    next.scrambleMode = scrambleMode;
  }

  if (builtinTokens) {
    next.builtinTokens = builtinTokens;
  }

  if (source.tickMs !== undefined) {
    next.tickMs = clampGlitchTickMs(source.tickMs);
  }

  if (defaultStyle) {
    next.defaultStyle = defaultStyle;
  }

  return next;
}

export function normalizeTextGlitch(raw: unknown): Record<string, FieldGlitchConfig> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: Record<string, FieldGlitchConfig> = {};

  for (const [path, config] of Object.entries(raw as Record<string, unknown>)) {
    const normalized = normalizeFieldGlitchConfig(config);
    if (normalized) {
      next[path] = normalized;
    }
  }

  return next;
}

export function sanitizeTextGlitchForFirestore(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
): Record<string, FieldGlitchConfig> | undefined {
  if (!textGlitch) {
    return undefined;
  }

  const next = normalizeTextGlitch(textGlitch);
  return Object.keys(next).length > 0 ? stripUndefinedDeep(next) : undefined;
}
