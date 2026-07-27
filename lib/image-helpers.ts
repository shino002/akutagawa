export {
  thumbnailCropStyle,
  thumbnailObjectStyle,
  thumbnailStyle,
  type ThumbnailSource,
} from "@/components/ThumbnailImage";

/**
 * 값을 min~max 범위로 잘라냅니다.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/**
 * 파일명에서 확장자를 제거합니다.
 */
export const fileNameWithoutExtension = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, "");
};

type ThumbnailDragStart = {
  thumbX: number;
  thumbY: number;
  pointerX: number;
  pointerY: number;
};

/**
 * 썸네일 드래그 시작점과 현재 포인터·요소 크기로 다음 thumbX/thumbY(%)를 계산합니다.
 */
export const computeThumbnailDragPosition = (
  start: ThumbnailDragStart,
  pointer: { x: number; y: number },
  rect: { width: number; height: number },
): { thumbX: number; thumbY: number } => {
  const nextX = start.thumbX - ((pointer.x - start.pointerX) / rect.width) * 100;
  const nextY = start.thumbY - ((pointer.y - start.pointerY) / rect.height) * 100;
  return {
    thumbX: Math.round(clamp(nextX, 0, 100)),
    thumbY: Math.round(clamp(nextY, 0, 100)),
  };
};

/**
 * 휠 delta로 썸네일 배율(1~2.5)을 조정합니다.
 */
export const computeThumbnailZoomScale = (currentScale: number, deltaY: number): number => {
  const nextScale = currentScale + (deltaY < 0 ? 0.08 : -0.08);
  return Number(clamp(nextScale, 1, 2.5).toFixed(2));
};
