"use client";

import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { TextGlitch } from "@/components/TextGlitch";
import type { HomeContent } from "@/lib/types";

interface HomeSectionProps {
  homeContent: HomeContent;
  className?: string;
}

/**
 * 홈 — 브랜드·소개·공지. 사이트 흑백 톤의 에디토리얼 레이아웃.
 */
export function HomeSection({ homeContent, className }: HomeSectionProps) {
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
    </section>
  );
}
