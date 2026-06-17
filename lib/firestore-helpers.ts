import type { Character } from "@/lib/types";

export function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

/** Firestore는 undefined 필드를 거부하므로 캐릭터 문서 쓰기 전에 정리합니다. */
export function characterFirestorePayload(
  character: Character,
  patch: Partial<Character> & Record<string, unknown> = {},
) {
  return omitUndefined({
    ...character,
    ...patch,
  });
}
