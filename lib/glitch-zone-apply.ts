import {
  glitchZoneStylesEqual,
  hasGlitchPresentation,
  normalizeGlitchZoneStyle,
} from "@/lib/glitch-style";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { zonesOverlap, type GlitchZone } from "@/lib/text-scramble";
import type {
  FieldGlitchConfig,
  GlitchErrorMessageSource,
  GlitchMarkdown,
  GlitchZoneStyle,
} from "@/lib/types";
import { normalizeZoneLinkTarget } from "@/lib/zone-links";

export type ApplyGlitchZoneOptions = {
  style?: GlitchZoneStyle;
  errorMessageSource?: GlitchErrorMessageSource;
  errorMessage?: string;
  linkTarget?: import("@/lib/types").ZoneLinkTarget;
  wordPool?: string;
  builtinScramble?: boolean;
  fieldText?: string;
};

export type ApplyGlitchZoneResult =
  | { ok: true; config: FieldGlitchConfig; message: string }
  | { ok: false; message: string };

function createZoneId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildNextConfigFromZones(
  config: FieldGlitchConfig | undefined,
  nextZones: GlitchZone[],
  options: ApplyGlitchZoneOptions = {},
): FieldGlitchConfig {
  return {
    wordPool: config?.wordPool ?? "",
    zones: nextZones,
    ...(config?.scrambleMode ? { scrambleMode: config.scrambleMode } : {}),
    ...(config?.builtinScramble ? { builtinScramble: config.builtinScramble } : {}),
    ...(options.builtinScramble ? { builtinScramble: true } : {}),
    ...(config?.errorDisplayMode ? { errorDisplayMode: config.errorDisplayMode } : {}),
    ...(config?.builtinTokens ? { builtinTokens: config.builtinTokens } : {}),
    ...(config?.tickMs ? { tickMs: config.tickMs } : {}),
    ...(config?.defaultStyle ? { defaultStyle: config.defaultStyle } : {}),
  };
}

function buildZoneFragment(
  zone: GlitchZone,
  start: number,
  end: number,
  sourceText: string,
  overrides?: Partial<Pick<GlitchZone, "style" | "errorMessageSource" | "errorMessage" | "linkTarget">>,
): GlitchZone | null {
  const clampedStart = Math.max(zone.start, start);
  const clampedEnd = Math.min(zone.end, end);

  if (clampedStart >= clampedEnd) {
    return null;
  }

  const original = sourceText.slice(clampedStart, clampedEnd);
  if (!original) {
    return null;
  }

  return {
    ...zone,
    id: createZoneId(),
    start: clampedStart,
    end: clampedEnd,
    original,
    ...(overrides?.style !== undefined ? { style: overrides.style } : {}),
    ...(overrides?.errorMessageSource !== undefined
      ? { errorMessageSource: overrides.errorMessageSource }
      : {}),
    ...(overrides?.errorMessage !== undefined ? { errorMessage: overrides.errorMessage } : {}),
    ...(overrides?.linkTarget !== undefined ? { linkTarget: overrides.linkTarget } : {}),
  };
}

function splitZonesForSelection(
  zones: GlitchZone[],
  selection: GlitchTextSelection,
  sourceText: string,
  nextSelectionZone: GlitchZone,
): GlitchZone[] {
  const untouched = zones.filter((zone) => !zonesOverlap(zone, selection));
  const fragments: GlitchZone[] = [];

  for (const zone of zones) {
    if (!zonesOverlap(zone, selection)) {
      continue;
    }

    const before = buildZoneFragment(zone, zone.start, selection.start, sourceText);
    if (before) {
      fragments.push(before);
    }

    const after = buildZoneFragment(zone, selection.end, zone.end, sourceText);
    if (after) {
      fragments.push(after);
    }
  }

  return [...untouched, ...fragments, nextSelectionZone].sort((left, right) => left.start - right.start);
}

function findMatchingZone(zones: GlitchZone[], selection: GlitchTextSelection, sourceText: string) {
  return zones.find((zone) => {
    if (zone.start !== selection.start || zone.end !== selection.end) {
      return false;
    }

    if (zone.original === selection.text) {
      return true;
    }

    return sourceText.slice(zone.start, zone.end) === selection.text;
  });
}

