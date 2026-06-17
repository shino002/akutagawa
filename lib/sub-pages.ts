import type { Character, CharacterSubPage } from "@/lib/types";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import { createDefaultProfileFields, normalizeProfileFields } from "@/lib/profile-fields";
import { normalizeSettingSections } from "@/lib/setting-sections";
import { normalizeWorks } from "@/utils/normalizers";

export function createSubPageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `subpage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankSubPage(title = ""): CharacterSubPage {
  return {
    id: createSubPageId(),
    displayId: "",
    title,
    kanjiName: "",
    subtitle: "",
    quote: "",
    palette: "from-zinc-950 via-black to-zinc-900",
    profileFields: createDefaultProfileFields(),
    settingSections: [],
    relationships: [],
    images: [],
    works: [],
    textGlitch: {},
  };
}

export function normalizeSubPages(raw: unknown): CharacterSubPage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const source = entry as Partial<CharacterSubPage> & {
        profile?: { age?: string; height?: string; role?: string; keyword?: string };
      };
      if (typeof source.id !== "string" || !source.id.trim()) {
        return null;
      }

      const legacyProfile = source.profile;
      const next: CharacterSubPage = {
        id: source.id.trim(),
        displayId: typeof source.displayId === "string" ? source.displayId.trim() : "",
        title: typeof source.title === "string" ? source.title : "",
        kanjiName: typeof source.kanjiName === "string" ? source.kanjiName.trim() : "",
        subtitle: typeof source.subtitle === "string" ? source.subtitle : "",
        quote: typeof source.quote === "string" ? source.quote : "",
        palette:
          typeof source.palette === "string" && source.palette.trim()
            ? source.palette.trim()
            : "from-zinc-950 via-black to-zinc-900",
        profileFields: normalizeProfileFields(source.profileFields, legacyProfile, {
          useDefaultsWhenEmpty: false,
        }),
        settingSections: normalizeSettingSections(
          Array.isArray(source.settingSections) ? source.settingSections : undefined,
        ),
        relationships: Array.isArray(source.relationships)
          ? source.relationships.filter((line): line is string => typeof line === "string")
          : [],
        images: Array.isArray(source.images) ? source.images : [],
        works: normalizeWorks(source.works),
        textGlitch: normalizeTextGlitch(source.textGlitch),
      };

      return next;
    })
    .filter((entry): entry is CharacterSubPage => entry !== null);
}

export function findSubPage(character: Character, subPageId: string) {
  return normalizeSubPages(character.subPages).find((subPage) => subPage.id === subPageId);
}

export function subPageToDisplayCharacter(parent: Character, subPage: CharacterSubPage): Character {
  const displayId = subPage.displayId?.trim();
  return {
    id: displayId || `${parent.id}--${subPage.id}`,
    kind: parent.kind,
    name: subPage.title || displayId || subPage.id,
    kanjiName: subPage.kanjiName?.trim() || undefined,
    subtitle: subPage.subtitle,
    quote: subPage.quote,
    palette: subPage.palette || parent.palette,
    profileFields: subPage.profileFields,
    settings: [],
    settingSections: normalizeSettingSections(subPage.settingSections),
    relationships: subPage.relationships ?? [],
    images: subPage.images ?? [],
    works: subPage.works ?? [],
    worldEntries: [],
    textGlitch: subPage.textGlitch,
    bgmUrl: subPage.bgmUrl,
  };
}

export function upsertSubPage(subPages: CharacterSubPage[], nextSubPage: CharacterSubPage) {
  const normalized = normalizeSubPages(subPages);
  const index = normalized.findIndex((subPage) => subPage.id === nextSubPage.id);

  if (index === -1) {
    return [...normalized, nextSubPage];
  }

  return normalized.map((subPage, subPageIndex) =>
    subPageIndex === index ? nextSubPage : subPage,
  );
}

export function removeSubPage(subPages: CharacterSubPage[], subPageId: string) {
  return normalizeSubPages(subPages).filter((subPage) => subPage.id !== subPageId);
}
