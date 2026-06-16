"use client";

import { cn } from "@/utils/cn";

interface ExtractSectionProps {
  className?: string;
}

export function ExtractSection({ className }: ExtractSectionProps) {
  return (
    <section className={cn("glass-card p-6 md:p-8", className)}>
      <p className="text-xs tracking-[0.35em] text-red-100/60 uppercase">@/1_R#0?/@...</p>
      <h3 className="board-title mt-3">아직 공사중</h3>
      <p className="mt-5 border border-emerald-100/10 bg-black/25 p-5 text-sm leading-7 text-emerald-50/70">
        아직 무슨 기능을 넣을지 정하지 않았어요.
      </p>
    </section>
  );
}
