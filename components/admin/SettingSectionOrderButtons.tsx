"use client";

interface SettingSectionOrderButtonsProps {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SettingSectionOrderButtons({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: SettingSectionOrderButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={index === 0}
        title="위로 이동"
        aria-label="레코드 박스를 위로 이동"
        className="border border-stone-400/25 px-2 py-1 text-xs text-stone-200 disabled:cursor-not-allowed disabled:opacity-35"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={index >= total - 1}
        title="아래로 이동"
        aria-label="레코드 박스를 아래로 이동"
        className="border border-stone-400/25 px-2 py-1 text-xs text-stone-200 disabled:cursor-not-allowed disabled:opacity-35"
      >
        ↓
      </button>
    </div>
  );
}
