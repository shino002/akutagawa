import type { SettingSection, ProfileField } from "@/lib/types";
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
  profileFields: ProfileField[];
  settingSections: SettingSection[];
  relationshipsText: string;
  textGlitch: Record<string, FieldGlitchConfig>;
  subPages: CharacterSubPage[];
  pairMemberIds: string[];
  bgmUrl: string;
};
