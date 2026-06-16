"use client";

import { cn } from "@/utils/cn";

interface ExtractSectionProps {
  className?: string;
}

export function ExtractSection({ className }: ExtractSectionProps) {
  return (
    <section className={cn("glass-card p-6 md:p-8", className)}>
      <p className="archive-kicker">@/1_R#0?/@...</p>
      <h3 className="archive-title mt-3 font-serif text-5xl">아직 공사중</h3>
      <p className="archive-panel mt-5 p-5 text-sm leading-7 text-emerald-50/70">
        아직 무슨 기능을 넣을지 정하지 않았어요.
      </p>
    </section>
  );
}
