"use client";

import { type FormEvent, useMemo } from "react";
import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import { emptyCharacter } from "@/constants/home";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, World } from "@/lib/types";
import type {
  CharacterDetailTab,
  ExpressionModalItem,
  GalleryModalItem,
  ReaderModalItem,
} from "@/types/home.types";

const TAB_LABELS: Record<CharacterDetailTab, string> = {
  settings: "설정",
  images: "그림",
  works: "글",
  worlds: "세계관",
};

const TAB_ORDER: CharacterDetailTab[] = ["settings", "images", "works", "worlds"];

interface CharactersSectionProps {
  characters: Character[];
  activeCharacterId: string;
  setActiveCharacterId: (id: string) => void;
  activeTab: CharacterDetailTab;
  setActiveTab: (tab: CharacterDetailTab) => void;
  worlds: World[];
  activeCharacterWorldId: string;
  setActiveCharacterWorldId: (id: string) => void;
  worldPasswordDrafts: Record<string, string>;
  onWorldPasswordChange: (worldId: string, value: string) => void;
  unlockedWorldIds: Record<string, boolean>;
  onUnlockCharacterWorld: (event: FormEvent<HTMLFormElement>, worldId: string) => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  onOpenExpression: (item: ExpressionModalItem) => void;
  onOpenReader: (item: ReaderModalItem) => void;
  className?: string;
}

