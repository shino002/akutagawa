import { deleteField, type FieldValue } from "firebase/firestore";
import type { FieldGlitchConfig } from "@/lib/types";
import { sanitizeTextGlitchForFirestore } from "@/lib/normalize-text-glitch";

type TextGlitchPatchValue = Record<string, FieldGlitchConfig | FieldValue> | FieldValue;

export function buildTextGlitchFirestorePatch(
  nextTextGlitch: Record<string, FieldGlitchConfig> | undefined,
  storedTextGlitch: Record<string, FieldGlitchConfig> | undefined,
): { textGlitch?: TextGlitchPatchValue } {
  const sanitized = sanitizeTextGlitchForFirestore(nextTextGlitch);
  const storedKeys = Object.keys(storedTextGlitch ?? {});
  const nextKeys = Object.keys(sanitized ?? {});
  const removedKeys = storedKeys.filter((path) => !nextKeys.includes(path));

  if (nextKeys.length === 0) {
    return storedKeys.length > 0 ? { textGlitch: deleteField() } : {};
  }

  if (removedKeys.length === 0) {
    return { textGlitch: sanitized };
  }

  const patch: Record<string, FieldGlitchConfig | FieldValue> = {
    ...(sanitized ?? {}),
  };

  for (const path of removedKeys) {
    patch[path] = deleteField();
  }

  return { textGlitch: patch };
}

export function countRemovedGlitchPaths(
  nextTextGlitch: Record<string, FieldGlitchConfig> | undefined,
  storedTextGlitch: Record<string, FieldGlitchConfig> | undefined,
) {
  const sanitized = sanitizeTextGlitchForFirestore(nextTextGlitch);
  const storedKeys = Object.keys(storedTextGlitch ?? {});
  const nextKeys = new Set(Object.keys(sanitized ?? {}));

  return storedKeys.filter((path) => !nextKeys.has(path)).length;
}
