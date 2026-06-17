"use client";

import { type FormEvent, useMemo } from "react";
import { cn } from "@/utils/cn";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { GlitchedText } from "@/components/GlitchedText";
import { characterPaletteStyle } from "@/lib/character-palette";
import { thumbnailStyle } from "@/lib/image-helpers";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, CharacterWorldEntry, UploadedImage, World, ZoneLinkTarget } from "@/lib/types";
import type { ExpressionModalItem, GalleryModalItem, ReaderModalItem } from "@/types/home.types";

const imageCreditName = (image: UploadedImage) => image.name?.trim() ?? "";

interface WorldsSectionProps {
  worlds: World[];
  activeWorldId: string;
  setActiveWorldId: (id: string) => void;
  characters: Character[];
  worldPasswordDrafts: Record<string, string>;
  onWorldPasswordChange: (worldId: string, value: string) => void;
  unlockedWorldIds: Record<string, boolean>;
  canUnlockWorlds: boolean;
  onUnlockWorld: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onRequireAuth: () => void;
  onViewParticipant: (characterId: string, worldId: string) => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  onOpenExpression: (item: ExpressionModalItem) => void;
  onOpenReader: (item: ReaderModalItem) => void;
  onZoneLinkNavigate?: (target: ZoneLinkTarget) => void;
  className?: string;
}

