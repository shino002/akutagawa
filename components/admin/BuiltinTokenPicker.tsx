"use client";

import { BUILTIN_TOKEN_GROUPS } from "@/lib/text-scramble";

interface BuiltinTokenPickerProps {
  selectedTokens: string[];
  onChange: (tokens: string[]) => void;
}

export function BuiltinTokenPicker({ selectedTokens, onChange }: BuiltinTokenPickerProps) {
  const selectedSet = new Set(selectedTokens);
  const usingAll = selectedTokens.length === 0;

  const toggleToken = (token: string) => {
    if (usingAll) {
      onChange([token]);
      return;
    }

    if (selectedSet.has(token)) {
      const next = selectedTokens.filter((item) => item !== token);
      onChange(next);
      return;
    }

    onChange([...selectedTokens, token]);
  };

  const selectGroup = (tokens: readonly string[]) => {
    const merged = new Set([...selectedTokens, ...tokens]);
    onChange([...merged]);
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <fieldset className="mt-3 border border-emerald-100/15 bg-black/25 p-3">
      <legend className="px-1 text-[11px] font-medium text-emerald-100/85">기본 기호 선택</legend>
      <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
        「전체 기호」는 ERR·NULL·▓ 등 기본 풀 전체를 씁니다. 원하는 기호만 고르면 그것만 번갈아
        나옵니다.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearSelection}
          className={
            usingAll
              ? "bg-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-950"
              : "border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
          }
        >
          전체 기호
        </button>
        {!usingAll ? (
          <span className="self-center text-[11px] text-emerald-100/45">
            {selectedTokens.length}개 선택됨
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {BUILTIN_TOKEN_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-emerald-100/70">{group.label}</p>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectGroup(group.tokens)}
                className="border border-emerald-100/15 px-2 py-0.5 text-[10px] text-emerald-100/55"
              >
                이 그룹 전체
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.tokens.map((token) => {
                const isActive = usingAll || selectedSet.has(token);

                return (
                  <button
                    key={`${group.id}-${token}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggleToken(token)}
                    className={
                      isActive
                        ? "bg-emerald-200 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-950"
                        : "border border-emerald-100/20 px-2 py-1 font-mono text-[11px] text-emerald-50"
                    }
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
