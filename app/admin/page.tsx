"use client";

import Link from "next/link";
import { AdminAsideNav } from "@/components/admin/AdminAsideNav";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { CharactersPanel } from "@/components/admin/CharactersPanel";
import { CharactersSidebar } from "@/components/admin/CharactersSidebar";
import { ArchiveContentEditor } from "@/components/admin/sections/ArchiveContentEditor";
import { BgmCategorySidebar, BgmTrackEditor } from "@/components/admin/sections/BgmTrackEditor";
import { DiaryCategorySidebar, DiaryEditor } from "@/components/admin/sections/DiaryEditor";
import {
  ExtractBannerEditor,
  ExtractCategorySidebar,
} from "@/components/admin/sections/ExtractBannerEditor";
import { GuestbookEditor } from "@/components/admin/sections/GuestbookEditor";
import { HomeContentEditor } from "@/components/admin/sections/HomeContentEditor";
import { WorldCategorySidebar, WorldsEditor } from "@/components/admin/sections/WorldsEditor";
import { CharactersAdminProvider, useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminPanelHistory } from "@/hooks/useAdminPanelHistory";
import { useCharactersAdminState } from "@/hooks/useCharactersAdminState";

/**
 * 로그인 후 관리자 워크스페이스입니다.
 * 캐릭터 훅은 Provider에서 한 번만 만들고 history·사이드바·패널이 공유합니다.
 */
function AdminWorkspace() {
  const charactersAdmin = useCharactersAdminState();
  return (
    <CharactersAdminProvider value={charactersAdmin}>
      <AdminWorkspaceInner />
    </CharactersAdminProvider>
  );
}

function AdminWorkspaceInner() {
  const { signOut } = useAdminAuth();
  const {
    charactersRef,
    activeCharacterId,
    setActiveCharacterId,
    activeCharacterKind,
    setActiveCharacterKind,
    activeSubPageId,
    setActiveSubPageId,
    setDraft,
    characterEditSection,
    setCharacterEditSection,
    activeCharacterWorldId,
    setActiveCharacterWorldId,
    setWorldSettingsText,
    setWorldWorkDraft,
    resetCharacterGlitch,
  } = useCharactersAdmin();

  const { adminPanel, setAdminPanel, activeCategory, setActiveCategory } = useAdminPanelHistory({
    charactersRef,
    activeCharacterId,
    setActiveCharacterId,
    activeCharacterKind,
    setActiveCharacterKind,
    activeSubPageId,
    setActiveSubPageId,
    setDraft,
    characterEditSection,
    setCharacterEditSection,
    activeCharacterWorldId,
    setActiveCharacterWorldId,
    setWorldSettingsText,
    setWorldWorkDraft,
    resetCharacterGlitch,
  });

  return (
    /* 두 단 전환을 xl(1280) → lg(1024) 로 내립니다. 예전에는 흔한 노트북 폭에서
       좌측 목록이 화면 전체를 먹고 편집기가 한참 아래로 밀려 있었습니다. */
    <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <AdminAsideNav
        adminPanel={adminPanel}
        onPanelChange={setAdminPanel}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        charactersSidebar={<CharactersSidebar />}
        categoryExtra={
          <>
            {activeCategory === "diary" && <DiaryCategorySidebar />}
            {activeCategory === "extract" && <ExtractCategorySidebar />}
            {activeCategory === "bgm" && <BgmCategorySidebar />}
            {activeCategory === "worlds" && <WorldCategorySidebar />}
          </>
        }
        onSignOut={() => {
          void signOut();
        }}
      />

      <section className="grid min-w-0 gap-5">
        {adminPanel === "categories" && activeCategory === "home" && <HomeContentEditor />}
        {adminPanel === "categories" && activeCategory === "archive" && <ArchiveContentEditor />}
        {adminPanel === "categories" && activeCategory === "diary" && <DiaryEditor />}
        {adminPanel === "categories" && activeCategory === "guestbook" && <GuestbookEditor />}
        {adminPanel === "categories" && activeCategory === "extract" && <ExtractBannerEditor />}
        {adminPanel === "categories" && activeCategory === "bgm" && <BgmTrackEditor />}
        {adminPanel === "categories" && activeCategory === "worlds" && <WorldsEditor />}
        {adminPanel === "characters" && <CharactersPanel />}
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAdminAuth();

  return (
    <main className="admin-page min-h-screen bg-black px-5 py-8 text-emerald-50 md:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#0a0c12_0%,#080a10_78%,#070910_100%)]" />
      <div className="noise-layer" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-5">
        {/* 도구 화면이라 표제는 한 줄 띠로 눌러 둡니다 — 예전 6xl 히어로가 첫 화면의
            절반을 쓰면서 정작 편집기는 스크롤 아래에 있었습니다 */}
        <header className="admin-topbar">
          <div className="min-w-0">
            <p className="adm-label">Admin Edit Page</p>
            <h1 className="admin-topbar-title">수정 페이지</h1>
          </div>
          <div className="admin-topbar-actions">
            <p className="admin-topbar-note">저장한 내용은 본 페이지에 바로 반영됩니다.</p>
            <Link href="/" className="admin-ghost-btn text-sm">
              본 페이지로 돌아가기
            </Link>
          </div>
        </header>

        {!isAdmin ? <AdminLoginForm /> : <AdminWorkspace />}
      </section>
    </main>
  );
}
