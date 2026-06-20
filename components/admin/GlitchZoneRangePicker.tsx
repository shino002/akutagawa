"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGlitchSelectionFromRange,
  findGlitchTextSelection,
  getGlitchTextTokenSpans,
  type GlitchTextSelection,
} from "@/lib/glitch-selection";

interface GlitchZoneRangePickerProps {
  fieldValue: string;
  disabled?: boolean;
  onSelect: (selection: GlitchTextSelection) => void;
  onApply?: (selection: GlitchTextSelection) => void;
  onNotice?: (message: string) => void;
}

export function GlitchZoneRangePicker({
  fieldValue,
  disabled = false,
  onSelect,
  onApply,
  onNotice,
}: GlitchZoneRangePickerProps) {
  const [findText, setFindText] = useState("");
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const tokenSpans = useMemo(() => getGlitchTextTokenSpans(fieldValue), [fieldValue]);

  useEffect(() => {
    const length = Math.max(fieldValue.length, 1);
    setRangeStart(1);
    setRangeEnd(length);
  }, [fieldValue]);

  const notify = (message: string) => {
    onNotice?.(message);
  };

  const applyRange = (start: number, end: number) => {
    const selection = createGlitchSelectionFromRange(fieldValue, start, end);

    if (!selection) {
      notify("구간을 다시 확인해주세요.");
      return;
    }

    onSelect(selection);
  };

  const applyFindText = () => {
    const selection = findGlitchTextSelection(fieldValue, findText);

    if (!selection) {
      notify("해당 문구를 찾지 못했어요.");
      return;
    }

    onSelect(selection);
  };

  return (
    <details className="mt-2 border border-emerald-100/10 bg-black/20">
      <summary className="cursor-pointer px-3 py-2 text-[11px] text-emerald-100/60">
        드래그가 어려우면 · 문구 찾기 · 번호 지정
      </summary>
      <div className="space-y-3 border-t border-emerald-100/10 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || !fieldValue}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyRange(0, fieldValue.length)}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50 disabled:opacity-40"
          >
            전체 선택
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={findText}
            onChange={(event) => setFindText(event.target.value)}
            disabled={disabled || !fieldValue}
            placeholder="찾을 문구"
            className="auth-input min-h-9 min-w-[10rem] flex-1 px-2 py-1 text-xs disabled:opacity-40"
            data-text-corruptor-ignore
          />
          <button
            type="button"
            disabled={disabled || !fieldValue || !findText.trim()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyFindText}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50 disabled:opacity-40"
          >
            선택
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[11px] text-emerald-100/60">
            시작
            <input
              type="number"
              min={1}
              max={Math.max(fieldValue.length, 1)}
              value={rangeStart}
              onChange={(event) => setRangeStart(Number(event.target.value))}
              disabled={disabled || !fieldValue}
              className="auth-input min-h-9 w-20 px-2 py-1 text-xs disabled:opacity-40"
              data-text-corruptor-ignore
            />
          </label>
          <label className="grid gap-1 text-[11px] text-emerald-100/60">
            끝
            <input
              type="number"
              min={1}
              max={Math.max(fieldValue.length, 1)}
              value={rangeEnd}
              onChange={(event) => setRangeEnd(Number(event.target.value))}
              disabled={disabled || !fieldValue}
              className="auth-input min-h-9 w-20 px-2 py-1 text-xs disabled:opacity-40"
              data-text-corruptor-ignore
            />
          </label>
          <button
            type="button"
            disabled={disabled || !fieldValue}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyRange(rangeStart - 1, rangeEnd)}
            className="border border-emerald-100/20 px-2 py-2 text-[11px] text-emerald-50 disabled:opacity-40"
          >
            범위 선택
          </button>
        </div>

        {tokenSpans.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {tokenSpans.map((span) => (
              <button
                key={`${span.start}-${span.end}`}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(span)}
                className="border border-emerald-100/20 px-2 py-1 font-mono text-[11px] text-emerald-50 disabled:opacity-40"
              >
                {span.text}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}
