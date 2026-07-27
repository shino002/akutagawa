"use client";

import { ThumbnailImage } from "@/components/ThumbnailImage";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminUploads } from "@/hooks/useAdminUploads";
import { setExtractBannerAdminNotice, useExtractBannerAdmin } from "@/hooks/useExtractBannerAdmin";

/**
 * 카테고리 패널 · Banner 사이드바 목록입니다.
 */
export function ExtractCategorySidebar() {
  const { extractBanners, activeExtractBannerId, startNewExtractBanner, selectExtractBanner } =
    useExtractBannerAdmin();

  return (
    <div className="mt-5 border-t border-emerald-100/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-emerald-50">배너 목록</h3>
        <button
          type="button"
          onClick={startNewExtractBanner}
          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
        >
          새 배너
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {extractBanners.map((banner) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => {
              selectExtractBanner(banner);
            }}
            className={`border p-3 text-left text-sm ${
              activeExtractBannerId === banner.id
                ? "border-stone-400/35 bg-emerald-100/10"
                : "border-emerald-100/10 bg-black/30"
            }`}
          >
            <span className="block text-base font-semibold">{banner.label || "제목 없음"}</span>
            <span className="mt-1 block truncate text-xs text-emerald-100/50">
              {banner.linkUrl}
            </span>
          </button>
        ))}
        {extractBanners.length === 0 && (
          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
            아직 저장된 배너가 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 카테고리 패널 · Banner 편집기입니다.
 * 업로드는 useAdminUploads 를 직접 호출해 useExtractBannerAdmin 에 넘깁니다.
 */
export function ExtractBannerEditor() {
  const { isAdmin } = useAdminAuth();
  const { uploadSingleImage } = useAdminUploads({
    isAdmin,
    onNotice: setExtractBannerAdminNotice,
  });
  const {
    extractBannerDraft,
    setExtractBannerDraft,
    extractBannerImageFile,
    handleExtractBannerImageChange,
    isSaving,
    notice,
    saveExtractBanner,
    deleteExtractBanner,
  } = useExtractBannerAdmin({
    isAdmin,
    uploadSingleImage,
  });

  return (
    <>
      <form onSubmit={saveExtractBanner} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="board-title">Banner</h2>
            {extractBannerDraft.id && extractBannerDraft.image && (
              <button
                type="button"
                onClick={() =>
                  deleteExtractBanner({
                    id: extractBannerDraft.id,
                    label: extractBannerDraft.label,
                    linkUrl: extractBannerDraft.linkUrl,
                    image: extractBannerDraft.image!,
                  })
                }
                disabled={isSaving}
                className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
              >
                현재 배너 삭제
              </button>
            )}
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            배너 라벨 (선택)
            <input
              value={extractBannerDraft.label}
              onChange={(event) =>
                setExtractBannerDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              placeholder="배너에 표시할 짧은 문구"
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            이동 링크
            <input
              value={extractBannerDraft.linkUrl}
              onChange={(event) =>
                setExtractBannerDraft((current) => ({
                  ...current,
                  linkUrl: event.target.value,
                }))
              }
              placeholder="https://example.com 또는 /guest"
              className="auth-input"
            />
          </label>
          <div className="grid gap-2 text-sm text-emerald-100/75">
            배너 이미지
            <input
              type="file"
              accept="image/*"
              onChange={handleExtractBannerImageChange}
              className="text-xs"
            />
            {(extractBannerImageFile || extractBannerDraft.image) && (
              <div className="extract-banner-link overflow-hidden">
                {extractBannerDraft.image ? (
                  <ThumbnailImage
                    image={extractBannerDraft.image}
                    src={
                      extractBannerImageFile
                        ? URL.createObjectURL(extractBannerImageFile)
                        : extractBannerDraft.image.url
                    }
                    alt="Banner 미리보기"
                    className="extract-banner-image"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- Local preview URL for banner upload. */
                  <img
                    src={extractBannerImageFile ? URL.createObjectURL(extractBannerImageFile) : ""}
                    alt="Banner 미리보기"
                    className="extract-banner-image"
                  />
                )}
              </div>
            )}
          </div>
        </section>
        <button
          disabled={isSaving}
          className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          배너 저장
        </button>
      </form>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
    </>
  );
}
