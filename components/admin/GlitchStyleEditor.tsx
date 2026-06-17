"use client";

import { useEffect, useState } from "react";
import {
  DECORATION_THICKNESS_STEP_PX,
  DEFAULT_DECORATION_THICKNESS_PX,
  DEFAULT_GLITCH_TICK_MS,
  clampGlitchTickMs,
  formatDecorationThicknessPx,
  GLITCH_STYLE_PRESETS,
  MAX_DECORATION_THICKNESS_PX,
  MAX_GLITCH_TICK_MS,
  MIN_DECORATION_THICKNESS_PX,
  MIN_GLITCH_TICK_MS,
  normalizeColorInput,
  normalizeGlitchZoneStyle,
  glitchZoneStylesEqual,
} from "@/lib/glitch-style";
import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import type { GlitchMarkdown, GlitchZoneStyle } from "@/lib/types";

interface GlitchStyleEditorProps {
  style: GlitchZoneStyle;
  onStyleChange: (style: GlitchZoneStyle) => void;
  compact?: boolean;
}

const MARKDOWN_OPTIONS: Array<{ key: keyof GlitchMarkdown; label: string; hint: string }> = [
  { key: "bold", label: "굵게", hint: "**텍스트**" },
  { key: "italic", label: "기울임", hint: "*텍스트*" },
  { key: "underline", label: "밑줄", hint: "밑줄" },
  { key: "strikethrough", label: "취소선", hint: "~~텍스트~~" },
];

const DEFAULT_PICKER_COLOR = "#d6d0bc";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const resolvedColor = normalizeColorInput(value);
  const pickerColor = resolvedColor ?? DEFAULT_PICKER_COLOR;

  const handlePickerChange = (next: string) => {
    if (!resolvedColor && next.toLowerCase() === DEFAULT_PICKER_COLOR.toLowerCase()) {
      return;
    }

    onChange(next);
  };

  return (
    <label className="grid gap-1 text-[11px] text-emerald-100/70">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerColor.startsWith("#") ? pickerColor.slice(0, 7) : DEFAULT_PICKER_COLOR}
          onChange={(event) => handlePickerChange(event.target.value)}
          className="h-8 w-10 cursor-pointer border border-emerald-100/20 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          placeholder="#d6d0bc"
          className="auth-input min-h-8 flex-1 px-2 py-1 text-[11px]"
          data-text-corruptor-ignore
        />
      </div>
    </label>
  );
}

function ThicknessField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const thickness = value ?? DEFAULT_DECORATION_THICKNESS_PX;

  return (
    <label className="grid gap-1 text-[11px] text-emerald-100/70">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-emerald-50">{formatDecorationThicknessPx(thickness)}</span>
      </div>
      <input
        type="range"
        min={MIN_DECORATION_THICKNESS_PX}
        max={MAX_DECORATION_THICKNESS_PX}
        step={DECORATION_THICKNESS_STEP_PX}
        value={thickness}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-300"
      />
    </label>
  );
}

