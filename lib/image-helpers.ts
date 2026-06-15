import type { UploadedImage } from "./types";

export function thumbnailStyle(image: Pick<UploadedImage, "thumbX" | "thumbY" | "thumbScale">) {
  const x = image.thumbX ?? 50;
  const y = image.thumbY ?? 50;
  const scale = image.thumbScale ?? 1;

  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${scale})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}
