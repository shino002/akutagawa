"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  keepAdminTextSelection,
  preserveAdminGlitchToolPointerDown,
} from "@/lib/admin-interaction";
import { GlitchStyleEditor, createDefaultGlitchDraft } from "@/components/admin/GlitchStyleEditor";
import { GlitchedText } from "@/components/GlitchedText";
import {
  ZoneScrambleSettingsEditor,
  type ZoneScrambleDraft,
} from "@/components/admin/ZoneScrambleSettingsEditor";
import { GlitchZoneRangePicker } from "@/components/admin/GlitchZoneRangePicker";
import {
  DEFAULT_GLITCH_TICK_MS,
  clampGlitchTickMs,
  fieldGlitchHasScramble,
  glitchZoneStyleSignature,
  glitchZoneStylesEqual,
  hasGlitchPresentation,
  isValidFieldGlitchConfig,
  mergeGlitchZoneStyles,
  normalizeGlitchZoneStyle,
} from "@/lib/glitch-style";
import {
  applyGlitchZone,
  findMatchingGlitchZone,
  glitchZoneHasEffect,
  mergePendingGlitchZonePreview,
} from "@/lib/glitch-zone-apply";
import { type GlitchZone } from "@/lib/text-scramble";
import { getGlitchFieldLabel, reanchorGlitchConfig } from "@/lib/glitch-fields";
import {
  findGlitchTextSelection,
  scheduleReadGlitchTextSelection,
  type GlitchTextSelection,
} from "@/lib/glitch-selection";
import { normalizeFieldGlitchConfig } from "@/lib/normalize-text-glitch";
import { ensureZoneErrorAlternation } from "@/lib/glitch-scramble-options";
import type {
  FieldGlitchConfig,
  GlitchErrorMessageSource,
  GlitchZoneStyle,
  Character,
  ZoneLinkTarget,
} from "@/lib/types";
import { normalizeZoneLinkTarget, type CharacterDetailSection } from "@/lib/zone-links";
import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import {
  GlitchFieldPicker,
  type GlitchFieldOptionGroup,
} from "@/components/admin/GlitchFieldPicker";
import { GlitchZoneListItem } from "@/components/admin/GlitchZoneListItem";
import { ZoneLinkEditor } from "@/components/admin/ZoneLinkEditor";

interface PendingZoneDraft extends ZoneScrambleDraft {
  style: GlitchZoneStyle;
  linkTarget?: ZoneLinkTarget;
}

function createDefaultPendingZoneDraft(style: GlitchZoneStyle): PendingZoneDraft {
  return {
    style,
    errorMessageSource: "none",
    wordPool: "",
    scrambleMode: "referenceOnly",
    builtinScramble: true,
    builtinTokens: [],
    errorDisplayMode: "alternate",
    tickMs: DEFAULT_GLITCH_TICK_MS,
  };
}

function pendingDraftFromZone(zone: GlitchZone): PendingZoneDraft {
  return {
    style: zone.style ?? {},
    errorMessageSource: zone.errorMessageSource ?? "none",
    errorMessage: zone.errorMessage,
    linkTarget: zone.linkTarget,
    wordPool: zone.wordPool ?? "",
    scrambleMode: zone.scrambleMode ?? "referenceOnly",
    builtinScramble: zone.builtinScramble ?? true,
    builtinTokens: zone.builtinTokens ?? [],
    errorDisplayMode: zone.errorDisplayMode ?? "alternate",
    tickMs: zone.tickMs ?? DEFAULT_GLITCH_TICK_MS,
  };
}

function appendScrambleFieldsToZone(zone: GlitchZone, draft: PendingZoneDraft): GlitchZone {
  const pool = draft.wordPool.trim();
  const next: GlitchZone = { ...zone };

  if (pool) {
    next.wordPool = pool;
    next.scrambleMode = draft.scrambleMode;
    delete next.builtinScramble;
  } else if (draft.builtinScramble) {
    next.builtinScramble = true;
    delete next.wordPool;
    delete next.scrambleMode;
  } else {
    delete next.wordPool;
    delete next.scrambleMode;
    delete next.builtinScramble;
  }

  if (draft.builtinTokens.length > 0) {
    next.builtinTokens = draft.builtinTokens;
  } else {
    delete next.builtinTokens;
  }

  if (draft.errorDisplayMode === "randomOnly") {
    next.errorDisplayMode = "randomOnly";
  } else {
    delete next.errorDisplayMode;
  }

  if (draft.errorMessageSource !== "none") {
    next.tickMs = clampGlitchTickMs(draft.tickMs);
  } else {
    delete next.tickMs;
  }

  return next;
}

function scrambleApplyOptionsFromDraft(draft: PendingZoneDraft) {
  return {
    wordPool: draft.wordPool.trim(),
    scrambleMode: draft.scrambleMode,
    builtinScramble: draft.builtinScramble,
    builtinTokens: draft.builtinTokens.length ? draft.builtinTokens : undefined,
    errorDisplayMode: draft.errorDisplayMode,
    tickMs: draft.tickMs,
  };
}