export function GlitchStyleEditor({ style, onStyleChange, compact = false }: GlitchStyleEditorProps) {
  const markdown = style.markdown ?? {};
  const hasUnderline = Boolean(markdown.underline);
  const hasStrikethrough = Boolean(markdown.strikethrough);
  const showUnderlineSettings = hasUnderline;
  const showStrikethroughSettings = hasStrikethrough;

  const updateStyle = (patch: GlitchZoneStyle) => {
    const merged: GlitchZoneStyle = {
      ...style,
      ...patch,
    };

    if ("markdown" in patch) {
      merged.markdown = patch.markdown;
    }

    const normalized = normalizeGlitchZoneStyle(merged) ?? merged;
    if (glitchZoneStylesEqual(normalized, style)) {
      return;
    }

    onStyleChange(normalized);
  };

  const toggleMarkdown = (key: keyof GlitchMarkdown) => {
    const turningOff = Boolean(markdown[key]);
    const nextMarkdown = { ...markdown, [key]: !markdown[key] };
    if (!nextMarkdown[key]) {
      delete nextMarkdown[key];
    }

    const patch: GlitchZoneStyle = {
      markdown: Object.keys(nextMarkdown).length > 0 ? nextMarkdown : undefined,
    };

    if (turningOff && key === "underline") {
      patch.underlineColor = undefined;
      patch.underlineThickness = undefined;
    }

    if (turningOff && key === "strikethrough") {
      patch.strikethroughColor = undefined;
      patch.strikethroughThickness = undefined;
    }

    updateStyle(patch);
  };

  return (
    <div className={compact ? "space-y-3" : "mt-3 space-y-3 border border-emerald-100/15 bg-black/25 p-3"}>
      {!compact && (
        <div>
          <p className="text-xs font-medium text-emerald-100/85">구간 스타일</p>
          <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
            글자색·굵게·기울임·밑줄·취소선을 적용할 수 있습니다. 밑줄·취소선은 각각 색과 굵기도
            조절할 수 있습니다.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(GLITCH_STYLE_PRESETS).map(([presetId, presetStyle]) => (
          <AdminChoiceButton
            key={presetId}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => updateStyle({ ...presetStyle })}
          >
            {presetId === "inherit" ? "기본" : presetId === "error" ? "굵게 강조" : "기울임 강조"}
          </AdminChoiceButton>
        ))}
        <AdminChoiceButton
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            updateStyle({
              textColor: undefined,
              underlineColor: undefined,
              strikethroughColor: undefined,
            })
          }
        >
          색 초기화
        </AdminChoiceButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        <ColorField
          label="글자색"
          value={style.textColor}
          onChange={(textColor) => updateStyle({ textColor })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {MARKDOWN_OPTIONS.map((option) => (
          <AdminChoiceButton
            key={option.key}
            active={Boolean(markdown[option.key])}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => toggleMarkdown(option.key)}
            title={option.hint}
          >
            {option.label}
          </AdminChoiceButton>
        ))}
      </div>

      {showUnderlineSettings ? (
        <div className="grid gap-3 border border-emerald-100/10 bg-black/20 p-3">
          <p className="text-[11px] font-medium text-emerald-100/80">밑줄 설정</p>
          <ColorField
            label="밑줄 색 (비우면 글자색 따름)"
            value={style.underlineColor}
            onChange={(underlineColor) => updateStyle({ underlineColor })}
          />
          <ThicknessField
            label="밑줄 굵기"
            value={style.underlineThickness}
            onChange={(underlineThickness) => updateStyle({ underlineThickness })}
          />
        </div>
      ) : null}

      {showStrikethroughSettings ? (
        <div className="grid gap-3 border border-emerald-100/10 bg-black/20 p-3">
          <p className="text-[11px] font-medium text-emerald-100/80">취소선 설정</p>
          <ColorField
            label="취소선 색 (비우면 글자색 따름)"
            value={style.strikethroughColor}
            onChange={(strikethroughColor) => updateStyle({ strikethroughColor })}
          />
          <ThicknessField
            label="취소선 굵기"
            value={style.strikethroughThickness}
            onChange={(strikethroughThickness) => updateStyle({ strikethroughThickness })}
          />
        </div>
      ) : null}
    </div>
  );
}

interface GlitchTickEditorProps {
  tickMs: number;
  onTickMsChange: (tickMs: number) => void;
  onTickMsCommit?: (tickMs: number) => void;
}

export function GlitchTickEditor({ tickMs, onTickMsChange, onTickMsCommit }: GlitchTickEditorProps) {
  const [draftTickMs, setDraftTickMs] = useState(tickMs);
  const seconds = (draftTickMs / 1000).toFixed(1);

  useEffect(() => {
    setDraftTickMs(tickMs);
  }, [tickMs]);

  const commitTickMs = (value: number) => {
    const clamped = clampGlitchTickMs(value);
    setDraftTickMs(clamped);
    onTickMsChange(clamped);
    onTickMsCommit?.(clamped);
  };

  return (
    <label className="mt-3 grid gap-2 border border-emerald-100/15 bg-black/25 p-3 text-xs text-emerald-100/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-emerald-100/85">오류 ↔ 원문 전환 간격</span>
        <span className="min-w-[3.5rem] text-right font-mono text-emerald-50">{seconds}초</span>
      </div>
      <input
        type="range"
        min={MIN_GLITCH_TICK_MS}
        max={MAX_GLITCH_TICK_MS}
        step={50}
        value={draftTickMs}
        onChange={(event) => setDraftTickMs(Number(event.target.value))}
        onPointerUp={(event) => commitTickMs(Number(event.currentTarget.value))}
        onTouchEnd={(event) => commitTickMs(Number(event.currentTarget.value))}
        className="w-full accent-emerald-300"
      />
      <p className="text-[11px] leading-5 text-emerald-100/50">
        원문과 오류 메시지가 번갈아 보입니다. 0.1초~10초 사이에서 각 상태가 유지되는 시간을
        조절할 수 있습니다.
      </p>
    </label>
  );
}

export function createDefaultGlitchDraft() {
  return {
    tickMs: DEFAULT_GLITCH_TICK_MS,
    zoneStyle: GLITCH_STYLE_PRESETS.inherit as GlitchZoneStyle,
  };
}
