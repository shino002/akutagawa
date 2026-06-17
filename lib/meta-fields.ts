import type { CaseMetaField } from "@/lib/types";

export const LEGACY_META_STATUS_ID = "legacy-meta-status";
export const LEGACY_META_CLASSIFICATION_ID = "legacy-meta-classification";

export function createMetaFieldId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `meta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankMetaField(label = ""): CaseMetaField {
  return {
    id: createMetaFieldId(),
    label,
    body: "",
  };
}

export function metaFieldGlitchPath(fieldId: string) {
  return `metaFields.${fieldId}`;
}

export function parseMetaFieldGlitchPath(path: string) {
  if (!path.startsWith("metaFields.")) {
    return null;
  }

  const fieldId = path.slice("metaFields.".length);
  return fieldId || null;
}

export function normalizeMetaFields(fields: CaseMetaField[] | undefined): CaseMetaField[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field, index) => {
      if (!field || typeof field !== "object") {
        return null;
      }

      const id = typeof field.id === "string" && field.id.trim() ? field.id.trim() : `meta-field-${index}`;
      const label = typeof field.label === "string" ? field.label.trim() : "";
      const body = typeof field.body === "string" ? field.body : "";

      if (!label && !body) {
        return null;
      }

      return { id, label, body };
    })
    .filter((field): field is CaseMetaField => field !== null);
}

type MetaFieldSource = {
  metaFields?: CaseMetaField[];
  statusTags?: string[];
  classification?: string;
};

export function resolveMetaFields(source: MetaFieldSource): CaseMetaField[] {
  const normalized = normalizeMetaFields(source.metaFields);
  if (normalized.length > 0) {
    return normalized;
  }

  const legacy: CaseMetaField[] = [];
  const statusLines = (source.statusTags ?? []).map((line) => line.trim()).filter(Boolean);

  if (statusLines.length > 0) {
    legacy.push({
      id: LEGACY_META_STATUS_ID,
      label: "상태",
      body: statusLines.join("\n"),
    });
  }

  if (source.classification?.trim()) {
    legacy.push({
      id: LEGACY_META_CLASSIFICATION_ID,
      label: "분류",
      body: source.classification.trim(),
    });
  }

  return legacy;
}

export function getMetaFieldBody(fields: CaseMetaField[], fieldId: string) {
  return fields.find((field) => field.id === fieldId)?.body ?? "";
}

export function getMetaFieldLabel(fields: CaseMetaField[], fieldId: string) {
  const field = fields.find((entry) => entry.id === fieldId);
  if (field?.label.trim()) {
    return field.label.trim();
  }

  return fieldId;
}

export function setMetaFieldBody(fields: CaseMetaField[], fieldId: string, body: string): CaseMetaField[] {
  return fields.map((field) => (field.id === fieldId ? { ...field, body } : field));
}

export function metaFieldsHaveContent(fields: CaseMetaField[]) {
  return normalizeMetaFields(fields).some((field) => field.label.trim() || field.body.trim());
}

export function migrateLegacyMetaFieldGlitch(
  textGlitch: Record<string, import("@/lib/types").FieldGlitchConfig>,
  metaFields: CaseMetaField[],
) {
  const next = { ...textGlitch };

  if (next.statusTags) {
    const target = metaFields.find((field) => field.id === LEGACY_META_STATUS_ID);
    if (target) {
      next[metaFieldGlitchPath(target.id)] = next.statusTags;
    }
    delete next.statusTags;
  }

  if (next.classification) {
    const target = metaFields.find((field) => field.id === LEGACY_META_CLASSIFICATION_ID);
    if (target) {
      next[metaFieldGlitchPath(target.id)] = next.classification;
    }
    delete next.classification;
  }

  return next;
}
