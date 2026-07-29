"use client";

import { useMemo, useState } from "react";

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

function FieldChip({
  option,
  active,
  onSelect,
}: {
  option: GlitchFieldOption;
  active: boolean;
  onSelect: (path: string) => void;
}) {
  const zoneCount = option.zoneCount ?? 0;

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(option.path)}
      aria-pressed={active}
      className="glitch-field-chip"
      data-state={active ? "active" : option.hasGlitch ? "applied" : "plain"}
      title={zoneCount > 0 ? `${option.label} · ${zoneCount}구간 적용` : option.label}
    >
      <span className="glitch-field-chip-label">{option.label}</span>
      {zoneCount > 0 ? <span className="glitch-field-chip-count">{zoneCount}</span> : null}
    </button>
  );
}

const countGroupApplied = (group: GlitchFieldOptionGroup) =>
  group.options.filter((option) => option.hasGlitch).length;

/**
 * 오류를 넣을 필드를 고르는 칸.
 *
 * 예전에는 그룹마다 접힌 서랍이라 필드 하나 찾으려면 서랍을 열어 가며 훑어야 했습니다.
 * 여기서는 그룹을 탭으로 눕히고 필드는 칩으로 늘어놓아, 어느 필드든 최대 두 번에
 * 닿습니다. 필드가 많아지면 이름으로 바로 거를 수 있게 찾기 칸을 함께 둡니다.
 */
export function GlitchFieldPicker({
  groups,
  options,
  activePath,
  onSelect,
  onOpenGlitchTab,
}: GlitchFieldPickerProps) {
  const resolvedGroups = useMemo(
    () => groups ?? (options && options.length > 0 ? [{ id: "all", label: "필드", options }] : []),
    [groups, options],
  );

  const [query, setQuery] = useState("");
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const activeGroupId = useMemo(() => {
    const owning = resolvedGroups.find((group) =>
      group.options.some((option) => option.path === activePath),
    );
    return openGroupId ?? owning?.id ?? resolvedGroups[0]?.id ?? null;
  }, [activePath, openGroupId, resolvedGroups]);

  const trimmedQuery = query.trim().toLowerCase();

  /* 찾는 중에는 그룹을 넘나들며 한 번에 보여 줍니다 — 어느 서랍에 있는지
     기억하지 못해도 이름만 알면 닿습니다. */
  const searchHits = useMemo(() => {
    if (!trimmedQuery) {
      return null;
    }

    return resolvedGroups.flatMap((group) =>
      group.options
        .filter((option) => option.label.toLowerCase().includes(trimmedQuery))
        .map((option) => ({ group, option })),
    );
  }, [resolvedGroups, trimmedQuery]);

  if (resolvedGroups.length === 0) {
    return null;
  }

  const visibleGroup = resolvedGroups.find((group) => group.id === activeGroupId);
  const totalOptions = resolvedGroups.reduce((count, group) => count + group.options.length, 0);
  const appliedCount = resolvedGroups.reduce((count, group) => count + countGroupApplied(group), 0);

  return (
    <div className="admin-glitch-field-picker">
      <div className="glitch-field-bar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`필드 찾기 (${totalOptions}개)`}
          className="auth-input glitch-field-search"
          data-text-corruptor-ignore
        />
        <span className="glitch-field-applied">
          {appliedCount > 0 ? `${appliedCount}개 적용 중` : "적용된 필드 없음"}
        </span>
        {onOpenGlitchTab ? (
          <button type="button" onClick={onOpenGlitchTab} className="admin-ghost-btn text-[11px]">
            오류 탭 열기
          </button>
        ) : null}
      </div>

      {searchHits ? (
        <div className="glitch-field-chips">
          {searchHits.length === 0 ? (
            <p className="adm-hint">「{query.trim()}」 와 맞는 필드가 없어요.</p>
          ) : (
            searchHits.map(({ group, option }) => (
              <FieldChip
                key={option.path}
                option={{ ...option, label: `${group.label} · ${option.label}` }}
                active={activePath === option.path}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      ) : (
        <>
          {resolvedGroups.length > 1 ? (
            <div className="glitch-field-tabs" role="tablist" aria-label="필드 그룹">
              {resolvedGroups.map((group) => {
                const groupApplied = countGroupApplied(group);

                return (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    aria-selected={group.id === activeGroupId}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setOpenGroupId(group.id)}
                    className={group.id === activeGroupId ? "is-active" : undefined}
                  >
                    {group.label}
                    {groupApplied > 0 ? (
                      <span className="glitch-field-tab-dot" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="glitch-field-chips">
            {visibleGroup?.options.map((option) => (
              <FieldChip
                key={option.path}
                option={option}
                active={activePath === option.path}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
