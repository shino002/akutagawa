import type { Character } from "@/lib/types";
import type { FieldGlitchConfig, GlitchZone } from "@/lib/types";
import type { CharacterDraft } from "@/lib/character-draft";
import { normalizeFieldGlitchConfig } from "@/lib/normalize-text-glitch";
import {
  isValidFieldGlitchConfig,
} from "@/lib/glitch-style";

export const GLITCH_FIELD_LABELS: Record<string, string> = {
  name: "자캐 이름",
  kanjiName: "한자 이름",
  subtitle: "한 줄 소개",
  quote: "대표 대사",
  classification: "기록 분류",
  statusTags: "기록 상태",
  "profile.age": "나이",
  "profile.height": "신장",
  "profile.role": "역할",
  "profile.keyword": "키워드",
  relationships: "관계",
  settingsText: "기존 한 줄 상세 설정",
};

export function getGlitchFieldLabel(path: string) {
  if (GLITCH_FIELD_LABELS[path]) {
    return GLITCH_FIELD_LABELS[path];
  }

  if (path.startsWith("settingSections.")) {
    return `상세 설정 본문 (${path.slice("settingSections.".length)})`;
  }

  if (path.startsWith("works.")) {
    return `연성 본문 (${path.slice("works.".length)})`;
  }

  return path;
}

export function getCharacterDraftFieldValue(draft: CharacterDraft, path: string) {
  if (path === "name") return draft.name;
  if (path === "kanjiName") return draft.kanjiName;
  if (path === "subtitle") return draft.subtitle;
  if (path === "quote") return draft.quote;
  if (path === "classification") return draft.classification;
  if (path === "statusTags") return draft.statusTagsText;
  if (path === "profile.age") return draft.age;
  if (path === "profile.height") return draft.height;
  if (path === "profile.role") return draft.role;
  if (path === "profile.keyword") return draft.keyword;
  if (path === "relationships") return draft.relationshipsText;
  if (path === "settingsText") return draft.settingsText;

  if (path.startsWith("settingSections.")) {
    const sectionId = path.slice("settingSections.".length);
    return draft.settingSections.find((section) => section.id === sectionId)?.body ?? "";
  }

  return "";
}

export function getCharacterFieldValue(character: Character, path: string) {
  if (path === "name") return character.name;
  if (path === "kanjiName") return character.kanjiName ?? "";
  if (path === "subtitle") return character.subtitle;
  if (path === "quote") return character.quote;
  if (path === "classification") return character.classification ?? "";
  if (path === "statusTags") return (character.statusTags ?? []).join("\n");
  if (path === "profile.age") return character.profile.age;
  if (path === "profile.height") return character.profile.height;
  if (path === "profile.role") return character.profile.role;
  if (path === "profile.keyword") return character.profile.keyword;
  if (path === "relationships") return character.relationships.join("\n");
  if (path === "settingsText") return character.settings.join("\n");

  if (path.startsWith("settingSections.")) {
    const sectionId = path.slice("settingSections.".length);
    return character.settingSections?.find((section) => section.id === sectionId)?.body ?? "";
  }

  return "";
}

export function setCharacterDraftFieldValue(draft: CharacterDraft, path: string, value: string): CharacterDraft {
  if (path === "name") return { ...draft, name: value };
  if (path === "kanjiName") return { ...draft, kanjiName: value };
  if (path === "subtitle") return { ...draft, subtitle: value };
  if (path === "quote") return { ...draft, quote: value };
  if (path === "classification") return { ...draft, classification: value };
  if (path === "statusTags") return { ...draft, statusTagsText: value };
  if (path === "profile.age") return { ...draft, age: value };
  if (path === "profile.height") return { ...draft, height: value };
  if (path === "profile.role") return { ...draft, role: value };
  if (path === "profile.keyword") return { ...draft, keyword: value };
  if (path === "relationships") return { ...draft, relationshipsText: value };
  if (path === "settingsText") return { ...draft, settingsText: value };

  if (path.startsWith("settingSections.")) {
    const sectionId = path.slice("settingSections.".length);
    return {
      ...draft,
      settingSections: draft.settingSections.map((section) =>
        section.id === sectionId ? { ...section, body: value } : section,
      ),
    };
  }

  return draft;
}

export function reanchorZone(text: string, zone: GlitchZone): GlitchZone | null {
  let anchored: GlitchZone | null = null;

  if (text.slice(zone.start, zone.end) === zone.original) {
    anchored = zone;
  } else {
    const nextIndex = text.indexOf(zone.original);
    if (nextIndex === -1) {
      return null;
    }

    anchored = {
      ...zone,
      start: nextIndex,
      end: nextIndex + zone.original.length,
    };
  }

  if (anchored.start < 0 || anchored.end > text.length || anchored.start >= anchored.end) {
    return null;
  }

  return anchored;
}

