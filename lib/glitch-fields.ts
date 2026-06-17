import type { Character, CharacterSubPage } from "@/lib/types";
import type { FieldGlitchConfig, GlitchZone } from "@/lib/types";
import type { CharacterDraft } from "@/lib/character-draft";
import { normalizeFieldGlitchConfig } from "@/lib/normalize-text-glitch";
import {
  getProfileFieldLabel,
  getProfileFieldValue,
  parseProfileFieldGlitchPath,
  profileFieldGlitchPath,
  setProfileFieldValue,
} from "@/lib/profile-fields";
import {
  isValidFieldGlitchConfig,
} from "@/lib/glitch-style";

export const GLITCH_FIELD_LABELS: Record<string, string> = {
  name: "이름",
  kanjiName: "한자 이름",
  subtitle: "한 줄 소개",
  quote: "대표 대사",
  classification: "기록 분류",
  statusTags: "기록 상태",
  relationships: "관계",
};

const SUB_PAGE_GLITCH_FIELD_PATHS = [
  "name",
  "kanjiName",
  "subtitle",
  "quote",
  "relationships",
] as const;

const BASE_GLITCH_FIELD_PATHS = [
  "name",
  "kanjiName",
  "subtitle",
  "quote",
  "classification",
  "statusTags",
  "relationships",
] as const;

export const SUB_PAGE_GLITCH_PREFIX = "subPages.";

export function parseSubPageGlitchPath(path: string): { subPageId: string; fieldPath: string } | null {
  if (!path.startsWith(SUB_PAGE_GLITCH_PREFIX)) {
    return null;
  }

  const rest = path.slice(SUB_PAGE_GLITCH_PREFIX.length);
  const dotIndex = rest.indexOf(".");

  if (dotIndex === -1) {
    return null;
  }

  const subPageId = rest.slice(0, dotIndex);
  const fieldPath = rest.slice(dotIndex + 1);

  if (!subPageId || !fieldPath) {
    return null;
  }

  return { subPageId, fieldPath };
}

export function subPageFieldGlitchPath(subPageId: string, fieldPath: string) {
  return `${SUB_PAGE_GLITCH_PREFIX}${subPageId}.${fieldPath}`;
}

function findSubPageInDraft(draft: CharacterDraft, subPageId: string) {
  return draft.subPages.find((subPage) => subPage.id === subPageId);
}

function getSubPageFieldValue(subPage: CharacterSubPage, fieldPath: string) {
  if (fieldPath === "name") return subPage.title;
  if (fieldPath === "kanjiName") return subPage.kanjiName ?? "";
  if (fieldPath === "subtitle") return subPage.subtitle;
  if (fieldPath === "quote") return subPage.quote;
  const profileFieldId = parseProfileFieldGlitchPath(fieldPath);
  if (profileFieldId) return getProfileFieldValue(subPage.profileFields, profileFieldId);
  if (fieldPath === "relationships") return (subPage.relationships ?? []).join("\n");

  if (fieldPath.startsWith("settingSections.")) {
    const sectionId = fieldPath.slice("settingSections.".length);
    return subPage.settingSections?.find((section) => section.id === sectionId)?.body ?? "";
  }

  return "";
}

function setSubPageFieldValue(subPage: CharacterSubPage, fieldPath: string, value: string): CharacterSubPage {
  if (fieldPath === "name") return { ...subPage, title: value };
  if (fieldPath === "kanjiName") return { ...subPage, kanjiName: value };
  if (fieldPath === "subtitle") return { ...subPage, subtitle: value };
  if (fieldPath === "quote") return { ...subPage, quote: value };
  const profileFieldId = parseProfileFieldGlitchPath(fieldPath);
  if (profileFieldId) {
    return {
      ...subPage,
      profileFields: setProfileFieldValue(subPage.profileFields, profileFieldId, value),
    };
  }
  if (fieldPath === "relationships") {
    return {
      ...subPage,
      relationships: value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }

  if (fieldPath.startsWith("settingSections.")) {
    const sectionId = fieldPath.slice("settingSections.".length);
    return {
      ...subPage,
      settingSections: (subPage.settingSections ?? []).map((section) =>
        section.id === sectionId ? { ...section, body: value } : section,
      ),
    };
  }

  return subPage;
}

export function getGlitchFieldLabel(path: string): string {
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    const innerLabel = getGlitchFieldLabel(subPagePath.fieldPath);
    return `상세 페이지 · ${innerLabel}`;
  }

  if (GLITCH_FIELD_LABELS[path]) {
    return GLITCH_FIELD_LABELS[path];
  }

  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) {
    return getProfileFieldLabel(profileFieldId, []);
  }

  if (path === "title") {
    return "세계관 이름";
  }

  if (path === "description") {
    return "상세 설명";
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
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    return subPage ? getSubPageFieldValue(subPage, subPagePath.fieldPath) : "";
  }

  if (path === "name") return draft.name;
  if (path === "kanjiName") return draft.kanjiName;
  if (path === "subtitle") return draft.subtitle;
  if (path === "quote") return draft.quote;
  if (path === "classification") return draft.classification;
  if (path === "statusTags") return draft.statusTagsText;
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) return getProfileFieldValue(draft.profileFields, profileFieldId);
  if (path === "relationships") return draft.relationshipsText;

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
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) return getProfileFieldValue(character.profileFields, profileFieldId);
  if (path === "relationships") return character.relationships.join("\n");

  if (path.startsWith("settingSections.")) {
    const sectionId = path.slice("settingSections.".length);
    return character.settingSections?.find((section) => section.id === sectionId)?.body ?? "";
  }

  return "";
}

