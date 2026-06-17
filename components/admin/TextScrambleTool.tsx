"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepAdminTextSelection } from "@/lib/admin-interaction";
import {
  GlitchStyleEditor,
  GlitchTickEditor,
  createDefaultGlitchDraft,
} from "@/components/admin/GlitchStyleEditor";
import { GlitchZoneMark } from "@/components/GlitchZoneMark";
import { GlitchedText } from "@/components/GlitchedText";
import { ZoneErrorMessageEditor } from "@/components/admin/ZoneErrorMessageEditor";
import { BuiltinTokenPicker } from "@/components/admin/BuiltinTokenPicker";
import { GlitchZoneRangePicker } from "@/components/admin/GlitchZoneRangePicker";
import {
  DEFAULT_GLITCH_TICK_MS,
  clampGlitchTickMs,
  fieldGlitchHasScramble,
  glitchZoneStyleSignature,
  glitchZoneStylesEqual,
  hasGlitchPresentation,
  normalizeGlitchZoneStyle,
} from "@/lib/glitch-style";
import { glitchTextWasSanitized, sanitizePlainText } from "@/lib/glitch-display";
import { zonesOverlap, type GlitchZone } from "@/lib/text-scramble";
import { getGlitchFieldLabel, glitchConfigSignature } from "@/lib/glitch-fields";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { readGlitchTextSelection } from "@/lib/glitch-selection";
import { normalizeFieldGlitchConfig } from "@/lib/normalize-text-glitch";
import { ensureZoneErrorAlternation } from "@/lib/glitch-scramble-options";
import type {
  FieldGlitchConfig,
  GlitchErrorDisplayMode,
  GlitchErrorMessageSource,
  GlitchScrambleMode,
  GlitchZoneStyle,
  Character,
  ZoneLinkTarget,
} from "@/lib/types";
import {
  formatZoneLinkLabel,
  normalizeZoneLinkTarget,
  resolveZoneLink,
  type CharacterDetailSection,
} from "@/lib/zone-links";
import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import { ZoneLinkEditor } from "@/components/admin/ZoneLinkEditor";

interface PendingZoneDraft {
  style: GlitchZoneStyle;
  errorMessageSource: GlitchErrorMessageSource;
  errorMessage?: string;
  linkTarget?: ZoneLinkTarget;
}

function createDefaultPendingZoneDraft(style: GlitchZoneStyle): PendingZoneDraft {
  return {
    style,
    errorMessageSource: "none",
  };
}

interface TextScrambleToolConfigOptions {
  wordPool: string;
  zones: GlitchZone[];
  tickMs: number;
  defaultStyle?: GlitchZoneStyle;
  scrambleMode?: GlitchScrambleMode;
  builtinScramble?: boolean;
  errorDisplayMode?: GlitchErrorDisplayMode;
  builtinTokens?: string[];
}

function buildConfig({
  wordPool,
  zones,
  tickMs,
  defaultStyle,
  scrambleMode,
  builtinScramble,
  errorDisplayMode,
  builtinTokens,
}: TextScrambleToolConfigOptions): FieldGlitchConfig | undefined {
  if (zones.length === 0) {
    return undefined;
  }

  return normalizeFieldGlitchConfig({
    wordPool: wordPool.trim(),
    zones: ensureZoneErrorAlternation(zones, {
      wordPool: wordPool.trim(),
      builtinScramble,
    }),
    tickMs: clampGlitchTickMs(tickMs),
    defaultStyle,
    scrambleMode: wordPool.trim() ? (scrambleMode ?? "referenceOnly") : undefined,
    builtinScramble,
    errorDisplayMode,
    builtinTokens: builtinTokens?.length ? builtinTokens : undefined,
  });
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
}

