import type { FieldGlitchConfig, World } from "@/lib/types";
import { normalizeFieldGlitchConfig, normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import { reanchorGlitchConfig } from "@/lib/glitch-fields";

export type WorldDraft = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  password: string;
  textGlitch: Record<string, FieldGlitchConfig>;
};

export const WORLD_GLITCH_FIELD_LABELS: Record<string, string> = {
  title: "세계관 이름",
  subtitle: "한 줄 설명",
  description: "상세 설명",
};

export function createBlankWorldDraft(): WorldDraft {
  return {
    id: "",
    title: "",
    subtitle: "",
    description: "",
    password: "",
    textGlitch: {},
  };
}

export function worldToDraft(world: World): WorldDraft {
  return {
    id: world.id,
    title: world.title,
    subtitle: world.subtitle,
    description: world.description,
    password: world.password ?? "",
    textGlitch: normalizeTextGlitch(world.textGlitch),
  };
}

export function getWorldGlitchFieldLabel(path: string) {
  return WORLD_GLITCH_FIELD_LABELS[path] ?? path;
}

export function getWorldDraftFieldValue(draft: WorldDraft, path: string) {
  if (path === "title") return draft.title;
  if (path === "subtitle") return draft.subtitle;
  if (path === "description") return draft.description;
  return "";
}

export function setWorldDraftFieldValue(draft: WorldDraft, path: string, value: string): WorldDraft {
  if (path === "title") return { ...draft, title: value };
  if (path === "subtitle") return { ...draft, subtitle: value };
  if (path === "description") return { ...draft, description: value };
  return draft;
}

function worldDraftAsAnchor(draft: WorldDraft) {
  return {
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    description: draft.description.trim(),
  };
}

export function pruneWorldDraftTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig>,
  draft: WorldDraft,
): Record<string, FieldGlitchConfig> {
  const anchor = worldDraftAsAnchor(draft);

  const nextEntries = Object.entries(textGlitch)
    .map(([path, config]) => {
      const text =
        path === "title"
          ? anchor.title
          : path === "subtitle"
            ? anchor.subtitle
            : path === "description"
              ? anchor.description
              : "";
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? [path, normalized] as const : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  return Object.fromEntries(nextEntries);
}

export function compactWorldDraftTextGlitch(draft: WorldDraft) {
  const compacted = pruneWorldDraftTextGlitch(draft.textGlitch, draft);

  if (Object.keys(compacted).length === 0) {
    return undefined;
  }

  return compacted;
}

export function buildWorldGlitchFieldOptions(
  draft: WorldDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
) {
  return Object.keys(WORLD_GLITCH_FIELD_LABELS).map((path) => ({
    path,
    label: getWorldGlitchFieldLabel(path),
    hasGlitch: Boolean(textGlitch[path]),
  }));
}

export function countWorldDraftGlitchFields(draft: WorldDraft) {
  return Object.keys(draft.textGlitch).length;
}

export function updateWorldDraftGlitchPath(
  draft: WorldDraft,
  path: string,
  config: FieldGlitchConfig | undefined,
): WorldDraft {
  const nextGlitch = { ...draft.textGlitch };
  const normalized = config ? normalizeFieldGlitchConfig(config) : undefined;

  if (!normalized) {
    delete nextGlitch[path];
  } else {
    nextGlitch[path] = normalized;
  }

  return {
    ...draft,
    textGlitch: nextGlitch,
  };
}

export function updateWorldDraftFieldValue(draft: WorldDraft, path: string, value: string): WorldDraft {
  const nextDraft = setWorldDraftFieldValue(draft, path, value);
  const reanchored = reanchorGlitchConfig(value, draft.textGlitch[path]);
  const normalized = reanchored ? normalizeFieldGlitchConfig(reanchored) : undefined;
  const nextGlitch = { ...draft.textGlitch };

  if (normalized) {
    nextGlitch[path] = normalized;
  } else {
    delete nextGlitch[path];
  }

  return {
    ...nextDraft,
    textGlitch: nextGlitch,
  };
}
