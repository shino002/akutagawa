"use client";

import { type FormEvent, useMemo } from "react";
import { Explora } from "next/font/google";
import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import { characterPaletteStyle } from "@/lib/character-palette";
import { caseFileDetailThemeStyle } from "@/lib/case-file-theme";
import { emptyCharacter } from "@/constants/home";
import { TextGlitch } from "@/components/TextGlitch";
import { GlitchedText } from "@/components/GlitchedText";
import { glitchConfigSignature, settingSectionGlitchPath } from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import {
  normalizeRelationshipEntries,
  relationshipEntryGlitchPath,
} from "@/lib/relationship-entries";
import { normalizeSettingSections } from "@/lib/setting-sections";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, UploadedImage, World, ZoneLinkTarget } from "@/lib/types";
import type { CharacterDetailSection } from "@/lib/zone-links";
import { findSubPage, listNavigableSubPages, resolveSubPage, subPageToDisplayCharacter } from "@/lib/sub-pages";
import {
  formatPairDisplayName,
  formatPairMemberLabel,
  isPairCharacter,
  pairIndexCardImage,
  resolveLinkedPairMembers,
} from "@/lib/pair-members";
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

const caseFileHeroMarkFont = Explora({
  subsets: ["latin"],
  weight: "400",
});

const imageCreditName = (image: UploadedImage) => image.name?.trim() ?? "";
const formatHeroCharacterId = (id: string) =>
  id ? `${id.slice(0, 1).toUpperCase()}${id.slice(1).toLowerCase()}` : "";

interface CharactersSectionProps {
  characters: Character[];
  allCharacters?: Character[];
  sectionIndexTitle?: string;
  emptyListMessage?: string;
  activeCharacterId: string;
  setActiveCharacterId: (id: string) => void;
  activeSubPageId?: string;
  setActiveSubPageId?: (id: string) => void;
  parentCharacter?: Character;
  detailSection: CharacterDetailSection;
  onNavigateToLinkedCharacter?: (characterId: string, subPageId?: string) => void;
  onZoneLinkNavigate?: (target: ZoneLinkTarget) => void;
  onDetailNavigateBack?: () => boolean;
  hasDetailNavHistory?: boolean;
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
  onRequireAuth: () => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  onOpenExpression: (item: ExpressionModalItem) => void;
  onOpenReader: (item: ReaderModalItem) => void;
  className?: string;
}

