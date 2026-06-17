import type { SettingSection } from "@/lib/types";

type RawSettingSection = SettingSection & {
  content?: string;
  text?: string;
};

export function normalizeSettingSections(sections: SettingSection[] | undefined): SettingSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section, index) => {
      const raw = section as RawSettingSection;

      return {
        id: raw.id || `setting-section-${index}`,
        title: raw.title?.trim() ?? "",
        body: (raw.body ?? raw.content ?? raw.text ?? "").trim(),
      };
    })
    .filter((section) => section.title || section.body);
}

export function legacySettingsToSections(settings: string[]): SettingSection[] {
  return settings
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const colonMatch = line.match(/^([^:]{1,40}):\s*(.+)$/);

      if (colonMatch) {
        return {
          id: `legacy-setting-${index}`,
          title: colonMatch[1].trim(),
          body: colonMatch[2].trim(),
        };
      }

      return {
        id: `legacy-setting-${index}`,
        title: `RECORD ${String(index + 1).padStart(2, "0")}`,
        body: line,
      };
    });
}

export function resolveDraftSettingSections(
  settingSections: SettingSection[] | undefined,
  settings: string[] | undefined,
) {
  const normalized = normalizeSettingSections(settingSections);
  const legacyLines = (settings ?? []).map((line) => line.trim()).filter(Boolean);

  if (normalized.length > 0) {
    return {
      settingSections: normalized,
      migratedFromLegacy: false,
    };
  }

  if (legacyLines.length > 0) {
    return {
      settingSections: legacySettingsToSections(legacyLines),
      migratedFromLegacy: true,
    };
  }

  return {
    settingSections: [],
    migratedFromLegacy: false,
  };
}
