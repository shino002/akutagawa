import { sanitizePlainText } from "@/lib/glitch-display";
import type {
  FieldGlitchConfig,
  GlitchErrorDisplayMode,
  GlitchScrambleMode,
  GlitchZone,
} from "@/lib/types";

/**
 * 구간에 저장된 값을 우선하고, 없으면 필드(레거시) 기본값을 씁니다.
 */
export function resolveZoneScrambleOptions(
  zone: GlitchZone,
  fieldConfig: Pick<
    FieldGlitchConfig,
    | "wordPool"
    | "scrambleMode"
    | "builtinScramble"
    | "builtinTokens"
    | "errorDisplayMode"
    | "tickMs"
  >,
) {
  const zonePool = typeof zone.wordPool === "string" ? sanitizePlainText(zone.wordPool.trim()) : "";
  const fieldPool =
    typeof fieldConfig.wordPool === "string" ? sanitizePlainText(fieldConfig.wordPool.trim()) : "";
  const wordPool = zonePool || fieldPool;
  const scrambleMode = zone.scrambleMode ?? fieldConfig.scrambleMode;
  const builtinScramble = zone.builtinScramble ?? fieldConfig.builtinScramble;
  const builtinTokens = zone.builtinTokens ?? fieldConfig.builtinTokens;
  const errorDisplayMode = zone.errorDisplayMode ?? fieldConfig.errorDisplayMode;
  const tickMs = zone.tickMs ?? fieldConfig.tickMs;

  return {
    wordPool,
    scrambleMode,
    builtinScramble,
    builtinTokens,
    errorDisplayMode,
    tickMs,
  };
}

export function zoneHasScrambleSource(
  zone: GlitchZone,
  fieldConfig?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">,
) {
  const options = resolveZoneScrambleOptions(zone, {
    wordPool: fieldConfig?.wordPool ?? "",
    builtinScramble: fieldConfig?.builtinScramble,
  });

  return Boolean(options.wordPool.trim()) || options.builtinScramble === true;
}

export function resolveEffectiveScrambleMode(
  wordPool: string,
  scrambleMode?: GlitchScrambleMode,
): GlitchScrambleMode | "builtinOnly" {
  if (!wordPool.trim()) {
    return "builtinOnly";
  }

  return scrambleMode ?? "referenceOnly";
}

/**
 * 구간에 저장된 errorMessageSource를 우선하고, 레거시 필드/구간 scramble 설정은 auto로 승격합니다.
 */
export function resolveZoneErrorMessageSource(
  zone: GlitchZone,
  config: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">,
): "none" | "auto" | "custom" {
  const explicitSource = normalizeErrorMessageSource(zone.errorMessageSource);
  const customMessage = zone.errorMessage?.trim();

  if (explicitSource === "none") {
    return "none";
  }

  if (explicitSource === "custom") {
    return "custom";
  }

  if (explicitSource === "auto") {
    return "auto";
  }

  if (customMessage) {
    return "custom";
  }

  if (zoneHasScrambleSource(zone, config)) {
    return "auto";
  }

  return "none";
}

export function zoneUsesErrorAlternation(
  zone: GlitchZone,
  config: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">,
) {
  const source = resolveZoneErrorMessageSource(zone, config);

  if (source === "none") {
    return false;
  }

  if (source === "custom") {
    return Boolean(zone.errorMessage?.trim());
  }

  // auto: 참조 단어·필드 기본 오류가 없어도 ERR/NULL 등 내장 토큰으로 번갈아 표시
  return true;
}

export function fieldConfigHasScrambleAlternation(
  config?: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble" | "zones">,
) {
  if (!config?.zones?.length) {
    return false;
  }

  return config.zones.some((zone) => zoneUsesErrorAlternation(zone, config));
}

/** 구간별 errorMessageSource를 명시적으로 맞춥니다. 서식만 있는 구간은 none으로 유지합니다. */
export function ensureZoneErrorAlternation(
  zones: GlitchZone[],
  _config: Pick<FieldGlitchConfig, "wordPool" | "builtinScramble">,
): GlitchZone[] {
  return zones.map((zone) => {
    const explicit = normalizeErrorMessageSource(zone.errorMessageSource);

    if (explicit === "none") {
      return zone;
    }

    if (explicit === "custom") {
      return zone;
    }

    if (explicit === "auto") {
      return zone;
    }

    return { ...zone, errorMessageSource: "none" as const };
  });
}

export function normalizeScrambleMode(value: unknown): GlitchScrambleMode | undefined {
  return value === "referenceOnly" || value === "referenceWithBuiltin" ? value : undefined;
}

export function normalizeErrorMessageSource(
  value: unknown,
): GlitchZone["errorMessageSource"] | undefined {
  return value === "auto" || value === "custom" || value === "none" ? value : undefined;
}

export function normalizeErrorDisplayMode(value: unknown): GlitchErrorDisplayMode | undefined {
  return value === "alternate" || value === "randomOnly" ? value : undefined;
}
