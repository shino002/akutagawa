"use client";

import { useCallback, useMemo, useState } from "react";
import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import { useAdminHistoryNavigation } from "@/hooks/useAdminHistoryNavigation";
import { useBgmTrackAdmin } from "@/hooks/useBgmTrackAdmin";
import { useDiaryAdmin } from "@/hooks/useDiaryAdmin";
import { useExtractBannerAdmin } from "@/hooks/useExtractBannerAdmin";
import { useWorldAdmin } from "@/hooks/useWorldAdmin";
import { createAdminHistoryState } from "@/lib/admin-history";
import { bgmTrackDraftFromTrack } from "@/lib/bgm-catalog";
import { characterToDraft, createBlankDraft, type CharacterDraft } from "@/lib/character-draft";
import { normalizeCharacterKind } from "@/lib/character-kind";
import { extractBannerDraftFromBanner } from "@/lib/personal-home-banners";
import type { Character, CharacterKind } from "@/lib/types";
import type { AdminCategory, AdminHistoryState, AdminPanel } from "@/types/admin.types";
import { normalizeWorldEntries } from "@/utils/normalizers";
import type { Dispatch, SetStateAction } from "react";

type UseAdminPanelHistoryOptions = {
  charactersRef: { current: Character[] };
  activeCharacterId: string;
  setActiveCharacterId: Dispatch<SetStateAction<string>>;
  activeCharacterKind: CharacterKind;
  setActiveCharacterKind: Dispatch<SetStateAction<CharacterKind>>;
  activeSubPageId: string;
  setActiveSubPageId: Dispatch<SetStateAction<string>>;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  characterEditSection: CharacterEditSection;
  setCharacterEditSection: Dispatch<SetStateAction<CharacterEditSection>>;
  activeCharacterWorldId: string;
  setActiveCharacterWorldId: Dispatch<SetStateAction<string>>;
  setWorldSettingsText: Dispatch<SetStateAction<string>>;
  setWorldWorkDraft: Dispatch<
    SetStateAction<{ title: string; kind: string; date: string; body: string }>
  >;
  resetCharacterGlitch: () => void;
};

/**
 * 관리자 패널/카테고리 선택과 브라우저 history 복원을 묶습니다.
 */
