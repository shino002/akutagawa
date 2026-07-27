"use client";

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  isGlitchFieldTarget,
  isGlitchFloatToolbarTarget,
  readGlitchFieldSelection,
} from "@/lib/admin-interaction";
import { scheduleReadContentEditableSelection } from "@/lib/contenteditable-glitch";
import {
  buildGlitchFieldOptionGroups,
  countDraftGlitchFields,
  getDraftGlitchConfig,
  getGlitchFieldLabel,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { scheduleReadGlitchTextSelection } from "@/lib/glitch-selection";
import type { FieldGlitchConfig } from "@/lib/types";
import type { CharacterDraft } from "@/types/character-draft.types";

type GlitchAnchorElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

type UseCharacterGlitchBindingParams = {
  isAdmin: boolean;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  setNotice: (message: string) => void;
  activeGlitchFieldPath: string | null;
  setActiveGlitchFieldPath: (path: string | null) => void;
  setGlitchFieldSelection: (selection: GlitchTextSelection | null) => void;
  setGlitchFieldAnchorElement: (element: GlitchAnchorElement | null) => void;
  glitchFieldAnchorRef: MutableRefObject<GlitchAnchorElement | null>;
  characterGlitchMountedRef: MutableRefObject<boolean>;
};

/**
 * 캐릭터 글리치 필드 선택·바인딩·툴바 적용을 담당합니다.
 */
export const useCharacterGlitchBinding = ({
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
}: UseCharacterGlitchBindingParams) => {
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

  const applyGlitchFromToolbar = (config: FieldGlitchConfig, message: string) => {
    if (!activeGlitchFieldPath) {
      return;
    }

    setDraft((current) => updateDraftGlitchPath(current, activeGlitchFieldPath, config));
    setNotice(message);
  };

  return {
    glitchFieldOptionGroups,
    glitchFieldPickerGroups,
    activeGlitchLabel,
    glitchFieldCount,
    subPageCount,
    captureGlitchFieldSelection,
    bindGlitchField,
    applyGlitchFromToolbar,
  };
};
