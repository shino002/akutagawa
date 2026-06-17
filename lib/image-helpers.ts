export {
  thumbnailCropStyle,
  thumbnailObjectStyle,
  thumbnailStyle,
  type ThumbnailSource,
} from "@/components/ThumbnailImage";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}
