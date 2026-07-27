"use client";

import type { BgmTrackScope } from "@/lib/types";
import { useBgmTrackAdmin } from "@/hooks/useBgmTrackAdmin";

/**
 * 카테고리 패널 · BGM 사이드바 목록입니다.
 */
export function BgmCategorySidebar() {
  const { bgmTracks, activeBgmTrackId, startNewBgmTrack, selectBgmTrack } = useBgmTrackAdmin();

  return (
    <div className="mt-5 border-t border-emerald-100/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-emerald-50">BGM 목록</h3>
        <button
          type="button"
          onClick={startNewBgmTrack}
          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
        >
          새 BGM
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {bgmTracks.map((track) => (
          <button
            key={track.id}
            type="button"
            onClick={() => {
              selectBgmTrack(track);
            }}
            className={`border p-3 text-left text-sm ${
              activeBgmTrackId === track.id
                ? "border-stone-400/35 bg-emerald-100/10"
                : "border-emerald-100/10 bg-black/30"
            }`}
          >
            <span className="block text-base font-semibold">{track.label}</span>
            <span className="mt-1 block text-xs text-emerald-100/50">
              {track.scope === "site" ? "사이트 기본" : "캐릭터 전용"}
            </span>
          </button>
        ))}
        {bgmTracks.length === 0 && (
          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
            아직 추가된 BGM이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 카테고리 패널 · BGM 트랙 편집기입니다.
 * page에서 props로 상태를 받지 않고 훅을 직접 호출합니다.
 */
export function BgmTrackEditor() {
  const {
    bgmTrackDraft,
    setBgmTrackDraft,
    bgmAudioFile,
    handleBgmAudioChange,
    isSaving,
    notice,
    saveBgmTrack,
    deleteBgmTrack,
  } = useBgmTrackAdmin();

  return (
    <>
      <form onSubmit={saveBgmTrack} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="board-title">BGM</h2>
            {bgmTrackDraft.id && bgmTrackDraft.url && (
              <button
                type="button"
                onClick={() =>
                  deleteBgmTrack({
                    id: bgmTrackDraft.id,
                    label: bgmTrackDraft.label,
                    url: bgmTrackDraft.url,
                    scope: bgmTrackDraft.scope,
                  })
                }
                disabled={isSaving}
                className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
              >
                현재 BGM 삭제
              </button>
            )}
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            곡 이름
            <input
              value={bgmTrackDraft.label}
              onChange={(event) =>
                setBgmTrackDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              placeholder="플레이어·선택 목록에 보일 이름"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            사용 범위
            <select
              value={bgmTrackDraft.scope}
              onChange={(event) =>
                setBgmTrackDraft((current) => ({
                  ...current,
                  scope: event.target.value as BgmTrackScope,
                }))
              }
              className="auth-input"
            >
              <option value="site">사이트 기본 (플레이어 순환 + 캐릭터 선택)</option>
              <option value="character-only">캐릭터 전용 (상세에서만)</option>
            </select>
          </label>
          <div className="grid gap-2 text-sm text-emerald-100/75">
            오디오 파일
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac"
              onChange={handleBgmAudioChange}
              className="text-xs"
            />
            <p className="text-xs text-emerald-100/55">mp3·ogg·wav 등, 파일 1개당 최대 15MB</p>
            {(bgmAudioFile || bgmTrackDraft.url) && (
              <audio
                controls
                preload="none"
                src={bgmAudioFile ? URL.createObjectURL(bgmAudioFile) : bgmTrackDraft.url}
                className="w-full"
              />
            )}
          </div>
        </section>
        <button
          disabled={isSaving}
          className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          BGM 저장
        </button>
      </form>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
    </>
  );
}
