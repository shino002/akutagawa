"use client";

import { useEffect, useState } from "react";
import type { GlitchErrorMessageSource, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import { generateErrorMessageCandidates } from "@/lib/text-scramble";

interface ZoneErrorMessageEditorProps {
  zone: GlitchZone;
  wordPool: string;
  scrambleMode: GlitchScrambleMode;
  builtinScramble: boolean;
  onChange: (patch: Partial<GlitchZone>) => void;
}

const SOURCE_OPTIONS: Array<{ value: GlitchErrorMessageSource; label: string; hint: string }> = [
  { value: "auto", label: "자동 생성", hint: "설정에 맞게 매번 바뀝니다" },
  { value: "custom", label: "직접 지정", hint: "고른 문구를 고정합니다" },
  { value: "none", label: "전환 없음", hint: "원문 유지 · 서식만" },
];

export function ZoneErrorMessageEditor({
  zone,
  wordPool,
  scrambleMode,
  builtinScramble,
  onChange,
}: ZoneErrorMessageEditorProps) {
  const source = zone.errorMessageSource ?? "auto";
  const [candidates, setCandidates] = useState<string[]>([]);

  const refreshCandidates = () => {
    setCandidates(
      generateErrorMessageCandidates(
        zone.original,
        {
          wordPool: wordPool.trim() ? wordPool : undefined,
          scrambleMode,
        },
        4,
      ),
    );
  };

  useEffect(() => {
    if (source === "auto") {
      refreshCandidates();
    }
  }, [zone.original, wordPool, scrambleMode, builtinScramble, source]);

  return (
    <div className="mt-3 space-y-3 border border-emerald-100/15 bg-black/20 p-3">
      <div>
        <p className="text-[11px] font-medium text-emerald-100/85">오류 메시지</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
          원문과 번갈아 보일 문구를 고릅니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              onChange({
                errorMessageSource: option.value,
                errorMessage: option.value === "custom" ? zone.errorMessage ?? candidates[0] ?? "" : undefined,
              })
            }
            className={
              source === option.value
                ? "bg-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-950"
                : "border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
            }
            title={option.hint}
          >
            {option.label}
          </button>
        ))}
      </div>

      {source === "auto" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-emerald-100/60">후보에서 선택하면 직접 지정으로 고정됩니다.</p>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={refreshCandidates}
              className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
            >
              다시 뽑기
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((candidate, index) => (
              <button
                key={`${candidate}-${index}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  onChange({
                    errorMessageSource: "custom",
                    errorMessage: candidate,
                  })
                }
                className="border border-emerald-100/20 px-2 py-1 font-mono text-[11px] text-emerald-50"
              >
                {candidate}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {source === "custom" ? (
        <label className="grid gap-1 text-[11px] text-emerald-100/70">
          고정 오류 메시지
          <input
            type="text"
            value={zone.errorMessage ?? ""}
            onChange={(event) => onChange({ errorMessage: event.target.value })}
            className="auth-input min-h-8 px-2 py-1 text-[11px]"
            data-text-corruptor-ignore
          />
        </label>
      ) : null}

      {source === "none" ? (
        <p className="text-[11px] leading-5 text-emerald-100/55">
          이 구간은 글자 내용이 바뀌지 않고 서식만 적용됩니다.
        </p>
      ) : null}
    </div>
  );
}
