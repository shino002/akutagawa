import type { CharacterWorldEntry } from "@/lib/types";
import { normalizeWorldEntries } from "@/utils/normalizers";

/**
 * 지정한 세계관 ID로 빈 자캐–세계관 엔트리를 만듭니다.
 */
export const createBlankWorldEntry = (worldId: string): CharacterWorldEntry => {
  return {
    worldId,
    settings: [],
    images: [],
    works: [],
  };
};

/**
 * 세계관 엔트리 목록에 nextEntry를 넣거나(없으면) 같은 worldId를 덮어씁니다.
 */
export const upsertWorldEntry = (
  entries: CharacterWorldEntry[] | undefined,
  nextEntry: CharacterWorldEntry,
): CharacterWorldEntry[] => {
  const normalizedEntries = normalizeWorldEntries(entries);
  const existingIndex = normalizedEntries.findIndex((entry) => entry.worldId === nextEntry.worldId);

  if (existingIndex === -1) {
    return [...normalizedEntries, nextEntry];
  }

  return normalizedEntries.map((entry, index) => (index === existingIndex ? nextEntry : entry));
};
