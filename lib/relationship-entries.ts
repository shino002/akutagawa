import type { RelationshipEntry } from "@/lib/types";

export function createRelationshipEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `relationship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlankRelationshipEntry(): RelationshipEntry {
  return {
    id: createRelationshipEntryId(),
    name: "",
    label: "",
    body: "",
  };
}

export type RelationshipEntryGlitchField = "body" | "name" | "label";

export function relationshipEntryGlitchPath(entryId: string) {
  return `relationships.${entryId}`;
}

export function relationshipEntryNameGlitchPath(entryId: string) {
  return `relationships.${entryId}.name`;
}

export function relationshipEntryLabelGlitchPath(entryId: string) {
  return `relationships.${entryId}.label`;
}

export function parseRelationshipEntryGlitchPath(
  path: string,
): { entryId: string; field: RelationshipEntryGlitchField } | null {
  if (!path.startsWith("relationships.")) {
    return null;
  }

  const rest = path.slice("relationships.".length);
  if (!rest) {
    return null;
  }

  if (rest.endsWith(".name")) {
    return { entryId: rest.slice(0, -".name".length), field: "name" };
  }

  if (rest.endsWith(".label")) {
    return { entryId: rest.slice(0, -".label".length), field: "label" };
  }

  return { entryId: rest, field: "body" };
}

export function getRelationshipEntryFieldValue(
  entries: RelationshipEntry[],
  entryId: string,
  field: RelationshipEntryGlitchField,
) {
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) {
    return "";
  }

  if (field === "name") {
    return entry.name;
  }

  if (field === "label") {
    return entry.label;
  }

  return entry.body;
}

export function setRelationshipEntryFieldValue(
  entries: RelationshipEntry[],
  entryId: string,
  field: RelationshipEntryGlitchField,
  value: string,
): RelationshipEntry[] {
  return entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    if (field === "name") {
      return { ...entry, name: value };
    }

    if (field === "label") {
      return { ...entry, label: value };
    }

    return { ...entry, body: value };
  });
}

function normalizeRelationshipEntry(raw: unknown): RelationshipEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<RelationshipEntry>;
  const id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : "";
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const label = typeof source.label === "string" ? source.label.trim() : "";
  const body = typeof source.body === "string" ? source.body.trim() : "";
  const linkedCharacterId =
    typeof source.linkedCharacterId === "string" && source.linkedCharacterId.trim()
      ? source.linkedCharacterId.trim()
      : undefined;
  const linkedSubPageId =
    typeof source.linkedSubPageId === "string" && source.linkedSubPageId.trim()
      ? source.linkedSubPageId.trim()
      : undefined;

  if (!id || (!name && !label && !body && !linkedCharacterId && !linkedSubPageId)) {
    return null;
  }

  return {
    id,
    name,
    label,
    body,
    ...(linkedCharacterId ? { linkedCharacterId } : {}),
    ...(linkedSubPageId ? { linkedSubPageId } : {}),
  };
}

function legacyLineToRelationshipEntry(line: string, index: number): RelationshipEntry {
  const trimmed = line.trim();
  const colonMatch = trimmed.match(/^([^:]{1,60}):\s*(.+)$/);

  if (colonMatch) {
    const namePart = colonMatch[1].trim();
    const body = colonMatch[2].trim();
    const labelMatch = namePart.match(/^(.+?)\s*[/·|]\s*(.+)$/);

    if (labelMatch) {
      return {
        id: `legacy-relationship-${index}`,
        name: labelMatch[1].trim(),
        label: labelMatch[2].trim(),
        body,
      };
    }

    return {
      id: `legacy-relationship-${index}`,
      name: namePart,
      label: "",
      body,
    };
  }

  return {
    id: `legacy-relationship-${index}`,
    name: trimmed.slice(0, 40),
    label: "",
    body: trimmed,
  };
}

export function relationshipEntriesToLegacyLines(entries: RelationshipEntry[]) {
  return entries
    .map((entry) => {
      const namePart = entry.label ? `${entry.name} / ${entry.label}` : entry.name;
      if (entry.body) {
        return `${namePart}: ${entry.body}`;
      }

      return namePart || entry.body;
    })
    .filter(Boolean);
}

export function getRelationshipEntryBody(entries: RelationshipEntry[], entryId: string) {
  return getRelationshipEntryFieldValue(entries, entryId, "body");
}

export function setRelationshipEntryBody(
  entries: RelationshipEntry[],
  entryId: string,
  body: string,
): RelationshipEntry[] {
  return setRelationshipEntryFieldValue(entries, entryId, "body", body);
}

export function updateRelationshipEntry(
  entries: RelationshipEntry[],
  entryId: string,
  patch: Partial<Pick<RelationshipEntry, "name" | "label" | "body" | "linkedCharacterId">>,
): RelationshipEntry[] {
  return entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry));
}

export function removeRelationshipEntry(entries: RelationshipEntry[], entryId: string) {
  return entries.filter((entry) => entry.id !== entryId);
}

export function relationshipEntriesHaveContent(entries: RelationshipEntry[]) {
  return entries.some(
    (entry) =>
      entry.name.trim() ||
      entry.label.trim() ||
      entry.body.trim() ||
      entry.linkedCharacterId ||
      entry.linkedSubPageId,
  );
}

/**
 * Firestore `relationshipEntries` 배열을 읽습니다. 없으면 예전 `relationships` 줄 목록에서 옮깁니다.
 */
export function normalizeRelationshipEntries(
  relationshipEntriesRaw: unknown,
  legacyRelationships?: string[],
): RelationshipEntry[] {
  if (Array.isArray(relationshipEntriesRaw)) {
    return relationshipEntriesRaw
      .map((entry) => normalizeRelationshipEntry(entry))
      .filter((entry): entry is RelationshipEntry => entry !== null);
  }

  if (Array.isArray(legacyRelationships)) {
    return legacyRelationships
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter(Boolean)
      .map((line, index) => legacyLineToRelationshipEntry(line, index));
  }

  return [];
}

export function resolveRelationshipEntries(
  relationshipEntries: RelationshipEntry[] | undefined,
  legacyRelationships: string[] | undefined,
) {
  const normalized = normalizeRelationshipEntries(relationshipEntries, legacyRelationships);
  const legacyLines = (legacyRelationships ?? []).map((line) => line.trim()).filter(Boolean);

  return {
    relationshipEntries: normalized,
    migratedFromLegacy: normalized.length > 0 && !relationshipEntries?.length && legacyLines.length > 0,
  };
}