interface TextScrambleToolConfigOptions {
  zones: GlitchZone[];
  defaultStyle?: GlitchZoneStyle;
  legacy?: Pick<
    FieldGlitchConfig,
    | "wordPool"
    | "scrambleMode"
    | "builtinScramble"
    | "errorDisplayMode"
    | "builtinTokens"
    | "tickMs"
  >;
}

function buildConfig({
  zones,
  defaultStyle,
  legacy,
}: TextScrambleToolConfigOptions): FieldGlitchConfig | undefined {
  if (zones.length === 0) {
    return undefined;
  }

  const wordPool = legacy?.wordPool?.trim() ?? "";

  return normalizeFieldGlitchConfig({
    wordPool,
    zones: ensureZoneErrorAlternation(zones, {
      wordPool,
      builtinScramble: legacy?.builtinScramble,
    }),
    tickMs: legacy?.tickMs ? clampGlitchTickMs(legacy.tickMs) : undefined,
    defaultStyle,
    scrambleMode: wordPool ? (legacy?.scrambleMode ?? "referenceOnly") : undefined,
    builtinScramble: legacy?.builtinScramble,
    errorDisplayMode: legacy?.errorDisplayMode,
    builtinTokens: legacy?.builtinTokens?.length ? legacy.builtinTokens : undefined,
  });
}

/** 저장용 normalize 없이 미리보기 전용 config (검증 실패로 plain 텍스트만 보이는 것 방지) */
function buildLivePreviewConfig(
  options: TextScrambleToolConfigOptions,
): FieldGlitchConfig | undefined {
  if (options.zones.length === 0) {
    return undefined;
  }

  const wordPool = options.legacy?.wordPool?.trim() ?? "";
  const zones = ensureZoneErrorAlternation(options.zones, {
    wordPool,
    builtinScramble: options.legacy?.builtinScramble,
  });
  const defaultStyle = normalizeGlitchZoneStyle(options.defaultStyle);
  const candidate: FieldGlitchConfig = {
    wordPool,
    zones,
    ...(defaultStyle ? { defaultStyle } : {}),
    ...(options.legacy?.tickMs ? { tickMs: clampGlitchTickMs(options.legacy.tickMs) } : {}),
    ...(wordPool ? { scrambleMode: options.legacy?.scrambleMode ?? "referenceOnly" } : {}),
    ...(options.legacy?.builtinScramble ? { builtinScramble: true } : {}),
    ...(options.legacy?.errorDisplayMode === "randomOnly"
      ? { errorDisplayMode: "randomOnly" }
      : {}),
    ...(options.legacy?.builtinTokens?.length
      ? { builtinTokens: options.legacy.builtinTokens }
      : {}),
  };

  if (!isValidFieldGlitchConfig(candidate)) {
    const hasPreviewEffect = candidate.zones.some(
      (zone) =>
        hasGlitchPresentation(zone.style) ||
        zone.errorMessageSource === "auto" ||
        zone.errorMessageSource === "custom" ||
        Boolean(zone.linkTarget || zone.linkSubPageId),
    );

    if (!hasPreviewEffect) {
      return undefined;
    }

    return candidate;
  }

  return candidate;
}

interface TextScrambleToolProps {
  activeFieldPath: string | null;
  fieldValue: string;
  externalSelection?: GlitchTextSelection | null;
  onExternalSelectionClear?: () => void;
  onFieldValueChange: (value: string) => void;
  glitchConfig?: FieldGlitchConfig;
  onGlitchChange: (config: FieldGlitchConfig | undefined) => void;
  onNotice?: (message: string) => void;
  allCharacters?: Character[];
  currentCharacterId?: string;
  currentSection?: CharacterDetailSection;
  fieldPickerGroups?: GlitchFieldOptionGroup[];
  onFieldSelect?: (path: string) => void;
  /** 구간 적용 성공 직후 호출 (예: 선택 해제) */
  onZoneApplied?: () => void;
}

function glitchSelectionKey(selection: GlitchTextSelection) {
  return `${selection.start}:${selection.end}:${selection.text}`;
}

function findEnclosingGlitchZone(zones: GlitchZone[], selection: GlitchTextSelection) {
  return zones.find((zone) => zone.start <= selection.start && zone.end >= selection.end);
}

/**
 * 기존 구간을 고칠 때는 draft 서식이 소스 오브 트루스.
 * 바깥 구간 style을 다시 merge하면 지운 fontSize 등이 되살아납니다.
 */
function resolvePendingInheritedStyle(
  zones: GlitchZone[],
  selection: GlitchTextSelection,
  fieldValue: string,
) {
  if (findMatchingGlitchZone(zones, selection, fieldValue)) {
    return undefined;
  }

  return findEnclosingGlitchZone(zones, selection)?.style;
}

