"use client";

import { useGuestbookAdmin } from "@/hooks/useGuestbookAdmin";

/**
 * 카테고리 패널 · 방명록 관리 편집기입니다.
 * page에서 props로 상태를 받지 않고 훅을 직접 호출합니다.
 */
export function GuestbookEditor() {
  const {
    guestbookEntries,
    guestbookReplyDrafts,
    setGuestbookReplyDrafts,
    isSaving,
    notice,
    saveGuestbookReply,
    deleteGuestbookEntry,
  } = useGuestbookAdmin();

  return (
    <>
      <div className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <div>
            <h2 className="board-title">방명록 관리</h2>
            <p className="mt-2 text-sm text-emerald-100/55">
              본 페이지에 남겨진 방명록에 관리자 답글을 달 수 있어요.
            </p>
          </div>
          <div className="grid gap-4">
            {guestbookEntries.map((entry, index) => (
              <article key={entry.id} className="border border-emerald-100/10 bg-black/30 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-emerald-50">
                      No.{guestbookEntries.length - index} {entry.name}
                    </p>
                    <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-emerald-50/70">
                      {entry.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteGuestbookEntry(entry)}
                    disabled={isSaving}
                    className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                  >
                    삭제
                  </button>
                </div>
                <label className="mt-4 grid gap-2 text-sm text-emerald-100/75">
                  관리자 답글
                  <textarea
                    value={guestbookReplyDrafts[entry.id] ?? ""}
                    onChange={(event) =>
                      setGuestbookReplyDrafts((current) => ({
                        ...current,
                        [entry.id]: event.target.value,
                      }))
                    }
                    placeholder="답글을 입력해주세요."
                    className="auth-input min-h-28"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => saveGuestbookReply(entry)}
                  disabled={isSaving}
                  className="mt-3 justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                >
                  답글 저장
                </button>
              </article>
            ))}
            {guestbookEntries.length === 0 && (
              <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/55">
                아직 남겨진 방명록이 없어요.
              </p>
            )}
          </div>
        </section>
      </div>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
    </>
  );
}