function truncateMiddle(text: string, maxLength = 40) {
  if (text.length <= maxLength) {
    return text;
  }

  const half = Math.floor((maxLength - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}

function createZoneId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
}: TextScrambleToolProps) {
  const defaults = createDefaultGlitchDraft();
  const [wordPool, setWordPool] = useState(glitchConfig?.wordPool ?? "");
  const [scrambleMode, setScrambleMode] = useState<GlitchScrambleMode>(
    glitchConfig?.scrambleMode ?? "referenceOnly",
  );
  const [builtinScramble, setBuiltinScramble] = useState(glitchConfig?.builtinScramble === true);
  const [errorDisplayMode, setErrorDisplayMode] = useState<GlitchErrorDisplayMode>(
    glitchConfig?.errorDisplayMode ?? "alternate",
  );
  const [builtinTokens, setBuiltinTokens] = useState<string[]>(glitchConfig?.builtinTokens ?? []);
  const [workSelection, setWorkSelection] = useState<GlitchTextSelection | null>(null);
  const [toolNotice, setToolNotice] = useState("");
  const [tickMs, setTickMs] = useState(glitchConfig?.tickMs ?? DEFAULT_GLITCH_TICK_MS);
  const [zoneStyle, setZoneStyle] = useState<GlitchZoneStyle>(
    glitchConfig?.defaultStyle ?? defaults.zoneStyle,
  );
  const [pendingZoneDraft, setPendingZoneDraft] = useState<PendingZoneDraft>(() =>
    createDefaultPendingZoneDraft(glitchConfig?.defaultStyle ?? defaults.zoneStyle),
  );
  const workTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const zones = glitchConfig?.zones ?? [];
  const draftConfig = {
    wordPool,
    zones,
    builtinScramble,
    scrambleMode,
    errorDisplayMode,
    builtinTokens,
  };
  const hasScramble = fieldGlitchHasScramble(draftConfig);
  const pendingUsesError = pendingZoneDraft.errorMessageSource !== "none";
  const showScrambleSettings =
    hasScramble || pendingUsesError || Boolean(wordPool.trim()) || builtinScramble;
  const showBuiltinTokenPicker = Boolean(
    showScrambleSettings &&
    (wordPool.trim() ? scrambleMode === "referenceWithBuiltin" : builtinScramble),
  );
  const activeSelection = workSelection ?? externalSelection;
  const zoneFingerprint = zones
    .map((zone) => `${zone.id}:${zone.start}:${zone.end}:${zone.original}`)
    .join("|");
  const previewConfig = useMemo(
    () =>
      zones.length > 0
        ? buildConfig({
            wordPool,
            zones,
            tickMs,
            defaultStyle: zoneStyle,
            scrambleMode,
            builtinScramble,
            errorDisplayMode,
            builtinTokens,
          })
        : undefined,
    [
      builtinScramble,
      builtinTokens,
      errorDisplayMode,
      scrambleMode,
      tickMs,
      wordPool,
      zoneStyle,
      zones,
    ],
  );
  const previewLoopSignature = useMemo(
    () => glitchConfigSignature(fieldValue, previewConfig ?? glitchConfig),
    [
      fieldValue,
      previewConfig,
      glitchConfig?.wordPool,
      glitchConfig?.scrambleMode,
      glitchConfig?.builtinScramble,
      glitchConfig?.builtinTokens,
      glitchConfig?.errorDisplayMode,
      glitchConfig?.tickMs,
      glitchConfig?.defaultStyle,
      zoneFingerprint,
    ],
  );
  const activeFieldLabel = activeFieldPath ? getGlitchFieldLabel(activeFieldPath) : null;
  const selectionStyle = normalizeGlitchZoneStyle(pendingZoneDraft.style);
  const canPreviewSelection = Boolean(activeSelection && hasGlitchPresentation(selectionStyle));
  const pendingZonePreview: GlitchZone | null = activeSelection
    ? {
        id: "pending",
        start: activeSelection.start,
        end: activeSelection.end,
        original: activeSelection.text,
        style: pendingZoneDraft.style,
        errorMessageSource: pendingZoneDraft.errorMessageSource,
        ...(pendingZoneDraft.errorMessage ? { errorMessage: pendingZoneDraft.errorMessage } : {}),
        ...(pendingZoneDraft.linkTarget ? { linkTarget: pendingZoneDraft.linkTarget } : {}),
      }
    : null;

  const notify = (message: string) => {
    setToolNotice(message);
    onNotice?.(message);
  };

  const defaultStyleSignature = glitchZoneStyleSignature(glitchConfig?.defaultStyle);

  useEffect(() => {
    setWordPool(glitchConfig?.wordPool ?? "");
    setScrambleMode(glitchConfig?.scrambleMode ?? "referenceOnly");
    setBuiltinScramble(glitchConfig?.builtinScramble === true);
    setErrorDisplayMode(glitchConfig?.errorDisplayMode ?? "alternate");
    setBuiltinTokens(glitchConfig?.builtinTokens ?? []);
    setTickMs(glitchConfig?.tickMs ?? DEFAULT_GLITCH_TICK_MS);
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
    setWorkSelection(null);
  }, [
    activeFieldPath,
    glitchConfig?.builtinScramble,
    glitchConfig?.builtinTokens,
    defaultStyleSignature,
    glitchConfig?.errorDisplayMode,
    glitchConfig?.scrambleMode,
    glitchConfig?.tickMs,
    glitchConfig?.wordPool,
  ]);

  const commitConfig = (
    options: Partial<TextScrambleToolConfigOptions> & { zones: GlitchZone[] },
  ) => {
    onGlitchChange(
      buildConfig({
        wordPool: options.wordPool ?? wordPool,
        zones: options.zones,
        tickMs: options.tickMs ?? tickMs,
        defaultStyle: options.defaultStyle ?? zoneStyle,
        scrambleMode: options.scrambleMode ?? scrambleMode,
        builtinScramble: options.builtinScramble ?? builtinScramble,
        errorDisplayMode: options.errorDisplayMode ?? errorDisplayMode,
        builtinTokens: options.builtinTokens ?? builtinTokens,
      }),
    );
  };

  const handleErrorDisplayModeChange = (nextMode: GlitchErrorDisplayMode) => {
    setErrorDisplayMode(nextMode);
    if (zones.length > 0) {
      commitConfig({ zones, errorDisplayMode: nextMode });
    }
  };

  const handleBuiltinTokensChange = (nextTokens: string[]) => {
    setBuiltinTokens(nextTokens);
    if (zones.length > 0) {
      commitConfig({ zones, builtinTokens: nextTokens });
    }
  };

  useEffect(() => {
    setPendingZoneDraft((current) => {
      if (glitchZoneStylesEqual(current.style, zoneStyle)) {
        return current;
      }

      return {
        ...current,
        style: zoneStyle,
      };
    });
  }, [zoneStyle]);

  useEffect(() => {
    if (!activeSelection) {
      return;
    }

    setPendingZoneDraft((current) => {
      if (glitchZoneStylesEqual(current.style, zoneStyle)) {
        return current;
      }

      return {
        ...current,
        style: zoneStyle,
      };
    });
  }, [activeSelection?.start, activeSelection?.end, activeSelection?.text, zoneStyle]);

  const updatePendingZoneDraft = (patch: Partial<PendingZoneDraft>) => {
    setPendingZoneDraft((current) => ({ ...current, ...patch }));
  };

  const updateSelectionFromTextarea = (element: HTMLTextAreaElement) => {
    setWorkSelection(readGlitchTextSelection(element));
  };

  const handleTickMsChange = (nextTickMs: number) => {
    const clamped = clampGlitchTickMs(nextTickMs);
    setTickMs(clamped);
  };

  const handleTickMsCommit = (nextTickMs: number) => {
    const clamped = clampGlitchTickMs(nextTickMs);
    setTickMs(clamped);
    if (zones.length > 0) {
      commitConfig({ zones, tickMs: clamped });
    }
  };

  const handleZoneStyleChange = (nextStyle: GlitchZoneStyle) => {
    const normalized = normalizeGlitchZoneStyle(nextStyle) ?? {};
    if (glitchZoneStylesEqual(normalized, zoneStyle)) {
      return;
    }

    setZoneStyle(normalized);
    updatePendingZoneDraft({ style: normalized });
    if (zones.length > 0) {
      commitConfig({ zones, defaultStyle: normalized });
    }
  };

  const handleScrambleModeChange = (nextMode: GlitchScrambleMode) => {
    setScrambleMode(nextMode);
    if (zones.length > 0) {
      const nextZones =
        nextMode === "referenceOnly"
          ? zones.map((zone) => {
              if (zone.errorMessageSource !== "custom") {
                return zone;
              }

              const { errorMessage: _removed, ...rest } = zone;
              return { ...rest, errorMessageSource: "auto" as const };
            })
          : zones;
      commitConfig({ zones: nextZones, scrambleMode: nextMode });
      notify(
        nextMode === "referenceOnly"
          ? "오류 메시지에 참조 단어 글자만 무작위로 섞어 씁니다."
          : "오류 메시지에 참조 단어 글자를 섞고 기본 기호도 함께 넣습니다.",
      );
    }
  };

  const handleBuiltinScrambleChange = (nextValue: boolean) => {
    setBuiltinScramble(nextValue);
    if (zones.length > 0) {
      commitConfig({ zones, builtinScramble: nextValue });
    }
  };

  const handleAddZone = (selectionOverride?: GlitchTextSelection | null) => {
    if (!activeFieldPath) {
      notify("위 편집 칸을 클릭해서 어느 필드에 적용할지 먼저 선택해주세요.");
      return;
    }

    const selection = selectionOverride ?? activeSelection;

    if (!selection) {
      notify("구간을 선택해주세요. 아래 「드래그 없이 구간 지정」도 사용할 수 있어요.");
      return;
    }

    const normalizedStyle = normalizeGlitchZoneStyle(pendingZoneDraft.style);
    const pool = wordPool.trim();
    const wantsReference = Boolean(pool);
    const wantsBuiltin = !pool && builtinScramble;
    const hasPresentation = hasGlitchPresentation(normalizedStyle);
    const hasLink = Boolean(normalizeZoneLinkTarget(pendingZoneDraft.linkTarget));

    if (!wantsReference && !wantsBuiltin && !hasPresentation && !hasLink) {
      notify("참조 단어, 기본 오류, 서식, 페이지 이동 연결 중 하나 이상을 설정해주세요.");
      return;
    }

    const errorMessageSource =
      pendingZoneDraft.errorMessageSource !== "none"
        ? pendingZoneDraft.errorMessageSource
        : wantsReference || wantsBuiltin
          ? ("auto" as const)
          : ("none" as const);
    const customMessage =
      errorMessageSource === "custom" ? pendingZoneDraft.errorMessage?.trim() : undefined;
    const linkTarget = normalizeZoneLinkTarget(pendingZoneDraft.linkTarget);

    const matchingZone = zones.find(
      (zone) =>
        zone.start === selection.start &&
        zone.end === selection.end &&
        zone.original === selection.text,
    );
    if (matchingZone) {
      const nextZones = zones.map((zone) =>
        zone.id === matchingZone.id
          ? {
              ...zone,
              style: normalizedStyle,
              errorMessageSource,
              ...(customMessage ? { errorMessage: customMessage } : { errorMessage: undefined }),
              ...(linkTarget
                ? { linkTarget, linkSubPageId: undefined }
                : { linkTarget: undefined, linkSubPageId: undefined }),
            }
          : zone,
      );
      commitConfig({ zones: nextZones, defaultStyle: normalizedStyle ?? zoneStyle });
      notify("선택한 구간 설정을 갱신했어요.");
      return;
    }

    const overlaps = zones.some((zone) => zonesOverlap(zone, selection));
    if (overlaps) {
      notify("이미 적용된 구간과 겹칩니다. 「스타일 수정」으로 바꾸거나 다른 구간을 선택해주세요.");
      return;
    }

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

    const nextZones = [...zones, nextZone].sort((left, right) => left.start - right.start);
    commitConfig({ zones: nextZones, defaultStyle: normalizedStyle ?? zoneStyle });
    setPendingZoneDraft(createDefaultPendingZoneDraft(normalizedStyle ?? zoneStyle));

    notify(
      wantsReference || wantsBuiltin || errorMessageSource === "custom"
        ? `${activeFieldLabel} · ${selection.start + 1}~${selection.end}번째 글자에 오류를 지정했어요.`
        : hasLink
          ? `${activeFieldLabel} · ${selection.start + 1}~${selection.end}번째 글자에 페이지 이동을 연결했어요.`
          : `${activeFieldLabel} · ${selection.start + 1}~${selection.end}번째 글자에 서식을 적용했어요.`,
    );
  };

  const applySelection = (selection: GlitchTextSelection) => {
    setWorkSelection(selection);
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

  const handleZoneErrorUpdate = (zoneId: string, patch: Partial<GlitchZone>) => {
    const nextZones = zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone));
    commitConfig({ zones: nextZones });
  };

  const handleZoneLinkChange = (zoneId: string, target: ZoneLinkTarget | undefined) => {
    const nextZones = zones.map((zone) => {
      if (zone.id !== zoneId) {
        return zone;
      }

      if (!target) {
        const { linkTarget: _linkTarget, linkSubPageId: _linkSubPageId, ...rest } = zone;
        return rest;
      }

      return {
        ...zone,
        linkTarget: target,
        linkSubPageId: undefined,
      };
    });

    commitConfig({ zones: nextZones });
    notify(
      target
        ? `「${zones.find((zone) => zone.id === zoneId)?.original ?? ""}」 → ${formatZoneLinkLabel(target, allCharacters)}`
        : "페이지 이동 연결을 해제했어요.",
    );
  };

  const linkContext = useMemo(
    () => ({ section: currentSection, characterId: currentCharacterId }),
    [currentCharacterId, currentSection],
  );

  const handleZoneStyleUpdate = (zoneId: string, nextStyle: GlitchZoneStyle) => {
    const normalizedStyle = normalizeGlitchZoneStyle(nextStyle);
    const currentZone = zones.find((zone) => zone.id === zoneId);
    if (glitchZoneStylesEqual(normalizedStyle, currentZone?.style)) {
      return;
    }

    const nextZones = zones.map((zone) => {
      if (zone.id !== zoneId) {
        return zone;
      }

      return normalizedStyle ? { ...zone, style: normalizedStyle } : { ...zone, style: undefined };
    });
    commitConfig({ zones: nextZones });
  };

  return (
    <section
      className="max-w-full min-w-0 border border-emerald-100/15 bg-black/30 p-4 pb-6"
      data-text-corruptor-ignore
      data-text-scramble-tool
    >
      <h3 className="text-sm font-semibold text-emerald-50">텍스트 오류 · 서식 도구</h3>
      <p className="mt-2 text-xs leading-6 text-emerald-100/60">
        필드를 고른 뒤 구간을 선택하고, 적용 전에 스타일·오류 메시지·페이지 이동을 모두 설정할 수
        있습니다.
      </p>

      {activeFieldPath ? (
        <div className="mt-3 border border-emerald-200/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-50">
          현재 필드: <span className="font-semibold">{activeFieldLabel}</span>
          {zones.length > 0 && (
            <span className="ml-2 text-emerald-100/60">· 적용 구간 {zones.length}개</span>
          )}
        </div>
      ) : (
        <p className="mt-3 border border-amber-400/30 bg-amber-950/20 p-3 text-xs leading-6 text-amber-100">
          위 편집 칸을 클릭한 뒤, 그 칸에서 바로 드래그하거나 아래 작업 텍스트에서 구간을
          선택하세요.
        </p>
      )}

      {!activeSelection ? (
        <GlitchStyleEditor style={zoneStyle} onStyleChange={handleZoneStyleChange} />
      ) : null}

      <label className="mt-3 grid gap-2 text-xs text-emerald-100/70">
        참조 단어 <span className="text-emerald-100/45">(선택 · 오류 메시지를 쓰는 구간만)</span>
        <textarea
          value={wordPool}
          onChange={(event) => {
            const raw = event.target.value;
            const next = sanitizePlainText(raw);
            setWordPool(next);
            if (zones.length > 0) {
              commitConfig({ zones, wordPool: next });
            }
            if (glitchTextWasSanitized(raw, next)) {
              notify(
                "참조 단어는 일반 글자만 넣어주세요. 오류 문구는 자동으로 뒤죽박죽(합성 기호) 처리됩니다.",
              );
            }
          }}
          placeholder={"한 줄에 하나씩 · 예: 오류\n불완전\nNULL"}
          className="auth-input min-h-20 max-w-full break-all"
          data-text-corruptor-ignore
        />
      </label>

      {showScrambleSettings && wordPool.trim() ? (
        <fieldset className="mt-3 border border-emerald-100/15 bg-black/25 p-3">
          <legend className="px-1 text-[11px] font-medium text-emerald-100/85">
            오류 메시지 구성
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminChoiceButton
              active={scrambleMode === "referenceOnly"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleScrambleModeChange("referenceOnly")}
            >
              참조 단어만
            </AdminChoiceButton>
            <AdminChoiceButton
              active={scrambleMode === "referenceWithBuiltin"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleScrambleModeChange("referenceWithBuiltin")}
            >
              참조 단어 + 기본 기호
            </AdminChoiceButton>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-emerald-100/50">
            「기본 기호」는 #, ?, ERR, NULL, ??? 같은 기본 제공 문구·기호입니다.
            {scrambleMode === "referenceOnly"
              ? " 참조 단어 글자만 무작위로 섞어 구간 길이에 맞춥니다. (오류·불완전·NULL 등 풀 안 글자만 사용)"
              : " 참조 단어로 문구를 만든 뒤 기본 기호(#, ERR 등)로 일부 글자를 더 섞습니다."}
          </p>
        </fieldset>
      ) : showScrambleSettings ? (
        <label className="mt-3 flex items-start gap-2 border border-emerald-100/15 bg-black/25 p-3 text-xs text-emerald-100/75">
          <input
            type="checkbox"
            checked={builtinScramble}
            onChange={(event) => handleBuiltinScrambleChange(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-emerald-50">기본 오류 메시지 사용</span>
            <span className="mt-1 block text-[11px] leading-5 text-emerald-100/50">
              「오류 메시지 사용」을 켠 구간에 ERR, NULL, ??? 같은 기본 문구를 넣습니다.
            </span>
          </span>
        </label>
      ) : null}

      {showBuiltinTokenPicker ? (
        <BuiltinTokenPicker selectedTokens={builtinTokens} onChange={handleBuiltinTokensChange} />
      ) : null}

      {showScrambleSettings && hasScramble ? (
        <fieldset className="mt-3 border border-emerald-100/15 bg-black/25 p-3">
          <legend className="px-1 text-[11px] font-medium text-emerald-100/85">전환 방식</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminChoiceButton
              active={errorDisplayMode === "alternate"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleErrorDisplayModeChange("alternate")}
            >
              원문 ↔ 오류 번갈아
            </AdminChoiceButton>
            <AdminChoiceButton
              active={errorDisplayMode === "randomOnly"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleErrorDisplayModeChange("randomOnly")}
            >
              오류만 랜덤
            </AdminChoiceButton>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-emerald-100/50">
            {errorDisplayMode === "alternate"
              ? "본 페이지처럼 원문과 오류 메시지가 번갈아 보입니다."
              : "원문 없이 오류 메시지만 계속 바뀝니다."}
          </p>
        </fieldset>
      ) : null}

      {hasScramble ? (
        <GlitchTickEditor
          tickMs={tickMs}
          onTickMsChange={handleTickMsChange}
          onTickMsCommit={handleTickMsCommit}
        />
      ) : null}

      <label className="mt-4 grid gap-2 text-xs text-emerald-100/70">
        작업 텍스트
        <textarea
          ref={workTextareaRef}
          value={fieldValue}
          data-glitch-work-textarea
          onChange={(event) => onFieldValueChange(event.target.value)}
          onSelect={(event) => updateSelectionFromTextarea(event.currentTarget)}
          onKeyUp={(event) => updateSelectionFromTextarea(event.currentTarget)}
          onMouseUp={(event) => updateSelectionFromTextarea(event.currentTarget)}
          placeholder={
            activeFieldPath
              ? "위 편집 칸과 같은 내용입니다. 여기서도 구간을 선택할 수 있어요."
              : "먼저 위 편집 칸을 클릭해주세요."
          }
          disabled={!activeFieldPath}
          className="auth-input min-h-32 disabled:cursor-not-allowed disabled:opacity-50"
          data-text-corruptor-ignore
        />
      </label>

      <GlitchZoneRangePicker
        fieldValue={fieldValue}
        disabled={!activeFieldPath}
        onSelect={applySelection}
        onApply={(selection) => handleAddZone(selection)}
        onNotice={notify}
      />

      {activeSelection && pendingZonePreview ? (
        <div
          className="mt-3 border border-amber-300/35 bg-amber-950/25 p-3"
          onMouseDown={keepAdminTextSelection}
        >
          <p className="text-xs font-medium text-amber-100">
            선택 구간 설정 · {activeSelection.start + 1}~{activeSelection.end}번째 글자 (
            {activeSelection.text.length}자)
          </p>
          <p className="mt-2 text-sm leading-7 break-all text-emerald-50/90">
            {fieldValue.slice(Math.max(0, activeSelection.start - 24), activeSelection.start)}
            <mark className="bg-amber-300/35 px-1 text-amber-50">{activeSelection.text}</mark>
            {fieldValue.slice(activeSelection.end, activeSelection.end + 24)}
          </p>
          {canPreviewSelection ? (
            <div className="mt-3 border border-emerald-100/15 bg-black/30 p-2">
              <p className="text-[11px] text-emerald-100/55">서식 미리보기</p>
              <p className="mt-2 text-sm leading-7 text-emerald-50/90">
                <GlitchZoneMark
                  text={activeSelection.text}
                  original={activeSelection.text}
                  zoneStyle={selectionStyle}
                />
              </p>
            </div>
          ) : null}
          <GlitchStyleEditor
            compact
            style={pendingZoneDraft.style}
            onStyleChange={(nextStyle) => {
              handleZoneStyleChange(nextStyle);
            }}
          />
          <ZoneErrorMessageEditor
            zone={pendingZonePreview}
            wordPool={wordPool}
            scrambleMode={scrambleMode}
            builtinScramble={builtinScramble}
            builtinTokens={builtinTokens}
            onChange={(patch) =>
              updatePendingZoneDraft({
                errorMessageSource: patch.errorMessageSource ?? pendingZoneDraft.errorMessageSource,
                errorMessage: patch.errorMessage,
              })
            }
          />
          <ZoneLinkEditor
            target={pendingZoneDraft.linkTarget}
            allCharacters={allCharacters}
            currentCharacterId={currentCharacterId}
            currentSection={currentSection}
            onChange={(nextTarget) => updatePendingZoneDraft({ linkTarget: nextTarget })}
            immediateApply
          />
        </div>
      ) : (
        <p className="mt-3 border border-stone-500/20 bg-stone-950/30 p-3 text-xs leading-6 text-stone-300">
          위 「드래그 없이 구간 지정」에서 전체 적용, 문구 찾기, 글자 번호를 사용하거나 작업
          텍스트를 드래그한 뒤, 여기서 스타일·오류·이동 연결을 먼저 설정하세요.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <AdminChoiceButton
          variant="primary"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleAddZone()}
          disabled={!activeFieldPath || !activeSelection}
          className="px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          이 구간에 적용
        </AdminChoiceButton>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClearAllZones}
          disabled={!activeFieldPath || zones.length === 0}
          className="admin-ghost-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          이 필드 전부 제거
        </button>
      </div>

      {zones.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-emerald-100/80">저장될 구간</p>
          {zones.map((zone, index) => (
            <div
              key={zone.id}
              className="overflow-visible border border-emerald-100/15 bg-black/25 px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-xs leading-6 break-all text-emerald-50/90">
                  <span className="font-semibold text-emerald-100">
                    구간 {index + 1} · {zone.start + 1}~{zone.end}번째 글자
                  </span>
                  <span className="mx-2 text-emerald-100/40">|</span>
                  <span className="font-mono text-emerald-100/80">
                    「{truncateMiddle(zone.original)}」
                  </span>
                  {zone.errorMessageSource === "custom" && zone.errorMessage ? (
                    <>
                      <span className="mx-2 text-emerald-100/40">→</span>
                      <span className="font-mono text-amber-100/85">
                        「{truncateMiddle(zone.errorMessage, 24)}」
                      </span>
                    </>
                  ) : null}
                  {zone.errorMessageSource === "none" ? (
                    <span className="ml-2 text-emerald-100/45">· 서식만</span>
                  ) : null}
                  {resolveZoneLink(zone, linkContext) ? (
                    <span className="ml-2 text-sky-200/80">
                      · {formatZoneLinkLabel(resolveZoneLink(zone, linkContext)!, allCharacters)}
                    </span>
                  ) : null}
                  {zone.style || zoneStyle ? (
                    <>
                      <span className="mx-2 text-emerald-100/40">|</span>
                      <GlitchZoneMark
                        text={truncateMiddle(zone.original, 24)}
                        original={truncateMiddle(zone.original, 24)}
                        zoneStyle={zone.style}
                      />
                    </>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleRemoveZone(zone.id)}
                    className="admin-ghost-btn px-2 py-1 text-[11px]"
                  >
                    제거
                  </button>
                </div>
              </div>
              <div className="mt-3" onMouseDown={keepAdminTextSelection}>
                <GlitchStyleEditor
                  compact
                  style={zone.style ?? zoneStyle}
                  onStyleChange={(nextStyle) => handleZoneStyleUpdate(zone.id, nextStyle)}
                />
                <ZoneErrorMessageEditor
                  zone={zone}
                  wordPool={wordPool}
                  scrambleMode={scrambleMode}
                  builtinScramble={builtinScramble}
                  builtinTokens={builtinTokens}
                  onChange={(patch) => handleZoneErrorUpdate(zone.id, patch)}
                />
                <ZoneLinkEditor
                  target={resolveZoneLink(zone, linkContext)}
                  allCharacters={allCharacters}
                  currentCharacterId={currentCharacterId}
                  currentSection={currentSection}
                  onChange={(nextTarget) => handleZoneLinkChange(zone.id, nextTarget)}
                  immediateApply
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border border-emerald-100/15 bg-black/40 p-3">
        <p className="text-xs font-medium text-emerald-100/80">본 페이지 미리보기</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
          {hasScramble
            ? errorDisplayMode === "alternate"
              ? "본 페이지와 같이 원문 ↔ 오류 메시지가 번갈아 바뀝니다."
              : "본 페이지와 같이 오류 메시지만 계속 랜덤으로 바뀝니다."
            : "본 페이지와 같이 서식·색상이 적용된 모습입니다."}
        </p>
        <p className="mt-3 min-h-[4.5rem] text-sm leading-7 break-words whitespace-pre-wrap text-emerald-50/90">
          {previewLoopSignature && previewConfig ? (
            <GlitchedText text={fieldValue} glitch={previewConfig} preserveWhitespace />
          ) : (
            <span className="text-emerald-100/35">구간을 적용하면 미리보기가 나타납니다.</span>
          )}
        </p>
      </div>

      {toolNotice && (
        <p className="mt-3 border border-stone-400/25 bg-stone-900/25 p-2 text-xs leading-6 text-stone-200">
          {toolNotice}
        </p>
      )}
    </section>
  );
}