export function applyGlitchZone(
  config: FieldGlitchConfig | undefined,
  selection: GlitchTextSelection,
  options: ApplyGlitchZoneOptions = {},
): ApplyGlitchZoneResult {
  const zones = config?.zones ?? [];
  const sourceText = options.fieldText ?? selection.text;
  const normalizedStyle = normalizeGlitchZoneStyle(options.style);
  const pool = (options.wordPool ?? config?.wordPool ?? "").trim();
  const builtinScramble = options.builtinScramble ?? config?.builtinScramble === true;
  const wantsReference = Boolean(pool);
  const wantsBuiltin = !pool && builtinScramble;
  const hasPresentation = hasGlitchPresentation(normalizedStyle);
  const hasLink = Boolean(normalizeZoneLinkTarget(options.linkTarget));
  const requestedErrorSource = options.errorMessageSource;
  const enableBuiltin = options.builtinScramble === true;
  const effectiveBuiltin = enableBuiltin || builtinScramble;
  const explicitNoError = requestedErrorSource === "none";
  const wantsError =
    requestedErrorSource === "auto" ||
    requestedErrorSource === "custom" ||
    (!explicitNoError && (wantsReference || effectiveBuiltin));

  const matchingZone = findMatchingZone(zones, selection, sourceText);

  if (!hasPresentation && !hasLink && !wantsError) {
    if (matchingZone) {
      const nextZones = zones.filter((zone) => zone.id !== matchingZone.id);
      return {
        ok: true,
        config: buildNextConfigFromZones(config, nextZones, options),
        message: `${selection.start + 1}~${selection.end}번째 글자의 서식을 해제했어요.`,
      };
    }

    const overlapping = zones.filter((zone) => zonesOverlap(zone, selection));
    if (overlapping.length > 0) {
      const clearedZone: GlitchZone = {
        id: createZoneId(),
        start: selection.start,
        end: selection.end,
        original: selection.text,
        errorMessageSource: "none",
      };
      const nextZones = splitZonesForSelection(zones, selection, sourceText, clearedZone).filter(
        (zone) =>
          !(
            zone.start === selection.start &&
            zone.end === selection.end &&
            zone.original === selection.text &&
            !hasGlitchPresentation(zone.style) &&
            zone.errorMessageSource === "none" &&
            !zone.linkTarget &&
            !zone.linkSubPageId
          ),
      );

      return {
        ok: true,
        config: buildNextConfigFromZones(config, nextZones, options),
        message: `${selection.start + 1}~${selection.end}번째 글자의 서식을 해제했어요.`,
      };
    }

    return {
      ok: false,
      message: "적용할 서식이 없습니다.",
    };
  }

  const errorMessageSource =
    requestedErrorSource ??
    (wantsReference || effectiveBuiltin ? ("auto" as const) : ("none" as const));
  const customMessage =
    errorMessageSource === "custom" ? options.errorMessage?.trim() : undefined;
  const linkTarget = normalizeZoneLinkTarget(options.linkTarget);

  let nextZones: GlitchZone[];

  if (matchingZone) {
    nextZones = zones.map((zone) =>
      zone.id === matchingZone.id
        ? {
            ...zone,
            ...(normalizedStyle ? { style: normalizedStyle } : {}),
            errorMessageSource,
            ...(customMessage ? { errorMessage: customMessage } : { errorMessage: undefined }),
            ...(linkTarget
              ? { linkTarget, linkSubPageId: undefined }
              : { linkTarget: undefined, linkSubPageId: undefined }),
          }
        : zone,
    );

    if (!normalizedStyle) {
      nextZones = nextZones.map((zone) => {
        if (zone.id !== matchingZone.id) {
          return zone;
        }

        const { style: _removed, ...rest } = zone;
        return rest;
      });
    }
  } else {
    const nextZone: GlitchZone = {
      id: createZoneId(),
      start: selection.start,
      end: selection.end,
      original: selection.text,
      style: normalizedStyle,
      errorMessageSource,
      ...(customMessage ? { errorMessage: customMessage } : {}),
      ...(linkTarget ? { linkTarget } : {}),
    };

    const overlaps = zones.some((zone) => zonesOverlap(zone, selection));
    if (overlaps) {
      nextZones = splitZonesForSelection(zones, selection, sourceText, nextZone);
    } else {
      nextZones = [...zones, nextZone].sort((left, right) => left.start - right.start);
    }
  }

  const nextConfig = buildNextConfigFromZones(config, nextZones, options);

  const message =
    wantsReference || wantsBuiltin || errorMessageSource === "custom" || errorMessageSource === "auto"
      ? `${selection.start + 1}~${selection.end}번째 글자에 오류를 적용했어요.`
      : hasLink
        ? `${selection.start + 1}~${selection.end}번째 글자에 페이지 이동을 연결했어요.`
        : `${selection.start + 1}~${selection.end}번째 글자에 서식을 적용했어요.`;

  return { ok: true, config: nextConfig, message };
}

export function buildQuickMarkdownStyle(
  current: GlitchZoneStyle | undefined,
  key: keyof GlitchMarkdown,
  enabled = true,
): GlitchZoneStyle {
  const markdown = { ...(current?.markdown ?? {}), [key]: enabled };

  if (!enabled) {
    delete markdown[key];
  }

  const next: GlitchZoneStyle = {
    ...current,
    markdown: Object.fromEntries(Object.entries(markdown).filter(([, value]) => Boolean(value))),
  };

  if (Object.keys(next.markdown ?? {}).length === 0) {
    delete next.markdown;
  }

  return normalizeGlitchZoneStyle(next) ?? {};
}

export function buildQuickTextColorStyle(
  current: GlitchZoneStyle | undefined,
  color: string | null | undefined,
): GlitchZoneStyle {
  const next: GlitchZoneStyle = { ...(current ?? {}) };

  if (!color?.trim()) {
    delete next.textColor;
    return normalizeGlitchZoneStyle(next) ?? {};
  }

  next.textColor = color.trim();
  return normalizeGlitchZoneStyle(next) ?? {};
}

export function resolveAnchoredSelection(
  selection: import("@/lib/glitch-selection").GlitchTextSelection,
  fieldValue: string,
) {
  const slice = fieldValue.slice(selection.start, selection.end);
  const text = slice || selection.text;

  if (!text) {
    return null;
  }

  if (slice && slice !== selection.text) {
    const nearby = fieldValue.indexOf(selection.text, Math.max(0, selection.start - selection.text.length));
    if (nearby !== -1 && nearby + selection.text.length <= fieldValue.length) {
      return {
        start: nearby,
        end: nearby + selection.text.length,
        text: selection.text,
      };
    }
  }

  return {
    start: selection.start,
    end: selection.start + text.length,
    text,
  };
}

export function stylesEqual(left?: GlitchZoneStyle, right?: GlitchZoneStyle) {
  return glitchZoneStylesEqual(left, right);
}
