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
  onApply: (selection: GlitchTextSelection) => void;
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

  const applyRange = (start: number, end: number, applyImmediately: boolean) => {
    const selection = createGlitchSelectionFromRange(fieldValue, start, end);

    if (!selection) {
      notify("구간을 다시 확인해주세요.");
      return;
    }

    onSelect(selection);

    if (applyImmediately) {
      onApply(selection);
    }
  };

  const applyFindText = (applyImmediately: boolean) => {
    const selection = findGlitchTextSelection(fieldValue, findText);

    if (!selection) {
      notify("해당 문구를 찾지 못했어요. 띄어쓰기까지 맞게 입력해주세요.");
      return;
    }

    onSelect(selection);

    if (applyImmediately) {
      onApply(selection);
    }
  };

  const handleManualSelect = () => {
    applyRange(rangeStart - 1, rangeEnd, false);
  };

  const handleManualApply = () => {
    applyRange(rangeStart - 1, rangeEnd, true);
  };

  const handleEntireSelect = () => {
    if (!fieldValue) {
      notify("먼저 필드를 선택하고 내용을 입력해주세요.");
      return;
    }

    applyRange(0, fieldValue.length, false);
  };

  const handleEntireApply = () => {
    if (!fieldValue) {
      notify("먼저 필드를 선택하고 내용을 입력해주세요.");
      return;
    }

    applyRange(0, fieldValue.length, true);
  };

  return (
    <div className="mt-3 border border-emerald-100/15 bg-black/25 p-3">
      <p className="text-xs font-medium text-emerald-100/85">드래그 없이 구간 지정</p>
      <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
        버튼만 눌러도 구간을 고를 수 있어요. 「바로 적용」은 선택과 오류 지정을 한 번에 합니다.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !fieldValue}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleEntireSelect}
          className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50 disabled:opacity-40"
        >
          전체 선택
        </button>
        <button
          type="button"
          disabled={disabled || !fieldValue}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleEntireApply}
          className="bg-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-950 disabled:opacity-40"
        >
          전체에 바로 적용
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={findText}
          onChange={(event) => setFindText(event.target.value)}
          disabled={disabled || !fieldValue}
          placeholder="찾을 문구 · 예: 170cm"
          className="auth-input min-h-9 px-2 py-1 text-xs disabled:opacity-40"
          data-text-corruptor-ignore
        />
        <button
          type="button"
          disabled={disabled || !fieldValue || !findText.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFindText(false)}
          className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50 disabled:opacity-40"
        >
          문구 선택
        </button>
        <button
          type="button"
          disabled={disabled || !fieldValue || !findText.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFindText(true)}
          className="bg-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-950 disabled:opacity-40"
        >
          문구 바로 적용
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label className="grid gap-1 text-[11px] text-emerald-100/60">
          시작 글자
          <input
            type="number"
            min={1}
            max={Math.max(fieldValue.length, 1)}
            value={rangeStart}
            onChange={(event) => setRangeStart(Number(event.target.value))}
            disabled={disabled || !fieldValue}
            className="auth-input min-h-9 px-2 py-1 text-xs disabled:opacity-40"
            data-text-corruptor-ignore
          />
        </label>
        <label className="grid gap-1 text-[11px] text-emerald-100/60">
          끝 글자
          <input
            type="number"
            min={1}
            max={Math.max(fieldValue.length, 1)}
            value={rangeEnd}
            onChange={(event) => setRangeEnd(Number(event.target.value))}
            disabled={disabled || !fieldValue}
            className="auth-input min-h-9 px-2 py-1 text-xs disabled:opacity-40"
            data-text-corruptor-ignore
          />
        </label>
        <button
          type="button"
          disabled={disabled || !fieldValue}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleManualSelect}
          className="self-end border border-emerald-100/20 px-2 py-2 text-[11px] text-emerald-50 disabled:opacity-40"
        >
          범위 선택
        </button>
        <button
          type="button"
          disabled={disabled || !fieldValue}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleManualApply}
          className="self-end bg-emerald-200 px-2 py-2 text-[11px] font-semibold text-emerald-950 disabled:opacity-40"
        >
          범위 바로 적용
        </button>
      </div>

      {tokenSpans.length > 1 ? (
        <div className="mt-3">
          <p className="text-[11px] text-emerald-100/55">단어를 누르면 그 구간에 바로 적용</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tokenSpans.map((span) => (
              <button
                key={`${span.start}-${span.end}`}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onApply(span)}
                className="border border-emerald-100/20 px-2 py-1 font-mono text-[11px] text-emerald-50 disabled:opacity-40"
              >
                {span.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
