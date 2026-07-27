"use client";

import { type ChangeEvent, type PointerEvent, type WheelEvent, useEffect, useState } from "react";
import { MAX_UPLOAD_SIZE } from "@/constants/upload";
import { extractCharacterPaletteFromImage } from "@/lib/character-palette";
import { computeThumbnailDragPosition, computeThumbnailZoomScale } from "@/lib/image-helpers";
import { uploadImageToR2 } from "@/lib/r2-upload-client";
import type { UploadedImage } from "@/lib/types";
import { formatBytes } from "@/utils/formatBytes";

/**
 * 관리자 이미지 업로드 대기열 항목입니다.
 */
export type PendingUpload = {
  displayName: string;
  id: string;
  file: File;
  previewUrl: string;
  thumbX: number;
  thumbY: number;
  thumbScale: number;
};

type ThumbnailDragState = {
  id: string;
  startPointerX: number;
  startPointerY: number;
  startThumbX: number;
  startThumbY: number;
};

type UseAdminUploadsOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  onPaletteExtracted?: (palette: string) => void;
};

/**
 * 관리자 이미지 선택·썸네일 조절·R2 업로드 상태를 묶습니다.
 * Firestore 반영은 persist 콜백으로 호출측에 맡깁니다.
 */
export const useAdminUploads = ({
  isAdmin,
  onNotice,
  onPaletteExtracted,
}: UseAdminUploadsOptions) => {
  const [worldWorkImageFiles, setWorldWorkImageFiles] = useState<File[]>([]);
  const [workImageFiles, setWorkImageFiles] = useState<File[]>([]);
  const [imageUploadCategory, setImageUploadCategory] = useState<"illustration" | "standing">(
    "illustration",
  );
  const [imageUploadWorldId, setImageUploadWorldId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [thumbnailDrag, setThumbnailDrag] = useState<ThumbnailDragState | null>(null);

  useEffect(() => {
    if (!thumbnailDrag) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [thumbnailDrag]);

  const clearPendingUploads = () => {
    setPendingUploads((current) => {
      current.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
      return [];
    });
  };

  const selectPendingImages = async (
    event: ChangeEvent<HTMLInputElement>,
    activeCharacterId: string,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !activeCharacterId) {
      if (!activeCharacterId) {
        onNotice("사진을 추가하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      }
      return;
    }

    if (!isAdmin) {
      onNotice("관리자만 사진을 선택할 수 있어요.");
      event.target.value = "";
      return;
    }

    const allowedFiles = files.filter((file) => file.size <= MAX_UPLOAD_SIZE);
    const blockedFiles = files.filter((file) => file.size > MAX_UPLOAD_SIZE);

    if (blockedFiles.length > 0) {
      onNotice(
        `${blockedFiles.map((file) => `${file.name} (${formatBytes(file.size)})`).join(", ")} 파일은 10MB를 넘어 제외했어요.`,
      );
    }

    if (!allowedFiles.length) {
      event.target.value = "";
      return;
    }

    const extractedPalette = await extractCharacterPaletteFromImage(allowedFiles[0]);
    if (extractedPalette) {
      onPaletteExtracted?.(extractedPalette);
    }

    setPendingUploads((current) => [
      ...current,
      ...allowedFiles.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        displayName: "",
        file,
        previewUrl: URL.createObjectURL(file),
        thumbX: 50,
        thumbY: 50,
        thumbScale: 1,
      })),
    ]);
    onNotice("썸네일 위치와 크기를 조절한 뒤 저장해주세요.");
    event.target.value = "";
  };

  const updatePendingUpload = (
    id: string,
    updates: Partial<Pick<PendingUpload, "displayName" | "thumbX" | "thumbY" | "thumbScale">>,
  ) => {
    setPendingUploads((current) =>
      current.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload)),
    );
  };

  const startThumbnailDrag = (upload: PendingUpload, event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setThumbnailDrag({
      id: upload.id,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startThumbX: upload.thumbX,
      startThumbY: upload.thumbY,
    });
  };

  const moveThumbnailDrag = (uploadId: string, event: PointerEvent<HTMLDivElement>) => {
    if (!thumbnailDrag || thumbnailDrag.id !== uploadId) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const next = computeThumbnailDragPosition(
      {
        thumbX: thumbnailDrag.startThumbX,
        thumbY: thumbnailDrag.startThumbY,
        pointerX: thumbnailDrag.startPointerX,
        pointerY: thumbnailDrag.startPointerY,
      },
      { x: event.clientX, y: event.clientY },
      { width: rect.width, height: rect.height },
    );

    updatePendingUpload(uploadId, next);
  };

  const stopThumbnailDrag = () => {
    setThumbnailDrag(null);
  };

  const zoomThumbnail = (upload: PendingUpload, event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updatePendingUpload(upload.id, {
      thumbScale: computeThumbnailZoomScale(upload.thumbScale, event.deltaY),
    });
  };

  const removePendingUpload = (id: string) => {
    setPendingUploads((current) => {
      const removed = current.find((upload) => upload.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((upload) => upload.id !== id);
    });
  };

  /**
   * 연성/로그 첨부용 이미지를 R2에 올리고 UploadedImage 배열을 반환합니다.
   */
  const uploadWorkImages = async (
    characterId: string,
    files: File[],
    worldId?: string,
  ): Promise<UploadedImage[]> => {
    if (!characterId || files.length === 0) return [];

    return Promise.all(
      files.map((file) =>
        uploadImageToR2(file, characterId, {
          worldId,
          category: "illustration",
        }),
      ),
    );
  };

  /**
   * 대기열 이미지를 R2에 올린 뒤 persist로 Firestore 반영을 맡깁니다.
   */
  const uploadPendingImages = async (
    characterId: string,
    persist: (uploaded: UploadedImage[], worldId: string) => Promise<void>,
  ) => {
    if (!characterId) {
      onNotice("사진을 저장하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      return;
    }

    if (!pendingUploads.length) {
      onNotice("먼저 사진을 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      const uploaded = await Promise.all(
        pendingUploads.map(async (upload) => {
          const image = await uploadImageToR2(upload.file, characterId, {
            displayName: upload.displayName.trim(),
            worldId: imageUploadWorldId || undefined,
            category: imageUploadCategory,
          });
          return {
            ...image,
            thumbX: upload.thumbX,
            thumbY: upload.thumbY,
            thumbScale: upload.thumbScale,
          };
        }),
      );

      await persist(uploaded, imageUploadWorldId);
      onNotice(
        imageUploadWorldId
          ? "세계관별 이미지를 저장했어요."
          : "이미지를 저장했어요. 본 페이지 카드와 상세에 반영됩니다.",
      );
      pendingUploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
      setPendingUploads([]);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "R2 업로드에 실패했어요.");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    worldWorkImageFiles,
    setWorldWorkImageFiles,
    workImageFiles,
    setWorkImageFiles,
    imageUploadCategory,
    setImageUploadCategory,
    imageUploadWorldId,
    setImageUploadWorldId,
    isUploading,
    pendingUploads,
    clearPendingUploads,
    selectPendingImages,
    updatePendingUpload,
    startThumbnailDrag,
    moveThumbnailDrag,
    stopThumbnailDrag,
    zoomThumbnail,
    removePendingUpload,
    uploadWorkImages,
    uploadPendingImages,
  };
};
