"use client";

import { type FormEvent, useMemo } from "react";
import { Explora } from "next/font/google";
import { cn } from "@/utils/cn";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { characterPaletteStyle } from "@/lib/character-palette";
import { caseFileDetailThemeStyle } from "@/lib/case-file-theme";
import { emptyCharacter } from "@/constants/home";
import { TextGlitch } from "@/components/TextGlitch";
import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import {
  settingSectionExcerptGlitchPath,
  settingSectionGlitchPath,
  settingSectionTitleGlitchPath,
} from "@/lib/glitch-fields";
import { getCharacterFieldGlitch } from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import { metaFieldGlitchPath, resolveMetaFields } from "@/lib/meta-fields";
import {
  normalizeRelationshipEntries,
  relationshipEntryGlitchPath,
} from "@/lib/relationship-entries";
import { normalizeSettingSections } from "@/lib/setting-sections";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { RecordBoxEntry } from "@/components/home/RecordBoxEntry";
import { StoryRecordCard } from "@/components/home/StoryRecordCard";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Character, UploadedImage, World, ZoneLinkTarget } from "@/lib/types";
import type { CharacterDetailSection } from "@/lib/zone-links";
import { listNavigableSubPages, resolveSubPage, subPageToDisplayCharacter } from "@/lib/sub-pages";
import {
  getSubPageEntryCopy,
  getSubPageEntryKicker,
  normalizeSubPageEntryLabel,
} from "@/lib/sub-page-kind";
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
  StoryModalItem,
} from "@/types/home.types";

const TAB_LABELS: Record<CharacterDetailTab, string> = {
  settings: "기록",
  images: "비주얼",
  works: "로그",
  worlds: "세계",
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
  onOpenStory: (item: StoryModalItem) => void;
  className?: string;
}

