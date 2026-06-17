"use client";

import type { ChangeEvent } from "react";
import {
  buildCharacterPaletteGradient,
  characterPaletteStyle,
  parseCharacterPalette,
  type CharacterPaletteColors,
} from "@/lib/character-palette";

interface PaletteEditorProps {
  palette: string;
  onChange: (palette: string) => void;
  onExtractFromImage?: (file: File) => Promise<string | null>;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = value.startsWith("#") ? value : "#09090b";

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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="auth-input min-h-8 flex-1 px-2 py-1 text-[11px]"
          data-text-corruptor-ignore
        />
      </div>
    </label>
  );
}

export function PaletteEditor({ palette, onChange, onExtractFromImage }: PaletteEditorProps) {
  const colors = parseCharacterPalette(palette);

  const updateColors = (next: Partial<CharacterPaletteColors>) => {
    onChange(
      buildCharacterPaletteGradient({
        ...colors,
        ...next,
      }),
    );
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onExtractFromImage) {
      return;
    }

    const extracted = await onExtractFromImage(file);
    if (extracted) {
      onChange(extracted);
    }
  };

  return (
    <div className="grid gap-3">
      <div
        className="character-palette-surface h-10 border border-emerald-100/10"
        style={characterPaletteStyle(palette)}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <ColorField label="왼쪽" value={colors.start} onChange={(start) => updateColors({ start })} />
        <ColorField label="중간" value={colors.mid} onChange={(mid) => updateColors({ mid })} />
        <ColorField label="오른쪽" value={colors.end} onChange={(end) => updateColors({ end })} />
      </div>
      {onExtractFromImage ? (
        <label className="inline-flex w-fit cursor-pointer border border-emerald-100/15 px-3 py-1.5 text-[11px] text-emerald-100/70 hover:border-emerald-100/30">
          일러스트에서 색 추출
          <input type="file" accept="image/*" className="sr-only" onChange={handleImagePick} />
        </label>
      ) : null}
    </div>
  );
}
