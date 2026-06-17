import { normalizeSettingSections } from "@/lib/setting-sections";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import {
  createDefaultProfileFields,
  normalizeProfileFields,
  profileFieldsHaveContent,
} from "@/lib/profile-fields";
import type { Character, ProfileField } from "@/lib/types";
import { normalizeWorldEntries, normalizeWorks } from "@/utils/normalizers";

/** 예전 페어 구현에서 멤버 프로필을 인라인으로 넣어 둔 구조 */
export type LegacyInlinePairMember = Partial<Character> & {
  id?: string;
  /** @deprecated profileFields 사용 */
  profile?: {
    age?: string;
    height?: string;
    role?: string;
    keyword?: string;
  };
};

function getLegacyPairMembers(character: Character): LegacyInlinePairMember[] {
  const raw = (character as Character & { pairMembers?: unknown }).pairMembers;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (member): member is LegacyInlinePairMember => Boolean(member && typeof member === "object"),
  );
}

function getMemberProfileFields(member: LegacyInlinePairMember): ProfileField[] {
  return normalizeProfileFields(member.profileFields, member.profile, { useDefaultsWhenEmpty: false });
}

function memberHasRecoverableBasics(member: LegacyInlinePairMember) {
  return (
    Boolean(member.quote?.trim()) ||
    Boolean(member.subtitle?.trim()) ||
    normalizeSettingSections(member.settingSections).length > 0 ||
    profileFieldsHaveContent(getMemberProfileFields(member)) ||
    Boolean(member.textGlitch && Object.keys(member.textGlitch).length > 0)
  );
}

function topLevelBasicsEmpty(character: Character) {
  return (
    !character.quote?.trim() &&
    !character.subtitle?.trim() &&
    normalizeSettingSections(character.settingSections).length === 0 &&
    !(character.settings?.length ?? 0) &&
    !profileFieldsHaveContent(character.profileFields) &&
    !(character.relationships?.length ?? 0)
  );
}

export function canRecoverFromLegacyPairMembers(character: Character, memberIndex = 0) {
  const member = getLegacyPairMembers(character)[memberIndex];
  if (!member || !memberHasRecoverableBasics(member)) {
    return false;
  }

  return topLevelBasicsEmpty(character);
}

export function recoverCharacterFromLegacyPairMember(
  character: Character,
  memberIndex = 0,
): Character | null {
  const member = getLegacyPairMembers(character)[memberIndex];
  if (!member || !canRecoverFromLegacyPairMembers(character, memberIndex)) {
    return null;
  }

  const recoveredImages =
    (character.images?.length ?? 0) > 0 ? character.images! : (member.images ?? []);
  const recoveredWorks =
    (character.works?.length ?? 0) > 0 ? character.works! : normalizeWorks(member.works);
  const recoveredWorldEntries =
    normalizeWorldEntries(character.worldEntries).length > 0
      ? normalizeWorldEntries(character.worldEntries)
      : normalizeWorldEntries(member.worldEntries);
  const recoveredSettingSections = normalizeSettingSections(
    normalizeSettingSections(character.settingSections).length > 0
      ? character.settingSections
      : member.settingSections,
  );
  const recoveredRelationships =
    (character.relationships?.length ?? 0) > 0
      ? character.relationships
      : (member.relationships ?? []);
  const recoveredTextGlitch =
    character.textGlitch && Object.keys(character.textGlitch).length > 0
      ? character.textGlitch
      : normalizeTextGlitch(member.textGlitch);
  const memberProfileFields = getMemberProfileFields(member);
  const recoveredProfileFields = profileFieldsHaveContent(character.profileFields)
    ? character.profileFields
    : memberProfileFields.length > 0
      ? memberProfileFields
      : createDefaultProfileFields();

  return {
    ...character,
    name: character.name.trim() || member.name?.trim() || character.name,
    kanjiName: character.kanjiName?.trim() ? character.kanjiName : (member.kanjiName ?? ""),
    subtitle: character.subtitle?.trim() ? character.subtitle : (member.subtitle ?? ""),
    quote: character.quote?.trim() ? character.quote : (member.quote ?? ""),
    palette: member.palette?.trim() || character.palette,
    profileFields: recoveredProfileFields,
    settingSections: recoveredSettingSections,
    relationships: recoveredRelationships,
    images: recoveredImages,
    works: recoveredWorks,
    worldEntries: recoveredWorldEntries,
    textGlitch: recoveredTextGlitch,
  };
}
