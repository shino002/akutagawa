"use client";

import { useEffect, useState } from "react";
import { clamp } from "@/lib/image-helpers";
import type { ExpressionModalItem, GalleryModalItem, ReaderModalItem } from "@/types/home.types";

/**
 * 공개 페이지에서 열리는 세 종류 모달(이미지 확대, 스탠딩 표정, 이북 리더)의 상태를 관리합니다.
 * 갤러리 모달이 열려 있는 동안 배경 페이지 스크롤을 잠그고, 휠 확대/축소 배율을 추적합니다.
 */
export const useHomeModals = () => {
  const [galleryModalItem, setGalleryModalItem] = useState<GalleryModalItem | null>(null);
  const [expressionModalItem, setExpressionModalItem] = useState<ExpressionModalItem | null>(null);
  const [readerModalItem, setReaderModalItem] = useState<ReaderModalItem | null>(null);
  const [galleryZoom, setGalleryZoom] = useState(1);

  useEffect(() => {
    if (!galleryModalItem) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryModalItem]);

  const openGalleryModal = (item: GalleryModalItem) => {
    setGalleryZoom(1);
    setGalleryModalItem(item);
  };

  const updateGalleryZoom = (nextZoom: number) => {
    setGalleryZoom(clamp(nextZoom, 0.5, 3));
  };

  return {
    galleryModalItem,
    setGalleryModalItem,
    expressionModalItem,
    setExpressionModalItem,
    readerModalItem,
    setReaderModalItem,
    galleryZoom,
    openGalleryModal,
    updateGalleryZoom,
  };
};
