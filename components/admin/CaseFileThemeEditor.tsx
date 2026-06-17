"use client";

import type { CSSProperties } from "react";
import {
  CASE_FILE_THEME_FIELDS,
  DEFAULT_CASE_FILE_DETAIL_THEME,
  resolveCaseFileDetailTheme,
} from "@/lib/case-file-theme";
import type { CaseFileDetailTheme } from "@/lib/types";

interface CaseFileThemeEditorProps {
  theme?: CaseFileDetailTheme;
  onChange: (theme: CaseFileDetailTheme | undefined) => void;
}

function ColorField({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value?: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const resolved = value ?? defaultValue;
  const pickerValue = resolved.startsWith("#") ? resolved : "#1a1a1a";

  return (
    <label className="grid gap-1.5 text-[11px] text-emerald-100/70">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer border border-emerald-100/15 bg-black/40 p-0.5"
          aria-label={`${label} 색 선택`}
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={defaultValue}
          className="auth-input min-h-8 flex-1 px-2 py-1 text-[11px]"
          data-text-corruptor-ignore
        />
      </div>
    </label>
  );
}

export function CaseFileThemeEditor({ theme, onChange }: CaseFileThemeEditorProps) {
  const resolved = resolveCaseFileDetailTheme(theme);

  const updateField = (key: keyof CaseFileDetailTheme, raw: string) => {
    const trimmed = raw.trim();
    const next = { ...(theme ?? {}) };

    if (!trimmed || trimmed === DEFAULT_CASE_FILE_DETAIL_THEME[key]) {
      delete next[key];
    } else {
      next[key] = trimmed;
    }

    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const introFields = CASE_FILE_THEME_FIELDS.filter((field) => field.group === "intro");
  const voiceFields = CASE_FILE_THEME_FIELDS.filter((field) => field.group === "voice");

  return (
    <section className="grid gap-4 border border-emerald-100/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-50">상세 페이지 테마</p>
          <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
            한 줄 소개·한마디 박스 색을 이 캐릭터(또는 상세 페이지)에 맞게 바꿉니다.
            본문·히어로 배경은 「색 분위기」에서 고른 3색 그라데이션을 따릅니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="border border-stone-400/30 px-3 py-1.5 text-[11px] text-stone-200"
        >
          기본값으로
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-emerald-100/55 uppercase">
            한 줄 소개
          </p>
          <div
            className="case-file-intro case-file-theme-preview"
            style={
              {
                "--case-intro-label": resolved.introLabel,
                "--case-intro-text": resolved.introText,
                "--case-intro-bg": resolved.introBackground,
                "--case-intro-border": resolved.introBorder,
              } as CSSProperties
            }
          >
            <p className="case-file-intro-label">한 줄 소개</p>
            <p className="case-file-intro-text">미리보기 문장입니다.</p>
          </div>
          {introFields.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={theme?.[field.key]}
              defaultValue={DEFAULT_CASE_FILE_DETAIL_THEME[field.key]}
              onChange={(value) => updateField(field.key, value)}
            />
          ))}
        </div>

        <div className="grid gap-3">
          <p className="text-[11px] font-medium tracking-[0.18em] text-emerald-100/55 uppercase">
            한마디
          </p>
          <div
            className="case-file-intro case-file-voice case-file-theme-preview"
            style={
              {
                "--case-voice-label": resolved.voiceLabel,
                "--case-voice-text": resolved.voiceText,
                "--case-voice-bg": resolved.voiceBackground,
                "--case-voice-border": resolved.voiceBorder,
              } as CSSProperties
            }
          >
            <p className="case-file-intro-label">한마디</p>
            <p className="case-file-intro-text">미리보기 한마디</p>
          </div>
          {voiceFields.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={theme?.[field.key]}
              defaultValue={DEFAULT_CASE_FILE_DETAIL_THEME[field.key]}
              onChange={(value) => updateField(field.key, value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
