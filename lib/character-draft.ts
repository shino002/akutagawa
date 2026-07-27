import { resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import { compactCaseFileDetailTheme } from "@/lib/case-file-theme";
import { normalizeCharacterKind } from "@/lib/character-kind";
import { DEFAULT_CHARACTER_PALETTE, normalizeCharacterPaletteInput } from "@/lib/character-palette";
import { compactDraftTextGlitch, compactSubPageTextGlitch } from "@/lib/glitch-fields";
import {
  metaFieldsHaveContent,
  migrateLegacyMetaFieldGlitch,
  normalizeMetaFields,
  resolveMetaFields,
} from "@/lib/meta-fields";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import {
  formatPairDisplayName,
  normalizePairMemberIds,
  resolvePairMemberIds,
} from "@/lib/pair-members";
import { createDefaultProfileFields, profileFieldsHaveContent } from "@/lib/profile-fields";
import {
  normalizeRelationshipEntries,
  relationshipEntriesHaveContent,
  relationshipEntriesToLegacyLines,
  resolveRelationshipEntries,
} from "@/lib/relationship-entries";
import { normalizeSettingSections, resolveDraftSettingSections } from "@/lib/setting-sections";
import { compactSubPageForStorage, normalizeSubPages } from "@/lib/sub-pages";
import type {
  CaseFileDetailTheme,
  CaseMetaField,
  Character,
  CharacterKind,
  CharacterSubPage,
  CharacterWorldEntry,
  FieldGlitchConfig,
  ProfileField,
  RelationshipEntry,
  SettingSection,
  UploadedImage,
  Work,
} from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

export type CharacterDraft = {
  id: string;
  kind: CharacterKind;
  name: string;
  kanjiName: string;
  metaFields: CaseMetaField[];
  subtitle: string;
  quote: string;
  palette: string;
  detailTheme?: CaseFileDetailTheme;
  profileFields: ProfileField[];
  settingSections: SettingSection[];
  relationshipEntries: RelationshipEntry[];
  textGlitch: Record<string, FieldGlitchConfig>;
  subPages: CharacterSubPage[];
  pairMemberIds: string[];
  bgmUrl: string;
  confidential: boolean;
};

/**
 * Firestore 자캐 문서를 관리자 편집 폼용 draft로 변환합니다.
 */
export const characterToDraft = (character: Character): CharacterDraft => {
  const { settingSections } = resolveDraftSettingSections(
    character.settingSections,
    character.settings,
  );
  const { relationshipEntries } = resolveRelationshipEntries(
    character.relationshipEntries,
    character.relationships,
  );

  return {
    id: character.id,
    kind: normalizeCharacterKind(character.kind),
    name: character.name,
    kanjiName: character.kanjiName ?? "",
    metaFields: resolveMetaFields(character),
    subtitle: character.subtitle,
    quote: character.quote,
    palette: character.palette,
    detailTheme: character.detailTheme,
    profileFields: character.profileFields,
    settingSections,
    relationshipEntries,
    textGlitch: migrateLegacyMetaFieldGlitch(
      normalizeTextGlitch(character.textGlitch),
      resolveMetaFields(character),
    ),
    subPages: normalizeSubPages(character.subPages),
    pairMemberIds: resolvePairMemberIds(character),
    bgmUrl: character.bgmUrl ?? "",
    confidential: Boolean(character.confidential),
  };
};

/**
 * 예전 관계 목록을 카드로 마이그레이션했을 때 관리자에게 보여줄 안내 문구입니다.
 */
export const getLegacyRelationshipsMigrationNotice = (character: Character): string | null => {
  const resolved = resolveRelationshipEntries(
    character.relationshipEntries,
    character.relationships,
  );
  return resolved.migratedFromLegacy
    ? "예전 관계 목록을 관계 카드로 불러왔어요. 아래 내용을 확인한 뒤 「본 페이지에 저장」을 눌러주세요."
    : null;
};

/**
 * 예전 상세 설정을 레코드 박스로 마이그레이션했을 때 관리자에게 보여줄 안내 문구입니다.
 */
export const getLegacySettingsMigrationNotice = (character: Character): string | null => {
  const resolved = resolveDraftSettingSections(character.settingSections, character.settings);
  return resolved.migratedFromLegacy
    ? "예전 상세 설정을 레코드 박스로 불러왔어요. 아래 내용을 확인한 뒤 「본 페이지에 저장」을 눌러주세요."
    : null;
};

/**
 * draft 기본 정보(인용·프로필·관계·설정 등)가 비어 있는지 판별합니다.
 */
export const draftBasicsLookEmpty = (draft: CharacterDraft): boolean => {
  return (
    !draft.quote.trim() &&
    !draft.subtitle.trim() &&
    !profileFieldsHaveContent(draft.profileFields) &&
    !draft.kanjiName.trim() &&
    !metaFieldsHaveContent(draft.metaFields) &&
    !relationshipEntriesHaveContent(draft.relationshipEntries) &&
    normalizeSettingSections(draft.settingSections).length === 0
  );
};

/**
 * draft 기본 정보에 내용이 있는지 판별합니다.
 */
export const draftBasicsHaveContent = (draft: CharacterDraft): boolean => {
  return !draftBasicsLookEmpty(draft);
};

/**
 * 분류만 바꾸다 빈 폼이 저장되며 카드·레코드가 지워지는 실수를 막습니다.
 */
export const mergeDraftForKindMigration = (
  draft: CharacterDraft,
  existing: Character,
): CharacterDraft => {
  const existingDraft = characterToDraft(existing);
  const kindChanged = normalizeCharacterKind(draft.kind) !== normalizeCharacterKind(existing.kind);

  if (!kindChanged || !draftBasicsLookEmpty(draft) || !draftBasicsHaveContent(existingDraft)) {
    return draft;
  }

  return {
    ...existingDraft,
    kind: draft.kind,
    id: draft.id.trim() || existingDraft.id,
    name: draft.name.trim() || existingDraft.name,
    pairMemberIds: draft.kind === "pair" ? existingDraft.pairMemberIds : ["", ""],
    textGlitch:
      Object.keys(draft.textGlitch).length > 0 ? draft.textGlitch : existingDraft.textGlitch,
    subPages: draft.subPages.length > 0 ? draft.subPages : existingDraft.subPages,
    bgmUrl: draft.bgmUrl.trim() ? draft.bgmUrl : existingDraft.bgmUrl,
  };
};

// Firestore 문서와 관리자 입력 폼 사이를 오가는 변환 함수들입니다.
/**
 * 빈 자캐 편집 draft를 만듭니다.
 */
export const createBlankDraft = (kind: CharacterKind = "oc"): CharacterDraft => {
  return {
    id: "",
    kind,
    name: "",
    kanjiName: "",
    metaFields: [],
    subtitle: "",
    quote: "",
    palette: DEFAULT_CHARACTER_PALETTE,
    profileFields: createDefaultProfileFields(),
    settingSections: [],
    relationshipEntries: [],
    textGlitch: {},
    subPages: [],
    pairMemberIds: ["", ""],
    bgmUrl: "",
    confidential: false,
  };
};

/**
 * 관리자 draft를 Firestore에 저장할 Character 문서로 변환합니다.
 */
export const draftToCharacter = (
  draft: CharacterDraft,
  currentWorks: Work[] = [],
  currentImages: UploadedImage[] = [],
  currentWorldEntries: CharacterWorldEntry[] = [],
  _existingCharacter?: Character,
  allCharacters: Character[] = [],
): Character => {
  const name = draft.name.trim();
  const id = slugifyId(draft.id || name);
  const kind = normalizeCharacterKind(draft.kind);

  const textGlitch = compactDraftTextGlitch(draft.textGlitch, draft);
  const bgmUrl = resolveCharacterBgmUrl(draft.bgmUrl);

  const characterBase: Character = {
    id,
    kind,
    name,
    kanjiName: draft.kanjiName.trim(),
    metaFields: normalizeMetaFields(draft.metaFields),
    subtitle: draft.subtitle.trim(),
    quote: draft.quote.trim(),
    palette: normalizeCharacterPaletteInput(draft.palette),
    profileFields: draft.profileFields.map((field) => ({
      id: field.id,
      label: field.label.trim(),
      value: field.value.trim(),
    })),
    settings: [],
    settingSections: normalizeSettingSections(draft.settingSections),
    relationships: relationshipEntriesToLegacyLines(draft.relationshipEntries),
    relationshipEntries: normalizeRelationshipEntries(draft.relationshipEntries),
    images: currentImages,
    works: currentWorks,
    worldEntries: currentWorldEntries,
    subPages: normalizeSubPages(draft.subPages).map((subPage) => {
      const compacted = compactSubPageForStorage(subPage);
      const subPageGlitch = compactSubPageTextGlitch(compacted);
      const subPageBgmUrl = resolveCharacterBgmUrl(compacted.bgmUrl);
      const nextSubPage = {
        ...compacted,
        relationshipEntries: normalizeRelationshipEntries(
          compacted.relationshipEntries,
          compacted.relationships,
        ),
        relationships: relationshipEntriesToLegacyLines(
          normalizeRelationshipEntries(compacted.relationshipEntries, compacted.relationships),
        ),
        ...(compactCaseFileDetailTheme(compacted.detailTheme)
          ? { detailTheme: compactCaseFileDetailTheme(compacted.detailTheme) }
          : {}),
        ...(subPageBgmUrl ? { bgmUrl: subPageBgmUrl } : {}),
      };
      return subPageGlitch ? { ...nextSubPage, textGlitch: subPageGlitch } : nextSubPage;
    }),
  };

  if (kind === "pair") {
    const pairMemberIds = normalizePairMemberIds(draft.pairMemberIds);
    const pairCharacter: Character = {
      ...characterBase,
      name: name || formatPairDisplayName({ ...characterBase, pairMemberIds }, allCharacters),
      pairMemberIds,
    };

    return {
      ...pairCharacter,
      ...(bgmUrl ? { bgmUrl } : {}),
      ...(draft.confidential ? { confidential: true } : {}),
      ...(textGlitch ? { textGlitch } : {}),
      ...(compactCaseFileDetailTheme(draft.detailTheme)
        ? { detailTheme: compactCaseFileDetailTheme(draft.detailTheme) }
        : {}),
    };
  }

  const character: Character = {
    ...characterBase,
    ...(bgmUrl ? { bgmUrl } : {}),
    ...(draft.confidential ? { confidential: true } : {}),
    ...(textGlitch ? { textGlitch } : {}),
    ...(compactCaseFileDetailTheme(draft.detailTheme)
      ? { detailTheme: compactCaseFileDetailTheme(draft.detailTheme) }
      : {}),
  };

  return character;
};
