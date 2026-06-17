import {
  CHARACTER_BGM_OPTIONS,
  CHARACTER_ONLY_BGM_OPTIONS,
  isCharacterBgmUrl,
  SITE_BGM_OPTIONS,
  SITE_BGM_PLAYLIST,
} from "@/lib/bgm-playlist";
import type { BgmTrack, BgmTrackScope } from "@/lib/types";

export type BgmOption = {
  label: string;
  url: string;
  scope: BgmTrackScope;
  source: "builtin" | "custom";
};

const AUDIO_URL_PATTERN = /\.(mp3|mpeg|ogg|wav|m4a|aac)(\?.*)?$/i;

let dynamicAllowedUrls = new Set<string>();

export function setDynamicBgmUrls(urls: Iterable<string>) {
  dynamicAllowedUrls = new Set(urls);
}

function normalizeScope(raw: unknown): BgmTrackScope {
  return raw === "character-only" ? "character-only" : "site";
}

export function normalizeBgmTrack(raw: unknown): BgmTrack | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<BgmTrack>;
  const url = typeof source.url === "string" ? source.url.trim() : "";
  const label = typeof source.label === "string" ? source.label.trim() : "";

  if (!url || !label || !isTrustedBgmUrl(url)) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id ? source.id : url,
    label,
    url,
    scope: normalizeScope(source.scope),
  };
}

export function normalizeBgmTracks(raw: unknown): BgmTrack[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => normalizeBgmTrack(entry))
    .filter((entry): entry is BgmTrack => entry !== null);
}

export function isTrustedBgmUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  if (isCharacterBgmUrl(trimmed)) {
    return true;
  }

  if (trimmed.startsWith("/audio/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return AUDIO_URL_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function resolveCharacterBgmUrl(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  if (isCharacterBgmUrl(trimmed) || dynamicAllowedUrls.has(trimmed)) {
    return trimmed;
  }

  return isTrustedBgmUrl(trimmed) ? trimmed : null;
}

function customTrackToOption(track: BgmTrack): BgmOption {
  return {
    label: track.label,
    url: track.url,
    scope: track.scope,
    source: "custom",
  };
}

function builtinSiteOptions(): BgmOption[] {
  return SITE_BGM_OPTIONS.map((option) => ({
    ...option,
    scope: "site" as const,
    source: "builtin" as const,
  }));
}

function builtinCharacterOnlyOptions(): BgmOption[] {
  return CHARACTER_ONLY_BGM_OPTIONS.map((option) => ({
    ...option,
    scope: "character-only" as const,
    source: "builtin" as const,
  }));
}

export function getMergedCharacterBgmOptions(customTracks: BgmTrack[] = []): BgmOption[] {
  const customByUrl = new Map(customTracks.map((track) => [track.url, customTrackToOption(track)]));
  const merged = [...builtinSiteOptions(), ...builtinCharacterOnlyOptions()];

  for (const option of customByUrl.values()) {
    if (!merged.some((entry) => entry.url === option.url)) {
      merged.push(option);
    }
  }

  return merged;
}

export function getMergedSiteBgmPlaylist(customTracks: BgmTrack[] = []) {
  const customSiteUrls = customTracks
    .filter((track) => track.scope === "site")
    .map((track) => track.url);
  const merged: string[] = [...SITE_BGM_PLAYLIST];

  for (const url of customSiteUrls) {
    if (!merged.includes(url)) {
      merged.push(url);
    }
  }

  return merged;
}

export function getAllowedBgmUrls(customTracks: BgmTrack[] = []) {
  return new Set([
    ...CHARACTER_BGM_OPTIONS.map((option) => option.url),
    ...customTracks.map((track) => track.url),
  ]);
}