export function WorldsSection({
  worlds,
  activeWorldId,
  setActiveWorldId,
  characters,
  worldPasswordDrafts,
  onWorldPasswordChange,
  unlockedWorldIds,
  canUnlockWorlds,
  onUnlockWorld,
  onRequireAuth,
  onViewParticipant,
  onOpenGallery,
  onOpenExpression,
  onOpenReader,
  onZoneLinkNavigate,
  className,
}: WorldsSectionProps) {
  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? worlds[0],
    [activeWorldId, worlds],
  );
  const activeWorldParticipants = useMemo(
    () =>
      activeWorld
        ? characters
            .map((character) => ({
              character,
              entry: normalizeWorldEntries(character.worldEntries).find(
                (worldEntry) => worldEntry.worldId === activeWorld.id,
              ),
            }))
            .filter((item): item is { character: Character; entry: CharacterWorldEntry } =>
              Boolean(item.entry),
            )
        : [],
    [activeWorld, characters],
  );
  const activeWorldPassword = activeWorld?.password?.trim() ?? "";
  const isActiveWorldUnlocked = Boolean(
    activeWorld && (!activeWorldPassword || unlockedWorldIds[activeWorld.id]),
  );

  const participantListContent = activeWorld ? (
    <>
      {activeWorldParticipants.map(({ character, entry }) => {
        const worldIllustrations = entry.images.filter((image) => image.category !== "standing");
        const worldStandings = entry.images.filter((image) => image.category === "standing");
        const worldMainIllustration = worldIllustrations[0] ?? entry.images[0];

        return (
          <article key={`${activeWorld.id}-${character.id}`} className="world-participant-entry">
            <section className="world-participant-body">
              <button
                type="button"
                onClick={() => onViewParticipant(character.id, entry.worldId)}
                className="archive-submit-button world-participant-detail-link px-4 py-2 text-sm"
              >
                자캐 상세로 보기
              </button>

              <div className="case-setting-note world-participant-profile">
                <div className="world-participant-layout">
                  <div className="world-participant-left">
                    <div className="world-participant-head">
                      <div className="world-detail-participant-name-row">
                        <h4 className="world-detail-participant-name text-2xl font-semibold">{character.name}</h4>
                        <span className="archive-kicker world-detail-participant-id">{character.id}</span>
                      </div>
                      {character.subtitle ? (
                        <p className="world-detail-participant-subtitle mt-1 text-sm text-emerald-100/60">
                          {character.subtitle}
                        </p>
                      ) : null}
                    </div>

                    <div className="world-participant-settings">
                      {entry.settings.length > 0 ? (
                        entry.settings.map((setting) => (
                          <p
                            key={setting}
                            className="border border-stone-400/20 bg-black/35 p-4 text-sm leading-8 text-emerald-50/75"
                          >
                            {setting}
                          </p>
                        ))
                      ) : (
                        <p className="plain-empty-note">등록된 세계관 설정이 없어요.</p>
                      )}
                    </div>
                  </div>

                  <div className="world-participant-illustration">
                    <button
                      type="button"
                      onClick={() =>
                        worldMainIllustration &&
                        onOpenGallery({ image: worldMainIllustration, character })
                      }
                      className="gallery-tile group block w-full text-left"
                      disabled={!worldMainIllustration}
                    >
                      <div className="world-participant-illustration-frame relative overflow-hidden">
                        {worldMainIllustration ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                          <img
                            src={worldMainIllustration.url}
                            alt={`${character.name} ${activeWorld.title} 일러스트`}
                            className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                            style={thumbnailStyle(worldMainIllustration)}
                          />
                        ) : (
                          <div
                            className="character-palette-surface h-full w-full"
                            style={characterPaletteStyle(character.palette)}
                          />
                        )}
                        {worldMainIllustration && imageCreditName(worldMainIllustration) && (
                          <span className="image-credit-label image-credit-label-large">
                            {imageCreditName(worldMainIllustration)}
                          </span>
                        )}
                      </div>
                      <p className="truncate p-3 text-xs text-emerald-50">세계관 일러스트</p>
                    </button>
                  </div>
                </div>
              </div>

              {(worldStandings.length > 0 || entry.works.length > 0) && (
                <div className="world-participant-extra">
                  {worldStandings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenExpression({ character, images: worldStandings })}
                      className="case-side-record text-left transition hover:border-stone-400/35"
                    >
                      <p className="text-xs tracking-[0.25em] text-stone-300/55 uppercase">
                        World Standing Expressions
                      </p>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {worldStandings.slice(0, 4).map((image) => (
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
                        세계관 스탠딩 표정 {worldStandings.length}장 보기
                      </p>
                    </button>
                  )}
                  {entry.works.length > 0 && (
                    <div className="space-y-3">
                      {entry.works.map((work, index) => (
                        <button
                          key={`${work.title}-${work.date}-${index}`}
                          type="button"
                          onClick={() => onOpenReader({ character, work })}
                          className="case-setting-note text-left hover:border-stone-400/35"
                        >
                          <p className="text-xs text-emerald-100/45">
                            {work.kind} / {work.date}
                          </p>
                          <h5 className="mt-2 text-lg font-semibold">{work.title}</h5>
                          {(work.images?.length ?? 0) > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                              {work.images?.slice(0, 5).map((image) => (
                                <div
                                  key={image.id}
                                  className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
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
                  )}
                </div>
              )}
            </section>
          </article>
        );
      })}
      {activeWorldParticipants.length === 0 && (
        <p className="archive-panel p-5 text-sm text-emerald-100/60">
          이 세계관에 연결된 자캐 자료가 아직 없어요.
        </p>
      )}
    </>
  ) : null;

  return (
    <section className={cn("world-archive-section space-y-5", className)}>
      <section className="glass-card p-6 md:p-8">
        <p className="archive-kicker">World Archive</p>
        <h3 className="archive-title mt-2 font-serif text-4xl">World</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-100/65">
          어떤 세계가 있는지는 볼 수 있지만, 세계관 기록은 비밀번호를 입력해야 열립니다.
        </p>
        <ArchiveMotion
          variant="stagger"
          motionKey="world-list"
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >          {worlds.map((world) => (
            <button
              key={world.id}
              type="button"
              onClick={() => setActiveWorldId(world.id)}
              className={`archive-row archive-world-card text-left ${
                activeWorld?.id === world.id ? "is-active" : ""
              }`}
            >
              <div className="archive-world-card-body">
                <p className="archive-world-card-id">{world.id}</p>
                <h4 className="archive-world-card-title">
                  <GlitchedText
                    text={world.title}
                    glitch={world.textGlitch?.title}
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </h4>
                <p className="archive-world-card-subtitle blue-emphasis">
                  <GlitchedText
                    text={world.subtitle}
                    glitch={world.textGlitch?.subtitle}
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </p>
                {world.password?.trim() && (
                  <p className="archive-world-card-locked mt-1 inline-block border border-stone-400/20 bg-black/35 px-2 py-1 text-[10px] tracking-[0.18em] text-stone-300/70 uppercase">
                    Locked
                  </p>
                )}
              </div>
            </button>
          ))}
        </ArchiveMotion>
        {worlds.length === 0 && (
          <p className="archive-panel mt-6 p-5 text-sm text-emerald-100/60">
            아직 등록된 세계관이 없어요.
          </p>
        )}
      </section>

      {activeWorld && (
        <ArchiveMotion
          as="section"
          motionKey={activeWorld.id}
          variant="scan"
          className="glass-card world-detail-panel p-6 md:p-8"
        >
          <div className="world-detail-stack">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
              <div className="world-detail-intro flex flex-col gap-2">
                <p className="archive-kicker">Selected World</p>
                <h3 className="archive-title world-detail-title m-0 max-w-3xl text-4xl leading-tight md:text-5xl">
                  <GlitchedText
                    text={activeWorld.title}
                    glitch={activeWorld.textGlitch?.title}
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </h3>
                <p className="blue-emphasis world-detail-subtitle mt-3 text-base leading-7">
                  <GlitchedText
                    text={activeWorld.subtitle}
                    glitch={activeWorld.textGlitch?.subtitle}
                    className="block w-full"
                    onZoneLinkClick={onZoneLinkNavigate}
                  />
                </p>
              </div>
              <p className="world-participant-count text-sm text-emerald-100/75">
                {isActiveWorldUnlocked
                  ? `참가 자캐 ${activeWorldParticipants.length}명`
                  : "기록 잠김"}
              </p>
            </div>
            {activeWorld.description && (
              <p className="world-description mt-5 w-full text-sm leading-8 whitespace-pre-line text-emerald-50/75">
                <GlitchedText
                  text={activeWorld.description}
                  glitch={activeWorld.textGlitch?.description}
                  preserveWhitespace
                  className="block w-full"
                  onZoneLinkClick={onZoneLinkNavigate}
                />
              </p>
            )}

            {!isActiveWorldUnlocked ? (
            <form
              onSubmit={onUnlockWorld}
              className="archive-panel mt-6 grid gap-3 p-5"
            >
              <p className="text-sm leading-7 text-emerald-100/70">
                {canUnlockWorlds
                  ? "이 세계관의 참가 자캐 기록, 그림, 로그를 보려면 관리자 페이지에서 설정한 비밀번호를 입력해주세요."
                  : "세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요."}
              </p>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  type="password"
                  value={worldPasswordDrafts[activeWorld.id] ?? ""}
                  onChange={(event) => onWorldPasswordChange(activeWorld.id, event.target.value)}
                  placeholder={canUnlockWorlds ? "World password" : "회원가입 또는 로그인 필요"}
                  className="auth-input auth-input-compact"
                  disabled={!canUnlockWorlds}
                />
                <button
                  type={canUnlockWorlds ? "submit" : "button"}
                  onClick={canUnlockWorlds ? undefined : onRequireAuth}
                  className="archive-submit-button px-5 py-2 text-sm"
                >
                  {canUnlockWorlds ? "기록 열기" : "로그인 창 열기"}
                </button>
              </div>
            </form>
          ) : (
            <ArchiveMotion
              variant="stagger"
              motionKey={`${activeWorld.id}-participants`}
              className="world-participant-list mt-6 grid gap-5"
            >
              {participantListContent}
            </ArchiveMotion>
          )}
          </div>
        </ArchiveMotion>
      )}
    </section>
  );
}
