"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { DocumentSheet } from "@/components/home/DocumentSheet";
import { settingSectionGlitchPath, settingSectionTitleGlitchPath } from "@/lib/glitch-fields";
import { toKanjiNumber } from "@/lib/kanji-number";
import { splitStoryParagraphs } from "@/lib/story-text";
import type { CharacterDetailSection } from "@/lib/zone-links";
import type { StoryModalItem } from "@/types/home.types";
import { cn } from "@/utils/cn";

interface StoryModalProps {
  item: StoryModalItem;
  onClose: () => void;
  className?: string;
}

/* 예전에는 종류(記録/叙述)를 나눠 찍었지만, 별지가 분량으로 열리게 되면서
   두 글자가 뜻하는 차이가 없어졌습니다. 문서는 전부 記録 입니다. */
const KIND_MARK = "記録";

/**
 * 별지(別紙) — 열람판에 다 싣지 못한 항의 전문.
 *
 * 예전 창은 스토리 한 편만 띄우고 끝이라, 다음 항을 보려면 창을 닫고 열람대로
 * 돌아가 다시 눌러야 했습니다. 여기서는 같은 인물의 항을 별지 안에서 그대로
 * 넘길 수 있게 하고(◀ ▶ / 좌우 키), 어디까지 읽었는지 판독 눈금으로 보여줍니다.
 */
export function StoryModal({ item, onClose, className }: StoryModalProps) {
  const { character, numberOffset = 0 } = item;

  /** 넘길 수 있는 항 목록 — 안 넘어오면 이 항만 단독으로 봅니다 */
  const sections = useMemo(
    () => (item.sections?.length ? item.sections : [item.section]),
    [item.section, item.sections],
  );

  const [activeId, setActiveId] = useState(item.section.id);
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const foundIndex = sections.findIndex((section) => section.id === activeId);
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;
  const section = sections[activeIndex];
  const total = sections.length;

  const glitch = character.textGlitch?.[settingSectionGlitchPath(section.id)];
  const titleGlitch = character.textGlitch?.[settingSectionTitleGlitchPath(section.id)];
  const paragraphs = splitStoryParagraphs(section.body);
  const linkContext = {
    section: "characters" as CharacterDetailSection,
    characterId: character.id,
  };

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      setActiveId(sections[index].id);
    },
    [sections],
  );

  /* 항을 넘기면 처음부터 다시 읽습니다.
     한 화면에 다 들어오는 짧은 항은 스크롤이 없어 눈금이 0 에 멈춰 있으므로
     그 자리에서 다 읽은 것으로 채워 둡니다. */
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    node.scrollTop = 0;
    setProgress(node.scrollHeight - node.clientHeight > 0 ? 0 : 1);
  }, [activeIndex]);

  /* 열릴 때 별지로 초점을 옮기고, 닫으면 원래 있던 자리로 돌려놓습니다 */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    return () => {
      previous?.focus?.();
    };
  }, []);

  /* Esc 로 닫고, 좌우 키로 항을 넘깁니다 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goTo, onClose]);

  const handleScroll = () => {
    const node = bodyRef.current;
    if (!node) return;
    const scrollable = node.scrollHeight - node.clientHeight;
    setProgress(scrollable > 0 ? Math.min(1, Math.max(0, node.scrollTop / scrollable)) : 1);
  };

  const clauseNumber = activeIndex + 1 + numberOffset;

  return (
    <div
      className={cn("desk-backdrop fixed inset-0 z-50 grid place-items-center p-4", className)}
      role="dialog"
      aria-modal="true"
      aria-label={`${section.title || "기록"} 전문 열람`}
      onClick={onClose}
    >
      <DocumentSheet tabLabel="別紙" className="record-annex">
        <header className="record-annex-head">
          <div className="record-annex-slug">
            <span className="record-annex-slug-no">NO.{String(clauseNumber).padStart(2, "0")}</span>
            <span className="record-annex-slug-mark">{KIND_MARK}</span>
            <span className="record-annex-slug-rule" aria-hidden="true" />
            <span className="record-annex-slug-name">{character.name}</span>
          </div>

          <div className="record-annex-title-row">
            <h3 className="record-annex-title">
              <span className="record-annex-title-num">第{toKanjiNumber(clauseNumber)}項</span>
              <span className="record-annex-title-name">
                {section.title ? (
                  <GlitchedText text={section.title} glitch={titleGlitch} preserveWhitespace />
                ) : (
                  "기록된 서사"
                )}
              </span>
            </h3>

            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              className="record-annex-close"
              aria-label="별지 닫기 (Esc)"
            >
              閉じる <span className="record-annex-close-ko">닫기</span>
            </button>
          </div>
        </header>

        <article
          ref={bodyRef}
          onScroll={handleScroll}
          className="record-annex-body"
          tabIndex={-1}
          aria-labelledby={undefined}
        >
          <div className="record-annex-content">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={index} className="record-annex-prose">
                  <StoryFormattedText
                    text={paragraph}
                    glitch={glitch}
                    preserveWhitespace
                    linkContext={linkContext}
                  />
                </p>
              ))
            ) : (
              <p className="record-annex-prose plain-empty-note">내용이 없어요.</p>
            )}
            <p className="record-annex-end" aria-hidden="true">
              以上
            </p>
          </div>
        </article>

        <footer className="record-annex-foot">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="record-annex-step"
          >
            <span aria-hidden="true">◀</span> 前項
          </button>

          <div className="record-annex-pos">
            <span className="record-annex-pos-text">
              第{toKanjiNumber(clauseNumber)}項 / 全{toKanjiNumber(total + numberOffset)}項
            </span>
            {/* 판독 눈금 — 이 항을 어디까지 읽었는지 */}
            <span className="record-annex-gauge paper-ink" aria-hidden="true">
              <span
                className="record-annex-gauge-fill paper-ink"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          </div>

          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === total - 1}
            className="record-annex-step"
          >
            次項 <span aria-hidden="true">▶</span>
          </button>
        </footer>
      </DocumentSheet>
    </div>
  );
}
