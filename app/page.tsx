"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ADMIN_AUTH_EMAIL } from "@/lib/auth-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { BgmPlayer } from "@/components/BgmPlayer";
import { SideMenu } from "@/components/home/SideMenu";
import { CalendarWidget } from "@/components/home/CalendarWidget";
import { HomeSection } from "@/components/home/sections/HomeSection";
import { CharactersSection } from "@/components/home/sections/CharactersSection";
import { WorldsSection } from "@/components/home/sections/WorldsSection";
import { DiarySection } from "@/components/home/sections/DiarySection";
import { GuestSection } from "@/components/home/sections/GuestSection";
import { ExtractSection } from "@/components/home/sections/ExtractSection";
import { ReaderModal } from "@/components/home/modals/ReaderModal";
import { GalleryModal } from "@/components/home/modals/GalleryModal";
import { ExpressionModal } from "@/components/home/modals/ExpressionModal";
import { useAuth } from "@/hooks/useAuth";
import { useCharacters } from "@/hooks/useCharacters";
import { useWorlds } from "@/hooks/useWorlds";
import { useExtractContent } from "@/hooks/useExtractContent";
import { useArchiveContent, useHomeContent } from "@/hooks/useSiteContent";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { useGuestbook } from "@/hooks/useGuestbook";
import { useHomeModals } from "@/hooks/useHomeModals";
import { useWorldUnlock } from "@/hooks/useWorldUnlock";
import { defaultArchiveContent, defaultExtractContent, defaultHomeContent, type ArchiveSubSectionId, type SectionId } from "@/constants/home";
import type { CharacterDetailTab, DetailNavSnapshot } from "@/types/home.types";
import { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import { filterCharactersByKind } from "@/lib/character-kind";
import type { CharacterKind } from "@/lib/types";
import type { ZoneLinkTarget } from "@/lib/types";
import { findSubPage, subPageToDisplayCharacter } from "@/lib/sub-pages";
import { characterSectionForId, type CharacterDetailSection } from "@/lib/zone-links";

dayjs.locale("ko");

const getInitialMenuOpen = () => {
  if (typeof window === "undefined") return true;

  return window.matchMedia("(min-width: 768px)").matches;
};

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const [activeArchiveSub, setActiveArchiveSub] = useState<ArchiveSubSectionId>("characters");
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeWorldId, setActiveWorldId] = useState("");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [activeSubPageId, setActiveSubPageId] = useState("");
  const [activeTab, setActiveTab] = useState<CharacterDetailTab>("settings");
  const [detailNavStack, setDetailNavStack] = useState<DetailNavSnapshot[]>([]);
  const [menuOpen, setMenuOpen] = useState(getInitialMenuOpen);
  const [authNotice, setAuthNotice] = useState("");
  const [guestDraft, setGuestDraft] = useState({ name: "", body: "" });

  const auth = useAuth(setAuthNotice);
  const { data: characters, error: charactersError } = useCharacters();
  const { data: worlds, error: worldsError } = useWorlds();
  const { content: homeContent, error: homeError } = useHomeContent(defaultHomeContent);
  const { content: archiveContent, error: archiveError } = useArchiveContent(defaultArchiveContent);
  const { content: extractContent, error: extractError } = useExtractContent(defaultExtractContent);
  const { data: diaryEntries, error: diaryError } = useDiaryEntries();
  const { data: guestbook, error: guestbookError } = useGuestbook();
  const modals = useHomeModals();
  const worldUnlock = useWorldUnlock(worlds, auth.authUser, setAuthNotice, () =>
    auth.setAuthPanelOpen(true),
  );

  // 사용자가 명시적으로 선택한 ID가 없으면 첫 번째 세계관을 활성으로 사용합니다.
  const effectiveActiveWorldId = activeWorldId || worlds[0]?.id || "";
  const effectiveActiveCharacterWorldId = activeCharacterWorldId || worlds[0]?.id || "";

  const isAdmin = auth.authUser?.email === ADMIN_AUTH_EMAIL;
  const ocCharacters = useMemo(() => filterCharactersByKind(characters, "oc"), [characters]);
  const pairCharacters = useMemo(() => filterCharactersByKind(characters, "pair"), [characters]);
  const otherCharacters = useMemo(() => filterCharactersByKind(characters, "other"), [characters]);
  const activeWorld = worlds.find((world) => world.id === effectiveActiveWorldId) ?? worlds[0];
  const activeCharacterParent =
    activeSection === "archive"
      ? characters.find((character) => character.id === activeCharacterId)
      : undefined;
  const activeSubPage =
    activeCharacterParent && activeSubPageId
      ? findSubPage(activeCharacterParent, activeSubPageId)
      : undefined;
  const activeCharacter =
    activeCharacterParent && activeSubPage
      ? subPageToDisplayCharacter(activeCharacterParent, activeSubPage)
      : activeCharacterParent;
  const characterBgmUrl =
    activeCharacter ? resolveCharacterBgmUrl(activeCharacter.bgmUrl) : null;

  // 구독 에러는 사용자 액션 알림(authNotice)이 비어 있을 때만 폴백으로 표시합니다.
  const subscriptionError =
    charactersError || worldsError || homeError || archiveError || extractError || diaryError || guestbookError;
  const displayedNotice = authNotice || subscriptionError || "";

  const pushDetailNavSnapshot = useCallback(() => {
    if (activeSection !== "archive") {
      return;
    }

    if (!activeCharacterId) {
      return;
    }

    setDetailNavStack((stack) => [
      ...stack,
      {
        section: "archive",
        archiveSub: activeArchiveSub,
        characterId: activeCharacterId,
        subPageId: activeSubPageId,
        tab: activeTab,
      },
    ]);
  }, [activeArchiveSub, activeCharacterId, activeSection, activeSubPageId, activeTab]);

  const clearDetailNavStack = useCallback(() => {
    setDetailNavStack([]);
  }, []);

  const navigateToArchiveCharacter = useCallback(
    (characterId: string, options?: { tab?: CharacterDetailTab; pushStack?: boolean }) => {
      const archiveSub = characterSectionForId(characters, characterId);
      if (options?.pushStack) {
        pushDetailNavSnapshot();
      } else {
        clearDetailNavStack();
      }
      setActiveSection("archive");
      setActiveArchiveSub(archiveSub);
      setActiveCharacterId(characterId);
      setActiveSubPageId("");
      if (options?.tab) {
        setActiveTab(options.tab);
      }
    },
    [characters, clearDetailNavStack, pushDetailNavSnapshot],
  );

  const navigateBackFromDetail = useCallback((): boolean => {
    if (detailNavStack.length === 0) {
      return false;
    }

    const previous = detailNavStack[detailNavStack.length - 1]!;
    setDetailNavStack((stack) => stack.slice(0, -1));
    setActiveSection(previous.section);
    setActiveArchiveSub(previous.archiveSub);
    setActiveCharacterId(previous.characterId);
    setActiveSubPageId(previous.subPageId);
    setActiveTab(previous.tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return true;
  }, [detailNavStack]);

  const handleWorldPasswordChange = (worldId: string, value: string) => {
    worldUnlock.setWorldPasswordDrafts((current) => ({ ...current, [worldId]: value }));
  };

  const handleUnlockActiveWorld = (event: FormEvent<HTMLFormElement>) => {
    if (!activeWorld) return;
    worldUnlock.unlockWorldById(event, activeWorld.id);
  };

  const navigateToGuest = () => setActiveSection("guest");

  const openAuthForWorldUnlock = () => {
    setAuthNotice("세계관 비밀번호는 회원가입 또는 로그인 후 입력할 수 있어요.");
    auth.setAuthPanelOpen(true);
  };

  const navigateToCharacterWorks = (characterId: string) => {
    navigateToArchiveCharacter(characterId, { tab: "works" });
  };

  const navigateToCharacterDetail = (characterId: string) => {
    navigateToArchiveCharacter(characterId);
  };

  const navigateToLinkedCharacter = (characterId: string) => {
    navigateToArchiveCharacter(characterId, { pushStack: true, tab: "settings" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectCharacter = (characterId: string) => {
    clearDetailNavStack();
    setActiveCharacterId(characterId);
    setActiveSubPageId("");
  };

  const handleSelectSection = (section: SectionId) => {
    clearDetailNavStack();
    setActiveSection(section);
    setActiveSubPageId("");
    setActiveCharacterId("");
  };

  const handleSelectArchiveSub = (sub: ArchiveSubSectionId) => {
    clearDetailNavStack();
    setActiveSection("archive");
    setActiveArchiveSub(sub);
    setActiveSubPageId("");
    setActiveCharacterId("");
  };

  const navigateToZoneLink = (target: ZoneLinkTarget) => {
    pushDetailNavSnapshot();
    setActiveSection("archive");
    setActiveArchiveSub(target.section);
    setActiveCharacterId(target.characterId);
    setActiveSubPageId(target.subPageId ?? "");
    setActiveTab("settings");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderArchiveSection = (
    kind: CharacterKind,
    sectionId: CharacterDetailSection,
    sectionIndexTitle: string,
    emptyListMessage: string,
  ) => (
    <CharactersSection
      characters={
        kind === "oc" ? ocCharacters : kind === "pair" ? pairCharacters : otherCharacters
      }
      allCharacters={characters}
      sectionIndexTitle={sectionIndexTitle}
      emptyListMessage={emptyListMessage}
      activeCharacterId={activeCharacterId}
      setActiveCharacterId={handleSelectCharacter}
      activeSubPageId={activeSubPageId}
      setActiveSubPageId={setActiveSubPageId}
      parentCharacter={activeCharacterParent}
      detailSection={sectionId}
      onNavigateToLinkedCharacter={navigateToLinkedCharacter}
      onZoneLinkNavigate={navigateToZoneLink}
      onDetailNavigateBack={navigateBackFromDetail}
      hasDetailNavHistory={detailNavStack.length > 0}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      worlds={worlds}
      activeCharacterWorldId={effectiveActiveCharacterWorldId}
      setActiveCharacterWorldId={setActiveCharacterWorldId}
      worldPasswordDrafts={worldUnlock.worldPasswordDrafts}
      onWorldPasswordChange={handleWorldPasswordChange}
      unlockedWorldIds={worldUnlock.unlockedWorldIds}
      canUnlockWorlds={Boolean(auth.authUser)}
      onUnlockCharacterWorld={worldUnlock.unlockWorldById}
      onRequireAuth={openAuthForWorldUnlock}
      onOpenGallery={modals.openGalleryModal}
      onOpenExpression={modals.setExpressionModalItem}
      onOpenReader={modals.setReaderModalItem}
    />
  );

  const viewParticipantInCharacterTab = (characterId: string, worldId: string) => {
    navigateToArchiveCharacter(characterId, { tab: "worlds" });
    setActiveCharacterWorldId(worldId);
  };

  const submitGuest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = guestDraft.name.trim() || "익명";
    const body = guestDraft.body.trim();

    if (!auth.authUser) {
      setAuthNotice("방명록은 로그인한 사람만 남길 수 있어요.");
      auth.setAuthPanelOpen(true);
      return;
    }

    if (!body) return;

    try {
      await addDoc(collection(getFirebaseDb(), "guestbook"), {
        name,
        body,
        reply: "",
        createdAtMillis: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setGuestDraft({ name: "", body: "" });
      setAuthNotice("방명록을 남겼어요.");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "방명록 저장에 실패했어요.");
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-emerald-50">
      <style jsx global>{`
        @font-face {
          font-family: "KbizHanmaumMyungjo";
          src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/KBIZHanmaumMyungjo.woff")
            format("woff");
          font-weight: normal;
          font-display: swap;
        }

        body,
        body
          *:not(i):not([class*="icon"]):not(.material-icons):not(.fa):not(.fas):not(.far):not(
            .fab
          ):not(.auth-input):not(.case-file-hero-mark) {
          font-family: "KbizHanmaumMyungjo", "Zen Old Mincho", serif !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-[linear-gradient(180deg,#000000_0%,#000000_78%,#080000_100%)]" />
      <div className="noise-layer" aria-hidden="true" />

      <SideMenu
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        archiveContent={archiveContent}
        activeSection={activeSection}
        activeArchiveSub={activeArchiveSub}
        onSelectSection={handleSelectSection}
        onSelectArchiveSub={handleSelectArchiveSub}
        auth={auth}
        isAdmin={isAdmin}
        authNotice={displayedNotice}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-5 pt-5 pb-12 md:px-8 md:pl-64 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {activeSection === "home" && (
            <HomeSection
              homeContent={homeContent}
              characters={ocCharacters}
              guestbook={guestbook}
              onNavigateToGuest={navigateToGuest}
              onNavigateToCharacterWorks={navigateToCharacterWorks}
              onNavigateToCharacterDetail={navigateToCharacterDetail}
            />
          )}

          {activeSection === "archive" && activeArchiveSub === "characters" &&
            renderArchiveSection(
              "oc",
              "characters",
              "OC Files",
              "아직 등록된 자캐가 없어요. 관리자 로그인 후 OC에서 첫 카드를 추가해주세요.",
            )}

          {activeSection === "archive" && activeArchiveSub === "pairs" &&
            renderArchiveSection(
              "pair",
              "pairs",
              "Pair Files",
              "아직 등록된 페어가 없어요. 관리자 로그인 후 Pair에서 첫 카드를 추가해주세요.",
            )}

          {activeSection === "archive" && activeArchiveSub === "others" &&
            renderArchiveSection(
              "other",
              "others",
              "Another Files",
              "아직 등록된 어나더 항목이 없어요. 관리자 로그인 후 어나더에서 첫 카드를 추가해주세요.",
            )}

          {activeSection === "worlds" && (
            <WorldsSection
              worlds={worlds}
              activeWorldId={effectiveActiveWorldId}
              setActiveWorldId={setActiveWorldId}
              characters={characters}
              worldPasswordDrafts={worldUnlock.worldPasswordDrafts}
              onWorldPasswordChange={handleWorldPasswordChange}
              unlockedWorldIds={worldUnlock.unlockedWorldIds}
              canUnlockWorlds={Boolean(auth.authUser)}
              onUnlockWorld={handleUnlockActiveWorld}
              onRequireAuth={openAuthForWorldUnlock}
              onViewParticipant={viewParticipantInCharacterTab}
              onOpenGallery={modals.openGalleryModal}
              onOpenExpression={modals.setExpressionModalItem}
              onOpenReader={modals.setReaderModalItem}
              onZoneLinkNavigate={navigateToZoneLink}
            />
          )}

          {activeSection === "diary" && <DiarySection entries={diaryEntries} />}

          {activeSection === "guest" && (
            <GuestSection
              guestbook={guestbook}
              guestDraft={guestDraft}
              onDraftChange={setGuestDraft}
              authUser={auth.authUser}
              onSubmit={submitGuest}
            />
          )}

          {activeSection === "extract" && <ExtractSection banners={extractContent.banners} />}
        </div>

        <aside className="space-y-3">
          <CalendarWidget />

          <BgmPlayer characterBgmUrl={characterBgmUrl} />
        </aside>
      </section>

      {modals.readerModalItem && (
        <ReaderModal
          item={modals.readerModalItem}
          onClose={() => modals.setReaderModalItem(null)}
          onOpenGallery={modals.openGalleryModal}
        />
      )}

      {modals.galleryModalItem && (
        <GalleryModal
          item={modals.galleryModalItem}
          zoom={modals.galleryZoom}
          onZoomChange={modals.updateGalleryZoom}
          onClose={() => modals.setGalleryModalItem(null)}
        />
      )}

      {modals.expressionModalItem && (
        <ExpressionModal
          item={modals.expressionModalItem}
          onClose={() => modals.setExpressionModalItem(null)}
          onOpenGallery={modals.openGalleryModal}
        />
      )}
    </main>
  );
}
