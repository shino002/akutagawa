import type { CharacterWorldEntry, Work } from "@/lib/types";

/**
 * Firestore에서 받아온 Work 배열의 누락 필드를 안전한 기본값으로 채웁니다.
 */
export const normalizeWorks = (works: Work[] | undefined): Work[] => {
  return Array.isArray(works)
    ? works.map((work) => ({
        ...work,
        images: Array.isArray(work.images) ? work.images : [],
      }))
    : [];
};

/**
 * 자캐의 세계관 엔트리 목록을 정규화합니다.
 * 누락된 settings/images/works 필드를 빈 배열로 채웁니다.
 */
export const normalizeWorldEntries = (
  entries: CharacterWorldEntry[] | undefined,
): CharacterWorldEntry[] => {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        worldId: entry.worldId,
        settings: Array.isArray(entry.settings) ? entry.settings : [],
        images: Array.isArray(entry.images) ? entry.images : [],
        works: normalizeWorks(entry.works),
      }))
    : [];
};
