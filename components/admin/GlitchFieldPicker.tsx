"use client";

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
          ? "bg-amber-200/90 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950"
          : option.hasGlitch
            ? "border border-emerald-200/35 bg-emerald-950/35 px-2.5 py-1.5 text-[11px] text-emerald-50"
            : "border border-emerald-100/15 px-2.5 py-1.5 text-[11px] text-emerald-100/70 hover:border-emerald-100/30 hover:text-emerald-50"
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

  if (resolvedGroups.length === 0) {
    return null;
  }

  const totalOptions = resolvedGroups.reduce((count, group) => count + group.options.length, 0);
  const appliedCount = resolvedGroups.reduce(
    (count, group) => count + group.options.filter((option) => option.hasGlitch).length,
    0,
  );

  return (
    <div className="border border-emerald-100/15 bg-black/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-100/85">오류 넣을 필드</p>
          <p className="mt-1 text-[11px] leading-5 text-emerald-100/50">
            버튼을 눌러 필드를 고르세요.
            {appliedCount > 0 ? ` · ${appliedCount}/${totalOptions}개 적용 중` : ""}
          </p>
        </div>
        {onOpenGlitchTab ? (
          <button
            type="button"
            onClick={onOpenGlitchTab}
            className="shrink-0 border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
          >
            오류 탭 열기
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {resolvedGroups.map((group) => (
          <div key={group.id}>
            {resolvedGroups.length > 1 ? (
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-100/45">
                {group.label}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => (
                <FieldButton
                  key={option.path}
                  option={option}
                  active={activePath === option.path}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
