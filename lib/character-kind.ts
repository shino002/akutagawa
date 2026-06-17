import type { Character, CharacterKind } from "@/lib/types";

export const CHARACTER_KINDS = ["oc", "pair", "other"] as const;

export const CHARACTER_KIND_LABELS: Record<CharacterKind, string> = {
  oc: "OC",
  pair: "Pair",
  other: "Another",
};

export const CHARACTER_KIND_ADMIN_LABELS: Record<CharacterKind, string> = {
  oc: "자캐",
  pair: "페어",
  other: "어나더",
};

export function normalizeCharacterKind(value: unknown): CharacterKind {
  if (value === "pair" || value === "other") {
    return value;
  }

  return "oc";
}

export function filterCharactersByKind(characters: Character[], kind: CharacterKind) {
  return characters.filter((character) => normalizeCharacterKind(character.kind) === kind);
}

/** 페어에 연결할 수 있는 캐릭터 (OC · Another) */
export function filterPairLinkableCharacters(characters: Character[]) {
  return characters.filter((character) => {
    const kind = normalizeCharacterKind(character.kind);
    return kind === "oc" || kind === "other";
  });
}
