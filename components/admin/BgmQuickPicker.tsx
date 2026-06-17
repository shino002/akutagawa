"use client";

import { ChangeEvent, useRef, useState } from "react";
import type { BgmOption } from "@/lib/bgm-catalog";

type BgmQuickPickerProps = {
  value: string;
  options: BgmOption[];
  onChange: (url: string) => void;
  onQuickUpload: (file: File) => Promise<string>;
  disabled?: boolean;
};

export function BgmQuickPicker({ value, options, onChange, onQuickUpload, disabled = false }: BgmQuickPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const siteOptions = options.filter((option) => option.scope === "site");
  const characterOnlyOptions = options.filter((option) => option.scope === "character-only");

  async function handleQuickUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || isUploading) {
      return;
    }

    try {
      setIsUploading(true);
      const url = await onQuickUpload(file);
      onChange(url);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="auth-input" disabled={disabled}>
        <option value="">사이트 기본 BGM (상세에서도 기본 목록)</option>
        <optgroup label="사이트 기본 목록">
          {siteOptions.map((option) => (
            <option key={option.url} value={option.url}>
              {option.label}
              {option.source === "custom" ? " (추가됨)" : ""}
            </option>
          ))}
        </optgroup>
        <optgroup label="캐릭터 전용">
          {characterOnlyOptions.map((option) => (
            <option key={option.url} value={option.url}>
              {option.label}
              {option.source === "custom" ? " (추가됨)" : ""}
            </option>
          ))}
        </optgroup>
      </select>

      <div className="grid gap-2">
        <p className="text-xs text-emerald-100/55">빠른 선택</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.url}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.url)}
              className={`border px-2.5 py-1.5 text-xs ${
                value === option.url
                  ? "border-stone-400/35 bg-emerald-100/10 text-emerald-50"
                  : "border-emerald-100/15 bg-black/30 text-emerald-100/75"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => onChange("")}
            className="border border-emerald-100/15 bg-black/30 px-2.5 py-1.5 text-xs text-emerald-100/75"
          >
            기본 목록
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-xs text-emerald-100/55">빠른 추가 (mp3 업로드 후 바로 적용)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac"
          onChange={(event) => void handleQuickUpload(event)}
          disabled={disabled || isUploading}
          className="text-xs"
        />
        {isUploading && <p className="text-xs text-emerald-100/55">BGM 업로드 중...</p>}
      </div>

      <span className="text-xs leading-5 text-emerald-100/50">
        OC 상세 보기에서만 재생됩니다. 「사이트 기본 목록」은 기본 플레이어와 같고, 「캐릭터 전용」은 상세에서만 쓰는
        곡입니다. 빠른 추가로 올린 곡은 캐릭터 전용으로 목록에 저장됩니다.
      </span>
    </div>
  );
}
