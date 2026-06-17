import { normalizeCharacterKind } from "@/lib/character-kind";
import type { Character } from "@/lib/types";

export const PAIR_MEMBER_SLOTS = 2;

export function isPairCharacter(character: Pick<Character, "kind">) {
  return normalizeCharacterKind(character.kind) === "pair";
}

export function normalizePairMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }

    const id = entry.trim();
    if (!id || ids.includes(id)) {
      continue;
    }

    ids.push(id);
    if (ids.length >= PAIR_MEMBER_SLOTS) {
      break;
    }
  }

  return ids;
}

/** @deprecated 예전 pairMembers[].id 값이 OC id면 이전합니다. */
function migrateLegacyPairMemberIds(character: Character): string[] {
  const legacy = (character as Character & { pairMembers?: Array<{ id?: string }> }).pairMembers;
  if (!Array.isArray(legacy)) {
    return [];
  }

  return legacy
    .map((entry) => (typeof entry?.id === "string" ? entry.id.trim() : ""))
    .filter(Boolean)
    .slice(0, PAIR_MEMBER_SLOTS);
}

export function resolvePairMemberIds(character: Character): string[] {
  const normalized = normalizePairMemberIds(character.pairMemberIds);
  if (normalized.length > 0) {
    return normalized;
  }

  return migrateLegacyPairMemberIds(character);
}

export function resolveLinkedPairMembers(pair: Character, allCharacters: Character[]) {
  const byId = new Map(allCharacters.map((character) => [character.id, character]));

  return resolvePairMemberIds(pair)
    .map((id) => byId.get(id))
    .filter((character): character is Character => Boolean(character));
}

export function formatPairMemberLabel(character: Character) {
  const name = character.name.trim();
  if (name) {
    return name;
  }

  return character.kanjiName?.trim() || character.id || "이름 없음";
}

export function formatPairDisplayName(pair: Character, allCharacters: Character[] = []) {
  const explicit = pair.name.trim();
  if (explicit) {
    return explicit;
  }

  const members = resolveLinkedPairMembers(pair, allCharacters);
  const labels = members.map(formatPairMemberLabel).filter((label) => label !== "이름 없음");

  if (labels.length >= 2) {
    return `${labels[0]} × ${labels[1]}`;
  }

  if (labels.length === 1) {
    return labels[0]!;
  }

  return pair.id;
}

export function pairIndexCardImage(pair: Character, allCharacters: Character[] = []) {
  const pairImage =
    (pair.images ?? []).find((image) => image.category !== "standing") ?? pair.images?.[0];

  if (pairImage) {
    return pairImage;
  }

  for (const member of resolveLinkedPairMembers(pair, allCharacters)) {
    const memberImage =
      (member.images ?? []).find((image) => image.category !== "standing") ?? member.images?.[0];
    if (memberImage) {
      return memberImage;
    }
  }

  return undefined;
}
