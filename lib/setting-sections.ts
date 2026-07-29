import type { SettingSection } from "@/lib/types";

/* 예전 저장본에 남아 있는 키들 — 읽을 때 흘려보냅니다.
   kind/excerpt 는 story 모드를 걷어내면서 쓰지 않게 됐고,
   content/text 는 body 이전 이름입니다. */
type RawSettingSection = SettingSection & {
  content?: string;
  text?: string;
  kind?: string;
  excerpt?: string;
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

export function moveSettingSection(
  sections: SettingSection[],
  sectionId: string,
  direction: "up" | "down",
): SettingSection[] {
  const index = sections.findIndex((section) => section.id === sectionId);
  if (index === -1) {
    return sections;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const next = [...sections];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
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
