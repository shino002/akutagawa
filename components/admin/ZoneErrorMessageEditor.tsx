"use client";

import { useEffect, useState } from "react";
import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import type { GlitchErrorMessageSource, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import { generateErrorMessageCandidates } from "@/lib/text-scramble";

interface ZoneErrorMessageEditorProps {
  zone: GlitchZone;
  wordPool: string;
  scrambleMode: GlitchScrambleMode;
  builtinScramble: boolean;
  builtinTokens?: string[];
  onChange: (patch: Partial<GlitchZone>) => void;
}

const MESSAGE_MODE_OPTIONS: Array<{
  value: Exclude<GlitchErrorMessageSource, "none">;
  label: string;
  hint: string;
}> = [
  { value: "auto", label: "자동 생성", hint: "참조 단어·기본 문구로 매번 바뀝니다" },
  { value: "custom", label: "직접 지정", hint: "고른 문구를 고정합니다" },
];

export function ZoneErrorMessageEditor({
  zone,
  wordPool,
  scrambleMode,
  builtinScramble,
  builtinTokens,
  onChange,
}: ZoneErrorMessageEditorProps) {
  const source = zone.errorMessageSource ?? "none";
  const usesErrorMessage = source !== "none";
  const messageMode: Exclude<GlitchErrorMessageSource, "none"> =
    source === "custom" ? "custom" : "auto";
  const [candidates, setCandidates] = useState<string[]>([]);

  const refreshCandidates = () => {
    setCandidates(
      generateErrorMessageCandidates(
        zone.original,
        {
          wordPool: wordPool.trim() ? wordPool : undefined,
          scrambleMode,
          builtinTokens,
        },
        4,
      ),
    );
  };

  useEffect(() => {
    if (usesErrorMessage && messageMode === "auto") {
      refreshCandidates();
    }
  }, [zone.original, wordPool, scrambleMode, builtinScramble, builtinTokens, usesErrorMessage, messageMode]);

  const enableErrorMessage = () => {
    onChange({
      errorMessageSource: zone.errorMessage?.trim() ? "custom" : "auto",
      errorMessage: zone.errorMessage?.trim() ? zone.errorMessage : undefined,
    });
  };

  const disableErrorMessage = () => {
    onChange({
      errorMessageSource: "none",
      errorMessage: undefined,
    });
  };

  return (
    <div className="mt-3 space-y-3 border border-emerald-100/15 bg-black/20 p-3">
      <div>
        <p className="text-[11px] font-medium text-emerald-100/85">오류 메시지</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
          글자색·굵게만 쓰려면 「사용 안 함」을 고르세요. 오류 문구 전환이 필요할 때만 켭니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminChoiceButton
          active={!usesErrorMessage}
          onMouseDown={(event) => event.preventDefault()}
          onClick={disableErrorMessage}
        >
          사용 안 함 (서식만)
        </AdminChoiceButton>
        <AdminChoiceButton
          active={usesErrorMessage}
          onMouseDown={(event) => event.preventDefault()}
          onClick={enableErrorMessage}
        >
          오류 메시지 사용
        </AdminChoiceButton>
      </div>

      {usesErrorMessage ? (
        <>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_MODE_OPTIONS.map((option) => (
              <AdminChoiceButton
                key={option.value}
                active={messageMode === option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  onChange({
                    errorMessageSource: option.value,
                    errorMessage:
                      option.value === "custom" ? zone.errorMessage ?? candidates[0] ?? "" : undefined,
                  })
                }
                title={option.hint}
              >
                {option.label}
              </AdminChoiceButton>
            ))}
          </div>

          {messageMode === "auto" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-emerald-100/60">
                  아래 참조 단어·기본 문구 설정을 사용합니다. 후보를 누르면 직접 지정으로 고정됩니다.
                </p>
                <AdminChoiceButton
                  variant="ghost"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={refreshCandidates}
                >
                  다시 뽑기
                </AdminChoiceButton>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {candidates.map((candidate, index) => (
                  <AdminChoiceButton
                    key={`${candidate}-${index}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      onChange({
                        errorMessageSource: "custom",
                        errorMessage: candidate,
                      })
                    }
                    className="admin-choice-btn-candidate max-w-full whitespace-normal break-all text-left font-mono"
                    title={candidate}
                  >
                    {candidate}
                  </AdminChoiceButton>
                ))}
              </div>
              {candidates.length === 0 ? (
                <p className="text-[11px] text-emerald-100/50">
                  참조 단어를 입력하거나 「다시 뽑기」를 눌러주세요.
                </p>
              ) : null}
            </div>
          ) : (
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
          )}
        </>
      ) : (
        <p className="text-[11px] leading-5 text-emerald-100/55">
          이 구간은 원문 그대로 두고 색·굵게·기울임·페이지 이동만 적용됩니다.
        </p>
      )}
    </div>
  );
}
