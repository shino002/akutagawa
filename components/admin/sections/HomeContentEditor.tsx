"use client";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useHomeContentAdmin } from "@/hooks/useHomeContentAdmin";

/**
 * 카테고리 패널 · 홈 상단 문구 편집기입니다.
 * page에서 props로 상태를 받지 않고 훅을 직접 호출합니다.
 */
export function HomeContentEditor() {
  const { isAdmin } = useAdminAuth();
  const { homeContent, setHomeContent, isSaving, notice, saveHomeContent } = useHomeContentAdmin({
    isAdmin,
  });

  return (
    <>
      <form onSubmit={saveHomeContent} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <h2 className="board-title">홈 상단 문구</h2>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            작은 문구
            <input
              value={homeContent.eyebrow}
              onChange={(event) =>
                setHomeContent((current) => ({
                  ...current,
                  eyebrow: event.target.value,
                }))
              }
              placeholder="상단 작은 문구"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            큰 제목
            <input
              value={homeContent.title}
              onChange={(event) =>
                setHomeContent((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="상단 제목"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            본문 문구
            <textarea
              value={homeContent.body}
              onChange={(event) =>
                setHomeContent((current) => ({ ...current, body: event.target.value }))
              }
              placeholder="홈에 보일 소개 문구"
              className="auth-input min-h-36"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            공지 / 메모
            <textarea
              value={homeContent.notice}
              onChange={(event) =>
                setHomeContent((current) => ({
                  ...current,
                  notice: event.target.value.slice(0, 1000),
                }))
              }
              maxLength={1000}
              placeholder="비우면 홈에 표시되지 않아요"
              className="auth-input min-h-28"
            />
          </label>
        </section>
        <button
          disabled={isSaving}
          className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          카테고리 저장
        </button>
      </form>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
    </>
  );
}
