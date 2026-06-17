import type { ProfileField } from "@/lib/types";

export const DEFAULT_PROFILE_FIELD_DEFS = [
  { id: "role", label: "역할" },
  { id: "height", label: "신장" },
  { id: "age", label: "나이" },
  { id: "keyword", label: "키워드" },
] as const;

const DEFAULT_PROFILE_FIELD_LABELS = Object.fromEntries(
  DEFAULT_PROFILE_FIELD_DEFS.map((field) => [field.id, field.label]),
) as Record<string, string>;

type LegacyProfile = {
  age?: string;
  height?: string;
  role?: string;
  keyword?: string;
};

export function createProfileFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultProfileFields(): ProfileField[] {
  return DEFAULT_PROFILE_FIELD_DEFS.map((field) => ({
    id: field.id,
    label: field.label,
    value: "",
  }));
}

export function createBlankProfileField(): ProfileField {
  return {
    id: createProfileFieldId(),
    label: "",
    value: "",
  };
}

export function profileFieldGlitchPath(fieldId: string) {
  return `profile.${fieldId}`;
}

export function parseProfileFieldGlitchPath(path: string) {
  if (!path.startsWith("profile.")) {
    return null;
  }

  const fieldId = path.slice("profile.".length);
  return fieldId || null;
}

export function getProfileFieldLabel(fieldId: string, fields: ProfileField[]) {
  const field = fields.find((entry) => entry.id === fieldId);
  if (field?.label.trim()) {
    return field.label.trim();
  }

  return DEFAULT_PROFILE_FIELD_LABELS[fieldId] ?? fieldId;
}

function normalizeProfileField(raw: unknown): ProfileField | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<ProfileField>;
  if (typeof source.id !== "string" || !source.id.trim()) {
    return null;
  }

  return {
    id: source.id.trim(),
    label: typeof source.label === "string" ? source.label.trim() : "",
    value: typeof source.value === "string" ? source.value : "",
  };
}

function migrateLegacyProfile(legacy?: LegacyProfile): ProfileField[] {
  return DEFAULT_PROFILE_FIELD_DEFS.map((field) => ({
    id: field.id,
    label: field.label,
    value:
      field.id === "age"
        ? (legacy?.age ?? "")
        : field.id === "height"
          ? (legacy?.height ?? "")
          : field.id === "role"
            ? (legacy?.role ?? "")
            : (legacy?.keyword ?? ""),
  }));
}

function hasLegacyProfileValues(legacy?: LegacyProfile) {
  return Boolean(
    legacy?.age?.trim() ||
      legacy?.height?.trim() ||
      legacy?.role?.trim() ||
      legacy?.keyword?.trim(),
  );
}

/**
 * Firestore `profileFields` 배열을 읽습니다. 없으면 예전 `profile` 객체에서 옮깁니다.
 */
export function normalizeProfileFields(
  profileFieldsRaw: unknown,
  legacyProfile?: LegacyProfile,
  options?: { useDefaultsWhenEmpty?: boolean },
): ProfileField[] {
  if (Array.isArray(profileFieldsRaw)) {
    return profileFieldsRaw
      .map((entry) => normalizeProfileField(entry))
      .filter((entry): entry is ProfileField => entry !== null);
  }

  if (hasLegacyProfileValues(legacyProfile)) {
    return migrateLegacyProfile(legacyProfile);
  }

  return options?.useDefaultsWhenEmpty === false ? [] : createDefaultProfileFields();
}

export function getProfileFieldValue(fields: ProfileField[], fieldId: string) {
  return fields.find((field) => field.id === fieldId)?.value ?? "";
}

export function setProfileFieldValue(
  fields: ProfileField[],
  fieldId: string,
  value: string,
): ProfileField[] {
  return fields.map((field) => (field.id === fieldId ? { ...field, value } : field));
}

export function updateProfileField(
  fields: ProfileField[],
  fieldId: string,
  patch: Partial<Pick<ProfileField, "label" | "value">>,
): ProfileField[] {
  return fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field));
}

export function addProfileField(fields: ProfileField[], field: ProfileField = createBlankProfileField()) {
  return [...fields, field];
}

export function removeProfileField(fields: ProfileField[], fieldId: string) {
  return fields.filter((field) => field.id !== fieldId);
}

export function profileFieldsHaveContent(fields: ProfileField[]) {
  return fields.some((field) => field.label.trim() || field.value.trim());
}
