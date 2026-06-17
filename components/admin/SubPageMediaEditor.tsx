"use client";

import { useState } from "react";
import type { UploadedImage, Work } from "@/lib/types";
import { thumbnailStyle } from "@/lib/image-helpers";
import {
  MAX_UPLOAD_SIZE,
  deleteR2Images,
  subPageUploadCharacterId,
  uploadImageToR2,
} from "@/lib/r2-upload-client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SubPageMediaEditorProps {
  parentCharacterId: string;
  subPageId: string;
  images: UploadedImage[];
  works: Work[];
  onImagesChange: (images: UploadedImage[]) => void;
  onWorksChange: (works: Work[]) => void;
  onNotice?: (message: string) => void;
}

export function SubPageMediaEditor({
  parentCharacterId,
  subPageId,
  images,
  works,
  onImagesChange,
  onWorksChange,
  onNotice,
}: SubPageMediaEditorProps) {
  const [imageCategory, setImageCategory] = useState<"illustration" | "standing">("illustration");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [workDraft, setWorkDraft] = useState({ title: "", kind: "새 연성", date: "", body: "" });
  const [workImageFiles, setWorkImageFiles] = useState<File[]>([]);

  const uploadCharacterId = subPageUploadCharacterId(parentCharacterId, subPageId);

  async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    try {
      setIsUploading(true);
      const uploaded = await Promise.all(
        files.map((file) =>
          uploadImageToR2(file, uploadCharacterId, { category: imageCategory }),
        ),
      );
      onImagesChange([...images, ...uploaded]);
      onNotice?.("하위 페이지 그림을 추가했어요. 「본 페이지에 저장」을 눌러 반영해주세요.");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "그림 업로드에 실패했어요.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteImage(imageId: string) {
    const targetImage = images.find((image) => image.id === imageId);
    if (!targetImage) return;

    try {
      setIsDeleting(true);
      await deleteR2Images([targetImage]);
      onImagesChange(images.filter((image) => image.id !== imageId));
      onNotice?.("하위 페이지 그림을 삭제했어요.");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "그림 삭제에 실패했어요.");
    } finally {
      setIsDeleting(false);
    }
  }

  function updateImageInfo(imageId: string, patch: Partial<UploadedImage>) {
    onImagesChange(
      images.map((image) => (image.id === imageId ? { ...image, ...patch } : image)),
    );
    onNotice?.("그림 정보를 수정했어요. 저장 버튼을 눌러 반영해주세요.");
  }

  async function addWork() {
    if (!workDraft.title.trim() || !workDraft.body.trim()) {
      onNotice?.("글 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      const uploadedImages = await Promise.all(
        workImageFiles.map((file) => uploadImageToR2(file, uploadCharacterId)),
      );
      const newWork: Work = {
        title: workDraft.title.trim(),
        kind: workDraft.kind.trim() || "연성",
        date: workDraft.date.trim() || "today",
        body: workDraft.body.trim(),
        images: uploadedImages,
      };
      onWorksChange([newWork, ...works]);
      setWorkDraft({ title: "", kind: "새 연성", date: "", body: "" });
      setWorkImageFiles([]);
      onNotice?.("하위 페이지 글을 추가했어요. 「본 페이지에 저장」을 눌러 반영해주세요.");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "글 추가에 실패했어요.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteWork(workIndex: number) {
    const targetWork = works[workIndex];
    if (!targetWork) return;

    try {
      setIsDeleting(true);
      await deleteR2Images(targetWork.images ?? []);
      onWorksChange(works.filter((_, index) => index !== workIndex));
      onNotice?.("하위 페이지 글을 삭제했어요.");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "글 삭제에 실패했어요.");
    } finally {
      setIsDeleting(false);
    }
  }

  const busy = isUploading || isDeleting;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 border border-emerald-100/10 bg-black/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-emerald-50">하위 페이지 그림</h3>
            <p className="mt-1 text-xs text-emerald-100/55">
              Visual 탭에 표시됩니다. 파일 1개당 최대 {formatBytes(MAX_UPLOAD_SIZE)}.
            </p>
          </div>
          <div className="grid gap-2 md:min-w-56">
            <select
              value={imageCategory}
              onChange={(event) =>
                setImageCategory(event.target.value as "illustration" | "standing")
              }
              className="auth-input text-xs"
            >
              <option value="illustration">일러스트 / 대표 썸네일</option>
              <option value="standing">스탠딩 / 표정 모음</option>
            </select>
            <label className="cursor-pointer bg-emerald-200 px-4 py-2 text-center text-sm font-semibold text-emerald-950 disabled:opacity-60">
              {isUploading ? "업로드 중..." : "사진 추가"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy}
                className="sr-only"
                onChange={handleImageSelect}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <article key={image.id} className="gallery-tile">
              <div className="aspect-[3/2] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                <img
                  src={image.url}
                  alt={image.name}
                  className="h-full w-full object-cover opacity-90"
                  style={thumbnailStyle(image)}
                />
              </div>
              <div className="p-3 text-sm">
                <div
                  data-image-edit
                  className="grid gap-2"
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
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      const container = event.currentTarget.closest("[data-image-edit]");
                      if (!container) {
                        return;
                      }

                      const nameInput = container.querySelector<HTMLInputElement>('input[name="name"]');
                      const categorySelect =
                        container.querySelector<HTMLSelectElement>('select[name="category"]');
                      updateImageInfo(image.id, {
                        name: nameInput?.value.trim() || image.name,
                        category: (categorySelect?.value as "illustration" | "standing") ?? "illustration",
                      });
                    }}
                    className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60"
                  >
                    정보 저장
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => deleteImage(image.id)}
                  disabled={busy}
                  className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
          {images.length === 0 && (
            <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60 sm:col-span-2 xl:col-span-3">
              아직 등록된 그림이 없어요.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 border border-emerald-100/10 bg-black/30 p-4">
        <h3 className="text-sm font-semibold text-emerald-50">하위 페이지 글 / 연성</h3>
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={workDraft.title}
              onChange={(event) =>
                setWorkDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="제목"
              className="auth-input"
            />
            <input
              value={workDraft.kind}
              onChange={(event) =>
                setWorkDraft((current) => ({ ...current, kind: event.target.value }))
              }
              placeholder="종류"
              className="auth-input"
            />
            <input
              value={workDraft.date}
              onChange={(event) =>
                setWorkDraft((current) => ({ ...current, date: event.target.value }))
              }
              placeholder="날짜"
              className="auth-input"
            />
          </div>
          <textarea
            value={workDraft.body}
            onChange={(event) =>
              setWorkDraft((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="글/연성 내용"
            className="auth-input min-h-28"
          />
          <label className="grid gap-2 text-sm text-emerald-100/75">
            첨부 사진
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
            type="button"
            onClick={() => void addWork()}
            disabled={busy}
            className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
          >
            글 추가
          </button>
        </div>

        <div className="grid gap-3">
          {works.map((work, index) => (
            <article
              key={`${work.title}-${work.date}-${index}`}
              className="border border-emerald-100/10 bg-black/35 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-emerald-100/45">
                    {work.kind} / {work.date}
                  </p>
                  <h4 className="mt-1 font-semibold">{work.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => deleteWork(index)}
                  disabled={busy}
                  className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
              {(work.images?.length ?? 0) > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {work.images?.map((image) => (
                    <div key={image.id} className="aspect-square overflow-hidden border border-emerald-100/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
          {works.length === 0 && (
            <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
              아직 등록된 글이 없어요.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