function buildPendingGlitchZone(
  selection: GlitchTextSelection,
  draft: PendingZoneDraft,
  options: { zoneId?: string; inheritedStyle?: GlitchZoneStyle } = {},
): GlitchZone {
  const normalizedStyle = normalizeGlitchZoneStyle(
    mergeGlitchZoneStyles(draft.style, options.inheritedStyle),
  );
  const errorMessageSource =
    draft.errorMessageSource === "auto" || draft.errorMessageSource === "custom"
      ? draft.errorMessageSource
      : "none";
  const customMessage = errorMessageSource === "custom" ? draft.errorMessage?.trim() : undefined;
  const linkTarget = normalizeZoneLinkTarget(draft.linkTarget);

  return appendScrambleFieldsToZone(
    {
      id: options.zoneId ?? "preview-pending",
      start: selection.start,
      end: selection.end,
      original: selection.text,
      ...(normalizedStyle ? { style: normalizedStyle } : {}),
      errorMessageSource,
      ...(customMessage ? { errorMessage: customMessage } : {}),
      ...(linkTarget ? { linkTarget } : {}),
    },
    draft,
  );
}

function finalizeGlitchConfig(
  options: TextScrambleToolConfigOptions,
): FieldGlitchConfig | undefined {
  if (options.zones.length === 0) {
    return undefined;
  }

  return buildConfig(options) ?? buildLivePreviewConfig(options);
}

function isPendingDraftStaleForZone(draft: PendingZoneDraft, zone: GlitchZone) {
  const draftHasEffect =
    draft.errorMessageSource !== "none" ||
    hasGlitchPresentation(draft.style) ||
    Boolean(normalizeZoneLinkTarget(draft.linkTarget));

  return !draftHasEffect && glitchZoneHasEffect(zone);
}

