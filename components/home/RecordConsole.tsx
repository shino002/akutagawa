"use client";

import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { toKanjiNumber } from "@/lib/kanji-number";
import { cn } from "@/utils/cn";

/* 예전에는 story(叙述) 가 따로 있었지만, 별지가 분량으로 열리게 되면서
   기록과 구분될 이유가 없어져 걷어냈습니다. */
export type RecordEntryKind = "identity" | "record";

export interface RecordEntry {
  id: string;
  kind: RecordEntryKind;
  /** 색인과 aria 라벨에 쓰는 평문 제목 */
  label: string;
  /** 제목 자리에 실제로 그릴 노드 (글리치 등). 없으면 label 을 씁니다 */
  title?: ReactNode;
  /** 제목 옆 한자 병기 */
  kanji?: string;
  /** 색인 분량 막대에 쓰는 본문 길이 */
  weight?: number;
  body: ReactNode;
  /** 본문이 열람판 한도를 넘겨 별지로 넘어갔을 때만 넘깁니다 */
  onExpand?: () => void;
  /** 별지로 넘어간 분량 표기 (예: 「이하 3단락」) */
  expandNote?: string;
}

/** 색인에 찍히는 항 종류 표시 */
const KIND_MARK: Record<RecordEntryKind, string> = {
  identity: "身上",
  record: "記録",
};

type ReadMode = "sheet" | "roll";

const MODE_LABELS: { id: ReadMode; jp: string; ko: string; hint: string }[] = [
  { id: "sheet", jp: "単票", ko: "한 장씩", hint: "항을 한 장씩 올려놓고 읽습니다" },
  { id: "roll", jp: "通読", ko: "이어서", hint: "모든 항을 한 두루마리로 잇습니다" },
];

