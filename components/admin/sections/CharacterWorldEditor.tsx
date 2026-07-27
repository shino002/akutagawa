"use client";

import { DocumentTextImport } from "@/components/admin/DocumentTextImport";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";

/**
 * 캐릭터 세계관별 자료 섹션입니다.
 */
export function CharacterWorldEditor() {
  const {
    activeCharacter,
    activeCharacterWorldId,
    worlds,
    selectCharacterWorld,
    activeCharacterWorldEntry,
    isSaving,
    deleteCharacterWorldEntry,
    worldSettingsText,
    setWorldSettingsText,
    saveCharacterWorldSettings,
    updateWorldImageInfo,
    deleteWorldImage,
    addWorldWork,
    worldWorkDraft,
    setWorldWorkDraft,
    setNotice,
    worldWorkImageFiles,
    setWorldWorkImageFiles,
    deleteWorldWork,
  } = useCharactersAdmin();

  if (!activeCharacter) {
    return null;
  }

  return (
    <section className="glass-card grid gap-4 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="board-title">세계관별 자료</h2>
          <p className="mt-2 text-xs text-emerald-100/55">
            World마다 설정, 그림, 로그를 따로 정리합니다.
          </p>
        </div>
        <select
          value={activeCharacterWorldId}
          onChange={(event) => selectCharacterWorld(event.target.value)}
          className="auth-input md:max-w-xs"
        >
          <option value="">세계관 선택</option>
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.title}
            </option>
          ))}
        </select>
      </div>

      {activeCharacterWorldId ? (
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 border border-stone-400/15 bg-stone-900/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-50">참가 기록 관리</h3>
              <p className="mt-1 text-xs text-emerald-100/55">
                이 자캐를 선택한 세계관에서 제거합니다. 세계관 전용 그림도 R2와 Firestore에서 함께
                삭제돼요.
              </p>
            </div>
            <button
              type="button"
              onClick={deleteCharacterWorldEntry}
              disabled={isSaving || !activeCharacterWorldEntry}
              className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
            >
              참가 자캐 삭제
            </button>
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            세계관별 설정
            <textarea
              value={worldSettingsText}
              onChange={(event) => setWorldSettingsText(event.target.value)}
              placeholder="한 줄에 하나씩 입력"
              className="auth-input min-h-32"
            />
          </label>
          <button
            type="button"
            onClick={saveCharacterWorldSettings}
            disabled={isSaving}
            className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
          >
            세계관 설정 저장
          </button>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(activeCharacterWorldEntry?.images ?? []).map((image) => (
              <article key={image.id} className="gallery-tile">
                <div className="aspect-[3/2] overflow-hidden">
                  <ThumbnailImage
                    image={image}
                    src={image.url}
                    alt={image.name}
                    className="opacity-90"
                  />
                </div>
                <div className="p-3 text-sm">
                  <form
                    className="grid gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      updateWorldImageInfo(image.id, {
                        name: String(formData.get("name") ?? image.name).trim() || image.name,
                        category: String(formData.get("category")) as "illustration" | "standing",
                      });
                    }}
                  >
                    <input
                      name="name"
                      defaultValue={image.name}
                      className="auth-input text-xs"
                      placeholder="그림 이름"
                    />
                    <select
                      name="category"
                      defaultValue={image.category ?? "illustration"}
                      className="auth-input text-xs"
                    >
                      <option value="illustration">일러스트 / 대표 썸네일</option>
                      <option value="standing">스탠딩 / 표정 모음</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60"
                    >
                      정보 저장
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => deleteWorldImage(image.id)}
                    disabled={isSaving}
                    className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                  >
                    기록 삭제
                  </button>
                </div>
              </article>
            ))}
            {(activeCharacterWorldEntry?.images ?? []).length === 0 && (
              <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
                이 세계관에 등록된 그림이 없어요. 그림 관리에서 업로드 대상을 이 세계관으로
                선택해주세요.
              </p>
            )}
          </div>

          <form
            onSubmit={addWorldWork}
            className="grid gap-3 border border-emerald-100/10 bg-black/30 p-4"
          >
            <h3 className="text-sm font-semibold text-emerald-50">세계관 연성/로그 추가</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={worldWorkDraft.title}
                onChange={(event) =>
                  setWorldWorkDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="제목"
                className="auth-input"
              />
              <input
                value={worldWorkDraft.kind}
                onChange={(event) =>
                  setWorldWorkDraft((current) => ({
                    ...current,
                    kind: event.target.value,
                  }))
                }
                placeholder="종류"
                className="auth-input"
              />
              <input
                value={worldWorkDraft.date}
                onChange={(event) =>
                  setWorldWorkDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                placeholder="날짜"
                className="auth-input"
              />
            </div>
            <DocumentTextImport
              disabled={isSaving}
              onNotice={setNotice}
              onImported={({ text, suggestedTitle }) => {
                setWorldWorkDraft((current) => ({
                  ...current,
                  title: current.title.trim() || suggestedTitle,
                  body: text,
                }));
              }}
            />
            <textarea
              value={worldWorkDraft.body}
              onChange={(event) =>
                setWorldWorkDraft((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              placeholder="세계관 연성/로그 내용"
              className="auth-input min-h-28"
            />
            <label className="grid gap-2 text-sm text-emerald-100/75">
              세계관 연성 첨부 사진
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setWorldWorkImageFiles(Array.from(event.target.files ?? []))}
                className="auth-input"
              />
              {worldWorkImageFiles.length > 0 && (
                <span className="text-xs text-emerald-100/50">
                  선택된 사진 {worldWorkImageFiles.length}장
                </span>
              )}
            </label>
            <button
              disabled={isSaving}
              className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
            >
              세계관 연성/로그 추가
            </button>
          </form>

          <div className="grid gap-3">
            {(activeCharacterWorldEntry?.works ?? []).map((work, index) => (
              <article
                key={`${work.title}-${work.date}-${index}`}
                className="border border-emerald-100/10 bg-black/30 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-emerald-100/45">
                      {work.kind} / {work.date}
                    </p>
                    <h3 className="mt-1 font-semibold">{work.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWorldWork(index)}
                    disabled={isSaving}
                    className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                  >
                    삭제
                  </button>
                </div>
                {(work.images?.length ?? 0) > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {work.images?.map((image) => (
                      <div
                        key={image.id}
                        className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                      >
                        <ThumbnailImage image={image} src={image.url} alt={image.name} />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
          먼저 세계관을 선택해주세요.
        </p>
      )}
    </section>
  );
}
