"use client";

import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { TextGlitch } from "@/components/TextGlitch";
import type { HomeContent } from "@/lib/types";

/** 홈에서 각 섹션으로 바로 들어가는 카드 */
export type HomeNavCard = {
  id: string;
  label: string;
  kicker: string;
  count: number;
  countUnit: string;
  onSelect: () => void;
};

/** 홈에 요약해 보여줄 최근 항목 (일기·방명록) */
export type HomeUpdateItem = {
  id: string;
  kind: string;
  meta: string;
  title: string;
  onSelect: () => void;
};

interface HomeSectionProps {
  homeContent: HomeContent;
  navCards: HomeNavCard[];
  updates: HomeUpdateItem[];
  className?: string;
}

const padIndex = (index: number) => String(index + 1).padStart(2, "0");

/**
 * 홈 — 브랜드·소개·공지 위에 섹션 진입 카드와 최근 업데이트를 얹은 에디토리얼 레이아웃.
 */
export function HomeSection({ homeContent, navCards, updates, className }: HomeSectionProps) {
  const notice = homeContent.notice.trim();

  return (
    <section className={cn("home-stage", className)}>
      <ArchiveMotion variant="enter" motionKey="home-index" className="home-stage-index">
        <span>HOME</span>
        <span className="home-stage-index-dot" aria-hidden="true" />
        <span>INDEX</span>
        <span className="home-stage-index-num">01</span>
      </ArchiveMotion>

      <div className="home-stage-main">
        <ArchiveMotion variant="enter" motionKey="home-brand" className="home-stage-brand">
          <p className="home-stage-kicker">
            <TextGlitch text={homeContent.eyebrow} />
          </p>
          <h1 className="home-stage-mark">
            <TextGlitch text={homeContent.title} />
          </h1>
        </ArchiveMotion>

        <div className="home-stage-aside">
          <ArchiveMotion as="p" variant="scan" motionKey="home-body" className="home-stage-body">
            {homeContent.body}
          </ArchiveMotion>

          {notice ? (
            <ArchiveMotion
              as="aside"
              variant="scan"
              motionKey={`home-notice-${notice}`}
              className="home-stage-notice"
              aria-label="공지"
            >
              <p className="home-stage-notice-label">NOTICE</p>
              <p className="home-stage-notice-body">{notice}</p>
            </ArchiveMotion>
          ) : null}
        </div>
      </div>

      {navCards.length > 0 ? (
        <section className="home-stage-block" aria-label="섹션 바로가기">
          <p className="home-stage-block-label">Index</p>
          <ArchiveMotion
            variant="stagger"
            motionKey={`home-nav-${navCards.length}`}
            className="home-stage-nav"
          >
            {navCards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                onClick={card.onSelect}
                className="home-stage-nav-card"
              >
                <span className="home-stage-nav-num">{padIndex(index)}</span>
                <span className="home-stage-nav-text">
                  <span className="home-stage-nav-kicker">{card.kicker}</span>
                  <span className="home-stage-nav-label">{card.label}</span>
                </span>
                <span className="home-stage-nav-count">
                  {card.count}
                  <span className="home-stage-nav-unit">{card.countUnit}</span>
                </span>
              </button>
            ))}
          </ArchiveMotion>
        </section>
      ) : null}

      {updates.length > 0 ? (
        <section className="home-stage-block" aria-label="최근 업데이트">
          <p className="home-stage-block-label">Recent</p>
          <ArchiveMotion
            variant="stagger"
            motionKey={`home-updates-${updates.map((item) => item.id).join(",")}`}
            className="home-stage-updates"
          >
            {updates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onSelect}
                className="home-stage-update"
              >
                <span className="home-stage-update-kind">{item.kind}</span>
                <span className="home-stage-update-meta">{item.meta}</span>
                <span className="home-stage-update-title">{item.title}</span>
              </button>
            ))}
          </ArchiveMotion>
        </section>
      ) : null}
    </section>
  );
}