export function CharactersSection({
  characters,
  allCharacters = characters,
  sectionIndexTitle = "OC 파일",
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
  onOpenStory,
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
  const activeSubPageEntryLabel = normalizeSubPageEntryLabel(activeSubPage?.entryKind);
  const activeSubPageCopy = isSubPageView ? getSubPageEntryCopy() : null;
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
    () => ({
      ...caseFileDetailThemeStyle(resolvedParentCharacter.detailTheme, activeSubPage?.detailTheme),
      ...characterPaletteStyle(resolvedParentCharacter.palette),
    }),
    [
      activeSubPage?.detailTheme,
      resolvedParentCharacter.detailTheme,
      resolvedParentCharacter.palette,
    ],
  );
  const activeSettingSections = normalizeSettingSections(activeCharacter.settingSections);
  const activeMetaFields = useMemo(() => resolveMetaFields(activeCharacter), [activeCharacter]);
  const filledMetaFields = useMemo(
    () => activeMetaFields.filter((field) => field.body.trim()),
    [activeMetaFields],
  );
  const quoteText = activeCharacter.quote.trim();
  const profileFieldCount = activeCharacter.profileFields.length;
  const quoteLabel = isSubPageView && activeSubPageCopy ? activeSubPageCopy.quoteLabel : "한마디";
  const recordEntryCount =
    activeSettingSections.length +
    (activeSettingSections.length === 0 ? activeCharacter.settings.length : 0) +
    (profileFieldCount > 0 ? 1 : 0);
  const settingsEntryOffset = profileFieldCount > 0 ? 1 : 0;

  const activeRelationshipEntries = useMemo(
    () =>
      normalizeRelationshipEntries(
        activeCharacter.relationshipEntries,
        activeCharacter.relationships,
      ),
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
        <ArchiveMotion
          as="section"
          motionKey={`character-index-panel-${detailSection}`}
          className="glass-card character-index-panel p-6 md:p-8"
        >
          <div className="character-index-header">
            <p className="character-index-blue-text text-xs tracking-[0.45em] uppercase">
              <TextGlitch className="character-index-blue-text" text={sectionIndexTitle} />
            </p>
            <TextGlitch
              className="character-index-blue-text"
              text={`${String(characters.length).padStart(2, "0")}개`}
            />
          </div>

          {characters.length === 0 ? (
            <div className="archive-panel mt-6 p-5 text-sm leading-7 text-white/65">
              {emptyListMessage}
            </div>
          ) : (
            <ArchiveMotion
              variant="stagger"
              motionKey={`character-index-grid-${detailSection}-${characters.length}`}
              className="character-index-grid"
            >
              {characters.map((character) => {
                const cardImage = isPairCharacter(character)
                  ? pairIndexCardImage(character, allCharacters)
                  : ((character.images ?? []).find((image) => image.category !== "standing") ??
                    (character.images ?? [])[0]);
                const cardName = isPairCharacter(character)
                  ? formatPairDisplayName(character, allCharacters)
                  : character.name;

                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => {
                      setActiveCharacterId(character.id);
                      setActiveSubPageId?.("");
                      setActiveTab("settings");
                    }}
                    className={`archive-character-card character-palette-scope text-left ${activeCharacterId === character.id ? "is-active" : ""}`}
                    style={characterPaletteStyle(character.palette)}
                  >
                    <div className="archive-character-card-image">
                      <div className="character-palette-backdrop" aria-hidden="true" />
                      {cardImage && (
                        <ThumbnailImage
                          image={cardImage}
                          src={cardImage.url}
                          alt={`${character.name} 대표 그림`}
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
                    </div>
                  </button>
                );
              })}
            </ArchiveMotion>
          )}
        </ArchiveMotion>
      )}

      {activeCharacterId && (
        <ArchiveMotion
          as="section"
          motionKey={`character-detail-${activeCharacterId}-${activeSubPageId || "main"}`}
          className="glass-card case-file-detail dossier-viewer overflow-hidden"
          style={detailThemeStyle}
        >
          <div className="case-file-hero" data-character-id={heroCharacterId}>
            <div className="character-palette-backdrop" aria-hidden="true" />
            {activeMainIllustration && (
              <ThumbnailImage
                image={activeMainIllustration}
                src={activeMainIllustration.url}
                alt={`${activeCharacter.name} 대표 그림`}
                wrapperClassName="case-file-hero-image"
              />
            )}
            <div className="case-file-hero-grid" />
            <div className="case-file-title-block">
              <p className="case-file-kicker">
                <TextGlitch
                  text={
                    isSubPageView
                      ? getSubPageEntryKicker(activeSubPageEntryLabel)
                      : "비공개 아카이브 / 케이스 파일"
                  }
                />
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
                <p className="case-file-intro-label">
                  {isSubPageView && activeSubPageCopy
                    ? activeSubPageCopy.subtitleLabel
                    : "한 줄 소개"}
                </p>
                <p className="case-file-intro-text" data-text-corruptor-ignore>
                  <GlitchedText
                    text={activeCharacter.subtitle}
                    glitch={activeCharacter.textGlitch?.subtitle}
                    preserveWhitespace
                    {...zoneLinkProps}
                  />
                </p>
              </div>
            </div>
            <button type="button" onClick={handleDetailBack} className="case-back-button">
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

            <div className="dossier-meta-strip" aria-label="식별 정보">
              <span className="dossier-meta-item dossier-meta-item--id">
                NO. {activeCharacter.id || "UNREGISTERED"}
              </span>
              {isSubPageView && activeSubPageEntryLabel ? (
                <span className="dossier-meta-item">
                  <span className="dossier-meta-quiet">유형</span> {activeSubPageEntryLabel}
                </span>
              ) : null}
              {filledMetaFields.map((field) => (
                <span key={field.id} className="dossier-meta-item">
                  {field.label.trim() ? (
                    <span className="dossier-meta-quiet">{field.label.trim()}</span>
                  ) : null}{" "}
                  <GlitchedText
                    text={field.body}
                    glitch={activeCharacter.textGlitch?.[metaFieldGlitchPath(field.id)]}
                    preserveWhitespace={field.body.includes("\n")}
                    {...zoneLinkProps}
                  />
                </span>
              ))}
            </div>

            {quoteText ? (
              <div className="dossier-voice">
                <p className="dossier-voice-label">{quoteLabel}</p>
                <blockquote className="dossier-voice-text" data-text-corruptor-ignore>
                  <StoryFormattedText
                    text={activeCharacter.quote}
                    glitch={activeCharacter.textGlitch?.quote}
                    preserveWhitespace
                    {...zoneLinkProps}
                  />
                </blockquote>
              </div>
            ) : null}

            <div className="case-tab-strip" role="tablist" aria-label="파일 탭">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`case-tab-button ${activeTab === tab ? "is-active" : ""}`}
                >
                  <span>{TAB_CODES[tab]}</span>
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="case-tab-panel">
              <ArchiveMotion motionKey={`${activeCharacterId}-${activeTab}`} variant="scan">
                {activeTab === "settings" && (
                  <>
                    <div className="record-settings-layout">
                      <div className="record-settings-pair">
                        <section className="record-box static-record-panel">
                          <header className="record-box-head">
                            <p className="record-box-kicker">기록</p>
                            <span className="record-box-count">
                              {recordEntryCount > 0
                                ? `${String(recordEntryCount).padStart(2, "0")}`
                                : "00"}
                            </span>
                          </header>
                          <div className="record-box-list">
                            {profileFieldCount > 0 ? (
                              <RecordBoxEntry
                                defaultOpen={false}
                                indexLabel="01"
                                title="프로필"
                                hint={`${String(profileFieldCount).padStart(2, "0")} fields`}
                              >
                                <div className="dossier-profile-inline">
                                  {activeCharacter.profileFields.map((field) => {
                                    const profileText = field.value.trim() || "-";
                                    const profileGlitch = getCharacterFieldGlitch(
                                      activeCharacter.textGlitch,
                                      profileFieldGlitchPath(field.id),
                                      profileText,
                                    );

                                    return (
                                      <div key={field.id} className="dossier-profile-inline-row">
                                        <span className="dossier-profile-inline-key">
                                          {field.label || "-"}
                                        </span>
                                        <span className="dossier-profile-inline-value">
                                          <GlitchedText
                                            text={profileText}
                                            glitch={profileGlitch}
                                            {...zoneLinkProps}
                                          />
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </RecordBoxEntry>
                            ) : null}

                            {activeSettingSections.length > 0 ? (
                              activeSettingSections.map((section, index) =>
                                section.kind === "story" ? (
                                  <StoryRecordCard
                                    key={section.id || `${section.title}-${index}`}
                                    section={section}
                                    index={settingsEntryOffset + index}
                                    titleGlitch={
                                      activeCharacter.textGlitch?.[
                                        settingSectionTitleGlitchPath(section.id)
                                      ]
                                    }
                                    excerptGlitch={
                                      activeCharacter.textGlitch?.[
                                        settingSectionExcerptGlitchPath(section.id)
                                      ]
                                    }
                                    onOpen={() =>
                                      onOpenStory({ character: activeCharacter, section })
                                    }
                                  />
                                ) : (
                                  <RecordBoxEntry
                                    key={section.id || `${section.title}-${index}`}
                                    defaultOpen={false}
                                    indexLabel={String(settingsEntryOffset + index + 1).padStart(
                                      2,
                                      "0",
                                    )}
                                    title={
                                      section.title ? (
                                        <GlitchedText
                                          text={section.title}
                                          glitch={
                                            activeCharacter.textGlitch?.[
                                              settingSectionTitleGlitchPath(section.id)
                                            ]
                                          }
                                          preserveWhitespace
                                        />
                                      ) : (
                                        `기록`
                                      )
                                    }
                                  >
                                    <p className="record-row-prose">
                                      <StoryFormattedText
                                        text={section.body || "-"}
                                        glitch={
                                          activeCharacter.textGlitch?.[
                                            settingSectionGlitchPath(section.id)
                                          ]
                                        }
                                        preserveWhitespace
                                        {...zoneLinkProps}
                                      />
                                    </p>
                                  </RecordBoxEntry>
                                ),
                              )
                            ) : activeCharacter.settings.length > 0 ? (
                              activeCharacter.settings.map((setting, index) => (
                                <RecordBoxEntry
                                  key={setting}
                                  defaultOpen={false}
                                  indexLabel={String(settingsEntryOffset + index + 1).padStart(
                                    2,
                                    "0",
                                  )}
                                  title={`기록`}
                                >
                                  <p className="record-row-prose">{setting}</p>
                                </RecordBoxEntry>
                              ))
                            ) : profileFieldCount === 0 ? (
                              <p className="plain-empty-note">등록된 상세 설정이 없어요.</p>
                            ) : null}
                          </div>
                        </section>

                        <button
                          type="button"
                          onClick={() =>
                            activeMainIllustration &&
                            onOpenGallery({
                              image: activeMainIllustration,
                              character: activeCharacter,
                            })
                          }
                          className="case-evidence-preview record-visual-preview group block w-full text-left"
                          disabled={!activeMainIllustration}
                        >
                          <div className="record-visual-frame">
                            {activeMainIllustration ? (
                              <ThumbnailImage
                                image={activeMainIllustration}
                                src={activeMainIllustration.url}
                                alt={`${activeCharacter.name} 일러스트`}
                                className="opacity-95 transition group-hover:opacity-100"
                              />
                            ) : (
                              <div className="h-full w-full bg-black/20" aria-hidden="true" />
                            )}
                            <span className="case-evidence-stamp">비주얼 기록</span>
                            {activeMainIllustration && imageCreditName(activeMainIllustration) && (
                              <span className="image-credit-label image-credit-label-large">
                                {imageCreditName(activeMainIllustration)}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

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
                            스탠딩 표정
                          </p>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {activeStandingImages.slice(0, 4).map((image) => (
                              <div
                                key={image.id}
                                className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                              >
                                <ThumbnailImage image={image} src={image.url} alt="스탠딩 이미지" />
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-sm text-white/70">
                            스탠딩 표정 {activeStandingImages.length}장 보기
                          </p>
                        </button>
                      )}
                    </div>

                    {activeRelationshipEntries.length > 0 && (
                      <section className="relation-map-panel mt-4">
                        <header className="relation-map-head">
                          <div>
                            <p className="case-file-intro-label">관계도</p>
                            <p className="relation-map-subtitle">관계 기록</p>
                          </div>
                          <span className="world-file-tag">
                            {activeRelationshipEntries.length} links
                          </span>
                        </header>
                        <div className="relation-link-list">
                          {activeRelationshipEntries.map((entry, index) => (
                            <article key={entry.id} className="relation-link-file">
                              <header className="relation-link-file-head">
                                <div className="relation-link-file-meta">
                                  <span className="relation-link-file-tab">LINK</span>
                                  <span className="relation-link-file-code">
                                    NO. {String(index + 1).padStart(2, "0")}
                                  </span>
                                </div>
                                <div className="relation-link-file-name-row">
                                  <h3 className="relation-link-file-name">
                                    {entry.name || "이름 없음"}
                                  </h3>
                                  {entry.label && (
                                    <span className="relation-link-file-badge">{entry.label}</span>
                                  )}
                                </div>
                              </header>
                              {entry.body && (
                                <div className="relation-link-file-body">
                                  <StoryFormattedText
                                    text={entry.body}
                                    glitch={
                                      activeCharacter.textGlitch?.[
                                        relationshipEntryGlitchPath(entry.id)
                                      ]
                                    }
                                    preserveWhitespace
                                    {...zoneLinkProps}
                                  />
                                </div>
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
                                  className="relation-link-file-action"
                                >
                                  <span className="relation-link-file-action-label">
                                    {linkedCharacterNameById.get(entry.linkedCharacterId) ||
                                      entry.linkedCharacterId}
                                    {entry.linkedSubPageId ? " 상세" : ""} 파일 보기
                                  </span>
                                  <span
                                    className="relation-link-file-action-icon"
                                    aria-hidden="true"
                                  >
                                    ↗
                                  </span>
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
                                  className="relation-link-file-action"
                                >
                                  <span className="relation-link-file-action-label">
                                    {ownSubPageTitleById.get(entry.linkedSubPageId) ||
                                      "하위 페이지"}{" "}
                                    보기
                                  </span>
                                  <span
                                    className="relation-link-file-action-icon"
                                    aria-hidden="true"
                                  >
                                    ↗
                                  </span>
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
                        <h4 className="mt-2 text-xl font-semibold text-white/90">
                          스탠딩 표정 모음
                        </h4>
                        <p className="mt-2 text-sm text-white/65">
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
                            <ThumbnailImage
                              image={image}
                              src={image.url}
                              alt={`${activeCharacter.name} 그림 ${index + 1}`}
                              className="h-64 w-full opacity-90 transition duration-300 group-hover:opacity-100"
                            />
                            {imageCreditName(image) && (
                              <span className="image-credit-label">{imageCreditName(image)}</span>
                            )}
                          </button>
                        </article>
                      ))}
                    </div>
                    {activeCharacterImages.length === 0 && (
                      <p className="plain-empty-note">등록된 그림이 없어요.</p>
                    )}
                  </div>
                )}

                {activeTab === "works" && (
                  <div className="dossier-tab-stack">
                    {activeWorks.length > 0 && (
                      <p className="border border-stone-400/18 bg-stone-900/10 p-3 text-sm text-white/70">
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
                            <p className="text-xs text-white/45">
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
                                <ThumbnailImage
                                  image={image}
                                  src={image.url}
                                  alt="첨부 이미지"
                                  className="opacity-90"
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
                      </button>
                    ))}
                    {activeWorks.length === 0 && (
                      <p className="plain-empty-note">등록된 글이 없어요.</p>
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
                                    {activeCharacterWorld?.title ??
                                      activeCharacterWorldEntry.worldId}
                                  </h4>
                                </div>
                                <form
                                  onSubmit={(event) =>
                                    onUnlockCharacterWorld(event, activeCharacterWorldEntry.worldId)
                                  }
                                  className="grid gap-3 border border-stone-400/15 bg-stone-900/10 p-4"
                                >
                                  <p className="text-sm leading-7 text-white/70">
                                    {canUnlockWorlds
                                      ? "이 세계관의 설정, 그림, 연성/로그를 보려면 비밀번호를 입력해주세요."
                                      : "세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요."}
                                  </p>
                                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <input
                                      type="password"
                                      value={
                                        worldPasswordDrafts[activeCharacterWorldEntry.worldId] ?? ""
                                      }
                                      onChange={(event) =>
                                        onWorldPasswordChange(
                                          activeCharacterWorldEntry.worldId,
                                          event.target.value,
                                        )
                                      }
                                      placeholder={
                                        canUnlockWorlds
                                          ? "World password"
                                          : "회원가입 또는 로그인 필요"
                                      }
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
                                  <p className="text-xs tracking-[0.25em] text-white/45 uppercase">
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
                                      <p className="plain-empty-note">이 세계관 설정이 없어요.</p>
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
                                            <ThumbnailImage
                                              image={activeWorldMainIllustration}
                                              src={activeWorldMainIllustration.url}
                                              alt={`${activeCharacter.name} 세계관 일러스트`}
                                              className="opacity-95 transition group-hover:opacity-100"
                                            />
                                          ) : (
                                            <div
                                              className="h-full w-full bg-black/20"
                                              aria-hidden="true"
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
                                          <span>
                                            세계관 스탠딩 표정 {activeWorldStandingImages.length}장
                                            보기
                                          </span>
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
                      <p className="plain-empty-note">참가한 세계관 자료가 없어요.</p>
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
