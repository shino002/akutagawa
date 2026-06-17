import type { ArchiveSubSectionId } from "@/constants/home";
import { CHARACTER_KIND_LABELS, filterCharactersByKind, normalizeCharacterKind } from "@/lib/character-kind";
import { findSubPage } from "@/lib/sub-pages";
import type { Character, CharacterKind, GlitchZone, ZoneLinkTarget } from "@/lib/types";

export type CharacterDetailSection = ArchiveSubSectionId;

export const CHARACTER_DETAIL_SECTIONS: CharacterDetailSection[] = ["characters", "pairs", "others"];

export const CHARACTER_DETAIL_SECTION_LABELS: Record<CharacterDetailSection, string> = {
  characters: CHARACTER_KIND_LABELS.oc,
  pairs: CHARACTER_KIND_LABELS.pair,
  others: CHARACTER_KIND_LABELS.other,
};

export function characterKindToSection(kind: CharacterKind): CharacterDetailSection {
  if (kind === "pair") {
    return "pairs";
  }

  if (kind === "other") {
    return "others";
  }

  return "characters";
}

export function sectionToCharacterKind(section: CharacterDetailSection): CharacterKind {
  if (section === "pairs") {
    return "pair";
  }

  if (section === "others") {
    return "other";
  }

  return "oc";
}

export function normalizeZoneLinkTarget(raw: unknown): ZoneLinkTarget | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const source = raw as Partial<ZoneLinkTarget>;
  const section = source.section;
  const characterId = typeof source.characterId === "string" ? source.characterId.trim() : "";

  if (
    (section !== "characters" && section !== "pairs" && section !== "others") ||
    !characterId
  ) {
    return undefined;
  }

  const subPageId =
    typeof source.subPageId === "string" && source.subPageId.trim()
      ? source.subPageId.trim()
      : undefined;

  return subPageId ? { section, characterId, subPageId } : { section, characterId };
}

type ZoneLinkContext = {
  section: CharacterDetailSection;
  characterId: string;
};

export function zoneHasPersistedLink(zone: GlitchZone) {
  if (normalizeZoneLinkTarget(zone.linkTarget)) {
    return true;
  }

  return typeof zone.linkSubPageId === "string" && zone.linkSubPageId.trim().length > 0;
}

export function fieldGlitchHasLinks(config?: { zones?: GlitchZone[] }) {
  return config?.zones?.some((zone) => zoneHasPersistedLink(zone)) ?? false;
}

export function resolveZoneLink(
  zone: GlitchZone,
  context?: ZoneLinkContext,
): ZoneLinkTarget | undefined {
  const normalizedTarget = normalizeZoneLinkTarget(zone.linkTarget);
  if (normalizedTarget) {
    return normalizedTarget;
  }

  const legacySubPageId =
    typeof zone.linkSubPageId === "string" && zone.linkSubPageId.trim()
      ? zone.linkSubPageId.trim()
      : undefined;

  if (legacySubPageId && context) {
    return {
      section: context.section,
      characterId: context.characterId,
      subPageId: legacySubPageId,
    };
  }

  return undefined;
}

export function zoneHasLink(zone: GlitchZone, context?: ZoneLinkContext) {
  return Boolean(resolveZoneLink(zone, context));
}

export function formatZoneLinkLabel(
  target: ZoneLinkTarget,
  characters: Character[],
): string {
  const kind = sectionToCharacterKind(target.section);
  const character =
    characters.find((entry) => entry.id === target.characterId) ??
    filterCharactersByKind(characters, kind).find((entry) => entry.id === target.characterId);
  const sectionLabel = CHARACTER_DETAIL_SECTION_LABELS[target.section];
  const characterName = character?.name?.trim() || target.characterId;

  if (!target.subPageId) {
    return `${sectionLabel} · ${characterName}`;
  }

  const subPage = character ? findSubPage(character, target.subPageId) : undefined;
  const subPageTitle = subPage?.title?.trim() || "상세 페이지";
  return `${sectionLabel} · ${characterName} · ${subPageTitle}`;
}

export function findCharacterByLinkTarget(characters: Character[], target: ZoneLinkTarget) {
  const kind = sectionToCharacterKind(target.section);
  return filterCharactersByKind(characters, kind).find((character) => character.id === target.characterId);
}

export function isSameZoneLinkTarget(a?: ZoneLinkTarget, b?: ZoneLinkTarget) {
  if (!a || !b) {
    return false;
  }

  return (
    a.section === b.section &&
    a.characterId === b.characterId &&
    (a.subPageId ?? "") === (b.subPageId ?? "")
  );
}

export function characterSectionForId(characters: Character[], characterId: string): CharacterDetailSection {
  const character = characters.find((entry) => entry.id === characterId);
  return characterKindToSection(normalizeCharacterKind(character?.kind));
}
