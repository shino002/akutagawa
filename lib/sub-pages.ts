import { DEFAULT_CHARACTER_PALETTE } from "@/lib/character-palette";
import type { Character, CharacterSubPage, SubPageSourceRef } from "@/lib/types";
import { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import {
  createDefaultProfileFieldsForSubPage,
  formatSubPageEntryTitle,
  normalizeSubPageEntryLabel,
} from "@/lib/sub-page-kind";
import { normalizeCaseFileDetailTheme } from "@/lib/case-file-theme";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import { normalizeProfileFields } from "@/lib/profile-fields";
import { normalizeSettingSections } from "@/lib/setting-sections";
import {
  normalizeRelationshipEntries,
  relationshipEntriesToLegacyLines,
} from "@/lib/relationship-entries";
import { normalizeWorks } from "@/utils/normalizers";
import { normalizeMetaFields, resolveMetaFields, migrateLegacyMetaFieldGlitch } from "@/lib/meta-fields";

export type SharedSubPageCatalogItem = {
  characterId: string;
  characterName: string;
  subPageId: string;
  title: string;
};

export type NavigableSubPageOption = {
  id: string;
  title: string;
  kind: "owned" | "imported" | "shared";
  entryLabel: string;
};

function normalizeSubPageSourceRef(raw: unknown): SubPageSourceRef | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const source = raw as Partial<SubPageSourceRef>;
  const characterId = typeof source.characterId === "string" ? source.characterId.trim() : "";
  const subPageId = typeof source.subPageId === "string" ? source.subPageId.trim() : "";

  if (!characterId || !subPageId) {
    return undefined;
  }

  return { characterId, subPageId };
}

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
    entryKind: "",
    title,
    kanjiName: "",
    subtitle: "",
    quote: "",
    metaFields: [],
    palette: DEFAULT_CHARACTER_PALETTE,
    profileFields: createDefaultProfileFieldsForSubPage(),
    settingSections: [],
    relationships: [],
    relationshipEntries: [],
    images: [],
    works: [],
    textGlitch: {},
    isShared: false,
  };
}

export function createSharedSubPageRef(source: SubPageSourceRef): CharacterSubPage {
  return {
    id: createSubPageId(),
    sharedFrom: source,
    displayId: "",
    title: "",
    kanjiName: "",
    subtitle: "",
    quote: "",
    metaFields: [],
    palette: DEFAULT_CHARACTER_PALETTE,
    profileFields: [],
    settingSections: [],
    relationships: [],
    relationshipEntries: [],
    images: [],
    works: [],
    textGlitch: {},
  };
}

export function isSubPageReference(subPage: CharacterSubPage) {
  return Boolean(subPage.sharedFrom?.characterId && subPage.sharedFrom?.subPageId);
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

      const sharedFrom = normalizeSubPageSourceRef(source.sharedFrom);
      if (sharedFrom) {
        return {
          id: source.id.trim(),
          sharedFrom,
          displayId: typeof source.displayId === "string" ? source.displayId.trim() : "",
          title: "",
          kanjiName: "",
          subtitle: "",
          quote: "",
          palette: DEFAULT_CHARACTER_PALETTE,
          profileFields: [],
          settingSections: [],
          relationships: [],
          relationshipEntries: [],
          images: [],
          works: [],
          textGlitch: {},
        } satisfies CharacterSubPage;
      }

      const legacyProfile = source.profile;
      const metaFields = resolveMetaFields(source);
      const resolvedBgmUrl = resolveCharacterBgmUrl(source.bgmUrl);
      const next: CharacterSubPage = {
        id: source.id.trim(),
        displayId: typeof source.displayId === "string" ? source.displayId.trim() : "",
        entryKind: normalizeSubPageEntryLabel(source.entryKind),
        title: typeof source.title === "string" ? source.title : "",
        kanjiName: typeof source.kanjiName === "string" ? source.kanjiName.trim() : "",
        subtitle: typeof source.subtitle === "string" ? source.subtitle : "",
        quote: typeof source.quote === "string" ? source.quote : "",
        metaFields,
        palette:
          typeof source.palette === "string" && source.palette.trim()
            ? source.palette.trim()
            : DEFAULT_CHARACTER_PALETTE,
        profileFields: normalizeProfileFields(source.profileFields, legacyProfile, {
          useDefaultsWhenEmpty: false,
        }),
        settingSections: normalizeSettingSections(
          Array.isArray(source.settingSections) ? source.settingSections : undefined,
        ),
        relationships: Array.isArray(source.relationships)
          ? source.relationships.filter((line): line is string => typeof line === "string")
          : [],
        relationshipEntries: normalizeRelationshipEntries(
          source.relationshipEntries,
          source.relationships,
        ),
        images: Array.isArray(source.images) ? source.images : [],
        works: normalizeWorks(source.works),
        textGlitch: migrateLegacyMetaFieldGlitch(normalizeTextGlitch(source.textGlitch), metaFields),
        isShared: source.isShared === true,
        ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : {}),
        ...(normalizeCaseFileDetailTheme(source.detailTheme)
          ? { detailTheme: normalizeCaseFileDetailTheme(source.detailTheme) }
          : {}),
      };

      return next;
    })
    .filter((entry): entry is CharacterSubPage => entry !== null);
}

