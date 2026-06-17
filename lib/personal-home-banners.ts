import type { PersonalHomeBanner, UploadedImage } from "@/lib/types";

function normalizeUploadedImage(raw: unknown): UploadedImage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<UploadedImage>;
  if (typeof source.url !== "string" || !source.url.trim()) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id ? source.id : source.url,
    name: typeof source.name === "string" ? source.name : "",
    url: source.url.trim(),
    size: typeof source.size === "number" ? source.size : 0,
    ...(typeof source.thumbX === "number" ? { thumbX: source.thumbX } : {}),
    ...(typeof source.thumbY === "number" ? { thumbY: source.thumbY } : {}),
    ...(typeof source.thumbScale === "number" ? { thumbScale: source.thumbScale } : {}),
  };
}

export function isAllowedBannerLinkUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizePersonalHomeBanner(raw: unknown): PersonalHomeBanner | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<PersonalHomeBanner>;
  const image = normalizeUploadedImage(source.image);
  const linkUrl = typeof source.linkUrl === "string" ? source.linkUrl.trim() : "";

  if (!image || !isAllowedBannerLinkUrl(linkUrl)) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id ? source.id : image.id,
    label: typeof source.label === "string" ? source.label.trim() : "",
    linkUrl,
    image,
  };
}

export function normalizePersonalHomeBanners(raw: unknown): PersonalHomeBanner[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => normalizePersonalHomeBanner(entry))
    .filter((entry): entry is PersonalHomeBanner => entry !== null);
}
