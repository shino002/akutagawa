"use client";

import { type Dispatch, type SetStateAction } from "react";
import { moveSettingSection as reorderSettingSection } from "@/lib/setting-sections";
import type { SettingSection } from "@/lib/types";
import type { CharacterDraft } from "@/types/character-draft.types";

type UseSettingSectionsParams = {
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
};

/**
 * draft 설정 섹션 추가·수정·삭제·순서 이동을 담당합니다.
 */
export const useSettingSections = ({ setDraft }: UseSettingSectionsParams) => {
  const addSettingSection = () => {
    setDraft((current) => ({
      ...current,
      settingSections: [
        ...current.settingSections,
        {
          id: crypto.randomUUID(),
          title: "",
          body: "",
        },
      ],
    }));
  };

  const updateSettingSection = (
    id: string,
    updates: Partial<Pick<SettingSection, "title" | "body" | "kind" | "excerpt">>,
  ) => {
    setDraft((current) => ({
      ...current,
      settingSections: current.settingSections.map((section) =>
        section.id === id ? { ...section, ...updates } : section,
      ),
    }));
  };

  const removeSettingSection = (id: string) => {
    setDraft((current) => ({
      ...current,
      settingSections: current.settingSections.filter((section) => section.id !== id),
    }));
  };

  const moveSettingSection = (id: string, direction: "up" | "down") => {
    setDraft((current) => ({
      ...current,
      settingSections: reorderSettingSection(current.settingSections, id, direction),
    }));
  };

  return {
    addSettingSection,
    updateSettingSection,
    removeSettingSection,
    moveSettingSection,
  };
};
