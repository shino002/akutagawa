"use client";

import { GLITCH_FONT_PRESETS } from "@/constants/glitch-font-presets";

interface FontPresetSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
  compact?: boolean;
}

export function FontPresetSelect({
  value,
  onChange,
  className,
  compact = false,
}: FontPresetSelectProps) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      className={className}
      data-text-corruptor-ignore
      data-admin-interactive
      aria-label="구간 폰트"
    >
      <option value="">{compact ? "폰트: 기본" : "기본 (주변 폰트 상속)"}</option>
      {GLITCH_FONT_PRESETS.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}
