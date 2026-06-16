"use client";

import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import type { GalleryModalItem, ReaderModalItem } from "@/types/home.types";

interface ReaderModalProps {
  item: ReaderModalItem;
  onClose: () => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  className?: string;
}

export function ReaderModal({ item, onClose, onOpenGallery, className }: ReaderModalProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-sm",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.work.title} 이북 보기`}
      onClick={onClose}
    >
      <div
        className="dossier-viewer flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-400/15 p-4">
          <div>
            <p className="archive-kicker">
              Ebook Reader / {item.character.name}
            </p>
            <h3 className="archive-title mt-1 text-2xl">{item.work.title}</h3>
            <p className="mt-1 text-xs text-emerald-100/45">
              {item.work.kind} / {item.work.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="archive-submit-button px-3 py-2 text-sm"
          >
            닫기
          </button>
        </div>

        <article className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,24,0.06),transparent_34%),#030000]">
          <div className="px-7 py-8 md:px-12 md:py-10">
            {(item.work.images?.length ?? 0) > 0 && (
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {item.work.images?.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => onOpenGallery({ image, character: item.character })}
                    className="gallery-tile group block text-left"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                      <img
                        src={image.url}
                        alt="첨부 이미지"
                        className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                        style={thumbnailStyle(image)}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[0.95rem] leading-9 whitespace-pre-line text-emerald-50/86">
              {item.work.body || "내용이 없어요."}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