export const useAdminPanelHistory = ({
  charactersRef,
  activeCharacterId,
  setActiveCharacterId,
  activeCharacterKind,
  setActiveCharacterKind,
  activeSubPageId,
  setActiveSubPageId,
  setDraft,
  characterEditSection,
  setCharacterEditSection,
  activeCharacterWorldId,
  setActiveCharacterWorldId,
  setWorldSettingsText,
  setWorldWorkDraft,
  resetCharacterGlitch,
}: UseAdminPanelHistoryOptions) => {
  const [adminPanel, setAdminPanel] = useState<AdminPanel>("categories");
  const [activeCategory, setActiveCategory] = useState<AdminCategory>("home");

  const { diaryEntriesRef, activeDiaryId, setActiveDiaryId, setDiaryDraft } = useDiaryAdmin();
  const {
    extractBannersRef,
    activeExtractBannerId,
    setActiveExtractBannerId,
    setExtractBannerDraft,
  } = useExtractBannerAdmin();
  const { bgmTracksRef, activeBgmTrackId, setActiveBgmTrackId, setBgmTrackDraft } =
    useBgmTrackAdmin();
  const { worldsRef, activeWorldId, setActiveWorldId, selectWorld } = useWorldAdmin();

  const applyAdminHistoryState = useCallback(
    (snapshot: AdminHistoryState) => {
      setAdminPanel(snapshot.panel);
      setActiveCategory(snapshot.category);
      setActiveCharacterKind(snapshot.characterKind);
      setCharacterEditSection(snapshot.editSection);
      setActiveDiaryId(snapshot.diaryId);
      setActiveExtractBannerId(snapshot.extractBannerId);
      setActiveBgmTrackId(snapshot.bgmTrackId);
      setActiveWorldId(snapshot.worldId);
      resetCharacterGlitch();

      if (snapshot.characterId) {
        const character = charactersRef.current.find((entry) => entry.id === snapshot.characterId);
        setActiveCharacterId(snapshot.characterId);
        if (character) {
          const nextDraft = characterToDraft(character);
          setDraft(nextDraft);
          setActiveSubPageId(snapshot.subPageId || nextDraft.subPages[0]?.id || "");
          setActiveCharacterKind(normalizeCharacterKind(character.kind));
        } else {
          setActiveSubPageId(snapshot.subPageId);
        }
      } else {
        setActiveCharacterId("");
        setActiveSubPageId(snapshot.subPageId);
        if (snapshot.panel === "characters") {
          setDraft(createBlankDraft(snapshot.characterKind));
        }
      }

      if (snapshot.diaryId) {
        const entry = diaryEntriesRef.current.find((item) => item.id === snapshot.diaryId);
        if (entry) {
          setDiaryDraft(entry);
        }
      }

      if (snapshot.extractBannerId) {
        const banner = extractBannersRef.current.find(
          (item) => item.id === snapshot.extractBannerId,
        );
        if (banner) {
          setExtractBannerDraft(extractBannerDraftFromBanner(banner));
        }
      }

      if (snapshot.bgmTrackId) {
        const track = bgmTracksRef.current.find((item) => item.id === snapshot.bgmTrackId);
        if (track) {
          setBgmTrackDraft(bgmTrackDraftFromTrack(track));
        }
      }

      if (snapshot.worldId) {
        const world = worldsRef.current.find((item) => item.id === snapshot.worldId);
        if (world) {
          selectWorld(world);
        }
      }

      if (snapshot.characterWorldId && snapshot.characterId) {
        const character = charactersRef.current.find((entry) => entry.id === snapshot.characterId);
        const worldEntry = character
          ? normalizeWorldEntries(character.worldEntries).find(
              (entry) => entry.worldId === snapshot.characterWorldId,
            )
          : undefined;
        setActiveCharacterWorldId(snapshot.characterWorldId);
        setWorldSettingsText(worldEntry?.settings.join("\n") ?? "");
        setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
      } else {
        setActiveCharacterWorldId(snapshot.characterWorldId);
        if (!snapshot.characterWorldId) {
          setWorldSettingsText("");
        }
      }
    },
    [
      bgmTracksRef,
      charactersRef,
      diaryEntriesRef,
      extractBannersRef,
      resetCharacterGlitch,
      selectWorld,
      setActiveBgmTrackId,
      setActiveCharacterId,
      setActiveCharacterKind,
      setActiveCharacterWorldId,
      setActiveDiaryId,
      setActiveExtractBannerId,
      setActiveSubPageId,
      setActiveWorldId,
      setBgmTrackDraft,
      setCharacterEditSection,
      setDiaryDraft,
      setDraft,
      setExtractBannerDraft,
      setWorldSettingsText,
      setWorldWorkDraft,
      worldsRef,
    ],
  );

  const adminHistoryState = useMemo(
    () =>
      createAdminHistoryState({
        panel: adminPanel,
        category: activeCategory,
        characterKind: activeCharacterKind,
        characterId: activeCharacterId,
        editSection: characterEditSection,
        subPageId: activeSubPageId,
        diaryId: activeDiaryId,
        extractBannerId: activeExtractBannerId,
        bgmTrackId: activeBgmTrackId,
        worldId: activeWorldId,
        characterWorldId: activeCharacterWorldId,
      }),
    [
      activeBgmTrackId,
      activeCategory,
      activeCharacterId,
      activeCharacterKind,
      activeCharacterWorldId,
      activeDiaryId,
      activeExtractBannerId,
      activeSubPageId,
      activeWorldId,
      adminPanel,
      characterEditSection,
    ],
  );

  useAdminHistoryNavigation({
    enabled: true,
    state: adminHistoryState,
    applyState: applyAdminHistoryState,
  });

  return {
    adminPanel,
    setAdminPanel,
    activeCategory,
    setActiveCategory,
  };
};
