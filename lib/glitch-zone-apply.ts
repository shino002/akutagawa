import {
  glitchZoneStylesEqual,
  hasGlitchPresentation,
  mergeGlitchZoneStyles,
  normalizeGlitchZoneStyle,
  clampGlitchTickMs,
} from "@/lib/glitch-style";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { zonesOverlap, type GlitchZone } from "@/lib/text-scramble";
import type {
  FieldGlitchConfig,
  GlitchErrorDisplayMode,
  GlitchErrorMessageSource,
  GlitchMarkdown,
  GlitchScrambleMode,
  GlitchZoneStyle,
} from "@/lib/types";
import { normalizeZoneLinkTarget } from "@/lib/zone-links";

export type ApplyGlitchZoneOptions = {
  style?: GlitchZoneStyle;
  errorMessageSource?: GlitchErrorMessageSource;
  errorMessage?: string;
  linkTarget?: import("@/lib/types").ZoneLinkTarget;
  wordPool?: string;
  scrambleMode?: import("@/lib/types").GlitchScrambleMode;
  builtinScramble?: boolean;
  builtinTokens?: string[];
  errorDisplayMode?: import("@/lib/types").GlitchErrorDisplayMode;
  tickMs?: number;
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

function applyZoneScrambleOptions(zone: GlitchZone, options: ApplyGlitchZoneOptions): GlitchZone {
  const pool = options.wordPool?.trim() ?? "";
  const next: GlitchZone = { ...zone };

  if (pool) {
    next.wordPool = pool;
    if (options.scrambleMode) {
      next.scrambleMode = options.scrambleMode;
    } else {
      delete next.scrambleMode;
    }
    delete next.builtinScramble;
  } else if (options.builtinScramble) {
    next.builtinScramble = true;
    delete next.wordPool;
    delete next.scrambleMode;
  } else {
    delete next.wordPool;
    delete next.scrambleMode;
    delete next.builtinScramble;
  }

  if (options.builtinTokens?.length) {
    next.builtinTokens = options.builtinTokens;
  } else {
    delete next.builtinTokens;
  }

  if (options.errorDisplayMode === "randomOnly") {
    next.errorDisplayMode = "randomOnly";
  } else {
    delete next.errorDisplayMode;
  }

  const usesError = next.errorMessageSource === "auto" || next.errorMessageSource === "custom";
  if (usesError && options.tickMs !== undefined) {
    next.tickMs = clampGlitchTickMs(options.tickMs);
  } else {
    delete next.tickMs;
  }

  return next;
}

function copyZoneScrambleFields(target: GlitchZone, source: GlitchZone): GlitchZone {
  const next: GlitchZone = { ...target };

  if (source.wordPool !== undefined) {
    next.wordPool = source.wordPool;
  } else {
    delete next.wordPool;
  }

  if (source.scrambleMode !== undefined) {
    next.scrambleMode = source.scrambleMode;
  } else {
    delete next.scrambleMode;
  }

  if (source.builtinScramble !== undefined) {
    next.builtinScramble = source.builtinScramble;
  } else {
    delete next.builtinScramble;
  }

  if (source.builtinTokens !== undefined) {
    next.builtinTokens = source.builtinTokens;
  } else {
    delete next.builtinTokens;
  }

  if (source.errorDisplayMode !== undefined) {
    next.errorDisplayMode = source.errorDisplayMode;
  } else {
    delete next.errorDisplayMode;
  }

  if (source.tickMs !== undefined) {
    next.tickMs = source.tickMs;
  } else {
    delete next.tickMs;
  }

  return next;
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

export function splitGlitchZonesForSelection(
  zones: GlitchZone[],
  selection: GlitchTextSelection,
  sourceText: string,
  nextSelectionZone: GlitchZone,
): GlitchZone[] {
  return splitZonesForSelection(zones, selection, sourceText, nextSelectionZone);
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

export function findMatchingGlitchZone(
  zones: GlitchZone[],
  selection: GlitchTextSelection,
  sourceText: string,
) {
  return findMatchingZone(zones, selection, sourceText);
}

export function glitchZoneHasEffect(zone: GlitchZone): boolean {
  return (
    zone.errorMessageSource === "auto" ||
    zone.errorMessageSource === "custom" ||
    hasGlitchPresentation(zone.style) ||
    Boolean(normalizeZoneLinkTarget(zone.linkTarget) || zone.linkSubPageId)
  );
}

function resolveMergedZoneStyle(
  pendingStyle?: GlitchZoneStyle,
  existingStyle?: GlitchZoneStyle,
): GlitchZoneStyle | undefined {
  return normalizeGlitchZoneStyle(mergeGlitchZoneStyles(pendingStyle, existingStyle));
}

function mergePendingOntoExistingZone(
  existing: GlitchZone,
  pending: GlitchZone,
  selection: GlitchTextSelection,
): GlitchZone {
  const merged: GlitchZone = {
    ...existing,
    id: existing.id,
    start: selection.start,
    end: selection.end,
    original: selection.text,
    errorMessageSource: pending.errorMessageSource ?? "none",
  };

  if (pending.errorMessageSource === "custom" && pending.errorMessage?.trim()) {
    merged.errorMessage = pending.errorMessage.trim();
  } else {
    delete merged.errorMessage;
  }

  const mergedStyle = resolveMergedZoneStyle(pending.style, existing.style);
  if (mergedStyle) {
    merged.style = mergedStyle;
  } else {
    delete merged.style;
  }

  if (pending.linkTarget) {
    merged.linkTarget = pending.linkTarget;
    delete merged.linkSubPageId;
  } else if (!normalizeZoneLinkTarget(existing.linkTarget) && !existing.linkSubPageId) {
    delete merged.linkTarget;
    delete merged.linkSubPageId;
  }

  return copyZoneScrambleFields(merged, pending);
}

/**
 * 미리보기용: 선택 구간에 pending 설정을 기존 구간 위에 덧씌웁니다.
 * 겹치는 바깥 구간은 분할하고, 동일 span이면 해당 구간만 갱신합니다.
 */
export function mergePendingGlitchZonePreview(
  zones: GlitchZone[],
  selection: GlitchTextSelection,
  sourceText: string,
  pendingZone: GlitchZone,
): GlitchZone[] {
  const matchingZone = findMatchingZone(zones, selection, sourceText);

  if (matchingZone) {
    return zones.map((zone) =>
      zone.id === matchingZone.id
        ? mergePendingOntoExistingZone(matchingZone, pendingZone, selection)
        : zone,
    );
  }

  const enclosingZone = zones.find(
    (zone) => zone.start <= selection.start && zone.end >= selection.end,
  );
  const mergedSelectionStyle = resolveMergedZoneStyle(pendingZone.style, enclosingZone?.style);

  const nextSelectionZone: GlitchZone = {
    ...pendingZone,
    id: pendingZone.id || createZoneId(),
    start: selection.start,
    end: selection.end,
    original: selection.text,
  };

  if (mergedSelectionStyle) {
    nextSelectionZone.style = mergedSelectionStyle;
  } else {
    delete nextSelectionZone.style;
  }

  if (zones.some((zone) => zonesOverlap(zone, selection))) {
    if (!glitchZoneHasEffect(nextSelectionZone)) {
      return zones;
    }

    return splitZonesForSelection(zones, selection, sourceText, nextSelectionZone);
  }

  return [...zones, nextSelectionZone].sort((left, right) => left.start - right.start);
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
  const matchingZone = findMatchingZone(zones, selection, sourceText);
  const enclosingZone = zones.find(
    (zone) => zone.start <= selection.start && zone.end >= selection.end,
  );
  const mergedApplyStyle = resolveMergedZoneStyle(
    normalizedStyle,
    matchingZone?.style ?? enclosingZone?.style,
  );
  const hasPresentation = hasGlitchPresentation(mergedApplyStyle);
  const hasLink = Boolean(normalizeZoneLinkTarget(options.linkTarget));
  const requestedErrorSource = options.errorMessageSource;
  const enableBuiltin = options.builtinScramble === true;
  const effectiveBuiltin = enableBuiltin || builtinScramble;
  const explicitNoError = requestedErrorSource === "none";
  const wantsError =
    requestedErrorSource === "auto" ||
    requestedErrorSource === "custom" ||
    (!explicitNoError && (wantsReference || effectiveBuiltin));

  if (!hasPresentation && !hasLink && !wantsError) {
    if (matchingZone) {
      if (glitchZoneHasEffect(matchingZone)) {
        return {
          ok: false,
          message: "변경할 서식이나 오류 설정을 고른 뒤 적용하세요.",
        };
      }

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
    nextZones = zones.map((zone) => {
      if (zone.id !== matchingZone.id) {
        return zone;
      }

      let nextZone: GlitchZone = {
        ...zone,
        errorMessageSource,
        ...(customMessage ? { errorMessage: customMessage } : { errorMessage: undefined }),
        ...(linkTarget
          ? { linkTarget, linkSubPageId: undefined }
          : { linkTarget: undefined, linkSubPageId: undefined }),
      };

      const mergedStyle = resolveMergedZoneStyle(mergedApplyStyle, zone.style);
      if (mergedStyle) {
        nextZone.style = mergedStyle;
      } else {
        const { style: _removed, ...rest } = nextZone;
        nextZone = rest;
      }

      nextZone = applyZoneScrambleOptions(nextZone, options);

      return nextZone;
    });
  } else {
    let nextZone: GlitchZone = {
      id: createZoneId(),
      start: selection.start,
      end: selection.end,
      original: selection.text,
      errorMessageSource,
      ...(customMessage ? { errorMessage: customMessage } : {}),
      ...(linkTarget ? { linkTarget } : {}),
    };

    const enclosingStyle = zones.find(
      (zone) => zone.start <= selection.start && zone.end >= selection.end,
    )?.style;
    const mergedStyle = resolveMergedZoneStyle(mergedApplyStyle, enclosingZone?.style);
    if (mergedStyle) {
      nextZone.style = mergedStyle;
    }

    nextZone = applyZoneScrambleOptions(nextZone, options);

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
