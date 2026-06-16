"use client";

import { cn } from "@/utils/cn";
import { thumbnailStyle } from "@/lib/image-helpers";
import type { ExpressionModalItem, GalleryModalItem } from "@/types/home.types";

interface ExpressionModalProps {
  item: ExpressionModalItem;
  onClose: () => void;
  onOpenGallery: (item: GalleryModalItem) => void;
  className?: string;
}

export function ExpressionModal({ item, onClose, onOpenGallery, className }: ExpressionModalProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-sm",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.character.name} 스탠딩 표정 보기`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-red-600/45 bg-[#070000] shadow-2xl shadow-black"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-red-600/20 p-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-red-200/70 uppercase">
              {item.character.name}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-emerald-50">스탠딩 표정 모음</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-emerald-100/20 px-3 py-2 text-sm text-emerald-50"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {item.images.map((image) => (
              <article key={image.id} className="gallery-tile">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGallery({ image, character: item.character });
                  }}
                  className="block w-full text-left"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                    <img
                      src={image.url}
                      alt="스탠딩 이미지"
                      className="h-full w-full object-cover"
                      style={thumbnailStyle(image)}
                    />
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
