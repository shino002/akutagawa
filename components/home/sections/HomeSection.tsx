"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import type { Character, GuestbookEntry, HomeContent } from "@/lib/types";

type HomeRecentItem = {
  characterId: string;
  title: string;
  meta: string;
  date: string;
};

interface HomeSectionProps {
  homeContent: HomeContent;
  characters: Character[];
  guestbook: GuestbookEntry[];
  onNavigateToGuest: () => void;
  onNavigateToCharacterWorks: (characterId: string) => void;
  onNavigateToCharacterDetail: (characterId: string) => void;
  className?: string;
}

export function HomeSection({
  homeContent,
  characters,
  guestbook,
  onNavigateToGuest,
  onNavigateToCharacterWorks,
  onNavigateToCharacterDetail,
  className,
}: HomeSectionProps) {
  const allWorks = useMemo(
    () =>
      characters.flatMap((character) =>
        character.works.map((work) => ({
          character,
          work,
        })),
      ),
    [characters],
  );

  const recentItems = useMemo<HomeRecentItem[]>(
    () => [
      ...allWorks.map(({ character, work }) => ({
        characterId: character.id,
        title: `${character.name} - ${work.title}`,
        meta: work.kind,
        date: work.date,
      })),
      ...guestbook.slice(0, 2).map((guest) => ({
        characterId: "",
        title: `방명록 - ${guest.name}`,
        meta: "comment",
        date: "new",
      })),
    ],
    [allWorks, guestbook],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <section className="glass-card p-6 md:p-8">
        <p className="text-sm tracking-[0.35em] text-emerald-100/60 uppercase">
          {homeContent.eyebrow}
        </p>
        <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">{homeContent.title}</h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 whitespace-pre-line text-emerald-50/85 md:text-base">
          {homeContent.body}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6">
          <h3 className="board-title">최근 갱신된 글</h3>
          <div className="mt-5 space-y-3">
            {recentItems.slice(0, 6).map((item) => (
              <button
                key={`${item.title}-${item.date}`}
                type="button"
                onClick={() => {
                  if (item.meta === "comment") {
                    onNavigateToGuest();
                    return;
                  }
                  onNavigateToCharacterWorks(item.characterId);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-100/10 bg-emerald-950/30 px-4 py-3 text-left transition hover:bg-emerald-100/10"
              >
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="text-xs text-emerald-100/50">{item.meta}</span>
                </span>
                <span className="text-xs text-emerald-100/60">{item.date}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="board-title">자캐 바로가기</h3>
          <div className="mt-5 grid gap-3">
            {characters.map((character) => {
              const shortcutImage = (character.images ?? [])[0];

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => onNavigateToCharacterDetail(character.id)}
                  className="overflow-hidden rounded-2xl border border-emerald-100/10 bg-emerald-950/30 text-left transition hover:-translate-y-1 hover:border-emerald-100/30"
                >
                  <div
                    className={`aspect-[3/2] overflow-hidden bg-gradient-to-r ${character.palette}`}
                  >
                    {shortcutImage && (
                      /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                      <img
                        src={shortcutImage.url}
                        alt={`${character.name} 대표 그림`}
                        className="h-full w-full object-cover opacity-90"
                        style={thumbnailStyle(shortcutImage)}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-xl font-bold">{character.name}</p>
                    <p className="mt-1 text-xs text-emerald-100/60">{character.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
