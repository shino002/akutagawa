"use client";

import { useEffect, useRef, useState } from "react";
import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import type { CharactersAdminContextValue } from "@/contexts/CharactersAdminContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminUploads } from "@/hooks/useAdminUploads";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import { useBgmTrackAdmin } from "@/hooks/useBgmTrackAdmin";
import { useCharacterDraft } from "@/hooks/useCharacterDraft";
import { useCharacterGlitchBinding } from "@/hooks/useCharacterGlitchBinding";
import { useCharacterImages } from "@/hooks/useCharacterImages";
import { useCharacterWorks } from "@/hooks/useCharacterWorks";
import { useCharacterWorldLink } from "@/hooks/useCharacterWorldLink";
import { useGlitchFieldEditing } from "@/hooks/useGlitchFieldEditing";
import { useSettingSections } from "@/hooks/useSettingSections";
import { useWorldAdmin } from "@/hooks/useWorldAdmin";

/**
 * 캐릭터 관리에 필요한 훅·폼 상태·세계관/이미지 액션을 한 곳에서 묶습니다.
 * Provider가 한 번만 호출하고 context로 하위 섹션에 공유합니다.
 */
export const useCharactersAdminState = (): CharactersAdminContextValue => {
  const { isAdmin } = useAdminAuth();
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [characterEditSection, setCharacterEditSection] = useState<CharacterEditSection>("basics");
  const clearPendingUploadsRef = useRef(() => {});

  const worldLinkRef = useRef<{ resetWorldForm: () => void }>({
    resetWorldForm: () => {},
  });

  const {
    characters,
    charactersRef,
    activeCharacterId,
    setActiveCharacterId,
    activeCharacterKind,
    setActiveCharacterKind,
    activeSubPageId,
    setActiveSubPageId,
    draft,
    setDraft,
    workDraft,
    setWorkDraft,
    activeCharacter,
    filteredCharacters,
    pairLinkableCharacters,
    canRecoverLegacyPairMember,
    kindLabel,
    isPairDraft,
    selectCharacterFromList,
    startNewCharacter,
    handleActiveKindChange,
    reloadCharacterFromServer,
    saveCharacter,
    recoverLegacyPairMemberData,
    deleteCharacter,
  } = useCharacterDraft({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
    clearPendingUploads: () => {
      clearPendingUploadsRef.current();
    },
    onCharacterNavigation: () => {
      setCharacterEditSection("basics");
      worldLinkRef.current.resetWorldForm();
    },
  });

  const {
    worldWorkImageFiles,
    setWorldWorkImageFiles,
    workImageFiles,
    setWorkImageFiles,
    imageUploadCategory,
    setImageUploadCategory,
    imageUploadWorldId,
    setImageUploadWorldId,
    isUploading,
    pendingUploads,
    clearPendingUploads,
    selectPendingImages,
    updatePendingUpload,
    startThumbnailDrag,
    moveThumbnailDrag,
    stopThumbnailDrag,
    zoomThumbnail,
    removePendingUpload,
    uploadWorkImages,
    uploadPendingImages,
  } = useAdminUploads({
    isAdmin,
    onNotice: setNotice,
    onPaletteExtracted: (palette) => {
      setDraft((current) => ({ ...current, palette }));
    },
  });
  useEffect(() => {
    clearPendingUploadsRef.current = clearPendingUploads;
  }, [clearPendingUploads]);

  const { quickAddCharacterBgm } = useBgmTrackAdmin({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
  });
  const { worlds } = useWorldAdmin();

  const characterGlitch = useGlitchFieldEditing();
  const {
    activePath: activeGlitchFieldPath,
    setActivePath: setActiveGlitchFieldPath,
    selection: glitchFieldSelection,
    setSelection: setGlitchFieldSelection,
    anchorElement: glitchFieldAnchorElement,
    setAnchorElement: setGlitchFieldAnchorElement,
    reset: resetCharacterGlitch,
    selectPath: selectGlitchField,
    anchorRef: glitchFieldAnchorRef,
    mountedRef: characterGlitchMountedRef,
  } = characterGlitch;

  const { characterOptions: bgmCharacterOptions } = useBgmCatalog();

  const {
    setActiveCharacterWorldId,
    worldSettingsText,
    setWorldSettingsText,
    worldWorkDraft,
    setWorldWorkDraft,
    resolvedCharacterWorldId,
    activeCharacterWorldEntry,
    resetWorldForm,
    selectCharacterWorld,
    saveCharacterWorldSettings,
    addWorldWork,
    deleteWorldWork,
    deleteCharacterWorldEntry,
  } = useCharacterWorldLink({
    isAdmin,
    activeCharacter,
    worlds,
    setNotice,
    setIsSaving,
    worldWorkImageFiles,
    setWorldWorkImageFiles,
    uploadWorkImages,
  });

  useEffect(() => {
    worldLinkRef.current = { resetWorldForm };
  }, [resetWorldForm]);

  const {
    glitchFieldPickerGroups,
    activeGlitchLabel,
    glitchFieldCount,
    subPageCount,
    bindGlitchField,
    applyGlitchFromToolbar,
  } = useCharacterGlitchBinding({
    isAdmin,
    draft,
    setDraft,
    setNotice,
    activeGlitchFieldPath,
    setActiveGlitchFieldPath,
    setGlitchFieldSelection,
    setGlitchFieldAnchorElement,
    glitchFieldAnchorRef,
    characterGlitchMountedRef,
  });

  const { addSettingSection, updateSettingSection, removeSettingSection, moveSettingSection } =
    useSettingSections({ setDraft });

  const { uploadImages, deleteImage, updateImageInfo, deleteWorldImage, updateWorldImageInfo } =
    useCharacterImages({
      isAdmin,
      activeCharacter,
      resolvedCharacterWorldId,
      activeCharacterWorldEntry,
      setNotice,
      setIsSaving,
      uploadPendingImages,
    });

  const { addWork, deleteWork } = useCharacterWorks({
    isAdmin,
    activeCharacter,
    workDraft,
    setWorkDraft,
    workImageFiles,
    setWorkImageFiles,
    setNotice,
    setIsSaving,
    uploadWorkImages,
  });

  return {
    isAdmin,
    notice,
    setNotice,
    isSaving,
    characterEditSection,
    setCharacterEditSection,
    activeCharacterWorldId: resolvedCharacterWorldId,
    setActiveCharacterWorldId,
    worldSettingsText,
    setWorldSettingsText,
    worldWorkDraft,
    setWorldWorkDraft,
    characters,
    charactersRef,
    activeCharacterId,
    setActiveCharacterId,
    activeCharacterKind,
    setActiveCharacterKind,
    activeSubPageId,
    setActiveSubPageId,
    draft,
    setDraft,
    workDraft,
    setWorkDraft,
    activeCharacter,
    filteredCharacters,
    pairLinkableCharacters,
    canRecoverLegacyPairMember,
    kindLabel,
    isPairDraft,
    selectCharacterFromList,
    startNewCharacter,
    handleActiveKindChange,
    reloadCharacterFromServer,
    saveCharacter,
    recoverLegacyPairMemberData,
    deleteCharacter,
    worlds,
    activeCharacterWorldEntry,
    worldWorkImageFiles,
    setWorldWorkImageFiles,
    workImageFiles,
    setWorkImageFiles,
    imageUploadCategory,
    setImageUploadCategory,
    imageUploadWorldId,
    setImageUploadWorldId,
    isUploading,
    pendingUploads,
    selectPendingImages,
    updatePendingUpload,
    startThumbnailDrag,
    moveThumbnailDrag,
    stopThumbnailDrag,
    zoomThumbnail,
    removePendingUpload,
    activeGlitchFieldPath,
    glitchFieldSelection,
    setGlitchFieldSelection,
    glitchFieldAnchorElement,
    setGlitchFieldAnchorElement,
    resetCharacterGlitch,
    selectGlitchField,
    glitchFieldPickerGroups,
    activeGlitchLabel,
    glitchFieldCount,
    subPageCount,
    bgmCharacterOptions,
    quickAddCharacterBgm,
    bindGlitchField,
    selectCharacterWorld,
    saveCharacterWorldSettings,
    addWorldWork,
    deleteWorldWork,
    deleteCharacterWorldEntry,
    addSettingSection,
    updateSettingSection,
    removeSettingSection,
    moveSettingSection,
    uploadImages,
    deleteImage,
    updateImageInfo,
    deleteWorldImage,
    updateWorldImageInfo,
    addWork,
    deleteWork,
    applyGlitchFromToolbar,
  };
};
