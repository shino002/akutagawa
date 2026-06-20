"use client";

import { useMemo } from "react";

export interface GlitchFieldOption {
  path: string;
  label: string;
  hasGlitch: boolean;
  zoneCount?: number;
}

export interface GlitchFieldOptionGroup {
  id: string;
  label: string;
  options: GlitchFieldOption[];
}

interface GlitchFieldPickerProps {
  groups?: GlitchFieldOptionGroup[];
  options?: GlitchFieldOption[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onOpenGlitchTab?: () => void;
}

function FieldButton({
  option,
  active,
  onSelect,
}: {
  option: GlitchFieldOption;
  active: boolean;
  onSelect: (path: string) => void;
}) {
  const zoneBadge =
    option.zoneCount && option.zoneCount > 0 ? `${option.zoneCount}구간` : null;

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(option.path)}
      className={
        active
          ? "admin-glitch-field-btn is-active bg-amber-200/90 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950"
          : option.hasGlitch
            ? "admin-glitch-field-btn border border-emerald-200/35 bg-emerald-950/35 px-2.5 py-1.5 text-[11px] text-emerald-50"
            : "admin-glitch-field-btn border border-emerald-100/15 px-2.5 py-1.5 text-[11px] text-emerald-100/70 hover:border-emerald-100/30 hover:text-emerald-50"
      }
      title={zoneBadge ? `${option.label} · ${zoneBadge}` : option.label}
    >
      <span className="flex items-center gap-1.5">
        {option.label}
        {zoneBadge ? (
          <span
            className={
              active
                ? "rounded bg-amber-950/15 px-1 py-0.5 text-[9px] font-bold"
                : "rounded bg-emerald-200/10 px-1 py-0.5 text-[9px] font-medium text-emerald-100/80"
            }
          >
            {zoneBadge}
          </span>
        ) : null}
      </span>
    </button>
  );
}

const countGroupApplied = (group: GlitchFieldOptionGroup) =>
  group.options.filter((option) => option.hasGlitch).length;

export function GlitchFieldPicker({
  groups,
  options,
  activePath,
  onSelect,
  onOpenGlitchTab,
}: GlitchFieldPickerProps) {
  const resolvedGroups =
    groups ??
    (options && options.length > 0
      ? [{ id: "all", label: "필드", options }]
      : []);

  const activeOption = useMemo(
    () =>
      resolvedGroups
        .flatMap((group) => group.options)
        .find((option) => option.path === activePath),
    [activePath, resolvedGroups],
  );

  if (resolvedGroups.length === 0) {
    return null;
  }

  const totalOptions = resolvedGroups.reduce((count, group) => count + group.options.length, 0);
  const appliedCount = resolvedGroups.reduce(
    (count, group) => count + countGroupApplied(group),
    0,
  );
  const useCategoryDropdowns = resolvedGroups.length > 1;

  return (
    <div className="admin-glitch-field-picker">
      <p className="text-[11px] text-emerald-100/55">
        ① 필드
        {appliedCount > 0 ? ` · ${appliedCount}/${totalOptions}개 적용 중` : ""}
        {activeOption ? (
          <>
            {" "}
            · 선택: <span className="font-medium text-emerald-100/85">{activeOption.label}</span>
          </>
        ) : null}
      </p>
      {onOpenGlitchTab ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onOpenGlitchTab}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
          >
            오류 탭 열기
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {resolvedGroups.map((group) => {
          const groupApplied = countGroupApplied(group);
          const groupHasActive = group.options.some((option) => option.path === activePath);
          const groupSummary = useCategoryDropdowns
            ? `${group.label} · ${group.options.length}개${
                groupApplied > 0 ? ` · ${groupApplied}개 적용` : ""
              }`
            : "필드 목록";

          return (
            <details
              key={group.id}
              className="border border-emerald-100/10 bg-black/20"
              open={groupHasActive}
            >
              <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-emerald-100/80 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span>{groupSummary}</span>
                  <span className="text-[10px] font-normal text-emerald-100/45">
                    {groupHasActive ? "펼침" : "클릭해서 열기"}
                  </span>
                </span>
              </summary>
              <div className="flex flex-wrap gap-2 border-t border-emerald-100/10 px-3 py-2">
                {group.options.map((option) => (
                  <FieldButton
                    key={option.path}
                    option={option}
                    active={activePath === option.path}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