export function CharactersSection({
  characters,
  allCharacters = characters,
  sectionIndexTitle = "OC Files",
  emptyListMessage = "아직 등록된 항목이 없어요.",
  activeCharacterId,
  setActiveCharacterId,
  activeSubPageId = "",
  setActiveSubPageId,
  parentCharacter,
  detailSection,
  onNavigateToLinkedCharacter,
  onZoneLinkNavigate,
  onDetailNavigateBack,
  hasDetailNavHistory = false,
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
  onRequireAuth,
  onOpenGallery,
  onOpenExpression,
  onOpenReader,
  className,
}: CharactersSectionProps) {
  const resolvedParentCharacter = useMemo(
    () =>
      parentCharacter ??
      characters.find((character) => character.id === activeCharacterId) ??
      characters[0] ??
      emptyCharacter,
    [activeCharacterId, characters, parentCharacter],
  );
  const activeSubPage = useMemo(
    () =>
      activeSubPageId
        ? resolveSubPage(resolvedParentCharacter, activeSubPageId, allCharacters)
        : undefined,
    [activeSubPageId, allCharacters, resolvedParentCharacter],
  );
  const isPairView = isPairCharacter(resolvedParentCharacter);
  const linkedPairMembers = useMemo(
    () => (isPairView ? resolveLinkedPairMembers(resolvedParentCharacter, allCharacters) : []),
    [allCharacters, isPairView, resolvedParentCharacter],
  );
  const activeCharacter = useMemo(
    () =>
      activeSubPage
        ? subPageToDisplayCharacter(resolvedParentCharacter, activeSubPage)
        : resolvedParentCharacter,
    [activeSubPage, resolvedParentCharacter],
  );
  const handleZoneLinkClick = (target: ZoneLinkTarget) => {
    if (onZoneLinkNavigate) {
      onZoneLinkNavigate(target);
      return;
    }

    if (target.section === detailSection) {
      setActiveCharacterId(target.characterId);
      setActiveSubPageId?.(target.subPageId ?? "");
      setActiveTab("settings");
    }
  };
  const detailLinkContext = useMemo(
    () => ({
      section: detailSection,
      characterId: activeCharacterId || resolvedParentCharacter.id,
    }),
    [activeCharacterId, detailSection, resolvedParentCharacter.id],
  );
  const zoneLinkProps = {
    linkContext: detailLinkContext,
    onZoneLinkClick: handleZoneLinkClick,
  } as const;
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
  const isSubPageView = Boolean(activeSubPageId && activeSubPage);
  const visibleTabs = isSubPageView ? TAB_ORDER.filter((tab) => tab !== "worlds") : TAB_ORDER;
  const backButtonLabel = useMemo(() => {
    if (hasDetailNavHistory) {
      return "이전으로";
    }

    if (isSubPageView) {
      return `${resolvedParentCharacter.name || "본 페이지"}으로`;
    }

    return "목록으로";
  }, [hasDetailNavHistory, isSubPageView, resolvedParentCharacter.name]);

  const handleDetailBack = () => {
    if (onDetailNavigateBack?.()) {
      return;
    }

    if (activeSubPageId) {
      setActiveSubPageId?.("");
      setActiveTab("settings");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    setActiveCharacterId("");
    setActiveSubPageId?.("");
    setActiveTab("settings");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const heroCharacterId = formatHeroCharacterId(
    isSubPageView && activeSubPage
      ? activeSubPage.displayId?.trim() || activeSubPage.id
      : activeCharacter.id,
  );
  const detailThemeStyle = useMemo(
    () =>
      caseFileDetailThemeStyle(
        resolvedParentCharacter.detailTheme,
        activeSubPage?.detailTheme,
      ),
    [activeSubPage?.detailTheme, resolvedParentCharacter.detailTheme],
  );
  const activeSettingSections = normalizeSettingSections(activeCharacter.settingSections);
  const activeRelationshipEntries = useMemo(
    () =>
      normalizeRelationshipEntries(activeCharacter.relationshipEntries, activeCharacter.relationships),
    [activeCharacter.relationshipEntries, activeCharacter.relationships],
  );
  const linkedCharacterNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const character of allCharacters) {
      map.set(character.id, character.name);
    }
    return map;
  }, [allCharacters]);
  const ownSubPageTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const subPage of listNavigableSubPages(resolvedParentCharacter, allCharacters)) {
      map.set(subPage.id, subPage.title);
    }
    return map;
  }, [allCharacters, resolvedParentCharacter]);

  return (
    <section className={cn("space-y-6", className)}>
      {!activeCharacterId && (
      <section className="glass-card character-index-panel p-6 md:p-8">
        <div className="character-index-header">
          <p className="character-index-blue-text text-xs tracking-[0.45em] uppercase">
            <TextGlitch className="character-index-blue-text" text={sectionIndexTitle} />
          </p>
          <TextGlitch
            className="character-index-blue-text"
            text={`${String(characters.length).padStart(2, "0")} Records`}
          />
        </div>

        {characters.length === 0 ? (
          <div className="archive-panel mt-6 p-5 text-sm leading-7 text-emerald-100/65">
            {emptyListMessage}
          </div>
        ) : (
          <ArchiveMotion
            variant="stagger"
            motionKey="character-index"
            className="character-index-grid"
          >
            {characters.map((character) => {
              const cardImage = isPairCharacter(character)
                ? pairIndexCardImage(character, allCharacters)
                : (character.images ?? []).find((image) => image.category !== "standing") ??
                  (character.images ?? [])[0];
              const cardName = isPairCharacter(character)
                ? formatPairDisplayName(character, allCharacters)
                : character.name;
              const cardSubtitle = isPairCharacter(character)
                ? resolveLinkedPairMembers(character, allCharacters)
                    .map(formatPairMemberLabel)
                    .filter((label) => label !== "이름 없음")
                    .join(" · ") || character.subtitle
                : character.subtitle;

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => {
                    setActiveCharacterId(character.id);
                    setActiveSubPageId?.("");
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
                      <GlitchedText
                        text={cardName}
                        glitch={character.textGlitch?.name}
                        useCssGlitchFallback
                        linkContext={{ section: detailSection, characterId: character.id }}
                        onZoneLinkClick={handleZoneLinkClick}
                      />
                      {character.kanjiName && (
                        <span className="kanji-name ml-2 align-baseline text-[0.58em] text-stone-300/55">
                          <GlitchedText
                            text={character.kanjiName}
                            glitch={character.textGlitch?.kanjiName}
                            useCssGlitchFallback
                          />
                        </span>
                      )}
                    </h4>
                    <div className="archive-card-intro" data-text-corruptor-ignore>
                      <GlitchedText
                        text={cardSubtitle}
                        glitch={character.textGlitch?.subtitle}
                        className="block w-full"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </ArchiveMotion>
        )}
      </section>
      )}

      {activeCharacterId && (
      <ArchiveMotion
        as="section"
        motionKey={`${activeCharacterId}-${activeSubPageId || "main"}`}
        className="glass-card case-file-detail dossier-viewer overflow-hidden"
        style={detailThemeStyle}
      >
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
          <div className="case-file-title-block">
            <p className="case-file-kicker">
              <TextGlitch text="Private Archive / Case File" />
              {isPairView && !isSubPageView && (
                <>
                  {" "}
                  / <TextGlitch text="Pair" />
                </>
              )}
            </p>
            <h3 className={cn("case-file-name", isSubPageView && "case-file-name--subpage")}>
              <GlitchedText
                text={
                  isPairView && !isSubPageView
                    ? formatPairDisplayName(resolvedParentCharacter, allCharacters)
                    : activeCharacter.name
                }
                glitch={activeCharacter.textGlitch?.name}
                useCssGlitchFallback
                {...zoneLinkProps}
              />
              {activeCharacter.kanjiName && (
                  <span className="kanji-name ml-3 align-baseline text-[0.34em] text-stone-300/55">
                  <GlitchedText
                    text={activeCharacter.kanjiName}
                    glitch={activeCharacter.textGlitch?.kanjiName}
                    useCssGlitchFallback
                    {...zoneLinkProps}
                  />
                </span>
              )}
            </h3>
            <div className="case-file-intro">
              <p className="case-file-intro-label">한 줄 소개</p>
              <p className="case-file-intro-text" data-text-corruptor-ignore>
                <GlitchedText
                  text={activeCharacter.subtitle}
                  glitch={activeCharacter.textGlitch?.subtitle}
                  {...zoneLinkProps}
                />
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDetailBack}
            className="case-back-button"
            style={{
              top: "1rem",
              right: "auto",
              bottom: "auto",
              left: "1rem",
            }}
          >
            ← {backButtonLabel}
          </button>
          <span
            className={cn("case-file-hero-mark", caseFileHeroMarkFont.className)}
            aria-hidden="true"
          >
            {heroCharacterId}
          </span>
        </div>
        <div className="dossier-body p-6 md:p-8">
          {isPairView && !isSubPageView && linkedPairMembers.length > 0 && (
            <div className="pair-member-switcher">
              {linkedPairMembers.map((member, index) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onNavigateToLinkedCharacter?.(member.id)}
                    className="pair-member-switcher__button pair-member-switcher__button--link"
                  >
                    <span className="pair-member-switcher__index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="pair-member-switcher__name">
                      {formatPairMemberLabel(member)}
                    </span>
                    {member.kanjiName?.trim() && (
                      <span className="pair-member-switcher__kanji">{member.kanjiName}</span>
                    )}
                    <span className="pair-member-switcher__hint">상세 보기</span>
                  </button>
                ))}
            </div>
          )}

          <div className="case-file-meta">
            <span>NO. {activeCharacter.id || "UNREGISTERED"}</span>
            {activeCharacter.classification && (
              <span>
                분류:{" "}
                <GlitchedText
                  text={activeCharacter.classification}
                  glitch={activeCharacter.textGlitch?.classification}
                  {...zoneLinkProps}
                />
              </span>
            )}
            {(activeCharacter.statusTags ?? []).length > 0 && (
              <span>
                상태:{" "}
                <GlitchedText
                  text={(activeCharacter.statusTags ?? []).join("\n")}
                  glitch={activeCharacter.textGlitch?.statusTags}
                  preserveWhitespace
                  {...zoneLinkProps}
                />
              </span>
            )}
          </div>

          {activeCharacter.quote.trim() ? (
            <figure className="case-file-voice">
              <figcaption className="case-file-voice-label">한마디</figcaption>
              <blockquote className="case-file-voice-text" data-text-corruptor-ignore>
                <GlitchedText
                  text={activeCharacter.quote}
                  glitch={activeCharacter.textGlitch?.quote}
                  {...zoneLinkProps}
                />
              </blockquote>
            </figure>
          ) : null}

          <dl className="case-profile-grid">
            {activeCharacter.profileFields.map((field) => (
              <div key={field.id} className="case-profile-cell">
                <dt>{field.label || "-"}</dt>
                <dd>
                  <GlitchedText
                    text={field.value || "-"}
                    glitch={activeCharacter.textGlitch?.[profileFieldGlitchPath(field.id)]}
                    {...zoneLinkProps}
                  />
                </dd>
              </div>
            ))}
          </dl>

          <div className="case-tab-strip">
            {visibleTabs.map((tab) => (
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
            <ArchiveMotion
              motionKey={`${activeCharacterId}-${activeTab}`}
              variant="scan"
            >
            {activeTab === "settings" && (
              <>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="static-record-panel">
                  <p className="text-xs tracking-[0.25em] text-emerald-100/45 uppercase">
                    Record Box
                  </p>
                  <div className="mt-3 grid gap-3">
                    {activeSettingSections.length > 0 ? (
                      activeSettingSections.map((section, index) => (
                        <article key={section.id || `${section.title}-${index}`} className="static-record-panel">
                          <span className="block text-xs tracking-[0.25em] text-emerald-100/45 uppercase mb-2">{section.title || `RECORD ${String(index + 1).padStart(2, "0")}`}</span>
                          <p className="whitespace-pre-line text-sm leading-7 text-emerald-50/80">
                            <GlitchedText
                              text={section.body || "-"}
                              glitch={activeCharacter.textGlitch?.[settingSectionGlitchPath(section.id)]}
                              preserveWhitespace
                              {...zoneLinkProps}
                            />
                          </p>
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
                </div>
              </div>

              {activeRelationshipEntries.length > 0 && (
                <section className="relationship-map-panel static-record-panel mt-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-[0.25em] text-emerald-100/45 uppercase">Relation Map</p>
                      <p className="mt-1 text-sm text-emerald-50/70">관계 기록</p>
                    </div>
                    <p className="text-xs text-emerald-100/45">{activeRelationshipEntries.length} links</p>
                  </div>
                  <div className="relationship-map-grid mt-4">
                    {activeRelationshipEntries.map((entry, index) => (
                      <article key={entry.id} className="relationship-card">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] tracking-[0.22em] text-emerald-100/45 uppercase">
                              LINK {String(index + 1).padStart(2, "0")}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-emerald-50">
                              {entry.name || "이름 없음"}
                            </h3>
                          </div>
                          {entry.label && (
                            <span className="relationship-card-badge">{entry.label}</span>
                          )}
                        </div>
                        {entry.body && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-emerald-50/80">
                            <GlitchedText
                              text={entry.body}
                              glitch={activeCharacter.textGlitch?.[relationshipEntryGlitchPath(entry.id)]}
                              preserveWhitespace
                              {...zoneLinkProps}
                            />
                          </p>
                        )}
                        {entry.linkedCharacterId && (
                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToLinkedCharacter?.(
                                entry.linkedCharacterId!,
                                entry.linkedSubPageId,
                              )
                            }
                            className="relationship-card-link"
                          >
                            {linkedCharacterNameById.get(entry.linkedCharacterId) || entry.linkedCharacterId}
                            {entry.linkedSubPageId ? " 상세" : ""} 파일 보기
                          </button>
                        )}
                        {!entry.linkedCharacterId && entry.linkedSubPageId && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubPageId?.(entry.linkedSubPageId!);
                              setActiveTab("settings");
                              if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }}
                            className="relationship-card-link"
                          >
                            {ownSubPageTitleById.get(entry.linkedSubPageId) || "하위 페이지"} 보기
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
              </>
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
                    <ArchiveMotion
                      motionKey={`${activeCharacterId}-${activeCharacterWorldEntry?.worldId ?? "none"}-${isActiveCharacterWorldUnlocked ? "open" : "locked"}`}
                      variant="enter"
                    >
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
                              <button
                                type={canUnlockWorlds ? "submit" : "button"}
                                onClick={canUnlockWorlds ? undefined : onRequireAuth}
                                className="border border-stone-400/25 bg-stone-900/30 px-5 py-2 text-sm text-stone-100"
                              >
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
                    </ArchiveMotion>
                  </>
                ) : (
                  <p className="plain-empty-note">
                    참가한 세계관 자료가 없어요.
                  </p>
                )}
              </div>
            )}
            </ArchiveMotion>
          </div>
        </div>
      </ArchiveMotion>
      )}
    </section>
  );
}
