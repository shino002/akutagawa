"use client";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useArchiveContentAdmin } from "@/hooks/useArchiveContentAdmin";

/**
 * 카테고리 패널 · 왼쪽 보관소 문구 편집기입니다.
 * page에서 props로 상태를 받지 않고 훅을 직접 호출합니다.
 */
export function ArchiveContentEditor() {
  const { isAdmin } = useAdminAuth();
  const { archiveContent, setArchiveContent, isSaving, notice, saveArchiveContent } =
    useArchiveContentAdmin({
      isAdmin,
    });

  return (
    <>
      <form onSubmit={saveArchiveContent} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <h2 className="board-title">왼쪽 보관소 문구</h2>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            작은 문구
            <input
              value={archiveContent.eyebrow}
              onChange={(event) =>
                setArchiveContent((current) => ({
                  ...current,
                  eyebrow: event.target.value,
                }))
              }
              placeholder="Archive"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            제목
            <input
              value={archiveContent.title}
              onChange={(event) =>
                setArchiveContent((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="보관소 제목"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            소개 문구
            <textarea
              value={archiveContent.body}
              onChange={(event) =>
                setArchiveContent((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              placeholder="왼쪽 보관소 영역에 보일 문구"
              className="auth-input min-h-32"
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