export function setCharacterDraftFieldValue(draft: CharacterDraft, path: string, value: string): CharacterDraft {
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    return {
      ...draft,
      subPages: draft.subPages.map((subPage) =>
        subPage.id === subPagePath.subPageId
          ? setSubPageFieldValue(subPage, subPagePath.fieldPath, value)
          : subPage,
      ),
    };
  }

  if (path === "name") return { ...draft, name: value };
  if (path === "kanjiName") return { ...draft, kanjiName: value };
  if (path === "subtitle") return { ...draft, subtitle: value };
  if (path === "quote") return { ...draft, quote: value };
  if (path === "classification") return { ...draft, classification: value };
  if (path === "statusTags") return { ...draft, statusTagsText: value };
  const profileFieldId = parseProfileFieldGlitchPath(path);
  if (profileFieldId) {
    return {
      ...draft,
      profileFields: setProfileFieldValue(draft.profileFields, profileFieldId, value),
    };
  }
  if (path === "relationships") return { ...draft, relationshipsText: value };

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
    profileFields: draft.profileFields.map((field) => ({
      ...field,
      label: field.label.trim(),
      value: field.value.trim(),
    })),
    settings: [],
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

export function pruneSubPageTextGlitch(
  textGlitch: Record<string, FieldGlitchConfig> | undefined,
  subPage: CharacterSubPage,
): Record<string, FieldGlitchConfig> {
  if (!textGlitch) {
    return {};
  }

  const nextEntries = Object.entries(textGlitch)
    .map(([fieldPath, config]) => {
      const text = getSubPageFieldValue(subPage, fieldPath);
      const anchored = reanchorGlitchConfig(text, config);
      const normalized = anchored ? normalizeFieldGlitchConfig(anchored) : undefined;
      return normalized ? [fieldPath, normalized] as const : null;
    })
    .filter((entry): entry is readonly [string, FieldGlitchConfig] => entry !== null);

  return Object.fromEntries(nextEntries);
}

