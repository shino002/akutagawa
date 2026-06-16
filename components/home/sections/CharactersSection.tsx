"use client";

import { type FormEvent, useMemo } from "react";
import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import { characterPaletteStyle } from "@/lib/character-palette";
import { emptyCharacter } from "@/constants/home";
import { TextGlitch } from "@/components/TextGlitch";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, UploadedImage, World } from "@/lib/types";
import type {
  CharacterDetailTab,
  ExpressionModalItem,
  GalleryModalItem,
  ReaderModalItem,
} from "@/types/home.types";

const TAB_LABELS: Record<CharacterDetailTab, string> = {
  settings: "Record",
  images: "Visual",
  works: "Works",
  worlds: "World",
};

const TAB_ORDER: CharacterDetailTab[] = ["settings", "images", "works", "worlds"];
const TAB_CODES: Record<CharacterDetailTab, string> = {
  settings: "FILE-01",
  images: "FILE-02",
  works: "FILE-03",
  worlds: "FILE-04",
};
const PROFILE_LABELS: Record<keyof Character["profile"], string> = {
  age: "나이",
  height: "신장",
  role: "역할",
  keyword: "키워드",
};

const imageCreditName = (image: UploadedImage) => image.name?.trim() ?? "";
const formatHeroCharacterId = (id: string) =>
  id ? `${id.slice(0, 1).toUpperCase()}${id.slice(1).toLowerCase()}` : "";

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
  canUnlockWorlds: boolean;
  onUnlockCharacterWorld: (
    event: FormEvent<HTMLFormElement>,
    worldId: string,
  ) => void | Promise<void>;
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
  canUnlockWorlds,
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
  const heroCharacterId = formatHeroCharacterId(activeCharacter.id);
  const activeSettingSections = activeCharacter.settingSections ?? [];

  return (
    <section className={cn("space-y-6", className)}>
      {!activeCharacterId && (
      <section className="glass-card character-index-panel p-6 md:p-8">
        <div className="character-index-header">
          <p className="character-index-blue-text text-xs tracking-[0.45em] uppercase">
            <TextGlitch className="character-index-blue-text" text="OC Files" />
          </p>
          <TextGlitch
            className="character-index-blue-text"
            text={`${String(characters.length).padStart(2, "0")} Records`}
          />
        </div>

        {characters.length === 0 ? (
          <div className="archive-panel mt-6 p-5 text-sm leading-7 text-emerald-100/65">
            아직 등록된 자캐가 없어요. 관리자 로그인 후 `새 자캐 만들기`로 첫 카드를 추가해주세요.
          </div>
        ) : (
          <div className="character-index-grid">
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
                  className={`archive-character-card text-left ${activeCharacterId === character.id ? "is-active" : ""}`}
                >
                  <div
                    className="archive-character-card-image character-palette-surface"
                    style={characterPaletteStyle(character.palette)}
                  >
                    {cardImage && (
                      /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                      <img
                        src={cardImage.url}
                        alt={`${character.name} 대표 그림`}
                        className="h-full w-full object-cover"
                        style={thumbnailStyle(cardImage)}
                      />
                    )}
                  </div>
                  <div className="archive-character-card-body">
                    <p className="archive-character-card-id">
                      <TextGlitch text={character.id} />
                    </p>
                    <h4 className="archive-character-card-name">
                      <TextGlitch text={character.name} />
                      {character.kanjiName && (
                        <span className="kanji-name ml-2 align-baseline text-[0.58em] text-stone-300/55">
                          <TextGlitch text={character.kanjiName} />
                        </span>
                      )}
                    </h4>
                    <p className="archive-character-card-subtitle">
                      <TextGlitch text={character.subtitle} />
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
      )}

      {activeCharacterId && (
      <section className="glass-card case-file-detail dossier-viewer overflow-hidden">
        <div className="case-file-hero" data-character-id={heroCharacterId}>
          <div
            className="character-palette-surface absolute inset-0"
            style={characterPaletteStyle(activeCharacter.palette)}
          />
          {activeMainIllustration && (
            /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
            <img
              src={activeMainIllustration.url}
              alt={`${activeCharacter.name} 대표 그림`}
              className="case-file-hero-image"
              style={thumbnailStyle(activeMainIllustration)}
            />
          )}
          <div className="case-file-hero-grid" />
          <div
            className="case-file-title-block"
            style={{
              position: "absolute",
              zIndex: 8,
              top: "auto",
              right: "auto",
              bottom: "0.65rem",
              left: "1rem",
            }}
          >
            <p className="case-file-kicker">
              <TextGlitch text="Private Archive / Case File" />
            </p>
            <h3 className="case-file-name">
              <TextGlitch text={activeCharacter.name} />
              {activeCharacter.kanjiName && (
                  <span className="kanji-name ml-3 align-baseline text-[0.34em] text-stone-300/55">
                  <TextGlitch text={activeCharacter.kanjiName} />
                </span>
              )}
            </h3>
            <p className="case-file-subtitle">
              <TextGlitch text={activeCharacter.subtitle} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveCharacterId("");
              setActiveTab("settings");
            }}
            className="case-back-button"
            style={{
              top: "1rem",
              right: "auto",
              bottom: "auto",
              left: "1rem",
            }}
          >
            목록으로
          </button>
        </div>
        <div className="dossier-body p-6 md:p-8">
          <div className="case-file-meta">
            <span>NO. {activeCharacter.id || "UNREGISTERED"}</span>
            {activeCharacter.classification && <span>분류: {activeCharacter.classification}</span>}
            {(activeCharacter.statusTags ?? []).slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <blockquote className="case-file-quote">
            “{activeCharacter.quote}”
          </blockquote>

          <dl className="case-profile-grid">
            {Object.entries(activeCharacter.profile).map(([key, value]) => (
              <div key={key} className="case-profile-cell">
                <dt>{PROFILE_LABELS[key as keyof Character["profile"]]}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>

          <div className="case-tab-strip">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`case-tab-button ${activeTab === tab ? "is-active" : ""}`}
              >
                <span>{TAB_CODES[tab]}</span>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="case-tab-panel">
            {activeTab === "settings" && (
              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="static-record-panel">
                  <p className="text-xs tracking-[0.25em] text-emerald-100/45 uppercase">
                    Record Box
                  </p>
                  <div className="mt-3 grid gap-3">
                    {activeSettingSections.length > 0 ? (
                      activeSettingSections.map((section, index) => (
                        <article key={section.id || `${section.title}-${index}`} className="static-record-panel">
                          <span className="block text-xs tracking-[0.25em] text-emerald-100/45 uppercase mb-2">{section.title || `RECORD ${String(index + 1).padStart(2, "0")}`}</span>
                          <p className="whitespace-pre-line text-sm leading-7 text-emerald-50/80">{section.body || "-"}</p>
                        </article>
                      ))
                    ) : activeCharacter.settings.length > 0 ? (
                      activeCharacter.settings.map((setting, index) => (
                        <div key={setting} className="static-record-panel">
                          <span className="block text-xs tracking-[0.25em] text-emerald-100/45 uppercase mb-2">RECORD {String(index + 1).padStart(2, "0")}</span>
                          <p className="text-sm leading-7 text-emerald-50/80">{setting}</p>
                        </div>
                      ))
                    ) : (
                      <p className="plain-empty-note">
                        등록된 상세 설정이 없어요.
                      </p>
                    )}
                  </div>
                </section>
                <div className="grid content-start gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      activeMainIllustration &&
                      onOpenGallery({ image: activeMainIllustration, character: activeCharacter })
                    }
                    className="case-evidence-preview group block w-full text-left"
                    disabled={!activeMainIllustration}
                  >
                    <div className="relative h-96 overflow-hidden md:h-[520px]">
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
                            className="character-palette-surface h-full w-full"
                            style={characterPaletteStyle(activeCharacter.palette)}
                          />
                      )}
                      <span className="case-evidence-stamp">VISUAL RECORD</span>
                      {activeMainIllustration && imageCreditName(activeMainIllustration) && (
                        <span className="image-credit-label image-credit-label-large">
                          {imageCreditName(activeMainIllustration)}
                        </span>
                      )}
                    </div>
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
                      className="case-side-record text-left"
                    >
                      <p className="text-xs tracking-[0.25em] text-stone-300/55 uppercase">
                        Standing Expressions
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {activeStandingImages.slice(0, 4).map((image) => (
                          <div
                            key={image.id}
                            className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
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

                  <div className="static-record-panel">
                    <p className="text-xs text-emerald-100/45 uppercase">관계</p>
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
              <div className="dossier-tab-stack">
                {activeStandingImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenExpression({
                        character: activeCharacter,
                        images: activeStandingImages,
                      })
                    }
                    className="case-side-record block w-full text-left transition hover:border-stone-400/35"
                  >
                    <p className="text-xs tracking-[0.28em] text-stone-300/55 uppercase">
                      Standing Expression Set
                    </p>
                    <h4 className="mt-2 text-xl font-semibold text-emerald-50">스탠딩 표정 모음</h4>
                    <p className="mt-2 text-sm text-emerald-100/65">
                      {activeStandingImages.length}장의 표정 이미지를 한 번에 봅니다.
                    </p>
                  </button>
                )}
                <div className="dossier-gallery-grid">
                  {activeIllustrationImages.map((image, index) => (
                    <article key={image.id} className="gallery-tile group">
                      <button
                        type="button"
                        onClick={() => onOpenGallery({ image, character: activeCharacter })}
                        className="relative block w-full overflow-hidden text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                        <img
                          src={image.url}
                          alt={`${activeCharacter.name} 그림 ${index + 1}`}
                          className="h-64 w-full object-cover opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                          style={thumbnailStyle(image)}
                        />
                        {imageCreditName(image) && (
                          <span className="image-credit-label">{imageCreditName(image)}</span>
                        )}
                      </button>
                    </article>
                  ))}
                </div>
                {activeCharacterImages.length === 0 && (
                  <p className="plain-empty-note">
                    등록된 그림이 없어요.
                  </p>
                )}
              </div>
            )}

            {activeTab === "works" && (
              <div className="dossier-tab-stack">
                {activeWorks.length > 0 && (
                  <p className="border border-stone-400/18 bg-stone-900/10 p-3 text-sm text-emerald-100/70">
                    글 카드를 누르면 이북 리더 화면으로 열립니다.
                  </p>
                )}
                {activeWorks.map((work, index) => (
                  <button
                    key={`${work.title}-${work.date}-${index}`}
                    type="button"
                    onClick={() => onOpenReader({ character: activeCharacter, work })}
                    className="case-setting-note block w-full text-left transition hover:border-stone-400/35"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-emerald-100/45">
                          {work.kind} / {work.date}
                        </p>
                        <h4 className="mt-2 text-xl font-semibold">{work.title}</h4>
                      </div>
                      <span className="archive-submit-button px-4 py-2 text-xs font-semibold">
                        이북 리더로 보기
                      </span>
                    </div>
                    {(work.images?.length ?? 0) > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {work.images?.slice(0, 5).map((image) => (
                          <div
                            key={image.id}
                            className="relative aspect-square overflow-hidden border border-stone-400/15 bg-black"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                            <img
                              src={image.url}
                              alt="첨부 이미지"
                              className="h-full w-full object-cover opacity-90"
                              style={thumbnailStyle(image)}
                            />
                            {imageCreditName(image) && (
                              <span className="image-credit-label image-credit-label-compact">
                                {imageCreditName(image)}
                              </span>
                            )}
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
                  <p className="plain-empty-note">
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
                            className={`case-tab-button px-4 py-2 text-sm ${
                              activeCharacterWorldEntry?.worldId === entry.worldId
                                ? "is-active"
                                : ""
                            }`}
                          >
                            {world?.title ?? entry.worldId}
                          </button>
                        );
                      })}
                    </div>
                    {activeCharacterWorldEntry &&
                      (!isActiveCharacterWorldUnlocked ? (
                        <article className="case-side-record grid gap-4">
                          <div>
                            <p className="text-xs tracking-[0.25em] text-stone-300/55 uppercase">
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
                            className="grid gap-3 border border-stone-400/15 bg-stone-900/10 p-4"
                          >
                            <p className="text-sm leading-7 text-emerald-100/70">
                              {canUnlockWorlds
                                ? "이 세계관의 설정, 그림, 연성/로그를 보려면 비밀번호를 입력해주세요."
                                : "세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요."}
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
                                placeholder={canUnlockWorlds ? "World password" : "회원가입 또는 로그인 필요"}
                                className="auth-input auth-input-compact"
                                disabled={!canUnlockWorlds}
                              />
                              <button className="border border-stone-400/25 bg-stone-900/30 px-5 py-2 text-sm text-stone-100">
                                {canUnlockWorlds ? "기록 열기" : "로그인 창 열기"}
                              </button>
                            </div>
                          </form>
                        </article>
                      ) : (
                          <article className="archive-panel grid gap-5 p-5">
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
                                  <p key={setting} className="case-setting-note">
                                    {setting}
                                  </p>
                                ))
                              ) : (
                                <p className="plain-empty-note">
                                  이 세계관 설정이 없어요.
                                </p>
                              )}
                            </div>
                            <div className="grid content-start gap-4">
                              <article className="gallery-tile world-profile-card">
                                <button
                                  type="button"
                                  onClick={() =>
                                    activeWorldMainIllustration &&
                                    onOpenGallery({
                                      image: activeWorldMainIllustration,
                                      character: activeCharacter,
                                    })
                                  }
                                  className="group block w-full text-left"
                                  disabled={!activeWorldMainIllustration}
                                >
                                  <div className="relative h-96 overflow-hidden md:h-[520px]">
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
                                        className="character-palette-surface h-full w-full"
                                        style={characterPaletteStyle(activeCharacter.palette)}
                                      />
                                    )}
                                    {activeWorldMainIllustration &&
                                      imageCreditName(activeWorldMainIllustration) && (
                                        <span className="image-credit-label image-credit-label-large">
                                          {imageCreditName(activeWorldMainIllustration)}
                                        </span>
                                      )}
                                  </div>
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
                                    className="world-profile-banner"
                                  >
                                    <span>세계관 스탠딩 표정 {activeWorldStandingImages.length}장 보기</span>
                                    <span>OPEN</span>
                                  </button>
                                )}
                              </article>

                            </div>
                          </div>
                        </article>
                      ))}
                  </>
                ) : (
                  <p className="plain-empty-note">
                    참가한 세계관 자료가 없어요.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      )}
    </section>
  );
}