export function TextScrambleTool({
  activeFieldPath,
  fieldValue,
  externalSelection = null,
  onExternalSelectionClear,
  onFieldValueChange,
  glitchConfig,
  onGlitchChange,
  onNotice,
  allCharacters = [],
  currentCharacterId = "",
  currentSection = "characters",
  fieldPickerGroups,
  onFieldSelect,
  onZoneApplied,
}: TextScrambleToolProps) {
  const defaults = createDefaultGlitchDraft();
  const toolMountedRef = useRef(false);
  const [workSelection, setWorkSelection] = useState<GlitchTextSelection | null>(null);
  const [pinnedSelection, setPinnedSelection] = useState<GlitchTextSelection | null>(null);
  const [toolNotice, setToolNotice] = useState("");
  const [previewScope, setPreviewScope] = useState<"field" | "zone">("field");
  const [zoneStyle, setZoneStyle] = useState<GlitchZoneStyle>(
    glitchConfig?.defaultStyle ?? defaults.zoneStyle,
  );
  const [pendingZoneDraft, setPendingZoneDraft] = useState<PendingZoneDraft>(() =>
    createDefaultPendingZoneDraft(glitchConfig?.defaultStyle ?? defaults.zoneStyle),
  );
  const workTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastLoadedSelectionKeyRef = useRef<string | null>(null);
  const pendingZoneDraftRef = useRef(pendingZoneDraft);
  const errorMessageTouchedRef = useRef(false);

  const legacyConfig = useMemo(
    () => ({
      wordPool: glitchConfig?.wordPool ?? "",
      scrambleMode: glitchConfig?.scrambleMode,
      builtinScramble: glitchConfig?.builtinScramble,
      errorDisplayMode: glitchConfig?.errorDisplayMode,
      builtinTokens: glitchConfig?.builtinTokens,
      tickMs: glitchConfig?.tickMs,
    }),
    [
      glitchConfig?.wordPool,
      glitchConfig?.scrambleMode,
      glitchConfig?.builtinScramble,
      glitchConfig?.errorDisplayMode,
      glitchConfig?.builtinTokens,
      glitchConfig?.tickMs,
    ],
  );

  const zones = useMemo(() => {
    return reanchorGlitchConfig(fieldValue, glitchConfig)?.zones ?? glitchConfig?.zones ?? [];
  }, [fieldValue, glitchConfig]);
  const pendingUsesError = pendingZoneDraft.errorMessageSource !== "none";
  const activeSelection = pinnedSelection ?? workSelection ?? externalSelection;
  const livePreviewZones = useMemo(() => {
    if (!activeSelection) {
      return zones;
    }

    const pendingZone = buildPendingGlitchZone(activeSelection, pendingZoneDraft, {
      inheritedStyle: resolvePendingInheritedStyle(zones, activeSelection, fieldValue),
    });

    return mergePendingGlitchZonePreview(zones, activeSelection, fieldValue, pendingZone);
  }, [zones, activeSelection, pendingZoneDraft, fieldValue]);
  const hasScramble = fieldGlitchHasScramble({
    wordPool: legacyConfig.wordPool ?? "",
    zones: livePreviewZones,
    builtinScramble: legacyConfig.builtinScramble,
  });

  const livePreviewConfig = useMemo(
    () =>
      livePreviewZones.length > 0
        ? buildLivePreviewConfig({
            zones: livePreviewZones,
            defaultStyle: zoneStyle,
            legacy: legacyConfig,
          })
        : undefined,
    [livePreviewZones, legacyConfig, zoneStyle],
  );
  const pendingZonePreview: GlitchZone | null = activeSelection
    ? buildPendingGlitchZone(activeSelection, pendingZoneDraft, {
        zoneId: "pending",
        inheritedStyle: resolvePendingInheritedStyle(zones, activeSelection, fieldValue),
      })
    : null;
  const selectionPreviewConfig = useMemo(() => {
    if (!activeSelection || !pendingZonePreview) {
      return undefined;
    }

    return buildLivePreviewConfig({
      zones: [
        {
          ...pendingZonePreview,
          start: 0,
          end: activeSelection.text.length,
          original: activeSelection.text,
        },
      ],
      defaultStyle: zoneStyle,
    });
  }, [activeSelection, pendingZonePreview, zoneStyle]);
  const selectionPreviewKey = activeSelection
    ? `${glitchSelectionKey(activeSelection)}:${glitchZoneStyleSignature(pendingZoneDraft.style)}`
    : "selection-preview";
  const livePreviewKey = activeFieldPath ?? "live-preview";
  const activeFieldLabel = activeFieldPath ? getGlitchFieldLabel(activeFieldPath) : null;

  const notify = (message: string) => {
    setToolNotice(message);
    if (onNotice) {
      queueMicrotask(() => onNotice(message));
    }
  };

  const defaultStyleSignature = glitchZoneStyleSignature(glitchConfig?.defaultStyle);

  useEffect(() => {
    toolMountedRef.current = true;
    return () => {
      toolMountedRef.current = false;
    };
  }, []);

  /* 최신 초안을 담아 두는 상자. 예전에는 렌더 도중에 대입했는데, 버려진 렌더의
     값이 그대로 남을 수 있습니다. 이 값은 선택 이벤트에서만 읽으므로
     커밋된 뒤에 채워도 늦지 않습니다. */
  useEffect(() => {
    pendingZoneDraftRef.current = pendingZoneDraft;
  }, [pendingZoneDraft]);

  useEffect(() => {
    setWorkSelection(null);
    setPinnedSelection(null);
    lastLoadedSelectionKeyRef.current = null;
    errorMessageTouchedRef.current = false;
  }, [activeFieldPath]);

  useEffect(() => {
    setZoneStyle((current) => {
      const next = glitchConfig?.defaultStyle ?? defaults.zoneStyle;
      return glitchZoneStylesEqual(current, next) ? current : next;
    });
    setPendingZoneDraft((current) => {
      const nextStyle = glitchConfig?.defaultStyle ?? defaults.zoneStyle;
      if (glitchZoneStylesEqual(current.style, nextStyle)) {
        return current;
      }

      return createDefaultPendingZoneDraft(nextStyle);
    });
  }, [activeFieldPath, defaultStyleSignature, glitchConfig?.defaultStyle]);

  const commitConfig = (options: { zones: GlitchZone[]; defaultStyle?: GlitchZoneStyle }) => {
    onGlitchChange(
      finalizeGlitchConfig({
        zones: options.zones,
        defaultStyle: options.defaultStyle ?? zoneStyle,
        legacy: legacyConfig,
      }),
    );
  };

  const applyPendingZoneDraftPatch = (patch: Partial<PendingZoneDraft>) => {
    setPendingZoneDraft((current) => {
      const matched = activeSelection
        ? findMatchingGlitchZone(zones, activeSelection, fieldValue)
        : undefined;

      if (!matched) {
        return { ...current, ...patch };
      }

      const zoneDraft = pendingDraftFromZone(matched);

      if (isPendingDraftStaleForZone(current, matched)) {
        errorMessageTouchedRef.current = false;
        return { ...zoneDraft, ...patch };
      }

      const next = { ...current, ...patch };

      if (
        !errorMessageTouchedRef.current &&
        !("errorMessageSource" in patch) &&
        !("errorMessage" in patch) &&
        next.errorMessageSource === "none" &&
        zoneDraft.errorMessageSource !== "none"
      ) {
        next.errorMessageSource = zoneDraft.errorMessageSource;
        next.errorMessage = zoneDraft.errorMessage;
      }

      return next;
    });
  };

  const loadPendingDraftForSelection = (selection: GlitchTextSelection) => {
    errorMessageTouchedRef.current = false;
    const matchingZone = findMatchingGlitchZone(zones, selection, fieldValue);

    if (matchingZone) {
      setPendingZoneDraft(pendingDraftFromZone(matchingZone));
      return;
    }

    const enclosingZone = findEnclosingGlitchZone(zones, selection);
    if (enclosingZone) {
      setPendingZoneDraft(pendingDraftFromZone(enclosingZone));
      return;
    }

    setPendingZoneDraft(createDefaultPendingZoneDraft(zoneStyle));
  };

  const clearWorkSelection = () => {
    lastLoadedSelectionKeyRef.current = null;
    errorMessageTouchedRef.current = false;
    setPinnedSelection(null);
    setWorkSelection(null);
  };

  const restoreWorkTextareaSelection = (selection: GlitchTextSelection) => {
    const textarea = workTextareaRef.current;
    if (!textarea || textarea.disabled) {
      return;
    }

    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(selection.start, selection.end);
  };

  const applyWorkSelection = (selection: GlitchTextSelection) => {
    const key = glitchSelectionKey(selection);
    const matchedZone = findMatchingGlitchZone(zones, selection, fieldValue);

    if (key !== lastLoadedSelectionKeyRef.current) {
      lastLoadedSelectionKeyRef.current = key;
      loadPendingDraftForSelection(selection);
    } else if (
      matchedZone &&
      isPendingDraftStaleForZone(pendingZoneDraftRef.current, matchedZone)
    ) {
      loadPendingDraftForSelection(selection);
    }

    setPinnedSelection(selection);
    setWorkSelection(selection);
  };

  const updateSelectionFromTextarea = (element: HTMLTextAreaElement) => {
    scheduleReadGlitchTextSelection(element, (selection) => {
      if (!toolMountedRef.current || !selection) {
        return;
      }

      applyWorkSelection(selection);
    });
  };

  useEffect(() => {
    const selection = pinnedSelection ?? workSelection;
    if (!selection) {
      return;
    }

    const currentText = fieldValue.slice(selection.start, selection.end);
    if (currentText === selection.text) {
      return;
    }

    const syncSelection = (next: GlitchTextSelection) => {
      if (
        selection.start === next.start &&
        selection.end === next.end &&
        selection.text === next.text
      ) {
        return;
      }

      lastLoadedSelectionKeyRef.current = glitchSelectionKey(next);
      setPinnedSelection(next);
      setWorkSelection(next);
    };

    const clearSelection = () => {
      if (!pinnedSelection && !workSelection) {
        return;
      }

      lastLoadedSelectionKeyRef.current = null;
      setPinnedSelection(null);
      setWorkSelection(null);
    };

    const matchedZone = findMatchingGlitchZone(zones, selection, fieldValue);
    if (matchedZone) {
      const end = Math.min(matchedZone.end, fieldValue.length);
      const start = Math.min(matchedZone.start, end);
      const text = fieldValue.slice(start, end);

      if (!text || start >= end) {
        clearSelection();
        return;
      }

      syncSelection({ start, end, text });
      return;
    }

    const relocated = findGlitchTextSelection(fieldValue, selection.text);
    if (relocated) {
      syncSelection(relocated);
      return;
    }

    clearSelection();
  }, [fieldValue, pinnedSelection, workSelection, zones]);

  const handlePendingStyleChange = (nextStyle: GlitchZoneStyle) => {
    const normalized = normalizeGlitchZoneStyle(nextStyle);
    if (glitchZoneStylesEqual(normalized, pendingZoneDraft.style)) {
      return;
    }

    errorMessageTouchedRef.current = true;
    applyPendingZoneDraftPatch({ style: normalized ?? {} });
  };

  const handleAddZone = (selectionOverride?: GlitchTextSelection | null) => {
    if (!activeFieldPath) {
      notify("먼저 필드를 고르세요.");
      return;
    }

    const selection = selectionOverride ?? activeSelection;

    if (!selection) {
      notify("텍스트를 드래그해서 구간을 선택하세요.");
      return;
    }

    const normalizedStyle = normalizeGlitchZoneStyle(pendingZoneDraft.style);
    const pool = pendingZoneDraft.wordPool.trim();
    const wantsReference = Boolean(pool);
    const wantsBuiltin = !pool && pendingZoneDraft.builtinScramble;
    const pendingZone = buildPendingGlitchZone(selection, pendingZoneDraft, {
      inheritedStyle: resolvePendingInheritedStyle(zones, selection, fieldValue),
    });
    const applyStyle = pendingZone.style ?? normalizedStyle;
    const hasPresentation = hasGlitchPresentation(applyStyle);
    const hasLink = Boolean(normalizeZoneLinkTarget(pendingZoneDraft.linkTarget));
    const pendingUsesErrorMessage = pendingZone.errorMessageSource !== "none";
    const scrambleOptions = scrambleApplyOptionsFromDraft(pendingZoneDraft);

    if (
      !wantsReference &&
      !wantsBuiltin &&
      !hasPresentation &&
      !hasLink &&
      !pendingUsesErrorMessage
    ) {
      notify("서식, 오류 메시지, 페이지 연결 중 하나를 설정한 뒤 적용하세요.");
      return;
    }

    const baseConfig = finalizeGlitchConfig({
      zones,
      defaultStyle: zoneStyle,
      legacy: legacyConfig,
    }) ?? {
      wordPool: legacyConfig.wordPool?.trim() ?? "",
      zones,
      ...(zoneStyle ? { defaultStyle: zoneStyle } : {}),
    };

    const result = applyGlitchZone(baseConfig, selection, {
      style: applyStyle,
      errorMessageSource: pendingZone.errorMessageSource,
      errorMessage: pendingZone.errorMessage,
      linkTarget: pendingZoneDraft.linkTarget,
      fieldText: fieldValue,
      ...scrambleOptions,
    });

    if (!result.ok) {
      notify(result.message);
      return;
    }

    const savedConfig =
      finalizeGlitchConfig({
        zones: result.config.zones,
        defaultStyle: result.config.defaultStyle ?? zoneStyle,
        legacy: {
          wordPool: result.config.wordPool,
          scrambleMode: result.config.scrambleMode,
          builtinScramble: result.config.builtinScramble,
          errorDisplayMode: result.config.errorDisplayMode,
          builtinTokens: result.config.builtinTokens,
          tickMs: result.config.tickMs,
        },
      }) ?? (isValidFieldGlitchConfig(result.config) ? result.config : undefined);

    if (!savedConfig) {
      notify("오류 설정을 저장하지 못했어요. 구간 설정을 다시 확인해주세요.");
      return;
    }

    onGlitchChange(savedConfig);

    const appliedZone =
      findMatchingGlitchZone(result.config.zones, selection, fieldValue) ??
      result.config.zones.find(
        (zone) => zone.start === selection.start && zone.end === selection.end,
      );

    if (appliedZone) {
      setPendingZoneDraft(pendingDraftFromZone(appliedZone));
      lastLoadedSelectionKeyRef.current = glitchSelectionKey(selection);
      errorMessageTouchedRef.current = false;
    } else {
      setPendingZoneDraft(createDefaultPendingZoneDraft(zoneStyle));
    }

    notify(result.message);
    clearWorkSelection();
    onExternalSelectionClear?.();
    onZoneApplied?.();
  };

  const applySelection = (selection: GlitchTextSelection) => {
    lastLoadedSelectionKeyRef.current = glitchSelectionKey(selection);
    setPinnedSelection(selection);
    setWorkSelection(selection);
    restoreWorkTextareaSelection(selection);
    loadPendingDraftForSelection(selection);
    onExternalSelectionClear?.();
  };

  const handleRemoveZone = (zoneId: string) => {
    const nextZones = zones.filter((zone) => zone.id !== zoneId);

    if (nextZones.length === 0) {
      onGlitchChange(undefined);
      setZoneStyle(defaults.zoneStyle);
      setPendingZoneDraft(createDefaultPendingZoneDraft(defaults.zoneStyle));
      notify("이 필드의 적용 구간을 모두 제거했어요.");
      return;
    }

    commitConfig({ zones: nextZones });
    notify("선택한 구간을 제거했어요.");
  };

  const handleClearAllZones = () => {
    onGlitchChange(undefined);
    setZoneStyle(defaults.zoneStyle);
    setPendingZoneDraft(createDefaultPendingZoneDraft(defaults.zoneStyle));
    notify("이 필드의 적용 구간을 모두 제거했어요.");
  };

  const selectZoneForEditing = (zone: GlitchZone) => {
    const selection = {
      start: zone.start,
      end: zone.end,
      text: zone.original,
    };
    lastLoadedSelectionKeyRef.current = glitchSelectionKey(selection);
    errorMessageTouchedRef.current = false;
    setPinnedSelection(selection);
    setWorkSelection(selection);
    setPendingZoneDraft(pendingDraftFromZone(zone));
    restoreWorkTextareaSelection(selection);
    onExternalSelectionClear?.();
  };

  const activeEditingZoneId = activeSelection
    ? findMatchingGlitchZone(zones, activeSelection, fieldValue)?.id
    : undefined;

  /* 미리보기 한 칸이 「전체」 와 「선택 구간」 을 번갈아 보여 줍니다.
     구간을 안 골랐으면 볼 게 전체뿐이라 스위치를 감춥니다. */
  const canPreviewZone = Boolean(activeSelection && selectionPreviewConfig);
  const showZonePreview = canPreviewZone && previewScope === "zone";

  return (
    <section
      className="admin-glitch-tool max-w-full min-w-0 border border-emerald-100/15 bg-black/30 p-4 pb-6"
      data-text-corruptor-ignore
      data-text-scramble-tool
      onMouseDownCapture={preserveAdminGlitchToolPointerDown}
    >
      <header className="glitch-tool-head">
        <h3 className="glitch-tool-title">텍스트 오류</h3>
        {/* 안내는 한 줄씩 흩뿌리지 않고 접어 둡니다 — 늘 펼쳐 두면 본 작업이 묻힙니다 */}
        <details className="glitch-help">
          <summary>쓰는 법</summary>
          <div>
            <p>
              <b>①</b> 필드를 고르고 → <b>②</b> 텍스트에서 구간을 드래그 → <b>③</b> 서식·오류를
              정하고 적용합니다.
            </p>
            <p>
              <b>고정 서식</b>은 글자를 그대로 두고 색·크기·굵기·밑줄만 바꿉니다. <b>오류 설정</b>을
              켜면 참조 단어·전환 속도·원문↔오류 방식을 이 구간만 따로 조절합니다.
            </p>
            <p>다른 탭에서는 텍스트를 드래그하면 뜨는 툴바로 서식만 빠르게 넣을 수 있어요.</p>
          </div>
        </details>
      </header>

      {/* ① 필드 */}
      <section className="glitch-step">
        <p className="glitch-step-head">
          <span className="glitch-step-no">1</span>
          <span className="glitch-step-title">필드</span>
          {activeFieldPath ? (
            <span className="glitch-step-state">
              {activeFieldLabel}
              {zones.length > 0 ? <span className="adm-count">{zones.length}</span> : null}
            </span>
          ) : (
            <span className="glitch-step-state is-empty">고르지 않음</span>
          )}
        </p>

        {fieldPickerGroups && fieldPickerGroups.length > 0 && onFieldSelect ? (
          <GlitchFieldPicker
            groups={fieldPickerGroups}
            activePath={activeFieldPath}
            onSelect={onFieldSelect}
          />
        ) : null}
      </section>

      {/* ② 텍스트 · 구간 선택 */}
      <section className="glitch-step">
        <p className="glitch-step-head">
          <span className="glitch-step-no">2</span>
          <span className="glitch-step-title">텍스트 · 구간 선택</span>
          {activeSelection ? (
            <span className="glitch-step-state">
              {activeSelection.start + 1}~{activeSelection.end}번째 「{activeSelection.text}」
            </span>
          ) : (
            <span className="glitch-step-state is-empty">
              {activeFieldPath ? "드래그해서 구간을 고르세요" : "먼저 필드를 고르세요"}
            </span>
          )}
        </p>
        <textarea
          aria-label="오류를 넣을 텍스트"
          ref={workTextareaRef}
          value={fieldValue}
          data-glitch-work-textarea
          {...(activeFieldPath ? { "data-glitch-field": activeFieldPath } : {})}
          onChange={(event) => onFieldValueChange(event.target.value)}
          onSelect={(event) => updateSelectionFromTextarea(event.currentTarget)}
          onKeyUp={(event) => updateSelectionFromTextarea(event.currentTarget)}
          onMouseUp={(event) => updateSelectionFromTextarea(event.currentTarget)}
          placeholder={
            activeFieldPath
              ? "텍스트를 고치거나 드래그로 구간을 선택하세요."
              : "먼저 위에서 필드를 고르세요."
          }
          disabled={!activeFieldPath}
          className="auth-input min-h-36 disabled:cursor-not-allowed disabled:opacity-50"
          data-text-corruptor-ignore
        />

        {/* 이미 걸어 둔 구간 — 텍스트 바로 밑에서 눌러 고칩니다.
            예전에는 화면 맨 아래 목록까지 내려가야 기존 구간을 다시 잡을 수 있었습니다. */}
        {zones.length > 0 ? (
          <div className="glitch-zone-chips">
            <span className="glitch-zone-chips-label">걸린 구간</span>
            {zones.map((zone, index) => (
              <button
                key={zone.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectZoneForEditing(zone)}
                className="glitch-zone-chip"
                data-state={zone.id === activeEditingZoneId ? "active" : "plain"}
                title={`${index + 1}번째 구간 · ${zone.original}`}
              >
                <span className="glitch-zone-chip-no">{index + 1}</span>
                <span className="glitch-zone-chip-text">{zone.original}</span>
              </button>
            ))}
          </div>
        ) : null}

        {/* 구간을 고르는 또 하나의 길이라 ② 안에 둡니다 — 예전에는 미리보기 뒤로 밀려
            텍스트와 떨어져 있었습니다 */}
        <GlitchZoneRangePicker
          fieldValue={fieldValue}
          disabled={!activeFieldPath}
          onSelect={applySelection}
          onApply={(selection) => handleAddZone(selection)}
          onNotice={notify}
        />
      </section>

      {activeSelection && pendingZonePreview ? (
        <div
          className="mt-3 border border-amber-300/35 bg-amber-950/25 p-3"
          data-glitch-selection-panel
          onMouseDown={keepAdminTextSelection}
        >
          <p className="glitch-step-head">
            <span className="glitch-step-no">3</span>
            <span className="glitch-step-title">선택 구간 설정</span>
          </p>
          {/* 고정 서식/오류 설정 설명 상자가 있던 자리 — 「쓰는 법」 으로 합쳤습니다 */}
          <p className="glitch-context">
            {fieldValue.slice(Math.max(0, activeSelection.start - 20), activeSelection.start)}
            <mark>{activeSelection.text}</mark>
            {fieldValue.slice(activeSelection.end, activeSelection.end + 20)}
          </p>
          <GlitchStyleEditor
            compact
            style={pendingZoneDraft.style}
            onStyleChange={handlePendingStyleChange}
          />
          <ZoneScrambleSettingsEditor
            draft={pendingZoneDraft}
            onChange={(patch) => {
              if (
                "errorMessageSource" in patch ||
                "errorMessage" in patch ||
                "style" in patch ||
                "tickMs" in patch ||
                "errorDisplayMode" in patch ||
                "wordPool" in patch ||
                "scrambleMode" in patch ||
                "builtinScramble" in patch ||
                "builtinTokens" in patch
              ) {
                errorMessageTouchedRef.current = true;
              }
              applyPendingZoneDraftPatch(patch);
            }}
            onNotice={notify}
          />
          <details className="glitch-sub">
            <summary>페이지 연결 (선택)</summary>
            <div>
              <ZoneLinkEditor
                target={pendingZoneDraft.linkTarget}
                allCharacters={allCharacters}
                currentCharacterId={currentCharacterId}
                currentSection={currentSection}
                onChange={(nextTarget) => applyPendingZoneDraftPatch({ linkTarget: nextTarget })}
                immediateApply
              />
            </div>
          </details>

          {/* 적용 단추는 ③ 바닥에 붙여 둡니다 — 설정이 길어져도 손이 닿게 */}
          <div className="glitch-apply">
            <AdminChoiceButton
              variant="primary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleAddZone()}
              className="px-3 py-2 text-xs"
            >
              이 구간에 적용
            </AdminChoiceButton>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearWorkSelection}
              className="admin-ghost-btn px-3 py-2 text-xs"
            >
              선택 취소
            </button>
          </div>
        </div>
      ) : null}

      {/* 미리보기 — 예전에는 「실시간」·「선택 구간」·「전체 필드」 세 상자가 따로 있었고
          구간을 고르는 순간 하나가 사라지고 둘이 나타났습니다. 한 칸으로 합치고
          무엇을 볼지는 위 스위치로 고릅니다. */}
      {activeFieldPath && fieldValue ? (
        <section className="glitch-preview">
          <p className="glitch-preview-head">
            <span className="glitch-preview-title">미리보기</span>
            {canPreviewZone ? (
              <span className="glitch-preview-switch" role="tablist" aria-label="미리보기 범위">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewScope === "field"}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setPreviewScope("field")}
                  className={previewScope === "field" ? "is-active" : undefined}
                >
                  전체
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewScope === "zone"}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setPreviewScope("zone")}
                  className={previewScope === "zone" ? "is-active" : undefined}
                >
                  선택 구간
                </button>
              </span>
            ) : null}
          </p>

          <p className="glitch-preview-body">
            {showZonePreview && selectionPreviewConfig && activeSelection ? (
              <GlitchedText
                key={selectionPreviewKey}
                text={activeSelection.text}
                glitch={selectionPreviewConfig}
                preserveWhitespace
                animate
              />
            ) : livePreviewConfig ? (
              <GlitchedText
                key={`panel-${livePreviewKey}`}
                text={fieldValue}
                glitch={livePreviewConfig}
                preserveWhitespace
                animate
              />
            ) : (
              fieldValue
            )}
          </p>

          <p className="glitch-preview-note">
            {showZonePreview
              ? pendingUsesError
                ? "고른 구간에 오류 설정이 적용된 모습입니다."
                : "고른 구간에 서식·연결이 적용된 모습입니다."
              : hasScramble
                ? "원문과 오류 글자가 번갈아 보입니다."
                : "적용된 서식·연결이 전체 텍스트에 반영된 모습입니다."}
          </p>
        </section>
      ) : null}

      {zones.length > 0 ? (
        <details className="mt-4 border border-emerald-100/10 bg-black/25" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-emerald-50">
            적용된 구간 ({zones.length})
          </summary>
          <div className="space-y-2 border-t border-emerald-100/10 p-3 pt-2">
            <div className="flex justify-end">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClearAllZones}
                className="admin-ghost-btn px-2 py-1 text-[11px]"
              >
                이 필드 전부 제거
              </button>
            </div>
            {zones.map((zone, index) => (
              <GlitchZoneListItem
                key={zone.id}
                zone={zone}
                index={index}
                allCharacters={allCharacters}
                currentCharacterId={currentCharacterId}
                currentSection={currentSection}
                isActive={zone.id === activeEditingZoneId}
                onSelectZone={selectZoneForEditing}
                onRemoveZone={handleRemoveZone}
              />
            ))}
          </div>
        </details>
      ) : null}

      {toolNotice ? (
        <p className="mt-3 border border-stone-400/25 bg-stone-900/25 p-2 text-xs leading-6 text-stone-200">
          {toolNotice}
        </p>
      ) : null}
    </section>
  );
}