export function compactSubPageTextGlitch(subPage: CharacterSubPage) {
  const compacted = pruneSubPageTextGlitch(subPage.textGlitch, subPage);

  if (Object.keys(compacted).length === 0) {
    return undefined;
  }

  return compacted;
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

const RECORD_GLITCH_PATHS = new Set(["relationships"]);

export function getGlitchSectionForPath(path: string): GlitchEditSection {
  const subPagePath = parseSubPageGlitchPath(path);
  const fieldPath = subPagePath?.fieldPath ?? path;

  if (RECORD_GLITCH_PATHS.has(fieldPath) || fieldPath.startsWith("settingSections.")) {
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

export type GlitchFieldOption = {
  path: string;
  label: string;
  hasGlitch: boolean;
};

export type GlitchFieldOptionGroup = {
  id: string;
  label: string;
  options: GlitchFieldOption[];
};

function buildBaseGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  const staticOptions = BASE_GLITCH_FIELD_PATHS.map((path) => ({
    path,
    label: GLITCH_FIELD_LABELS[path],
    hasGlitch: Boolean(textGlitch[path]),
  }));

  const profileOptions = draft.profileFields.map((field, index) => {
    const path = profileFieldGlitchPath(field.id);
    return {
      path,
      label: field.label.trim() || getProfileFieldLabel(field.id, draft.profileFields) || `프로필 ${index + 1}`,
      hasGlitch: Boolean(textGlitch[path]),
    };
  });

  return [...staticOptions, ...profileOptions];
}

function buildRecordBoxGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOption[] {
  return draft.settingSections.map((section, index) => {
    const path = settingSectionGlitchPath(section.id);
    return {
      path,
      label: section.title.trim() || `레코드 박스 ${index + 1}`,
      hasGlitch: Boolean(textGlitch[path]),
    };
  });
}

function buildSubPageGlitchFieldOptions(subPage: CharacterSubPage): GlitchFieldOption[] {
  const subGlitch = subPage.textGlitch ?? {};
  const options: GlitchFieldOption[] = [];

  SUB_PAGE_GLITCH_FIELD_PATHS.forEach((fieldPath) => {
    const path = subPageFieldGlitchPath(subPage.id, fieldPath);
    options.push({
      path,
      label: GLITCH_FIELD_LABELS[fieldPath],
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  subPage.profileFields.forEach((field, index) => {
    const fieldPath = profileFieldGlitchPath(field.id);
    options.push({
      path: subPageFieldGlitchPath(subPage.id, fieldPath),
      label: field.label.trim() || getProfileFieldLabel(field.id, subPage.profileFields) || `프로필 ${index + 1}`,
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  subPage.settingSections?.forEach((section, index) => {
    const fieldPath = settingSectionGlitchPath(section.id);
    options.push({
      path: subPageFieldGlitchPath(subPage.id, fieldPath),
      label: section.title.trim() || `레코드 박스 ${index + 1}`,
      hasGlitch: Boolean(subGlitch[fieldPath]),
    });
  });

  return options;
}

export function buildGlitchFieldOptionGroups(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
): GlitchFieldOptionGroup[] {
  const groups: GlitchFieldOptionGroup[] = [
    {
      id: "basics",
      label: "본 페이지",
      options: buildBaseGlitchFieldOptions(draft, textGlitch),
    },
  ];

  const recordBoxOptions = buildRecordBoxGlitchFieldOptions(draft, textGlitch);
  if (recordBoxOptions.length > 0) {
    groups.push({
      id: "record-boxes",
      label: "레코드 박스",
      options: recordBoxOptions,
    });
  }

  draft.subPages.forEach((subPage, subIndex) => {
    const options = buildSubPageGlitchFieldOptions(subPage);
    if (options.length === 0) {
      return;
    }

    groups.push({
      id: `subpage-${subPage.id}`,
      label: subPage.title.trim() || `상세 페이지 ${subIndex + 1}`,
      options,
    });
  });

  return groups;
}

export function buildGlitchFieldOptions(
  draft: CharacterDraft,
  textGlitch: Record<string, FieldGlitchConfig>,
) {
  return buildGlitchFieldOptionGroups(draft, textGlitch).flatMap((group) =>
    group.options.map((option) => ({
      ...option,
      label: group.id === "basics" || group.id === "record-boxes"
        ? option.label
        : `${group.label} · ${option.label}`,
    })),
  );
}

export function countDraftGlitchFields(draft: CharacterDraft) {
  let count = Object.keys(draft.textGlitch).length;

  for (const subPage of draft.subPages) {
    count += Object.keys(subPage.textGlitch ?? {}).length;
  }

  return count;
}

export function getDraftGlitchConfig(draft: CharacterDraft, path: string) {
  const subPagePath = parseSubPageGlitchPath(path);
  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    return subPage?.textGlitch?.[subPagePath.fieldPath];
  }

  return draft.textGlitch[path];
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
    errorDisplayMode: glitch.errorDisplayMode,
    builtinTokens: glitch.builtinTokens,
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
        linkTarget: zone.linkTarget,
        linkSubPageId: zone.linkSubPageId,
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
  const normalized = config ? normalizeFieldGlitchConfig(config) : undefined;
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    return {
      ...draft,
      subPages: draft.subPages.map((subPage) => {
        if (subPage.id !== subPagePath.subPageId) {
          return subPage;
        }

        const nextGlitch = { ...(subPage.textGlitch ?? {}) };

        if (!normalized) {
          delete nextGlitch[subPagePath.fieldPath];
        } else {
          nextGlitch[subPagePath.fieldPath] = normalized;
        }

        return {
          ...subPage,
          textGlitch: nextGlitch,
        };
      }),
    };
  }

  const nextGlitch = { ...draft.textGlitch };

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
  const subPagePath = parseSubPageGlitchPath(path);

  if (subPagePath) {
    const subPage = findSubPageInDraft(draft, subPagePath.subPageId);
    if (!subPage) {
      return draft;
    }

    const nextSubPage = setSubPageFieldValue(subPage, subPagePath.fieldPath, value);
    const reanchored = reanchorGlitchConfig(value, subPage.textGlitch?.[subPagePath.fieldPath]);
    const normalized = reanchored ? normalizeFieldGlitchConfig(reanchored) : undefined;
    const nextGlitch = { ...(subPage.textGlitch ?? {}) };

    if (normalized) {
      nextGlitch[subPagePath.fieldPath] = normalized;
    } else {
      delete nextGlitch[subPagePath.fieldPath];
    }

    return {
      ...draft,
      subPages: draft.subPages.map((entry) =>
        entry.id === subPagePath.subPageId ? { ...nextSubPage, textGlitch: nextGlitch } : entry,
      ),
    };
  }

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
