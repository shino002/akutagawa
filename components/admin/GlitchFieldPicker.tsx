"use client";

interface GlitchFieldOption {
  path: string;
  label: string;
  hasGlitch: boolean;
}

interface GlitchFieldPickerProps {
  options: GlitchFieldOption[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onOpenGlitchTab?: () => void;
}

export function GlitchFieldPicker({
  options,
  activePath,
  onSelect,
  onOpenGlitchTab,
}: GlitchFieldPickerProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="border border-emerald-100/15 bg-black/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-emerald-100/70">필드 버튼을 누르면 해당 입력 칸으로 이동합니다.</p>
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
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.path}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(option.path)}
            className={
              activePath === option.path
                ? "bg-amber-200/90 px-2 py-1 text-[11px] font-semibold text-amber-950"
                : option.hasGlitch
                  ? "border border-emerald-200/30 bg-emerald-950/30 px-2 py-1 text-[11px] text-emerald-50"
                  : "border border-emerald-100/15 px-2 py-1 text-[11px] text-emerald-100/70"
            }
          >
            {option.label}
            {option.hasGlitch ? " · 적용됨" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