export function compactSubPageForStorage(subPage: CharacterSubPage): CharacterSubPage {
  if (!isSubPageReference(subPage)) {
    return {
      ...subPage,
      isShared: subPage.isShared === true,
    };
  }

  return {
    id: subPage.id,
    sharedFrom: subPage.sharedFrom,
    displayId: subPage.displayId?.trim() ?? "",
    title: "",
    kanjiName: "",
    subtitle: "",
    quote: "",
    metaFields: [],
    palette: DEFAULT_CHARACTER_PALETTE,
    profileFields: [],
    settingSections: [],
    relationships: [],
    relationshipEntries: [],
    images: [],
    works: [],
    textGlitch: {},
  };
}

export function findSubPage(character: Character, subPageId: string) {
  return normalizeSubPages(character.subPages).find((subPage) => subPage.id === subPageId);
}

export function resolveOwnedSubPage(
  character: Character,
  subPageId: string,
  allCharacters: Character[],
  visited = new Set<string>(),
): CharacterSubPage | undefined {
  const visitKey = `${character.id}:${subPageId}`;
  if (visited.has(visitKey)) {
    return undefined;
  }
  visited.add(visitKey);

  const entry = findSubPage(character, subPageId);
  if (!entry || isSubPageReference(entry)) {
    return undefined;
  }

  return entry;
}

export function resolveSubPage(
  character: Character,
  subPageId: string,
  allCharacters: Character[],
): CharacterSubPage | undefined {
  const entry = findSubPage(character, subPageId);
  if (!entry) {
    return undefined;
  }

  if (!isSubPageReference(entry)) {
    return entry;
  }

  const owner = allCharacters.find((candidate) => candidate.id === entry.sharedFrom!.characterId);
  if (!owner) {
    return undefined;
  }

  const source = resolveOwnedSubPage(owner, entry.sharedFrom!.subPageId, allCharacters);
  if (!source?.isShared) {
    return undefined;
  }

  return {
    ...source,
    id: entry.id,
    displayId: entry.displayId?.trim() || source.displayId,
    sharedFrom: entry.sharedFrom,
    isShared: false,
  };
}

export function collectSharedSubPageCatalog(
  allCharacters: Character[],
  options?: { excludeCharacterId?: string },
): SharedSubPageCatalogItem[] {
  const items: SharedSubPageCatalogItem[] = [];

  for (const character of allCharacters) {
    if (options?.excludeCharacterId && character.id === options.excludeCharacterId) {
      continue;
    }

    for (const subPage of normalizeSubPages(character.subPages)) {
      if (isSubPageReference(subPage) || !subPage.isShared) {
        continue;
      }

      items.push({
        characterId: character.id,
        characterName: character.name || character.id,
        subPageId: subPage.id,
        title: formatSubPageEntryTitle(
          subPage.title?.trim() || "제목 없음",
          normalizeSubPageEntryLabel(subPage.entryKind),
        ),
      });
    }
  }

  return items;
}

export function listNavigableSubPages(
  character: Character,
  allCharacters: Character[],
): NavigableSubPageOption[] {
  return normalizeSubPages(character.subPages).map((entry) => {
    if (isSubPageReference(entry)) {
      const resolved = resolveSubPage(character, entry.id, allCharacters);
      return {
        id: entry.id,
        title: resolved?.title?.trim()
          ? `${formatSubPageEntryTitle(resolved.title, normalizeSubPageEntryLabel(resolved.entryKind))} (불러옴)`
          : "공용 페이지 (불러옴)",
        kind: "imported" as const,
        entryLabel: normalizeSubPageEntryLabel(resolved?.entryKind),
      };
    }

    return {
      id: entry.id,
      title: formatSubPageEntryTitle(entry.title, normalizeSubPageEntryLabel(entry.entryKind)),
      kind: entry.isShared ? ("shared" as const) : ("owned" as const),
      entryLabel: normalizeSubPageEntryLabel(entry.entryKind),
    };
  });
}

export function characterAlreadyImportsSharedSubPage(
  character: Character,
  source: SubPageSourceRef,
) {
  return normalizeSubPages(character.subPages).some(
    (subPage) =>
      subPage.sharedFrom?.characterId === source.characterId &&
      subPage.sharedFrom?.subPageId === source.subPageId,
  );
}

export function subPageToDisplayCharacter(parent: Character, subPage: CharacterSubPage): Character {
  const displayId = subPage.displayId?.trim();
  return {
    id: displayId || `${parent.id}--${subPage.id}`,
    kind: parent.kind,
    name: subPage.title || displayId || subPage.id,
    kanjiName: subPage.kanjiName?.trim() || undefined,
    metaFields: resolveMetaFields(subPage),
    subtitle: subPage.subtitle,
    quote: subPage.quote,
    palette: subPage.palette || parent.palette,
    detailTheme: subPage.detailTheme ?? parent.detailTheme,
    profileFields: subPage.profileFields,
    settings: [],
    settingSections: normalizeSettingSections(subPage.settingSections),
    relationships: relationshipEntriesToLegacyLines(subPage.relationshipEntries ?? []),
    relationshipEntries: subPage.relationshipEntries,
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
    return [...normalized, compactSubPageForStorage(nextSubPage)];
  }

  return normalized.map((subPage, subPageIndex) =>
    subPageIndex === index ? compactSubPageForStorage(nextSubPage) : subPage,
  );
}

export function removeSubPage(subPages: CharacterSubPage[], subPageId: string) {
  return normalizeSubPages(subPages).filter((subPage) => subPage.id !== subPageId);
}
