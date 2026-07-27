"use client";

import { useDiaryAdmin } from "@/hooks/useDiaryAdmin";

/**
 * 카테고리 패널 · 다이어리 사이드바 목록입니다.
 */
export function DiaryCategorySidebar() {
  const { diaryEntries, activeDiaryId, startNewDiaryEntry, selectDiaryEntry } = useDiaryAdmin();

  return (
    <div className="mt-5 border-t border-emerald-100/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-emerald-50">일기 목록</h3>
        <button
          type="button"
          onClick={startNewDiaryEntry}
          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
        >
          새 일기
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {diaryEntries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              selectDiaryEntry(entry);
            }}
            className={`border p-3 text-left text-sm ${
              activeDiaryId === entry.id
                ? "border-stone-400/35 bg-emerald-100/10"
                : "border-emerald-100/10 bg-black/30"
            }`}
          >
            <span className="block text-base font-semibold">{entry.title}</span>
            <span className="mt-1 block text-xs text-emerald-100/50">
              {entry.date || "no date"}
            </span>
          </button>
        ))}
        {diaryEntries.length === 0 && (
          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
            아직 저장된 일기가 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 카테고리 패널 · 다이어리 편집기입니다.
 * page에서 props로 상태를 받지 않고 훅을 직접 호출합니다.
 */
export function DiaryEditor() {
  const { diaryDraft, setDiaryDraft, isSaving, notice, saveDiaryEntry, deleteDiaryEntry } =
    useDiaryAdmin();

  return (
    <>
      <form onSubmit={saveDiaryEntry} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="board-title">다이어리</h2>
            {diaryDraft.id && (
              <button
                type="button"
                onClick={() => deleteDiaryEntry(diaryDraft)}
                disabled={isSaving}
                className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
              >
                현재 일기 삭제
              </button>
            )}
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            일기 제목
            <input
              value={diaryDraft.title}
              onChange={(event) =>
                setDiaryDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="다이어리 제목"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            날짜
            <input
              value={diaryDraft.date}
              onChange={(event) =>
                setDiaryDraft((current) => ({ ...current, date: event.target.value }))
              }
              placeholder="2026-06-15"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            일기 내용
            <textarea
              value={diaryDraft.body}
              onChange={(event) =>
                setDiaryDraft((current) => ({ ...current, body: event.target.value }))
              }
              placeholder="오늘의 기록을 적어주세요."
              className="auth-input min-h-56"
            />
          </label>
        </section>
        <button
          disabled={isSaving}
          className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          일기 저장
        </button>
      </form>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
    </>
  );
}
