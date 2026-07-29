"use client";

import { useMemo, useState } from "react";
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
  /* 아직 안 건드린 칸은 null 로 둡니다.
     예전에는 fieldValue 가 바뀔 때마다 효과가 두 칸을 1‥길이 로 되돌려서,
     번호를 적어 둔 뒤 본문을 한 글자만 고쳐도 지정한 구간이 날아갔습니다.
     기본값은 상태로 붙들지 않고 그릴 때·쓸 때 계산합니다. */
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const tokenSpans = useMemo(() => getGlitchTextTokenSpans(fieldValue), [fieldValue]);

  const maxIndex = Math.max(fieldValue.length, 1);
  /* 본문이 짧아졌으면 적어 둔 번호를 잘라서 씁니다 — 되돌리지는 않습니다 */
  const resolvedStart = Math.min(Math.max(rangeStart ?? 1, 1), maxIndex);
  const resolvedEnd = Math.min(Math.max(rangeEnd ?? maxIndex, resolvedStart), maxIndex);

  /* 호출부는 「고르면 바로 구간까지 추가」 를 onApply 로 넘겨 두는데 예전에는
     이 컴포넌트가 그걸 한 번도 부르지 않아 조용히 무시됐습니다.
     매 버튼마다 짝을 만들면 칸이 복잡해지므로, 켜고 끄는 스위치 하나로 받습니다. */
  const [addOnPick, setAddOnPick] = useState(false);
  const canAddOnPick = Boolean(onApply);

  const notify = (message: string) => {
    onNotice?.(message);
  };

  const commit = (selection: GlitchTextSelection) => {
    onSelect(selection);

    if (addOnPick) {
      onApply?.(selection);
    }
  };

  const applyRange = (start: number, end: number) => {
    const selection = createGlitchSelectionFromRange(fieldValue, start, end);

    if (!selection) {
      notify("구간을 다시 확인해주세요.");
      return;
    }

    commit(selection);
  };

  const applyFindText = () => {
    const selection = findGlitchTextSelection(fieldValue, findText);

    if (!selection) {
      notify("해당 문구를 찾지 못했어요.");
      return;
    }

    commit(selection);
  };

  return (
    <details className="mt-2 border border-emerald-100/10 bg-black/20">
      <summary className="cursor-pointer px-3 py-2 text-[11px] text-emerald-100/60">
        드래그가 어려우면 · 문구 찾기 · 번호 지정
      </summary>
      <div className="space-y-3 border-t border-emerald-100/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || !fieldValue}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyRange(0, fieldValue.length)}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50 disabled:opacity-40"
          >
            전체 선택
          </button>
          {canAddOnPick ? (
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-emerald-100/60">
              <input
                type="checkbox"
                checked={addOnPick}
                onChange={(event) => setAddOnPick(event.target.checked)}
                className="accent-emerald-300"
              />
              고르면 바로 구간 추가
            </label>
          ) : null}
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
              max={maxIndex}
              value={resolvedStart}
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
              max={maxIndex}
              value={resolvedEnd}
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
            onClick={() => applyRange(resolvedStart - 1, resolvedEnd)}
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
                onClick={() => commit(span)}
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
