"use client";

import {
  DEFAULT_GLITCH_TICK_MS,
  GLITCH_STYLE_PRESETS,
  MAX_GLITCH_TICK_MS,
  MIN_GLITCH_TICK_MS,
  normalizeColorInput,
  normalizeGlitchZoneStyle,
} from "@/lib/glitch-style";
import type { GlitchMarkdown, GlitchZoneStyle } from "@/lib/types";

interface GlitchStyleEditorProps {
  style: GlitchZoneStyle;
  onStyleChange: (style: GlitchZoneStyle) => void;
  compact?: boolean;
}

const MARKDOWN_OPTIONS: Array<{ key: keyof GlitchMarkdown; label: string; hint: string }> = [
  { key: "bold", label: "굵게", hint: "**텍스트**" },
  { key: "italic", label: "기울임", hint: "*텍스트*" },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const normalized = normalizeColorInput(value) ?? "#d6d0bc";

  return (
    <label className="grid gap-1 text-[11px] text-emerald-100/70">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalized.startsWith("#") ? normalized.slice(0, 7) : "#d6d0bc"}
          onChange={(event) => onChange(event.target.value)}
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

export function GlitchStyleEditor({ style, onStyleChange, compact = false }: GlitchStyleEditorProps) {
  const markdown = style.markdown ?? {};

  const updateStyle = (patch: GlitchZoneStyle) => {
    const merged: GlitchZoneStyle = {
      ...style,
      ...patch,
    };

    if ("markdown" in patch) {
      merged.markdown = patch.markdown;
    }

    onStyleChange(normalizeGlitchZoneStyle(merged) ?? merged);
  };

  const toggleMarkdown = (key: keyof GlitchMarkdown) => {
    const nextMarkdown = { ...markdown, [key]: !markdown[key] };
    if (!nextMarkdown[key]) {
      delete nextMarkdown[key];
    }

    updateStyle({
      markdown: Object.keys(nextMarkdown).length > 0 ? nextMarkdown : undefined,
    });
  };

  return (
    <div className={compact ? "space-y-3" : "mt-3 space-y-3 border border-emerald-100/15 bg-black/25 p-3"}>
      {!compact && (
        <div>
          <p className="text-xs font-medium text-emerald-100/85">구간 스타일</p>
          <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
            글자색·굵게·기울임만 적용됩니다. 배경 칠 효과는 사용하지 않습니다.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(GLITCH_STYLE_PRESETS).map(([presetId, presetStyle]) => (
          <button
            key={presetId}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => updateStyle({ ...presetStyle })}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
          >
            {presetId === "inherit" ? "기본" : presetId === "error" ? "굵게 강조" : "기울임 강조"}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => updateStyle({ textColor: undefined })}
          className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
        >
          색 초기화
        </button>
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
          <button
            key={option.key}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => toggleMarkdown(option.key)}
            className={
              markdown[option.key]
                ? "bg-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-950"
                : "border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
            }
            title={option.hint}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface GlitchTickEditorProps {
  tickMs: number;
  onTickMsChange: (tickMs: number) => void;
}

export function GlitchTickEditor({ tickMs, onTickMsChange }: GlitchTickEditorProps) {
  const seconds = (tickMs / 1000).toFixed(1);

  return (
    <label className="mt-3 grid gap-2 border border-emerald-100/15 bg-black/25 p-3 text-xs text-emerald-100/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-emerald-100/85">오류 ↔ 원문 전환 간격</span>
        <span className="font-mono text-emerald-50">{seconds}초</span>
      </div>
      <input
        type="range"
        min={MIN_GLITCH_TICK_MS}
        max={MAX_GLITCH_TICK_MS}
        step={50}
        value={tickMs}
        onChange={(event) => onTickMsChange(Number(event.target.value))}
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
