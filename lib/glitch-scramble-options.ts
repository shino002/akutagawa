import type { FieldGlitchConfig, GlitchScrambleMode, GlitchZone } from "@/lib/types";

export function resolveEffectiveScrambleMode(
  wordPool: string,
  scrambleMode?: GlitchScrambleMode,
): GlitchScrambleMode | "builtinOnly" {
  if (!wordPool.trim()) {
    return "builtinOnly";
  }

  return scrambleMode ?? "referenceWithBuiltin";
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

export function normalizeScrambleMode(value: unknown): GlitchScrambleMode | undefined {
  return value === "referenceOnly" || value === "referenceWithBuiltin" ? value : undefined;
}

export function normalizeErrorMessageSource(value: unknown): GlitchZone["errorMessageSource"] | undefined {
  return value === "auto" || value === "custom" || value === "none" ? value : undefined;
}
