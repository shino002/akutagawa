"use client";

import { cn } from "@/utils/cn";
import type { DiaryEntry } from "@/lib/types";

interface DiarySectionProps {
  entries: DiaryEntry[];
  className?: string;
}

export function DiarySection({ entries, className }: DiarySectionProps) {
  return (
    <section className={cn("glass-card p-6 md:p-8", className)}>
      <h3 className="board-title">다이어리</h3>
      <div className="mt-5 grid gap-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-3xl border border-emerald-100/10 bg-emerald-950/30 p-5"
            >
              <p className="text-xs text-emerald-100/50">{entry.date}</p>
              <h4 className="mt-2 text-xl font-semibold text-emerald-50">{entry.title}</h4>
              <p className="mt-4 text-sm leading-8 whitespace-pre-line text-emerald-50/78">
                {entry.body}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-3xl border border-emerald-100/10 bg-black/30 p-5 text-sm text-emerald-100/60">
            아직 저장된 일기가 없어요.
          </p>
        )}
      </div>
    </section>
  );
}
