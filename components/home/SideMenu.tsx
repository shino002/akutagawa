"use client";

import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { cn } from "@/utils/cn";
import { ADMIN_LOGIN_ID, displayLoginId } from "@/lib/auth-helpers";
import { sections, type SectionId } from "@/constants/home";
import type { HomeContent } from "@/lib/types";

type AuthMode = "login" | "signup";

type AuthDraft = {
  loginId: string;
  password: string;
};

interface SideMenuAuthApi {
  authUser: User | null;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authDraft: AuthDraft;
  setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  authPanelOpen: boolean;
  setAuthPanelOpen: Dispatch<SetStateAction<boolean>>;
  isAuthLoading: boolean;
  submitAuth: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  logout: () => void | Promise<void>;
}

interface SideMenuProps {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  archiveContent: HomeContent;
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  auth: SideMenuAuthApi;
  isAdmin: boolean;
  authNotice: string;
  className?: string;
}

export function SideMenu({
  menuOpen,
  setMenuOpen,
  archiveContent,
  activeSection,
  onSelectSection,
  auth,
  isAdmin,
  authNotice,
  className,
}: SideMenuProps) {
  const {
    authUser,
    authMode,
    setAuthMode,
    authDraft,
    setAuthDraft,
    showPassword,
    setShowPassword,
    authPanelOpen,
    setAuthPanelOpen,
    isAuthLoading,
    submitAuth,
    logout,
  } = auth;

  return (
    <aside
      className={cn(
        "side-menu fixed top-5 left-5 z-30 backdrop-blur-xl",
        menuOpen ? "is-open" : "is-collapsed",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        className="side-menu-trigger"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
      >
        ☰
      </button>

      <div className="side-menu-content" aria-hidden={!menuOpen}>
        <div className="mb-3 border border-emerald-100/10 p-3">
          <p className="text-xs tracking-[0.4em] text-emerald-200/70 uppercase">
            {archiveContent.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold">{archiveContent.title}</h1>
          <p className="mt-2 text-xs leading-5 text-emerald-100/60">{archiveContent.body}</p>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={`group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                activeSection === section.id
                  ? "bg-emerald-200 text-emerald-950"
                  : "text-emerald-50/75 hover:bg-emerald-100/10 hover:text-white"
              }`}
            >
              <span>{section.label}</span>
              <span className="text-xs opacity-60">›</span>
            </button>
          ))}
        </nav>

        <section
          className={`auth-panel mt-3 border border-emerald-100/10 bg-black/20 ${authPanelOpen ? "is-open" : "is-collapsed"}`}
        >
          <button
            type="button"
            onClick={() => setAuthPanelOpen((value) => !value)}
            className="auth-panel-trigger"
            aria-expanded={authPanelOpen}
            aria-label={authPanelOpen ? "로그인 창 닫기" : "로그인 창 열기"}
          >
            <span className="auth-panel-dot" />
            <span>{authUser ? "USER" : "LOGIN"}</span>
            <span className="auth-panel-trigger-mark">{authPanelOpen ? "×" : "+"}</span>
          </button>
          {authPanelOpen && (
            <div className="auth-panel-content">
              <p className="mb-3 text-[10px] tracking-[0.28em] text-red-100/65 uppercase">
                {authUser ? "Account" : authMode === "signup" ? "Sign Up" : "Login"}
              </p>

              {authUser ? (
                <div className="space-y-2 text-xs">
                  <p className="text-emerald-100/60">{isAdmin ? "관리자 로그인됨" : "로그인됨"}</p>
                  <p className="break-all text-emerald-50">
                    {isAdmin ? ADMIN_LOGIN_ID : displayLoginId(authUser.email)}
                  </p>
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="block border border-red-600/40 bg-red-950/30 p-2 text-center text-red-100"
                    >
                      수정 페이지로 이동
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full border border-emerald-100/15 bg-emerald-100/10 py-2 text-emerald-50"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <form onSubmit={submitAuth} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`py-1.5 ${
                        authMode === "signup"
                          ? "bg-red-700/80 text-red-50"
                          : "border border-emerald-100/15 text-emerald-100/65"
                      }`}
                    >
                      회원가입
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`py-1.5 ${
                        authMode === "login"
                          ? "bg-red-700/80 text-red-50"
                          : "border border-emerald-100/15 text-emerald-100/65"
                      }`}
                    >
                      로그인
                    </button>
                  </div>
                  <input
                    value={authDraft.loginId}
                    onChange={(event) =>
                      setAuthDraft((current) => ({ ...current, loginId: event.target.value }))
                    }
                    placeholder="아이디"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="auth-input auth-input-compact"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <input
                      value={authDraft.password}
                      onChange={(event) =>
                        setAuthDraft((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="비밀번호"
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="auth-input auth-input-compact"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="border border-emerald-100/15 px-2 text-[11px] text-emerald-100/70"
                    >
                      {showPassword ? "숨김" : "보기"}
                    </button>
                  </div>
                  <button
                    disabled={isAuthLoading}
                    className="w-full bg-red-700/80 py-2 text-[11px] font-semibold text-red-50 disabled:opacity-60"
                  >
                    {isAuthLoading
                      ? "확인 중..."
                      : authMode === "signup"
                        ? "가입하기"
                        : "로그인하기"}
                  </button>
                </form>
              )}

              {authNotice && (
                <p className="mt-2 border border-red-600/30 bg-red-950/20 p-2 text-xs leading-5 text-red-100/80">
                  {authNotice}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
