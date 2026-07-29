"use client";

import { type FormEvent, useEffect, useMemo } from "react";
import { Explora } from "next/font/google";
import { cn } from "@/utils/cn";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { characterPaletteStyle } from "@/lib/character-palette";
import { CLEARANCE_GRADES, clearancePresetOf, resolveClearancePreset } from "@/lib/clearance";
import { caseFileDetailThemeStyle } from "@/lib/case-file-theme";
import { emptyCharacter } from "@/constants/home";
import { toKanjiNumber } from "@/lib/kanji-number";
import { TextGlitch } from "@/components/TextGlitch";
import { GlitchedText } from "@/components/GlitchedText";
import { StoryFormattedText } from "@/components/StoryFormattedText";
import { settingSectionGlitchPath, settingSectionTitleGlitchPath } from "@/lib/glitch-fields";
import { getCharacterFieldGlitch } from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import { metaFieldGlitchPath, resolveMetaFields } from "@/lib/meta-fields";
import {
  normalizeRelationshipEntries,
  relationshipEntryGlitchPath,
} from "@/lib/relationship-entries";
import { normalizeSettingSections } from "@/lib/setting-sections";
import { ArchiveMotion } from "@/components/home/ArchiveMotion";
import { RecordConsole, type RecordEntry } from "@/components/home/RecordConsole";
import { excerptForPlate } from "@/lib/record-excerpt";
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
  relations: "관계",
  images: "비주얼",
  works: "로그",
  worlds: "세계",
};

/** 탭 라벨에 병기할 한자 — 서류 색인 느낌을 냅니다 */
const TAB_KANJI: Record<CharacterDetailTab, string> = {
  settings: "記録",
  relations: "関係",
  images: "図版",
  works: "作品",
  worlds: "世界",
};

/** 관계는 인물 자신에 대한 색인이라 기록 바로 옆에 물립니다 */
const TAB_ORDER: CharacterDetailTab[] = ["settings", "relations", "images", "works", "worlds"];

const caseFileHeroMarkFont = Explora({
  subsets: ["latin"],
  weight: "400",
});

const imageCreditName = (image: UploadedImage) => image.name?.trim() ?? "";
const formatHeroCharacterId = (id: string) =>
  id ? `${id.slice(0, 1).toUpperCase()}${id.slice(1).toLowerCase()}` : "";

/**
 * 문서 일련번호 — id 에서 결정적으로 만듭니다.
 * (렌더마다 값이 흔들리면 hydration 이 깨지므로 난수는 쓰지 않습니다)
 */
const documentSerial = (id: string) => {
  const key = id || "unregistered";
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000;
  }
  return `ARC-${key.slice(0, 4).toUpperCase().padEnd(4, "X")}-${String(hash).padStart(5, "0")}`;
};

/** 사본 번호(01‥05) — 일련번호와 같은 이유로 난수를 쓰지 않습니다 */
const documentCopyNo = (id: string) => {
  const key = id || "unregistered";
  let sum = 0;
  for (let index = 0; index < key.length; index += 1) {
    sum += key.charCodeAt(index);
  }
  return String((sum % 5) + 1).padStart(2, "0");
};

