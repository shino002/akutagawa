"use client";

import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { TextGlitch } from "@/components/TextGlitch";
import type { HomeContent } from "@/lib/types";

interface HomeSectionProps {
  homeContent: HomeContent;
  onEnterArchive: () => void;
  className?: string;
}

/**
 * 홈 — 보관소 입구. 보드/목록 없이 브랜드와 짧은 안내만 둔다.
 */
export function HomeSection({ homeContent, onEnterArchive, className }: HomeSectionProps) {
  return (
    <section className={cn("home-entrance", className)}>
      <ArchiveMotion variant="enter" motionKey="home-brand" className="home-entrance-brand">
        <p className="home-entrance-kicker">
          <TextGlitch text={homeContent.eyebrow} />
        </p>
        <h1 className="home-entrance-mark">
          <TextGlitch text={homeContent.title} />
        </h1>
      </ArchiveMotion>

      <ArchiveMotion as="p" variant="scan" motionKey="home-body" className="home-entrance-body">
        {homeContent.body}
      </ArchiveMotion>

      <ArchiveMotion variant="enter" motionKey="home-cta" className="home-entrance-foot">
        <button type="button" onClick={onEnterArchive} className="home-entrance-cta">
          ARCHIVE
        </button>
        <p className="home-entrance-meta">FILE · 00</p>
      </ArchiveMotion>
    </section>
  );
}
