import type { SettingSection } from "@/lib/types";
import type { FieldGlitchConfig } from "@/lib/types";

export type CharacterDraft = {
  id: string;
  name: string;
  kanjiName: string;
  statusTagsText: string;
  classification: string;
  subtitle: string;
  quote: string;
  palette: string;
  age: string;
  height: string;
  role: string;
  keyword: string;
  settingsText: string;
  settingSections: SettingSection[];
  relationshipsText: string;
  textGlitch: Record<string, FieldGlitchConfig>;
  bgmUrl: string;
};