/** 편철된 매수(03‥20) — 표지에 「몇 장이 들어 있는지」를 적어 둡니다 */
const documentSheetCount = (id: string) => {
  const key = id || "unregistered";
  let sum = 0;
  for (let index = 0; index < key.length; index += 1) {
    sum += key.charCodeAt(index) * (index + 1);
  }
  return String((sum % 18) + 3).padStart(2, "0");
};

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
  const activeClearance = useMemo(() => resolveClearancePreset(activeCharacter), [activeCharacter]);
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
  /** 발언란 머리에 병기할 한자 — 서류의 다른 칸(身上·記録·叙述)과 같은 어휘로 맞춥니다 */
  const quoteKanji = isSubPageView && activeSubPageCopy ? "一節" : "一言";
  /** 第一項 身上 — 항목표나 인물 사진 중 하나라도 있으면 싣습니다 */
  const hasIdentityClause = profileFieldCount > 0 || Boolean(activeMainIllustration);

  /**
   * 열람대에 올릴 항 목록.
   * 신상(身上)·설정(記録)·서사(叙述)를 한 줄기 색인으로 합칩니다 —
   * 읽는 사람 입장에서는 전부 같은 문서의 항이지 종류별 상자가 아니니까요.
   */
  const recordEntries: RecordEntry[] = [];

  if (hasIdentityClause) {
    recordEntries.push({
      id: "identity",
      kind: "identity",
      label: "프로필",
      kanji: "身上",
      weight: profileFieldCount * 40,
      body: (
        <div className="dossier-identity">
          {profileFieldCount > 0 ? (
            <table className="dossier-table">
              <tbody>
                {activeCharacter.profileFields.map((field) => {
                  const profileText = field.value.trim() || "-";
                  const profileGlitch = getCharacterFieldGlitch(
                    activeCharacter.textGlitch,
                    profileFieldGlitchPath(field.id),
                    profileText,
                  );

                  return (
                    <tr key={field.id}>
                      <th scope="row">{field.label || "-"}</th>
                      <td>
                        <GlitchedText
                          text={profileText}
                          glitch={profileGlitch}
                          {...zoneLinkProps}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}

          {activeMainIllustration ? (
            <figure className="dossier-figure">
              <button
                type="button"
                onClick={() =>
                  onOpenGallery({ image: activeMainIllustration, character: activeCharacter })
                }
                className="case-evidence-preview dossier-figure-frame group"
              >
                <ThumbnailImage
                  image={activeMainIllustration}
                  src={activeMainIllustration.url}
                  alt={`${activeCharacter.name} 일러스트`}
                  className="opacity-95 transition group-hover:opacity-100"
                />
              </button>
              <figcaption className="dossier-figure-caption">
                図一 — 인물 사진
                {imageCreditName(activeMainIllustration) ? (
                  <span className="dossier-figure-credit">
                    {imageCreditName(activeMainIllustration)}
                  </span>
                ) : null}
              </figcaption>
            </figure>
          ) : null}
        </div>
      ),
    });
  }

  if (activeSettingSections.length > 0) {
    activeSettingSections.forEach((section, index) => {
      const titleGlitch = activeCharacter.textGlitch?.[settingSectionTitleGlitchPath(section.id)];
      const bodyGlitch = activeCharacter.textGlitch?.[settingSectionGlitchPath(section.id)];
      const fallbackTitle = "기록";
      const label = section.title.trim() || fallbackTitle;
      const title = section.title ? (
        <GlitchedText text={section.title} glitch={titleGlitch} preserveWhitespace />
      ) : (
        fallbackTitle
      );

      /* 열람판에는 발췌만 싣고, 한도를 넘긴 뒷부분은 별지로 넘깁니다.
         종류(記録/叙述)가 아니라 분량이 기준이라 긴 설정 항도 별지가 붙습니다. */
      const excerpt = excerptForPlate(section.body);

      recordEntries.push({
        id: section.id || `record-${index}`,
        kind: "record",
        label,
        title,
        weight: section.body.length,
        onExpand: excerpt.truncated
          ? () =>
              onOpenStory({
                character: activeCharacter,
                section,
                sections: activeSettingSections,
                numberOffset: hasIdentityClause ? 1 : 0,
              })
          : undefined,
        expandNote:
          excerpt.hiddenParagraphs > 0 ? `이하 ${excerpt.hiddenParagraphs}단락` : undefined,
        body:
          excerpt.paragraphs.length > 0 ? (
            excerpt.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className="record-prose">
                <StoryFormattedText
                  text={paragraph}
                  glitch={bodyGlitch}
                  preserveWhitespace
                  {...zoneLinkProps}
                />
              </p>
            ))
          ) : (
            <p className="record-prose plain-empty-note">내용이 없어요.</p>
          ),
      });
    });
  } else {
    activeCharacter.settings.forEach((setting, index) => {
      const excerpt = excerptForPlate(setting);

      recordEntries.push({
        id: `legacy-setting-${index}`,
        kind: "record",
        label: "기록",
        weight: setting.length,
        onExpand: excerpt.truncated
          ? () =>
              onOpenStory({
                character: activeCharacter,
                section: { id: `legacy-setting-${index}`, title: "기록", body: setting },
                numberOffset: hasIdentityClause ? 1 : 0,
              })
          : undefined,
        expandNote:
          excerpt.hiddenParagraphs > 0 ? `이하 ${excerpt.hiddenParagraphs}단락` : undefined,
        body: excerpt.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className="record-prose">
            {paragraph}
          </p>
        )),
      });
    });
  }

  const activeRelationshipEntries = useMemo(
    () =>
      normalizeRelationshipEntries(
        activeCharacter.relationshipEntries,
        activeCharacter.relationships,
      ),
    [activeCharacter.relationshipEntries, activeCharacter.relationships],
  );

  /* 하위 페이지에는 세계 탭이 없고, 관계 기록이 없는 인물은 관계 견출지도 달지 않습니다 */
  const visibleTabs = useMemo(
    () =>
      TAB_ORDER.filter((tab) => {
        if (tab === "worlds") return !isSubPageView;
        if (tab === "relations") return activeRelationshipEntries.length > 0;
        return true;
      }),
    [activeRelationshipEntries.length, isSubPageView],
  );

  /* 견출지가 사라진 탭에 머물면 빈 종이만 보이므로 기록으로 되돌립니다 */
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab("settings");
    }
  }, [activeTab, setActiveTab, visibleTabs]);

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
          {/* 문서고 표찰 — 서가에 들어서면 먼저 보이는 판 */}
          <div className="character-index-header">
            <span className="archive-vault-mark" aria-hidden="true">
              機密
            </span>
            <span className="archive-vault-title">
              <span className="archive-vault-jp" aria-hidden="true">
                文書保管庫
              </span>
              <span className="archive-vault-ko">
                <TextGlitch className="character-index-blue-text" text={sectionIndexTitle} />
              </span>
            </span>
            <span className="archive-vault-meta">
              <span className="archive-vault-count">
                <span className="archive-vault-count-key" aria-hidden="true">
                  保管
                </span>
                <TextGlitch text={String(characters.length).padStart(2, "0")} />
                <span className="archive-vault-count-key" aria-hidden="true">
                  件
                </span>
              </span>
              <span className="archive-vault-note">열람 기록 보존</span>
            </span>
          </div>

          {/* 출입 제한 띠 — 이 패널 안쪽이 서가라는 표시 */}
          <p className="archive-vault-rail" aria-hidden="true">
            <span className="archive-vault-rail-tape paper-ink" />
            <span className="archive-vault-rail-text">RESTRICTED AREA · 인가자 외 반출 금지</span>
            <span className="archive-vault-rail-tape paper-ink" />
          </p>

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
                /* 표지 문구는 그 인물의 열람등급을 따릅니다 — 상세의 도장과 같은 프리셋 */
                const cardClearance = resolveClearancePreset(character);

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
                    style={characterPaletteStyle(character.palette)}
                  >
                    {/* 파일철 한 부. 표지·뒷장·안쪽 자료가 각자 움직이므로 3D 무대는
                        버튼이 아니라 이 안쪽 요소가 맡습니다 — 버튼은 자식들을 익명 상자
                        하나로 묶어서 perspective 도 preserve-3d 도 넘겨주지 않습니다. */}
                    <span className="archive-folder-flip">
                      {/* 문서를 받치는 서류철 뒷장 */}
                      <span className="archive-folder-back paper-ink" aria-hidden="true" />

                      {/* 물려 있는 기밀문서 — 표지 윗변 위로 종이 끝이 어긋나게 삐져나옵니다.
                          가운데 장에는 등급 색 띠가 인쇄돼 있어 무엇이 들었는지 표가 납니다. */}
                      <span className="archive-folder-papers" aria-hidden="true">
                        <span className="archive-folder-paper archive-folder-paper--back paper-ink" />
                        <span className="archive-folder-paper archive-folder-paper--mid paper-ink" />
                        <span className="archive-folder-paper archive-folder-paper--front paper-ink" />
                      </span>

                      {/* 안쪽 자료 — 표지를 열면 나오는 인물 문서 */}
                      <span className="archive-folder-sheet character-palette-scope">
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
                      </span>

                      {/* 표지 — 마우스를 올리면 왼쪽 경첩으로 열립니다 */}
                      <span
                        className={cn(
                          "archive-folder-cover",
                          `archive-folder-cover--${cardClearance.tone}`,
                        )}
                        aria-hidden="true"
                      >
                        {/* 오른쪽 위로 솟은 견출지 — 실제 파일철처럼 NAME 칸과 No. 칸이 인쇄돼 있습니다 */}
                        <span className="archive-folder-tab">
                          <span className="archive-folder-tab-cell archive-folder-tab-cell--name">
                            <span className="archive-folder-tab-key">NAME</span>
                            <span className="archive-folder-tab-value">{character.id}</span>
                          </span>
                          <span className="archive-folder-tab-cell archive-folder-tab-cell--no">
                            <span className="archive-folder-tab-key">No.</span>
                            <span className="archive-folder-tab-value">
                              {documentCopyNo(character.id)}
                            </span>
                          </span>
                        </span>

                        {/* 관리표 — 검은 표지에 덧붙인 흰 종이 라벨.
                            먹칠·일련번호처럼 「지워졌다」로 읽혀야 하는 것들이 여기 올라갑니다. */}
                        <span className="archive-folder-plate paper-ink">
                          <span className="archive-folder-head">
                            <span className="archive-folder-head-mark">秘</span>
                            <span className="archive-folder-head-text">文書管理票</span>
                          </span>

                          <span className="archive-folder-redaction">
                            <span className="archive-folder-redaction-row">
                              <span className="archive-folder-redaction-key">件名</span>
                              <span className="archive-folder-redaction-bar paper-ink" />
                            </span>
                            <span className="archive-folder-redaction-row">
                              <span className="archive-folder-redaction-key">分類</span>
                              <span className="archive-folder-redaction-bar paper-ink" />
                            </span>
                          </span>

                          <span className="archive-folder-slug">
                            <span className="archive-folder-serial">
                              {documentSerial(character.id)}
                            </span>
                            <span className="archive-folder-sheets">
                              {documentSheetCount(character.id)} 葉
                            </span>
                          </span>
                        </span>

                        {/* 고무도장 — 라벨 오른쪽, 검은 표지 위에 비스듬히 눌러 찍습니다 */}
                        <span className="archive-folder-label">
                          <span className="archive-folder-mark">{cardClearance.stampMain}</span>
                          <span className="archive-folder-rule" />
                          <span className="archive-folder-sub">{cardClearance.stampSub}</span>
                        </span>

                        {/* 표지 아래를 가로지르는 취급 표시 */}
                        <span className="archive-folder-foot">
                          <span className="archive-folder-foot-mark">取扱注意</span>
                          <span className="archive-folder-foot-text">무단 복제 · 반출 금지</span>
                          <span className="archive-folder-open">열람하려면 여시오</span>
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </ArchiveMotion>
          )}

          {/* 서가 바닥 — 여기서 이 칸의 편철이 끝난다는 표시 */}
          <p className="archive-vault-foot" aria-hidden="true">
            <span className="archive-vault-foot-code">第壹書庫</span>
            <span className="archive-vault-foot-rule paper-ink" />
            <span className="archive-vault-foot-end">以下余白</span>
          </p>
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
            {/* 편철 구멍 — 이 표지가 묶여 있는 서류철의 한 장이라는 표시 */}
            <span className="case-file-punch paper-ink" aria-hidden="true" />
            <button type="button" onClick={handleDetailBack} className="case-back-button">
              ← {backButtonLabel}
            </button>

            {/* 케이스 파일 표지 — 왼쪽에 표제, 오른쪽에 붙인 사진판.
                예전에는 세로 그림을 가로 띠에 깔고 그 위에 글자를 얹느라, 그림은 절반 넘게
                잘리고 남은 절반마저 가독성용 그늘에 덮였습니다. */}
            <div className="case-file-cover">
              <div className="case-file-title-block">
                {/* 머리줄 — 분류 표시와 등급 라벨을 한 줄에 물립니다.
                    위아래로 쌓아 두면 둘 다 짧아서 오른쪽이 통째로 빕니다. */}
                <div className="case-file-topline">
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

                  {/* 봉인 띠 — 표지에 가로로 붙인 등급 라벨.
                      본문 우상단의 사각 고무도장·둥근 인장과는 다른 장치입니다. */}
                  {/* 글자가 아니라 잉크로 그린 칸·괘선·천공은 .paper-ink 로 배경 제거 규칙을 빠져나갑니다 */}
                  <span
                    className={cn(
                      "case-file-seal paper-ink",
                      `case-file-seal--${activeClearance.tone}`,
                      isSubPageView && "is-compact",
                    )}
                    aria-hidden="true"
                  >
                    <span className="case-file-seal-grade paper-ink">{activeClearance.grade}</span>
                    <span className="case-file-seal-main">{activeClearance.stampMain}</span>
                    <span className="case-file-seal-rule paper-ink" />
                    <span className="case-file-seal-sub">{activeClearance.stampSub}</span>
                    <span className="case-file-seal-perf paper-ink" />
                  </span>
                </div>

                {/* 기재란 머리 — 이름이 자유롭게 떠 있는 제목이 아니라 서식의 「件名」 칸임을 밝힙니다 */}
                <p className="case-file-fieldmark" aria-hidden="true">
                  <span className="case-file-fieldmark-jp">件名</span>
                  <span className="case-file-fieldmark-ko">건명</span>
                  <span className="case-file-fieldmark-rule paper-ink" />
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

                {/* 摘要란 — 한 줄 소개를 서식의 기입칸(라벨칸 | 기입칸)으로 앉힙니다.
                    테두리만 두른 상자였을 때는 표지에서 그냥 지나쳐지는 자리였습니다. */}
                <div className="case-file-brief">
                  <p className="case-file-brief-label paper-ink">
                    <span className="case-file-brief-label-jp">摘要</span>
                    <span className="case-file-brief-label-ko">
                      {isSubPageView && activeSubPageCopy
                        ? activeSubPageCopy.subtitleLabel
                        : "한 줄 소개"}
                    </span>
                  </p>
                  <p className="case-file-brief-text paper-ink" data-text-corruptor-ignore>
                    <GlitchedText
                      text={activeCharacter.subtitle}
                      glitch={activeCharacter.textGlitch?.subtitle}
                      preserveWhitespace
                      {...zoneLinkProps}
                    />
                  </p>
                </div>
              </div>

              {activeMainIllustration && (
                <figure className="case-file-plate">
                  {/* 눌러서 원본을 봅니다 — 그림 탭의 갤러리 창을 그대로 씁니다 */}
                  <button
                    type="button"
                    onClick={() =>
                      onOpenGallery({ image: activeMainIllustration, character: activeCharacter })
                    }
                    className="case-file-plate-frame"
                    aria-label={`${activeCharacter.name} 대표 그림 크게 보기`}
                  >
                    <ThumbnailImage
                      image={activeMainIllustration}
                      src={activeMainIllustration.url}
                      alt={`${activeCharacter.name} 대표 그림`}
                      wrapperClassName="case-file-plate-image"
                    />
                    {/* 네 귀의 모서리 홀더가 있던 자리 — 위쪽 테이프 두 조각으로 바꿨습니다.
                        테이프는 .case-file-plate-frame 의 가상요소라 마크업이 필요 없습니다. */}
                  </button>
                  <figcaption className="case-file-plate-slug">
                    <span className="case-file-plate-slug-jp">寫眞</span>
                    <span
                      className={cn("case-file-plate-sign", caseFileHeroMarkFont.className)}
                      aria-hidden="true"
                    >
                      {heroCharacterId}
                    </span>
                  </figcaption>
                </figure>
              )}
            </div>
          </div>
          {/* 등급을 종이 자체에 새깁니다 — 워터마크·마이크로프린트·먹칠 같은 장치를
              CSS 에서 [data-clearance] 하나로 켜고 끕니다. 낮은 등급은 민무늬로 두어야
              높은 등급이 특별해 보입니다. */}
          <div className="dossier-body p-6 md:p-8" data-clearance={activeClearance.grade}>
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

            {/* 봉인 띠 — 등급표 밖(X)의 문서에만 걸립니다.
                뜯긴 적 없다는 표시라 문서 위를 가로질러 붙습니다. */}
            {activeClearance.grade === "X" && (
              <p className="dossier-seal-band" aria-hidden="true">
                <span className="dossier-seal-band-mark">封</span>
                <span className="dossier-seal-band-text">
                  이 문서는 봉인되어 있습니다 · 개봉 이력 없음
                </span>
                <span className="dossier-seal-band-mark">封</span>
              </p>
            )}

            {/* 고무도장 두 벌 — 등급 도장은 관리자에서 고른 프리셋을, 취급 도장은 항상 찍힙니다 */}
            <span className="dossier-stamp-cluster" aria-hidden="true">
              <span className={cn("dossier-stamp", `dossier-stamp--${activeClearance.tone}`)}>
                <span className="dossier-stamp-main">{activeClearance.stampMain}</span>
                <span className="dossier-stamp-sub">{activeClearance.stampSub}</span>
              </span>
              <span className="dossier-chop">
                <span className="dossier-chop-main">取扱注意</span>
                <span className="dossier-chop-sub">취급주의</span>
              </span>
            </span>

            <header className="dossier-header">
              {/* 문서 관리 정보 — 일련번호 / 사본 번호 / 바코드 */}
              <div className="dossier-docmeta">
                <span className="dossier-docmeta-serial">{documentSerial(activeCharacter.id)}</span>
                {/* 사본 번호 — 몇 부 찍어 어디로 갔는지까지 관리되는 문서라는 표시.
                    id 에서 결정적으로 뽑아 hydration 이 어긋나지 않게 합니다. */}
                <span className="dossier-docmeta-copy">
                  複製 {documentCopyNo(activeCharacter.id)}/05
                </span>
                <span className="dossier-docmeta-barcode paper-ink" aria-hidden="true" />
                <span className="dossier-docmeta-flag">열람 기록 보존</span>
              </div>

              {/* 배포 제한 — 이 문서가 어디까지 나갈 수 있는지 */}
              <p className="dossier-dist">
                <span className="dossier-dist-mark" aria-hidden="true">
                  配布先限定
                </span>
                <span className="dossier-dist-text">
                  배포처 한정 · 관내 반출 시 <b>{activeClearance.koLabel}</b> 결재 필요
                </span>
                <span className="dossier-dist-serial" aria-hidden="true">
                  {activeClearance.stampSub}
                </span>
              </p>

              {/* 열람등급 — 등급을 하나만 찍어 두면 그게 높은 건지 낮은 건지 읽는 사람은 모릅니다.
                  네 등급을 전부 인쇄해 두고 해당하는 칸에만 붉은 ○ 를 치는 該当欄 방식입니다. */}
              <div
                className={cn("dossier-clearance", `dossier-clearance--${activeClearance.tone}`)}
              >
                <span className="dossier-clearance-caption">열람등급</span>
                <span className="dossier-clearance-scale" aria-hidden="true">
                  {CLEARANCE_GRADES.map((grade) => (
                    <span
                      key={grade}
                      className={cn(
                        "dossier-clearance-cell",
                        grade === activeClearance.grade && "is-marked",
                      )}
                    >
                      {clearancePresetOf(grade).cellMark}
                    </span>
                  ))}
                </span>
                <span className="dossier-clearance-text">
                  <span className="dossier-clearance-label">{activeClearance.koHeadline}</span>
                  <span className="dossier-clearance-note">{activeClearance.koNote}</span>
                </span>
              </div>

              {/* 취급 경고 띠 — 이 문서가 어떤 물건인지 한 줄로 못 박습니다 */}
              <p className="dossier-hazard">
                <span className="dossier-hazard-tape" aria-hidden="true" />
                <span className="dossier-hazard-text">
                  무단 복제 · 반출 금지 — 열람 기록은 보존됩니다
                </span>
                <span className="dossier-hazard-tape" aria-hidden="true" />
              </p>

              {/* 기재란(記載欄) — 항목마다 라벨칸과 기입칸을 괘선으로 끊은 서식 칸입니다 */}
              <div className="dossier-meta-strip" aria-label="식별 정보">
                <span className="dossier-meta-item dossier-meta-item--id">
                  <span className="dossier-meta-quiet">NO.</span>
                  <span className="dossier-meta-value">{activeCharacter.id || "UNREGISTERED"}</span>
                </span>
                {isSubPageView && activeSubPageEntryLabel ? (
                  <span className="dossier-meta-item">
                    <span className="dossier-meta-quiet">유형</span>
                    <span className="dossier-meta-value">{activeSubPageEntryLabel}</span>
                  </span>
                ) : null}
                {filledMetaFields.map((field) => (
                  <span key={field.id} className="dossier-meta-item">
                    {field.label.trim() ? (
                      <span className="dossier-meta-quiet">{field.label.trim()}</span>
                    ) : null}
                    <span className="dossier-meta-value">
                      <GlitchedText
                        text={field.body}
                        glitch={activeCharacter.textGlitch?.[metaFieldGlitchPath(field.id)]}
                        preserveWhitespace={field.body.includes("\n")}
                        {...zoneLinkProps}
                      />
                    </span>
                  </span>
                ))}
              </div>

              {quoteText ? (
                <div className="dossier-voice">
                  <p className="dossier-voice-label">
                    <span className="dossier-voice-label-mark" aria-hidden="true">
                      {quoteKanji}
                    </span>
                    <span className="dossier-voice-label-ko">{quoteLabel}</span>
                  </p>
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
            </header>

            <div className="dossier-tabs-layout">
              {/* 편철 견출지 — 서류철에서 삐져나온 색인 탭 */}
              <div className="file-tab-rail" role="tablist" aria-label="파일 탭">
                {visibleTabs.map((tab, index) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn("file-tab", activeTab === tab && "is-active")}
                  >
                    {/* 편철 번호는 붙어 있는 견출지 순서 — 안 단 탭 자리를 비워 두면
                        서류에서 한 항이 빠진 것처럼 보입니다 */}
                    <span className="file-tab-index" aria-hidden="true">
                      {toKanjiNumber(index + 1)}
                    </span>
                    <span className="file-tab-main" aria-hidden="true">
                      {TAB_KANJI[tab]}
                    </span>
                    <span className="file-tab-ko">{TAB_LABELS[tab]}</span>
                  </button>
                ))}
              </div>

              <div className="case-tab-panel">
                <ArchiveMotion motionKey={`${activeCharacterId}-${activeTab}`} variant="scan">
                  {activeTab === "settings" && (
                    <div className="record-settings-layout">
                      <div className="record-settings-pair">
                        <RecordConsole
                          entries={recordEntries}
                          serial={documentSerial(activeCharacter.id)}
                          emptyMessage="등록된 상세 설정이 없어요."
                        />
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
                  )}

                  {activeTab === "relations" && (
                    <div className="dossier-tab-stack">
                      {activeRelationshipEntries.length > 0 ? (
                        <section className="relation-map-panel">
                          <header className="relation-map-head">
                            <div>
                              <p className="case-file-intro-label">관계도</p>
                              <p className="relation-map-subtitle">
                                이 인물과 이어진 기록을 편철했습니다.
                              </p>
                            </div>
                            <span className="world-file-tag">
                              {activeRelationshipEntries.length} links
                            </span>
                          </header>
                          <div className="relation-link-list">
                            {activeRelationshipEntries.map((entry, index) => (
                              <article key={entry.id} className="relation-link-file">
                                {/* 견출지 「関係」 안이라 카드마다 LINK 라고 또 적지 않습니다 */}
                                <header className="relation-link-file-head">
                                  <div className="relation-link-file-name-row">
                                    <h3 className="relation-link-file-name">
                                      {entry.name || "이름 없음"}
                                    </h3>
                                    {entry.label && (
                                      <span className="relation-link-file-badge">
                                        {entry.label}
                                      </span>
                                    )}
                                  </div>
                                  <span className="relation-link-file-code">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
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
                      ) : (
                        <p className="plain-empty-note">등록된 관계 기록이 없어요.</p>
                      )}
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
                                      onUnlockCharacterWorld(
                                        event,
                                        activeCharacterWorldEntry.worldId,
                                      )
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
                                          worldPasswordDrafts[activeCharacterWorldEntry.worldId] ??
                                          ""
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
                                              세계관 스탠딩 표정 {activeWorldStandingImages.length}
                                              장 보기
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

            {/* 결재란 — 마지막 칸에는 붉은 도장이 이미 찍혀 있습니다 */}
            <footer className="dossier-approval" aria-hidden="true">
              <span className="dossier-approval-label">결재란</span>
              <span className="dossier-approval-cells">
                {[
                  { ko: "접수", jp: "受付", stamped: false },
                  { ko: "심사", jp: "審査", stamped: false },
                  { ko: "승인", jp: "承認", stamped: true },
                ].map((cell) => (
                  <span
                    key={cell.ko}
                    className={cn("dossier-approval-cell", cell.stamped && "is-stamped")}
                  >
                    <span className="dossier-approval-cell-ko">{cell.ko}</span>
                    <span className="dossier-approval-cell-jp">{cell.jp}</span>
                    {cell.stamped ? <span className="dossier-approval-chop">承認</span> : null}
                  </span>
                ))}
              </span>
            </footer>
          </div>
        </ArchiveMotion>
      )}
    </section>
  );
}
