import type { Character } from "@/lib/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Firestore는 undefined 필드를 거부하므로 중첩 객체·배열까지 재귀적으로 제거합니다. */
export function omitUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => omitUndefined(entry)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, omitUndefined(entry)]),
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
