import type { SettingSection, ProfileField, RelationshipEntry, CaseFileDetailTheme } from "@/lib/types";
import type { CharacterKind, FieldGlitchConfig, CharacterSubPage } from "@/lib/types";

export type CharacterDraft = {
  id: string;
  kind: CharacterKind;
  name: string;
  kanjiName: string;
  statusTagsText: string;
  classification: string;
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
};
