"use client";

import { DocumentTextImport } from "@/components/admin/DocumentTextImport";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import { MAX_UPLOAD_SIZE } from "@/constants/upload";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { formatBytes } from "@/utils/formatBytes";

/**
 * 캐릭터 그림·글(연성) 관리 섹션입니다.
 */
export function CharacterImagesEditor() {
  const {
    activeCharacterId,
    activeCharacter,
    worlds,
    imageUploadWorldId,
    setImageUploadWorldId,
    imageUploadCategory,
    setImageUploadCategory,
    isUploading,
    selectPendingImages,
    pendingUploads,
    uploadImages,
    startThumbnailDrag,
    moveThumbnailDrag,
    stopThumbnailDrag,
    zoomThumbnail,
    updatePendingUpload,
    removePendingUpload,
    isSaving,
    updateImageInfo,
    deleteImage,
    addWork,
    workDraft,
    setWorkDraft,
    setNotice,
    workImageFiles,
    setWorkImageFiles,
    deleteWork,
  } = useCharactersAdmin();

  if (!activeCharacterId || !activeCharacter) {
    return (
      <section className="glass-card p-5">
        <h2 className="board-title">그림 관리</h2>
        <p className="mt-3 border border-amber-400/25 bg-amber-950/20 p-4 text-sm leading-7 text-amber-100/90">
          사진을 추가하려면 먼저 <span className="font-semibold">기본 · 레코드</span> 탭에서 이름을
          입력하고 <span className="font-semibold">「본 페이지에 저장」</span>을 눌러주세요. 저장된
          뒤 다시 그림 탭으로 오면 업로드할 수 있어요.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="glass-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="board-title">그림 관리</h2>
            <p className="mt-2 text-xs text-emerald-100/55">
              파일 1개당 최대 {formatBytes(MAX_UPLOAD_SIZE)}.
            </p>
          </div>
          <div className="grid gap-2 md:min-w-64">
            <select
              value={imageUploadWorldId}
              onChange={(event) => setImageUploadWorldId(event.target.value)}
              className="auth-input"
            >
              <option value="">기본 자료에 업로드</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title}
                </option>
              ))}
            </select>
            <select
              value={imageUploadCategory}
              onChange={(event) =>
                setImageUploadCategory(event.target.value as "illustration" | "standing")
              }
              className="auth-input"
            >
              <option value="illustration">일러스트 / 대표 썸네일</option>
              <option value="standing">스탠딩 / 표정 모음</option>
            </select>
            <label className="cursor-pointer bg-emerald-200 px-4 py-3 text-center text-sm font-semibold text-emerald-950">
              사진 선택
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                className="sr-only"
                onChange={(event) => {
                  void selectPendingImages(event, activeCharacterId);
                }}
              />
            </label>
          </div>
        </div>
        {pendingUploads.length > 0 && (
          <div className="mt-4 border border-emerald-100/10 bg-black/30 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-emerald-50">선택한 사진 썸네일 설정</h3>
                <p className="mt-1 text-xs text-emerald-100/55">
                  사진을 드래그해서 위치를 맞추고, 마우스 휠로 확대/축소할 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={uploadImages}
                disabled={isUploading}
                className="bg-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
              >
                {isUploading ? "업로드 중..." : "선택한 사진 저장"}
              </button>
            </div>
            <div className="mt-4 grid gap-4">
              {pendingUploads.map((upload) => (
                <article
                  key={upload.id}
                  className="grid gap-4 border border-emerald-100/10 bg-black/40 p-4"
                >
                  <div
                    className="aspect-[3/2] cursor-move touch-none overflow-hidden border border-stone-400/25 bg-black"
                    onPointerDown={(event) => startThumbnailDrag(upload, event)}
                    onPointerMove={(event) => moveThumbnailDrag(upload.id, event)}
                    onPointerUp={stopThumbnailDrag}
                    onPointerCancel={stopThumbnailDrag}
                    onWheel={(event) => zoomThumbnail(upload, event)}
                    title="드래그로 위치 조정, 휠로 확대/축소"
                  >
                    <ThumbnailImage
                      image={upload}
                      src={upload.previewUrl}
                      alt={upload.file.name}
                      className="opacity-90 select-none"
                      draggable={false}
                    />
                  </div>
                  <div className="grid content-start gap-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <label className="grid gap-2 text-sm font-semibold text-emerald-100/80">
                        사이트에 표시할 이름
                        <input
                          value={upload.displayName}
                          onChange={(event) =>
                            updatePendingUpload(upload.id, {
                              displayName: event.target.value,
                            })
                          }
                          placeholder="예: 신 정장 전신"
                          className="auth-input"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removePendingUpload(upload.id)}
                        className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200"
                      >
                        선택 취소
                      </button>
                    </div>
                    <label className="grid gap-2 text-xs text-emerald-100/70">
                      크기 {Math.round(upload.thumbScale * 100)}%
                      <input
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.05"
                        value={upload.thumbScale}
                        onChange={(event) =>
                          updatePendingUpload(upload.id, {
                            thumbScale: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-emerald-100/70">
                      가로 위치 {upload.thumbX}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={upload.thumbX}
                        onChange={(event) =>
                          updatePendingUpload(upload.id, {
                            thumbX: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-emerald-100/70">
                      세로 위치 {upload.thumbY}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={upload.thumbY}
                        onChange={(event) =>
                          updatePendingUpload(upload.id, {
                            thumbY: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(activeCharacter.images ?? []).map((image) => (
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
                    updateImageInfo(image.id, {
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
                  onClick={() => deleteImage(image.id)}
                  disabled={isSaving}
                  className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                >
                  기록 삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="board-title">글 관리</h2>
        <form onSubmit={addWork} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={workDraft.title}
              onChange={(event) =>
                setWorkDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="제목"
              className="auth-input"
            />
            <input
              value={workDraft.kind}
              onChange={(event) =>
                setWorkDraft((current) => ({
                  ...current,
                  kind: event.target.value,
                }))
              }
              placeholder="종류"
              className="auth-input"
            />
            <input
              value={workDraft.date}
              onChange={(event) =>
                setWorkDraft((current) => ({
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
              setWorkDraft((current) => ({
                ...current,
                title: current.title.trim() || suggestedTitle,
                body: text,
              }));
            }}
          />
          <textarea
            value={workDraft.body}
            onChange={(event) =>
              setWorkDraft((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="글/연성 내용"
            className="auth-input min-h-28"
          />
          <label className="grid gap-2 text-sm text-emerald-100/75">
            글 첨부 사진
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setWorkImageFiles(Array.from(event.target.files ?? []))}
              className="auth-input"
            />
            {workImageFiles.length > 0 && (
              <span className="text-xs text-emerald-100/50">
                선택된 사진 {workImageFiles.length}장
              </span>
            )}
          </label>
          <button
            disabled={isSaving}
            className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
          >
            글 추가
          </button>
        </form>
        <div className="mt-4 grid gap-3">
          {activeCharacter.works.map((work, index) => (
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
                  onClick={() => deleteWork(index)}
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
    </section>
  );
}
