"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import type { CharactersAdminContextValue } from "@/contexts/CharactersAdminContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminUploads } from "@/hooks/useAdminUploads";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import { useBgmTrackAdmin } from "@/hooks/useBgmTrackAdmin";
import { useCharacterDraft } from "@/hooks/useCharacterDraft";
import { useGlitchFieldEditing } from "@/hooks/useGlitchFieldEditing";
import { useWorldAdmin } from "@/hooks/useWorldAdmin";
import {
  isGlitchFieldTarget,
  isGlitchFloatToolbarTarget,
  readGlitchFieldSelection,
} from "@/lib/admin-interaction";
import { scheduleReadContentEditableSelection } from "@/lib/contenteditable-glitch";
import { characterFirestorePayload } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import {
  buildGlitchFieldOptionGroups,
  countDraftGlitchFields,
  getDraftGlitchConfig,
  getGlitchFieldLabel,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { scheduleReadGlitchTextSelection } from "@/lib/glitch-selection";
import { deleteR2Images } from "@/lib/r2-upload-client";
import { moveSettingSection as reorderSettingSection } from "@/lib/setting-sections";
import type {
  Character,
  CharacterWorldEntry,
  FieldGlitchConfig,
  SettingSection,
  UploadedImage,
  Work,
} from "@/lib/types";
import { createBlankWorldEntry, upsertWorldEntry } from "@/lib/world-entries";
import { linesToList } from "@/utils/linesToList";
import { normalizeWorks, normalizeWorldEntries } from "@/utils/normalizers";

/**
 * 캐릭터 관리에 필요한 훅·폼 상태·세계관/이미지 액션을 한 곳에서 묶습니다.
 * Provider가 한 번만 호출하고 context로 하위 섹션에 공유합니다.
 */
export const useCharactersAdminState = (): CharactersAdminContextValue => {
  const { isAdmin } = useAdminAuth();
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [characterEditSection, setCharacterEditSection] = useState<CharacterEditSection>("basics");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [worldSettingsText, setWorldSettingsText] = useState("");
  const [worldWorkDraft, setWorldWorkDraft] = useState({
    title: "",
    kind: "세계관 연성",
    date: "",
    body: "",
  });
  const clearPendingUploadsRef = useRef(() => {});

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
      setActiveCharacterWorldId("");
      setWorldSettingsText("");
      setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
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
  // 세계관 목록이 생기면 선택값이 비어 있을 때만 첫 항목을 표시용으로 씁니다.
  const resolvedCharacterWorldId = activeCharacterWorldId || worlds[0]?.id || "";

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

  const glitchFieldOptionGroups = useMemo(
    () => buildGlitchFieldOptionGroups(draft, draft.textGlitch),
    [draft],
  );
  const glitchFieldPickerGroups = useMemo(
    () =>
      glitchFieldOptionGroups.map((group) => ({
        ...group,
        options: group.options.map((option) => {
          const config = getDraftGlitchConfig(draft, option.path);
          return {
            ...option,
            zoneCount: config?.zones?.length ?? 0,
          };
        }),
      })),
    [draft, glitchFieldOptionGroups],
  );
  const activeGlitchLabel = activeGlitchFieldPath
    ? getGlitchFieldLabel(activeGlitchFieldPath)
    : null;
  const glitchFieldCount = countDraftGlitchFields(draft);
  const subPageCount = draft.subPages.length;
  const activeCharacterWorldEntry = useMemo(
    () =>
      normalizeWorldEntries(activeCharacter?.worldEntries).find(
        (entry) => entry.worldId === resolvedCharacterWorldId,
      ),
    [activeCharacter, resolvedCharacterWorldId],
  );

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      const path = target.dataset.glitchField;
      if (
        !path ||
        target.dataset.glitchScope === "world" ||
        !target.closest(".admin-page") ||
        target.closest("[data-text-scramble-tool]")
      ) {
        return;
      }

      setActiveGlitchFieldPath(path);
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [setActiveGlitchFieldPath]);

  const captureGlitchFieldSelection = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
      const path = element.dataset.glitchField;
      if (!path) {
        return;
      }

      if (element.closest("[data-text-scramble-tool]") || element.dataset.glitchScope === "world") {
        return;
      }

      const applySelection = (selection: GlitchTextSelection | null) => {
        if (!characterGlitchMountedRef.current) {
          return;
        }

        setActiveGlitchFieldPath(path);
        setGlitchFieldSelection(selection);
        setGlitchFieldAnchorElement(selection ? element : null);
      };

      if (element instanceof HTMLElement && element.isContentEditable) {
        scheduleReadContentEditableSelection(element, applySelection);
        return;
      }

      scheduleReadGlitchTextSelection(
        element as HTMLInputElement | HTMLTextAreaElement,
        applySelection,
      );
    },
    [
      characterGlitchMountedRef,
      setActiveGlitchFieldPath,
      setGlitchFieldAnchorElement,
      setGlitchFieldSelection,
    ],
  );

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const syncAnchoredSelection = () => {
      if (!characterGlitchMountedRef.current) {
        return;
      }

      if (document.documentElement.dataset.glitchToolbarActive === "true") {
        return;
      }

      const characterAnchor = glitchFieldAnchorRef.current;
      if (characterAnchor) {
        const selection = readGlitchFieldSelection(characterAnchor);
        setGlitchFieldSelection(selection);
        if (!selection) {
          setGlitchFieldAnchorElement(null);
        }
      }
    };

    const handleSelectionChange = () => {
      if (isGlitchFloatToolbarTarget(document.activeElement)) {
        return;
      }

      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) {
        syncAnchoredSelection();
        return;
      }

      if (active.dataset.glitchScope === "world") {
        return;
      }

      if (active.isContentEditable && active.dataset.glitchField) {
        captureGlitchFieldSelection(active);
        return;
      }

      if (!(active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) {
        syncAnchoredSelection();
        return;
      }

      if (active.dataset.glitchField) {
        captureGlitchFieldSelection(active);
        return;
      }

      syncAnchoredSelection();
    };

    const clearFloatingSelections = () => {
      if (!characterGlitchMountedRef.current) {
        return;
      }

      setGlitchFieldSelection(null);
      setGlitchFieldAnchorElement(null);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (isGlitchFloatToolbarTarget(event.target)) {
        document.documentElement.dataset.glitchToolbarActive = "true";
        return;
      }

      delete document.documentElement.dataset.glitchToolbarActive;

      if (isGlitchFieldTarget(event.target)) {
        return;
      }

      clearFloatingSelections();
    };

    const handlePointerUp = () => {
      delete document.documentElement.dataset.glitchToolbarActive;
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      delete document.documentElement.dataset.glitchToolbarActive;
    };
  }, [
    captureGlitchFieldSelection,
    characterGlitchMountedRef,
    glitchFieldAnchorRef,
    isAdmin,
    setGlitchFieldAnchorElement,
    setGlitchFieldSelection,
  ]);

  const bindGlitchField = useCallback(
    (path: string) => ({
      "data-glitch-field": path,
      onFocus: () => setActiveGlitchFieldPath(path),
      onClick: () => setActiveGlitchFieldPath(path),
      onSelect: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureGlitchFieldSelection(event.currentTarget);
      },
      onKeyUp: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => {
        captureGlitchFieldSelection(event.currentTarget);
      },
      onMouseUp: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureGlitchFieldSelection(event.currentTarget);
      },
    }),
    [captureGlitchFieldSelection, setActiveGlitchFieldPath],
  );

  const selectCharacterWorld = (worldId: string) => {
    const entry = normalizeWorldEntries(activeCharacter?.worldEntries).find(
      (worldEntry) => worldEntry.worldId === worldId,
    );
    setActiveCharacterWorldId(worldId);
    setWorldSettingsText(entry?.settings.join("\n") ?? "");
    setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
  };

  const saveCharacterWorldSettings = async () => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId) return;

    const nextEntry: CharacterWorldEntry = {
      ...(activeCharacterWorldEntry ?? createBlankWorldEntry(resolvedCharacterWorldId)),
      settings: linesToList(worldSettingsText),
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관별 설정을 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관별 설정 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const addWorldWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId) return;

    if (!worldWorkDraft.title.trim() || !worldWorkDraft.body.trim()) {
      setNotice("세계관 연성/로그 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const uploadedImages = await uploadWorkImages(
        activeCharacter.id,
        worldWorkImageFiles,
        resolvedCharacterWorldId,
      );
      const nextEntry: CharacterWorldEntry = {
        ...(activeCharacterWorldEntry ?? createBlankWorldEntry(resolvedCharacterWorldId)),
        works: [
          {
            title: worldWorkDraft.title.trim(),
            kind: worldWorkDraft.kind.trim() || "세계관 연성",
            date: worldWorkDraft.date.trim() || "today",
            body: worldWorkDraft.body.trim(),
            images: uploadedImages,
          },
          ...(activeCharacterWorldEntry?.works ?? []),
        ],
      };
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
      setWorldWorkImageFiles([]);
      setNotice("세계관 연성/로그를 추가했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 연성/로그 추가에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorldWork = async (workIndex: number) => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }
    const targetWork = activeCharacterWorldEntry.works[workIndex];

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      works: activeCharacterWorldEntry.works.filter((_, index) => index !== workIndex),
    };

    try {
      setIsSaving(true);
      await deleteR2Images(targetWork?.images ?? []);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 연성/로그를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 연성/로그 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCharacterWorldEntry = async () => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }

    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: normalizeWorldEntries(activeCharacter.worldEntries).filter(
        (entry) => entry.worldId !== resolvedCharacterWorldId,
      ),
    };

    try {
      setIsSaving(true);
      await deleteR2Images([
        ...activeCharacterWorldEntry.images,
        ...normalizeWorks(activeCharacterWorldEntry.works).flatMap((work) => work.images ?? []),
      ]);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterWorldId("");
      setWorldSettingsText("");
      setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
      setNotice("이 자캐의 세계관 참가 기록과 세계관 전용 이미지를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 참가 기록 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const uploadImages = async () => {
    if (!activeCharacter) {
      setNotice("사진을 저장하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      return;
    }

    await uploadPendingImages(activeCharacter.id, async (uploaded, worldId) => {
      if (worldId) {
        const targetEntry =
          normalizeWorldEntries(activeCharacter.worldEntries).find(
            (entry) => entry.worldId === worldId,
          ) ?? createBlankWorldEntry(worldId);
        const nextEntry = {
          ...targetEntry,
          images: [...targetEntry.images, ...uploaded],
        };

        await setDoc(
          doc(getFirebaseDb(), "characters", activeCharacter.id),
          characterFirestorePayload(activeCharacter, {
            worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
            updatedAt: serverTimestamp(),
          }),
          { merge: true },
        );
        return;
      }

      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          images: [...(activeCharacter.images ?? []), ...uploaded],
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
    });
  };

  const deleteImage = async (imageId: string) => {
    if (!isAdmin || !activeCharacter) return;

    const targetImage = (activeCharacter.images ?? []).find((image) => image.id === imageId);

    if (!targetImage) {
      setNotice("삭제할 이미지 기록을 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteR2Images([targetImage]);
      const nextCharacter: Character = {
        ...activeCharacter,
        images: (activeCharacter.images ?? []).filter((image) => image.id !== imageId),
      };
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateImageInfo = async (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => {
    if (!isAdmin || !activeCharacter) return;

    const nextImages = (activeCharacter.images ?? []).map((image) =>
      image.id === imageId ? { ...image, ...updates } : image,
    );
    const nextCharacter: Character = {
      ...activeCharacter,
      images: nextImages,
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWorldImage = async (imageId: string) => {
    if (!isAdmin || !activeCharacter || !resolvedCharacterWorldId || !activeCharacterWorldEntry) {
      return;
    }

    const targetImage = activeCharacterWorldEntry.images.find((image) => image.id === imageId);
    if (!targetImage) {
      setNotice("삭제할 세계관 이미지를 찾지 못했어요.");
      return;
    }

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      images: activeCharacterWorldEntry.images.filter((image) => image.id !== imageId),
    };
    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
    };

    try {
      setIsSaving(true);
      await deleteR2Images([targetImage]);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateWorldImageInfo = async (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldEntry) return;

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      images: activeCharacterWorldEntry.images.map((image) =>
        image.id === imageId ? { ...image, ...updates } : image,
      ),
    };
    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: upsertWorldEntry(activeCharacter.worldEntries, nextEntry),
    };

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(nextCharacter, {
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("세계관 그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const addWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !activeCharacter) return;

    if (!workDraft.title.trim() || !workDraft.body.trim()) {
      setNotice("글 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const uploadedImages = await uploadWorkImages(activeCharacter.id, workImageFiles);
      const newWork: Work = {
        title: workDraft.title.trim(),
        kind: workDraft.kind.trim() || "연성",
        date: workDraft.date.trim() || "today",
        body: workDraft.body.trim(),
        images: uploadedImages,
      };

      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          works: [newWork, ...activeCharacter.works],
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setWorkDraft({ title: "", kind: "새 연성", date: "", body: "" });
      setWorkImageFiles([]);
      setNotice("글을 추가했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "글 추가에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWork = async (workIndex: number) => {
    if (!isAdmin || !activeCharacter) return;
    const targetWork = activeCharacter.works[workIndex];

    try {
      setIsSaving(true);
      await deleteR2Images(targetWork?.images ?? []);
      await setDoc(
        doc(getFirebaseDb(), "characters", activeCharacter.id),
        characterFirestorePayload(activeCharacter, {
          works: activeCharacter.works.filter((_, index) => index !== workIndex),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setNotice("글을 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "글 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const applyGlitchFromToolbar = (config: FieldGlitchConfig, message: string) => {
    if (!activeGlitchFieldPath) {
      return;
    }

    setDraft((current) => updateDraftGlitchPath(current, activeGlitchFieldPath, config));
    setNotice(message);
  };

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
