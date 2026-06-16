"use client";

import { type FormEvent, useState } from "react";
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
import { useArchiveContent, useHomeContent } from "@/hooks/useSiteContent";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { useGuestbook } from "@/hooks/useGuestbook";
import { useHomeModals } from "@/hooks/useHomeModals";
import { useWorldUnlock } from "@/hooks/useWorldUnlock";
import { defaultArchiveContent, defaultHomeContent, type SectionId } from "@/constants/home";
import type { CharacterDetailTab } from "@/types/home.types";

dayjs.locale("ko");

export default function Home() {
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeWorldId, setActiveWorldId] = useState("");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [activeTab, setActiveTab] = useState<CharacterDetailTab>("settings");
  const [menuOpen, setMenuOpen] = useState(true);
  const [authNotice, setAuthNotice] = useState("");
  const [guestDraft, setGuestDraft] = useState({ name: "", body: "" });

  const auth = useAuth(setAuthNotice);
  const { data: characters, error: charactersError } = useCharacters();
  const { data: worlds, error: worldsError } = useWorlds();
  const { content: homeContent, error: homeError } = useHomeContent(defaultHomeContent);
  const { content: archiveContent, error: archiveError } = useArchiveContent(defaultArchiveContent);
  const { data: diaryEntries, error: diaryError } = useDiaryEntries();
  const { data: guestbook, error: guestbookError } = useGuestbook();
  const modals = useHomeModals();
  const worldUnlock = useWorldUnlock(worlds, setAuthNotice);

  // 사용자가 명시적으로 선택한 ID가 없으면 첫 번째 세계관을 활성으로 사용합니다.
  const effectiveActiveWorldId = activeWorldId || worlds[0]?.id || "";
  const effectiveActiveCharacterWorldId = activeCharacterWorldId || worlds[0]?.id || "";

  const isAdmin = auth.authUser?.email === ADMIN_AUTH_EMAIL;
  const activeWorld = worlds.find((world) => world.id === effectiveActiveWorldId) ?? worlds[0];

  // 구독 에러는 사용자 액션 알림(authNotice)이 비어 있을 때만 폴백으로 표시합니다.
  const subscriptionError =
    charactersError || worldsError || homeError || archiveError || diaryError || guestbookError;
  const displayedNotice = authNotice || subscriptionError || "";

  const handleWorldPasswordChange = (worldId: string, value: string) => {
    worldUnlock.setWorldPasswordDrafts((current) => ({ ...current, [worldId]: value }));
  };

  const handleUnlockActiveWorld = (event: FormEvent<HTMLFormElement>) => {
    if (!activeWorld) return;
    worldUnlock.unlockWorldById(event, activeWorld.id);
  };

  const navigateToGuest = () => setActiveSection("guest");

  const navigateToCharacterWorks = (characterId: string) => {
    setActiveCharacterId(characterId);
    setActiveTab("works");
    setActiveSection("characters");
  };

  const navigateToCharacterDetail = (characterId: string) => {
    setActiveCharacterId(characterId);
    setActiveSection("characters");
  };

  const viewParticipantInCharacterTab = (characterId: string, worldId: string) => {
    setActiveCharacterId(characterId);
    setActiveCharacterWorldId(worldId);
    setActiveTab("worlds");
    setActiveSection("characters");
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
          ):not(.auth-input) {
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
        onSelectSection={setActiveSection}
        auth={auth}
        isAdmin={isAdmin}
        authNotice={displayedNotice}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-5 pt-5 pb-12 md:px-8 md:pl-64 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {activeSection === "home" && (
            <HomeSection
              homeContent={homeContent}
              characters={characters}
              guestbook={guestbook}
              onNavigateToGuest={navigateToGuest}
              onNavigateToCharacterWorks={navigateToCharacterWorks}
              onNavigateToCharacterDetail={navigateToCharacterDetail}
            />
          )}

          {activeSection === "characters" && (
            <CharactersSection
              characters={characters}
              activeCharacterId={activeCharacterId}
              setActiveCharacterId={setActiveCharacterId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              worlds={worlds}
              activeCharacterWorldId={effectiveActiveCharacterWorldId}
              setActiveCharacterWorldId={setActiveCharacterWorldId}
              worldPasswordDrafts={worldUnlock.worldPasswordDrafts}
              onWorldPasswordChange={handleWorldPasswordChange}
              unlockedWorldIds={worldUnlock.unlockedWorldIds}
              onUnlockCharacterWorld={worldUnlock.unlockWorldById}
              onOpenGallery={modals.openGalleryModal}
              onOpenExpression={modals.setExpressionModalItem}
              onOpenReader={modals.setReaderModalItem}
            />
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
              onUnlockWorld={handleUnlockActiveWorld}
              onViewParticipant={viewParticipantInCharacterTab}
              onOpenGallery={modals.openGalleryModal}
              onOpenExpression={modals.setExpressionModalItem}
              onOpenReader={modals.setReaderModalItem}
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

          {activeSection === "extract" && <ExtractSection />}
        </div>

        <aside className="space-y-4">
          <CalendarWidget />

          <BgmPlayer />
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
