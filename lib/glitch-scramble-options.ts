import type { FieldGlitchConfig, GlitchErrorDisplayMode, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import { hasGlitchPresentation } from "@/lib/glitch-style";

export function resolveEffectiveScrambleMode(
  wordPool: string,
  scrambleMode?: GlitchScrambleMode,
): GlitchScrambleMode | "builtinOnly" {
  if (!wordPool.trim()) {
    return "builtinOnly";
  }

  return scrambleMode ?? "referenceOnly";
}

export function zoneUsesErrorAlternation(zone: GlitchZone, config: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">) {
  if (zone.errorMessageSource === "none") {
    return false;
  }

  if (zone.errorMessageSource === "custom") {
    return Boolean(zone.errorMessage?.trim());
  }

  const pool = config.wordPool?.trim() ?? "";
  if (pool) {
    return true;
  }

  return config.builtinScramble !== false;
}

export function fieldConfigHasScrambleAlternation(config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones">) {
  if (!config?.zones?.length) {
    return false;
  }

  return config.zones.some((zone) => zoneUsesErrorAlternation(zone, config));
}

/** 참조 단어·기본 오류가 켜져 있는데 구간만 none으로 남은 경우 자동 생성으로 복구 */
export function ensureZoneErrorAlternation(
  zones: GlitchZone[],
  config: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">,
): GlitchZone[] {
  const hasPool = Boolean(config.wordPool?.trim());
  const hasBuiltin = config.builtinScramble !== false;

  if (!hasPool && !hasBuiltin) {
    return zones;
  }

  return zones.map((zone) => {
    if (zone.errorMessageSource === "none") {
      return zone;
    }

    if (zone.errorMessageSource !== undefined) {
      return zone;
    }

    if (hasGlitchPresentation(zone.style) || zone.linkTarget || zone.linkSubPageId) {
      return zone;
    }

    return { ...zone, errorMessageSource: "auto" as const };
  });
}

export function normalizeScrambleMode(value: unknown): GlitchScrambleMode | undefined {
  return value === "referenceOnly" || value === "referenceWithBuiltin" ? value : undefined;
}

export function normalizeErrorMessageSource(value: unknown): GlitchZone["errorMessageSource"] | undefined {
  return value === "auto" || value === "custom" || value === "none" ? value : undefined;
}

export function normalizeErrorDisplayMode(value: unknown): GlitchErrorDisplayMode | undefined {
  return value === "alternate" || value === "randomOnly" ? value : undefined;
}
