"use client";

import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * 관리자 로그인 폼입니다.
 */
export function AdminLoginForm() {
  const { loginDraft, setLoginDraft, authNotice, isAuthLoading, signIn } = useAdminAuth();

  return (
    <section className="glass-card max-w-xl p-6">
      <h2 className="board-title">관리자 로그인</h2>
      <form onSubmit={signIn} className="mt-5 grid gap-3">
        <input
          value={loginDraft.loginId}
          onChange={(event) =>
            setLoginDraft((current) => ({ ...current, loginId: event.target.value }))
          }
          placeholder="id"
          className="auth-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <input
          value={loginDraft.password}
          onChange={(event) =>
            setLoginDraft((current) => ({ ...current, password: event.target.value }))
          }
          placeholder="password"
          type="text"
          className="auth-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          disabled={isAuthLoading}
          className="bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          {isAuthLoading ? "로그인 중..." : "로그인"}
        </button>
        {authNotice && (
          <p className="border border-stone-400/25 bg-stone-900/25 p-3 text-sm text-stone-200">
            {authNotice}
          </p>
        )}
      </form>
    </section>
  );
}