interface RecordConsoleProps {
  entries: RecordEntry[];
  /** 슬러그 줄에 찍는 문서 일련번호 */
  serial?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * 기록 열람대(閲覧台).
 *
 * 예전 조서는 항을 세로로 전부 쌓아 두어 긴 인물일수록 어디를 읽는 중인지 잃어버렸습니다.
 * 여기서는 왼쪽 색인(索引)이 항 전체를 한눈에 잡아 두고, 오른쪽 열람판에 고른 항만
 * 올려놓습니다. 대신 색인이 서랍이 되지 않도록 「通読」 모드를 함께 두어,
 * 전문을 한 번에 훑는 길도 항상 열어 둡니다.
 */
export function RecordConsole({
  entries,
  serial,
  emptyMessage = "등록된 기록이 없어요.",
  className,
}: RecordConsoleProps) {
  const [mode, setMode] = useState<ReadMode>("sheet");
  const [activeId, setActiveId] = useState("");
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sheetRefs = useRef<(HTMLElement | null)[]>([]);

  const total = entries.length;
  /** 항 목록이 통째로 갈리면(다른 인물로 이동) 찾지 못하므로 자연히 첫 항으로 돌아옵니다 */
  const foundIndex = entries.findIndex((entry) => entry.id === activeId);
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;
  const activeEntry = entries[activeIndex];

  const maxWeight = useMemo(
    () => Math.max(1, ...entries.map((entry) => entry.weight ?? 0)),
    [entries],
  );

  const goTo = useCallback(
    (index: number, options?: { focus?: boolean }) => {
      if (index < 0 || index >= entries.length) return;

      setDirection(index >= activeIndex ? "next" : "prev");
      setActiveId(entries[index].id);

      if (options?.focus) {
        tabRefs.current[index]?.focus();
      }

      if (mode === "roll") {
        sheetRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [activeIndex, entries, mode],
  );

  const handleIndexKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowDown: activeIndex + 1,
      ArrowRight: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      ArrowLeft: activeIndex - 1,
      Home: 0,
      End: total - 1,
    };

    const nextIndex = moves[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    goTo(Math.min(Math.max(nextIndex, 0), total - 1), { focus: true });
  };

  if (total === 0) {
    return <p className="plain-empty-note">{emptyMessage}</p>;
  }

  const renderSheet = (entry: RecordEntry, index: number, standalone: boolean) => (
    <article
      key={entry.id}
      ref={(node) => {
        sheetRefs.current[index] = node;
      }}
      className="record-sheet"
      data-dir={standalone ? direction : undefined}
      data-kind={entry.kind}
      id={`record-sheet-${entry.id}`}
      role={standalone ? "tabpanel" : undefined}
      aria-labelledby={standalone ? `record-tab-${entry.id}` : undefined}
      tabIndex={standalone ? -1 : undefined}
    >
      <div className="record-sheet-slug">
        <span className="record-sheet-slug-no">NO.{String(index + 1).padStart(2, "0")}</span>
        <span className="record-sheet-slug-mark">{KIND_MARK[entry.kind]}</span>
        <span className="record-sheet-slug-rule" aria-hidden="true" />
        {serial ? <span className="record-sheet-slug-serial">{serial}</span> : null}
      </div>

      <h3 className="record-sheet-title">
        <span className="record-sheet-title-num">第{toKanjiNumber(index + 1)}項</span>
        <span className="record-sheet-title-name">{entry.title ?? entry.label}</span>
        {entry.kanji ? <span className="record-sheet-title-kanji">{entry.kanji}</span> : null}
      </h3>

      <div className="record-sheet-body">{entry.body}</div>

      {/* 별지 참조 — 전문은 따로 뜬 장에 실립니다 */}
      {entry.onExpand ? (
        <button type="button" onClick={entry.onExpand} className="record-sheet-expand">
          <span className="record-sheet-expand-rule" aria-hidden="true" />
          <span className="record-sheet-expand-mark" aria-hidden="true">
            別紙
          </span>
          {entry.expandNote ? (
            <span className="record-sheet-expand-note">{entry.expandNote}</span>
          ) : null}
          <span className="record-sheet-expand-label">전문 열람</span>
        </button>
      ) : null}
    </article>
  );

  return (
    <section className={cn("record-console", className)} data-mode={mode}>
      <header className="record-console-bar">
        <p className="record-console-brand">
          記録閲覧台
          <span className="record-console-brand-ko">기록 열람대</span>
        </p>

        {/* 표제와 열람 방식 사이를 잇는 괘선과 일련번호 — 이 자리가 비어 있으면
            머리띠가 아니라 양끝에 얹힌 조각 둘로 보입니다 */}
        <span className="record-console-rule paper-ink" aria-hidden="true" />
        {serial ? (
          <span className="record-console-serial" aria-hidden="true">
            {serial}
          </span>
        ) : null}

        <div className="record-console-modes" role="group" aria-label="열람 방식">
          {MODE_LABELS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              aria-label={`${option.ko} 보기 — ${option.hint}`}
              aria-pressed={mode === option.id}
              onClick={() => setMode(option.id)}
              className={cn("record-console-mode", mode === option.id && "is-active")}
            >
              <span className="record-console-mode-jp">{option.jp}</span>
              <span className="record-console-mode-ko">{option.ko}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="record-console-body">
        <div
          className="record-index"
          role="tablist"
          aria-orientation="vertical"
          aria-label="기록 색인"
          onKeyDown={handleIndexKeyDown}
        >
          <p className="record-index-head">
            索引
            <span className="record-index-count">全{toKanjiNumber(total)}項</span>
          </p>

          {entries.map((entry, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`record-tab-${entry.id}`}
                aria-selected={isActive}
                aria-controls={`record-sheet-${entry.id}`}
                tabIndex={isActive ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                onClick={() => goTo(index)}
                className={cn("record-index-item", isActive && "is-active")}
                data-kind={entry.kind}
              >
                <span className="record-index-no">{String(index + 1).padStart(2, "0")}</span>
                <span className="record-index-name">{entry.label}</span>
                <span className="record-index-mark">{KIND_MARK[entry.kind]}</span>
                <span className="record-index-gauge paper-ink" aria-hidden="true">
                  <span
                    className="record-index-gauge-fill paper-ink"
                    style={{
                      width: `${Math.max(6, Math.round(((entry.weight ?? 0) / maxWeight) * 100))}%`,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="record-plate">
          {mode === "sheet" ? (
            renderSheet(activeEntry, activeIndex, true)
          ) : (
            <div className="record-roll">
              {entries.map((entry, index) => renderSheet(entry, index, false))}
            </div>
          )}
        </div>
      </div>

      {mode === "sheet" ? (
        <footer className="record-console-foot">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="record-console-step"
          >
            <span aria-hidden="true">◀</span> 前項
          </button>

          <div className="record-console-pos">
            <span className="record-console-pos-text">
              第{toKanjiNumber(activeIndex + 1)}項 / 全{toKanjiNumber(total)}項
            </span>
            <span className="record-console-pos-rail paper-ink" aria-hidden="true">
              <span
                className="record-console-pos-mark paper-ink"
                style={{
                  left: `${total > 1 ? (activeIndex / (total - 1)) * 100 : 0}%`,
                }}
              />
            </span>
          </div>

          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === total - 1}
            className="record-console-step"
          >
            次項 <span aria-hidden="true">▶</span>
          </button>
        </footer>
      ) : null}
    </section>
  );
}