export function CharactersSection({
  characters,
  activeCharacterId,
  setActiveCharacterId,
  activeTab,
  setActiveTab,
  worlds,
  activeCharacterWorldId,
  setActiveCharacterWorldId,
  worldPasswordDrafts,
  onWorldPasswordChange,
  unlockedWorldIds,
  onUnlockCharacterWorld,
  onOpenGallery,
  onOpenExpression,
  onOpenReader,
  className,
}: CharactersSectionProps) {
  const activeCharacter = useMemo(
    () =>
      characters.find((character) => character.id === activeCharacterId) ??
      characters[0] ??
      emptyCharacter,
    [activeCharacterId, characters],
  );
  const activeCharacterImages = useMemo(() => activeCharacter.images ?? [], [activeCharacter]);
  const activeIllustrationImages = useMemo(
    () => activeCharacterImages.filter((image) => image.category !== "standing"),
    [activeCharacterImages],
  );
  const activeStandingImages = useMemo(
    () => activeCharacterImages.filter((image) => image.category === "standing"),
    [activeCharacterImages],
  );
  const activeMainIllustration = activeIllustrationImages[0] ?? activeCharacterImages[0];
  const activeWorks = useMemo(() => activeCharacter.works, [activeCharacter]);
  const activeCharacterWorldEntries = useMemo(
    () =>
      normalizeWorldEntries(activeCharacter.worldEntries).filter((entry) =>
        worlds.some((world) => world.id === entry.worldId),
      ),
    [activeCharacter, worlds],
  );
  const activeCharacterWorldEntry = useMemo(
    () =>
      activeCharacterWorldEntries.find((entry) => entry.worldId === activeCharacterWorldId) ??
      activeCharacterWorldEntries[0],
    [activeCharacterWorldEntries, activeCharacterWorldId],
  );
  const activeWorldIllustrationImages = useMemo(
    () =>
      (activeCharacterWorldEntry?.images ?? []).filter((image) => image.category !== "standing"),
    [activeCharacterWorldEntry],
  );
  const activeWorldStandingImages = useMemo(
    () =>
      (activeCharacterWorldEntry?.images ?? []).filter((image) => image.category === "standing"),
    [activeCharacterWorldEntry],
  );
  const activeWorldMainIllustration =
    activeWorldIllustrationImages[0] ?? activeCharacterWorldEntry?.images[0];
  const activeCharacterWorld = useMemo(
    () =>
      activeCharacterWorldEntry
        ? worlds.find((world) => world.id === activeCharacterWorldEntry.worldId)
        : undefined,
    [activeCharacterWorldEntry, worlds],
  );
  const activeCharacterWorldPassword = activeCharacterWorld?.password?.trim() ?? "";
  const isActiveCharacterWorldUnlocked = Boolean(
    activeCharacterWorldEntry &&
    (!activeCharacterWorldPassword || unlockedWorldIds[activeCharacterWorldEntry.worldId]),
  );

  return (
    <section className={cn("space-y-6", className)}>
      <section className="glass-card p-6 md:p-8">
        <div className="text-center">
          <p className="text-center text-xs tracking-[0.45em] text-emerald-100/55 uppercase">
            Character Cards
          </p>
        </div>

        {characters.length === 0 ? (
          <div className="mt-6 border border-emerald-100/10 bg-black/20 p-5 text-sm leading-7 text-emerald-100/65">
            아직 등록된 자캐가 없어요. 관리자 로그인 후 `새 자캐 만들기`로 첫 카드를 추가해주세요.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => {
              const cardImage =
                (character.images ?? []).find((image) => image.category !== "standing") ??
                (character.images ?? [])[0];

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => {
                    setActiveCharacterId(character.id);
                    setActiveTab("settings");
                  }}
                  className={`character-card text-left ${activeCharacter.id === character.id ? "is-active" : ""}`}
                >
                  <div
                    className={`aspect-[3/2] overflow-hidden bg-gradient-to-br ${character.palette}`}
                  >
                    {cardImage && (
                      /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                      <img
                        src={cardImage.url}
                        alt={`${character.name} 대표 그림`}
                        className="h-full w-full object-cover opacity-95 transition duration-300 hover:scale-105 hover:opacity-100"
                        style={thumbnailStyle(cardImage)}
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs tracking-[0.28em] text-red-200/70 uppercase">
                      {character.id}
                    </p>
                    <h4 className="mt-2 text-2xl font-bold text-emerald-50">{character.name}</h4>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-emerald-100/65">
                      {character.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass-card overflow-hidden">
        <div className={`h-56 overflow-hidden bg-gradient-to-r ${activeCharacter.palette}`}>
          {activeMainIllustration && (
            /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
            <img
              src={activeMainIllustration.url}
              alt={`${activeCharacter.name} 대표 그림`}
              className="h-full w-full object-cover opacity-90"
              style={thumbnailStyle(activeMainIllustration)}
            />
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] text-emerald-100/50 uppercase">
                Character Detail
              </p>
              <h3 className="mt-2 font-serif text-5xl font-bold">{activeCharacter.name}</h3>
              <p className="mt-2 text-emerald-100/70">{activeCharacter.subtitle}</p>
            </div>
          </div>

          <blockquote className="mt-6 border border-emerald-100/10 bg-black/20 p-5 text-sm leading-7 text-emerald-50/80">
            “{activeCharacter.quote}”
          </blockquote>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(activeCharacter.profile).map(([key, value]) => (
              <div key={key} className="border border-emerald-100/10 bg-emerald-950/30 p-4">
                <dt className="text-xs text-emerald-100/45 uppercase">{key}</dt>
                <dd className="mt-2 text-sm">{value || "-"}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm ${
                  activeTab === tab
                    ? "bg-emerald-200 text-emerald-950"
                    : "bg-emerald-100/10 text-emerald-50/70"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "settings" && (
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  {activeCharacter.settings.length > 0 ? (
                    activeCharacter.settings.map((setting) => (
                      <p
                        key={setting}
                        className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-sm leading-7"
                      >
                        {setting}
                      </p>
                    ))
                  ) : (
                    <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">
                      등록된 상세 설정이 없어요.
                    </p>
                  )}
                </div>
                <div className="grid content-start gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      activeMainIllustration &&
                      onOpenGallery({ image: activeMainIllustration, character: activeCharacter })
                    }
                    className="gallery-tile group block w-full text-left"
                    disabled={!activeMainIllustration}
                  >
                    <div className="h-96 overflow-hidden md:h-[520px]">
                      {activeMainIllustration ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                        <img
                          src={activeMainIllustration.url}
                          alt={`${activeCharacter.name} 일러스트`}
                          className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                          style={thumbnailStyle(activeMainIllustration)}
                        />
                      ) : (
                        <div
                          className={`h-full w-full bg-gradient-to-r ${activeCharacter.palette}`}
                        />
                      )}
                    </div>
                    <p className="p-3 text-xs text-emerald-50">일러스트 대표 썸네일</p>
                  </button>

                  {activeStandingImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenExpression({
                          character: activeCharacter,
                          images: activeStandingImages,
                        })
                      }
                      className="border border-red-600/40 bg-black/35 p-4 text-left transition hover:border-red-500"
                    >
                      <p className="text-xs tracking-[0.25em] text-red-100/55 uppercase">
                        Standing Expressions
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {activeStandingImages.slice(0, 4).map((image) => (
                          <div
                            key={image.id}
                            className="aspect-square overflow-hidden border border-red-600/25 bg-black"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                            <img
                              src={image.url}
                              alt="스탠딩 이미지"
                              className="h-full w-full object-cover"
                              style={thumbnailStyle(image)}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-emerald-50/75">
                        스탠딩 표정 {activeStandingImages.length}장 보기
                      </p>
                    </button>
                  )}

                  <div className="border border-emerald-100/10 bg-emerald-950/30 p-4">
                    <p className="text-xs text-emerald-100/45 uppercase">Relationship</p>
                    <ul className="mt-3 space-y-2 text-sm text-emerald-50/80">
                      {activeCharacter.relationships.length > 0 ? (
                        activeCharacter.relationships.map((relationship) => (
                          <li key={relationship}>{relationship}</li>
                        ))
                      ) : (
                        <li className="text-emerald-100/50">등록된 관계가 없어요.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "images" && (
              <div className="space-y-4">
                {activeStandingImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenExpression({
                        character: activeCharacter,
                        images: activeStandingImages,
                      })
                    }
                    className="block w-full border border-red-600/45 bg-red-950/10 p-5 text-left transition hover:border-red-500"
                  >
                    <p className="text-xs tracking-[0.28em] text-red-100/55 uppercase">
                      Standing Expression Set
                    </p>
                    <h4 className="mt-2 text-xl font-semibold text-emerald-50">스탠딩 표정 모음</h4>
                    <p className="mt-2 text-sm text-emerald-100/65">
                      {activeStandingImages.length}장의 표정 이미지를 한 번에 봅니다.
                    </p>
                  </button>
                )}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {activeIllustrationImages.map((image, index) => (
                    <article key={image.id} className="gallery-tile group">
                      <button
                        type="button"
                        onClick={() => onOpenGallery({ image, character: activeCharacter })}
                        className="block w-full text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                        <img
                          src={image.url}
                          alt={`${activeCharacter.name} 그림 ${index + 1}`}
                          className="h-64 w-full object-cover opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                          style={thumbnailStyle(image)}
                        />
                      </button>
                    </article>
                  ))}
                </div>
                {activeCharacterImages.length === 0 && (
                  <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">
                    등록된 그림이 없어요.
                  </p>
                )}
              </div>
            )}

            {activeTab === "works" && (
              <div className="space-y-4">
                {activeWorks.length > 0 && (
                  <p className="border border-red-600/30 bg-red-950/10 p-3 text-sm text-emerald-100/70">
                    글 카드를 누르면 이북 리더 화면으로 열립니다.
                  </p>
                )}
                {activeWorks.map((work, index) => (
                  <button
                    key={`${work.title}-${work.date}-${index}`}
                    type="button"
                    onClick={() => onOpenReader({ character: activeCharacter, work })}
                    className="block w-full border border-emerald-100/10 bg-emerald-950/30 p-5 text-left transition hover:border-red-500/70 hover:bg-red-950/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-emerald-100/45">
                          {work.kind} / {work.date}
                        </p>
                        <h4 className="mt-2 text-xl font-semibold">{work.title}</h4>
                      </div>
                      <span className="bg-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-950">
                        이북 리더로 보기
                      </span>
                    </div>
                    {(work.images?.length ?? 0) > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {work.images?.slice(0, 5).map((image) => (
                          <div
                            key={image.id}
                            className="aspect-square overflow-hidden border border-red-600/25 bg-black"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                            <img
                              src={image.url}
                              alt="첨부 이미지"
                              className="h-full w-full object-cover opacity-90"
                              style={thumbnailStyle(image)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-emerald-50/75">
                      {work.body}
                    </p>
                  </button>
                ))}
                {activeWorks.length === 0 && (
                  <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">
                    등록된 글이 없어요.
                  </p>
                )}
              </div>
            )}

            {activeTab === "worlds" && (
              <div className="grid gap-5">
                {activeCharacterWorldEntries.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {activeCharacterWorldEntries.map((entry) => {
                        const world = worlds.find((item) => item.id === entry.worldId);
                        return (
                          <button
                            key={entry.worldId}
                            type="button"
                            onClick={() => setActiveCharacterWorldId(entry.worldId)}
                            className={`px-4 py-2 text-sm ${
                              activeCharacterWorldEntry?.worldId === entry.worldId
                                ? "bg-emerald-200 text-emerald-950"
                                : "bg-emerald-100/10 text-emerald-50/70"
                            }`}
                          >
                            {world?.title ?? entry.worldId}
                          </button>
                        );
                      })}
                    </div>
                    {activeCharacterWorldEntry &&
                      (!isActiveCharacterWorldUnlocked ? (
                        <article className="grid gap-4 border border-red-600/30 bg-black/30 p-5">
                          <div>
                            <p className="text-xs tracking-[0.25em] text-red-100/55 uppercase">
                              World Data Locked
                            </p>
                            <h4 className="mt-2 text-2xl font-semibold">
                              {activeCharacterWorld?.title ?? activeCharacterWorldEntry.worldId}
                            </h4>
                          </div>
                          <form
                            onSubmit={(event) =>
                              onUnlockCharacterWorld(event, activeCharacterWorldEntry.worldId)
                            }
                            className="grid gap-3 border border-red-600/25 bg-red-950/10 p-4"
                          >
                            <p className="text-sm leading-7 text-emerald-100/70">
                              이 세계관의 설정, 그림, 연성/로그를 보려면 비밀번호를 입력해주세요.
                            </p>
                            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                              <input
                                type="password"
                                value={worldPasswordDrafts[activeCharacterWorldEntry.worldId] ?? ""}
                                onChange={(event) =>
                                  onWorldPasswordChange(
                                    activeCharacterWorldEntry.worldId,
                                    event.target.value,
                                  )
                                }
                                placeholder="World password"
                                className="auth-input auth-input-compact"
                              />
                              <button className="border border-red-600/50 bg-red-950/40 px-5 py-2 text-sm text-red-50">
                                기록 열기
                              </button>
                            </div>
                          </form>
                        </article>
                      ) : (
                        <article className="grid gap-5 border border-emerald-100/10 bg-black/20 p-5">
                          <div>
                            <p className="text-xs tracking-[0.25em] text-emerald-100/45 uppercase">
                              World Data
                            </p>
                            <h4 className="mt-2 text-2xl font-semibold">
                              {worlds.find(
                                (world) => world.id === activeCharacterWorldEntry.worldId,
                              )?.title ?? activeCharacterWorldEntry.worldId}
                            </h4>
                          </div>
                          <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                            <div className="grid content-start gap-3">
                              {activeCharacterWorldEntry.settings.length > 0 ? (
                                activeCharacterWorldEntry.settings.map((setting) => (
                                  <p
                                    key={setting}
                                    className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-sm leading-7"
                                  >
                                    {setting}
                                  </p>
                                ))
                              ) : (
                                <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
                                  이 세계관 설정이 없어요.
                                </p>
                              )}
                            </div>
                            <div className="grid content-start gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  activeWorldMainIllustration &&
                                  onOpenGallery({
                                    image: activeWorldMainIllustration,
                                    character: activeCharacter,
                                  })
                                }
                                className="gallery-tile group block w-full text-left"
                                disabled={!activeWorldMainIllustration}
                              >
                                <div className="h-96 overflow-hidden md:h-[520px]">
                                  {activeWorldMainIllustration ? (
                                    /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                                    <img
                                      src={activeWorldMainIllustration.url}
                                      alt={`${activeCharacter.name} 세계관 일러스트`}
                                      className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                                      style={thumbnailStyle(activeWorldMainIllustration)}
                                    />
                                  ) : (
                                    <div
                                      className={`h-full w-full bg-gradient-to-r ${activeCharacter.palette}`}
                                    />
                                  )}
                                </div>
                                <p className="truncate p-3 text-xs text-emerald-50">
                                  세계관 일러스트
                                </p>
                              </button>

                              {activeWorldStandingImages.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenExpression({
                                      character: activeCharacter,
                                      images: activeWorldStandingImages,
                                    })
                                  }
                                  className="border border-red-600/40 bg-black/35 p-4 text-left transition hover:border-red-500"
                                >
                                  <p className="text-xs tracking-[0.25em] text-red-100/55 uppercase">
                                    World Standing Expressions
                                  </p>
                                  <div className="mt-3 grid grid-cols-4 gap-2">
                                    {activeWorldStandingImages.slice(0, 4).map((image) => (
                                      <div
                                        key={image.id}
                                        className="aspect-square overflow-hidden border border-red-600/25 bg-black"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                        <img
                                          src={image.url}
                                          alt="스탠딩 이미지"
                                          className="h-full w-full object-cover"
                                          style={thumbnailStyle(image)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <p className="mt-3 text-sm text-emerald-50/75">
                                    세계관 스탠딩 표정 {activeWorldStandingImages.length}장 보기
                                  </p>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-3">
                            {activeCharacterWorldEntry.works.map((work, index) => (
                              <button
                                key={`${work.title}-${work.date}-${index}`}
                                type="button"
                                onClick={() => onOpenReader({ character: activeCharacter, work })}
                                className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-left hover:border-red-500/70"
                              >
                                <p className="text-xs text-emerald-100/45">
                                  {work.kind} / {work.date}
                                </p>
                                <h4 className="mt-2 text-lg font-semibold">{work.title}</h4>
                                {(work.images?.length ?? 0) > 0 && (
                                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {work.images?.slice(0, 5).map((image) => (
                                      <div
                                        key={image.id}
                                        className="aspect-square overflow-hidden border border-red-600/25 bg-black"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                        <img
                                          src={image.url}
                                          alt="첨부 이미지"
                                          className="h-full w-full object-cover opacity-90"
                                          style={thumbnailStyle(image)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="mt-2 line-clamp-2 text-sm leading-7 text-emerald-50/70">
                                  {work.body}
                                </p>
                              </button>
                            ))}
                          </div>
                        </article>
                      ))}
                  </>
                ) : (
                  <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">
                    참가한 세계관 자료가 없어요.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