export function reanchorGlitchConfig(text: string, config?: FieldGlitchConfig): FieldGlitchConfig | undefined {
  if (!config?.zones?.length) {
    return undefined;
  }

  const zones = config.zones
    .map((zone) => reanchorZone(text, zone))
    .filter((zone): zone is GlitchZone => zone !== null);

  if (zones.length === 0) {
    return undefined;
  }

  return normalizeFieldGlitchConfig({
    ...config,
    wordPool: config.wordPool.trim(),
    zones,
  });
}

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function draftAsGlitchAnchorCharacter(draft: CharacterDraft): Character {
  return {
    id: draft.id,
    name: draft.name.trim(),
    kanjiName: draft.kanjiName.trim(),
    subtitle: draft.subtitle.trim(),
    quote: draft.quote.trim(),
    classification: draft.classification.trim(),
    statusTags: linesToList(draft.statusTagsText),
    profile: {
      age: draft.age.trim(),
      height: draft.height.trim(),
      role: draft.role.trim(),
      keyword: draft.keyword.trim(),
    },
    settings: linesToList(draft.settingsText),
    settingSections: draft.settingSections.map((section) => ({
      ...section,
      title: section.title.trim(),
      body: section.body.trim(),
    })),
    relationships: linesToList(draft.relationshipsText),
    palette: draft.palette.trim() || "from-zinc-950 via-black to-zinc-900",
    works: [],
  };
}

export function pruneDraftTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig>,
  draft: CharacterDraft,
): Record<string, FieldGlitchConfig> {
  const anchorCharacter = draftAsGlitchAnchorCharacter(draft);

  const nextEntries = Object.entries(textGlitch)
    .map(([path, config]) => {
      const text = getCharacterFieldValue(anchorCharacter, path);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? [path, normalized] as const : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  return Object.fromEntries(nextEntries);
}

export function compactTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  character: Character,
) {
  if (!textGlitch) {
    return undefined;
  }

  const nextEntries = Object.entries(textGlitch)
    .map(([path, config]) => {
      const text = getCharacterFieldValue(character, path);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? [path, normalized] as const : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  if (nextEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(nextEntries);
}

export function compactDraftTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  draft: CharacterDraft,
) {
  return compactTextGlitch(textGlitch, draftAsGlitchAnchorCharacter(draft));
}

export type GlitchEditSection = "card" | "record";

const RECORD_GLITCH_PATHS = new Set(["relationships", "settingsText"]);

export function getGlitchSectionForPath(path: string): GlitchEditSection {
  if (RECORD_GLITCH_PATHS.has(path) || path.startsWith("settingSections.")) {
    return "record";
  }

  return "card";
}

function findGlitchFieldElement(path: string) {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-glitch-field]");

  return Array.from(fields).find((element) => element.dataset.glitchField === path) ?? null;
}

export function focusGlitchFieldElement(path: string, options?: { preferWorkTextarea?: boolean }) {
  if (typeof document === "undefined") {
    return;
  }

  const focusTarget = () => {
    if (options?.preferWorkTextarea) {
      const workTextarea = document.querySelector("[data-glitch-work-textarea]");
      if (workTextarea instanceof HTMLTextAreaElement) {
        workTextarea.scrollIntoView({ behavior: "smooth", block: "center" });
        workTextarea.focus({ preventScroll: true });
        return true;
      }
    }

    const field = findGlitchFieldElement(path);
    if (field) {
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.focus({ preventScroll: true });
      return true;
    }

    return false;
  };

  window.setTimeout(() => {
    if (focusTarget()) {
      return;
    }

    window.setTimeout(focusTarget, 200);
  }, 50);
}

export function buildGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
) {
  const options = Object.keys(GLITCH_FIELD_LABELS).map((path) => ({
    path,
    label: getGlitchFieldLabel(path),
    hasGlitch: Boolean(textGlitch[path]),
  }));

  draft.settingSections.forEach((section, index) => {
    const path = settingSectionGlitchPath(section.id);
    options.push({
      path,
      label: section.title.trim() || `상세 박스 ${index + 1}`,
      hasGlitch: Boolean(textGlitch[path]),
    });
  });

  return options;
}

export function glitchConfigSignature(text: string, glitch?: FieldGlitchConfig) {
  if (!glitch?.zones?.length || !isValidFieldGlitchConfig(glitch)) {
    return "";
  }

  return JSON.stringify({
    text,
    wordPool: glitch.wordPool.trim(),
    scrambleMode: glitch.scrambleMode,
    builtinScramble: glitch.builtinScramble,
    tickMs: glitch.tickMs,
    defaultStyle: glitch.defaultStyle,
    zones: [...glitch.zones]
      .map((zone) => ({
        id: zone.id,
        start: zone.start,
        end: zone.end,
        original: zone.original,
        style: zone.style,
        errorMessage: zone.errorMessage,
        errorMessageSource: zone.errorMessageSource,
      }))
      .sort((left, right) => left.start - right.start),
  });
}

export function getCharacterFieldGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  path: string,
  text: string,
) {
  return reanchorGlitchConfig(text, textGlitch?.[path]);
}

export function settingSectionGlitchPath(sectionId: string) {
  return `settingSections.${sectionId}`;
}

export function workBodyGlitchPath(index: number) {
  return `works.${index}.body`;
}

export function updateDraftGlitchPath(
  draft: CharacterDraft,
  path: string,
  config: FieldGlitchConfig | undefined,
): CharacterDraft {
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

export function updateDraftFieldValue(draft: CharacterDraft, path: string, value: string): CharacterDraft {
  const nextDraft = setCharacterDraftFieldValue(draft, path, value);
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
