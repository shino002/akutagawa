import type {
  CaseFileDetailTheme,
  CaseMetaField,
  CharacterKind,
  CharacterSubPage,
  FieldGlitchConfig,
  ProfileField,
  RelationshipEntry,
  SettingSection,
} from "@/lib/types";
import type { ClearanceGrade } from "@/lib/clearance";

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
  /** 문서 열람등급 (X/S/A/B/C) — lib/clearance.ts */
  clearance: ClearanceGrade;
};
