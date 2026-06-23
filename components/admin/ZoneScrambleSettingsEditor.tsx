"use client";

import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import { BuiltinTokenPicker } from "@/components/admin/BuiltinTokenPicker";
import { GlitchTickEditor } from "@/components/admin/GlitchStyleEditor";
import { glitchTextWasSanitized, sanitizePlainText } from "@/lib/glitch-display";
import type {
  GlitchErrorDisplayMode,
  GlitchErrorMessageSource,
  GlitchScrambleMode,
} from "@/lib/types";

export interface ZoneScrambleDraft {
  errorMessageSource: GlitchErrorMessageSource;
  errorMessage?: string;
  wordPool: string;
  scrambleMode: GlitchScrambleMode;
  builtinScramble: boolean;
  builtinTokens: string[];
  errorDisplayMode: GlitchErrorDisplayMode;
  tickMs: number;
}

interface ZoneScrambleSettingsEditorProps {
  draft: ZoneScrambleDraft;
  onChange: (patch: Partial<ZoneScrambleDraft>) => void;
  onNotice?: (message: string) => void;
}

export function ZoneScrambleSettingsEditor({
  draft,
  onChange,
  onNotice,
}: ZoneScrambleSettingsEditorProps) {
  const usesError = draft.errorMessageSource !== "none";
  const showBuiltinTokenPicker = draft.wordPool.trim()
    ? draft.scrambleMode === "referenceWithBuiltin"
    : true;

  const enableError = () => {
    const custom = draft.errorMessage?.trim();
    onChange({
      errorMessageSource: custom ? "custom" : "auto",
      errorMessage: custom || undefined,
    });
  };

  const disableError = () => {
    onChange({
      errorMessageSource: "none",
      errorMessage: undefined,
    });
  };

  const handleCustomMessageChange = (value: string) => {
    if (!usesError) {
      return;
    }

    const trimmed = value.trim();
    if (trimmed) {
      onChange({ errorMessageSource: "custom", errorMessage: value });
      return;
    }

    onChange({ errorMessageSource: "auto", errorMessage: undefined });
  };

  return (
    <div className="mt-3 space-y-3 border border-emerald-100/15 bg-black/25 p-3">
      <div>
        <p className="text-[11px] font-medium text-emerald-100/85">이 구간 · 오류 설정</p>
        <p className="mt-1 text-[10px] leading-5 text-emerald-100/50">
          켜면 원문과 ERR·NULL 등 오류 글자가 번갈아 보입니다. 끄면 위 고정 서식만 적용되고 글자
          내용은 바뀌지 않습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminChoiceButton
          active={!usesError}
          onMouseDown={(event) => event.preventDefault()}
          onClick={disableError}
        >
          끔 · 서식만
        </AdminChoiceButton>
        <AdminChoiceButton
          active={usesError}
          onMouseDown={(event) => event.preventDefault()}
          onClick={enableError}
        >
          켬 · 오류
        </AdminChoiceButton>
      </div>

      {usesError ? (
        <>
          <label className="grid gap-2 text-xs text-emerald-100/70">
            참조 단어{" "}
            <span className="text-emerald-100/45">
              (한 줄에 하나, 비우면 ERR·NULL 등 기본 기호)
            </span>
            <textarea
              value={draft.wordPool}
              onChange={(event) => {
                const raw = event.target.value;
                const next = sanitizePlainText(raw);
                onChange({ wordPool: next });
                if (glitchTextWasSanitized(raw, next)) {
                  onNotice?.("참조 단어는 일반 글자만 넣을 수 있어요.");
                }
              }}
              placeholder={"한 줄에 하나 · 예: 오류\nNULL"}
              className="auth-input min-h-16 max-w-full break-all"
              data-text-corruptor-ignore
            />
          </label>

          {draft.wordPool.trim() ? (
            <div className="flex flex-wrap gap-2">
              <AdminChoiceButton
                active={draft.scrambleMode === "referenceOnly"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange({ scrambleMode: "referenceOnly" })}
              >
                참조 단어만
              </AdminChoiceButton>
              <AdminChoiceButton
                active={draft.scrambleMode === "referenceWithBuiltin"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange({ scrambleMode: "referenceWithBuiltin" })}
              >
                참조 + 기호
              </AdminChoiceButton>
            </div>
          ) : (
            <label className="flex items-start gap-2 text-xs text-emerald-100/75">
              <input
                type="checkbox"
                checked={draft.builtinScramble}
                onMouseDown={(event) => event.preventDefault()}
                onChange={(event) => onChange({ builtinScramble: event.target.checked })}
                className="mt-1"
              />
              <span>기본 오류 기호 (ERR, NULL, ???)</span>
            </label>
          )}

          {showBuiltinTokenPicker ? (
            <BuiltinTokenPicker
              selectedTokens={draft.builtinTokens}
              onChange={(builtinTokens) => onChange({ builtinTokens })}
            />
          ) : null}

          <label className="grid gap-1 text-[11px] text-emerald-100/70">
            고정 오류 문구 (선택)
            <input
              type="text"
              value={draft.errorMessage ?? ""}
              onChange={(event) => handleCustomMessageChange(event.target.value)}
              placeholder="비우면 참조 단어·기호로 매번 바뀝니다"
              className="auth-input min-h-8 px-2 py-1 text-[11px]"
              data-text-corruptor-ignore
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <AdminChoiceButton
              active={draft.errorDisplayMode === "alternate"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange({ errorDisplayMode: "alternate" })}
            >
              원문 ↔ 오류
            </AdminChoiceButton>
            <AdminChoiceButton
              active={draft.errorDisplayMode === "randomOnly"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange({ errorDisplayMode: "randomOnly" })}
            >
              오류만
            </AdminChoiceButton>
          </div>

          <GlitchTickEditor
            tickMs={draft.tickMs}
            onTickMsChange={(tickMs) => onChange({ tickMs })}
          />
        </>
      ) : (
        <p className="text-[10px] leading-5 text-emerald-100/55">
          지금은 고정 서식(색·굵게 등)만 적용됩니다.
        </p>
      )}
    </div>
  );
}
