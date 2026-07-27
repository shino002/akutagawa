"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminUploads } from "@/hooks/useAdminUploads";
import { useBgmTrackAdmin } from "@/hooks/useBgmTrackAdmin";
import { useDiaryAdmin } from "@/hooks/useDiaryAdmin";
import { useExtractBannerAdmin } from "@/hooks/useExtractBannerAdmin";
import { useGlitchFieldEditing } from "@/hooks/useGlitchFieldEditing";
import { useWorldAdmin } from "@/hooks/useWorldAdmin";
import {
  bgmTrackDraftFromTrack,
  normalizeBgmTracks,
  resolveCharacterBgmUrl,
} from "@/lib/bgm-catalog";
import { getFirebaseDb } from "@/lib/firebase";
import { extractCharacterPaletteFromImage } from "@/lib/character-palette";
import { PaletteEditor } from "@/components/admin/PaletteEditor";
import { compactCaseFileDetailTheme, normalizeCaseFileDetailTheme } from "@/lib/case-file-theme";
import { CaseFileThemeEditor } from "@/components/admin/CaseFileThemeEditor";
import { ThumbnailImage } from "@/components/ThumbnailImage";
import {
  ProfileFieldsEditor,
  profileFieldGlitchPath,
} from "@/components/admin/ProfileFieldsEditor";
import { RelationshipsEditor } from "@/components/admin/RelationshipsEditor";
import { BgmQuickPicker } from "@/components/admin/BgmQuickPicker";
import { DocumentTextImport } from "@/components/admin/DocumentTextImport";
import { useAdminHistoryNavigation } from "@/hooks/useAdminHistoryNavigation";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import { createAdminHistoryState } from "@/lib/admin-history";
import type { AdminCategory, AdminHistoryState, AdminPanel } from "@/types/admin.types";
import { defaultArchiveContent } from "@/constants/home";
import { MAX_UPLOAD_SIZE } from "@/constants/upload";
import { formatBytes } from "@/utils/formatBytes";
import { glitchFieldClass } from "@/utils/glitchFieldClass";
import { linesToList } from "@/utils/linesToList";
import { normalizeWorks, normalizeWorldEntries } from "@/utils/normalizers";
import { slugifyId } from "@/utils/slugifyId";
import { normalizeProfileFields } from "@/lib/profile-fields";
import {
  normalizeRelationshipEntries,
  relationshipEntryGlitchPath,
  relationshipEntryLabelGlitchPath,
  relationshipEntryNameGlitchPath,
} from "@/lib/relationship-entries";
import { extractBannerDraftFromBanner } from "@/lib/personal-home-banners";
import { deleteR2Images } from "@/lib/r2-upload-client";
import { createBlankWorldEntry, upsertWorldEntry } from "@/lib/world-entries";
import type {
  Character,
  CharacterKind,
  CharacterWorldEntry,
  GuestbookEntry,
  HomeContent,
  BgmTrack,
  BgmTrackScope,
  PersonalHomeBanner,
  SettingSection,
  UploadedImage,
  Work,
} from "@/lib/types";
import {
  characterToDraft,
  createBlankDraft,
  draftBasicsHaveContent,
  draftBasicsLookEmpty,
  draftToCharacter,
  getLegacyRelationshipsMigrationNotice,
  getLegacySettingsMigrationNotice,
  mergeDraftForKindMigration,
  type CharacterDraft,
} from "@/lib/character-draft";
import {
  buildGlitchFieldOptionGroups,
  countDraftGlitchFields,
  getCharacterDraftFieldValue,
  getDraftGlitchConfig,
  getGlitchFieldLabel,
  pruneDraftTextGlitch,
  pruneSubPageTextGlitch,
  settingSectionExcerptGlitchPath,
  settingSectionGlitchPath,
  settingSectionTitleGlitchPath,
  updateDraftFieldValue,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import { TextScrambleTool } from "@/components/admin/TextScrambleTool";
import { GlitchSelectionFloatingToolbar } from "@/components/admin/GlitchSelectionFloatingToolbar";
import { AdminInlineGlitchEditor } from "@/components/admin/AdminInlineGlitchEditor";
import { SettingSectionOrderButtons } from "@/components/admin/SettingSectionOrderButtons";
import { SubPageEditor } from "@/components/admin/SubPageEditor";
import { MetaFieldsEditor } from "@/components/admin/MetaFieldsEditor";
import { PairMemberPicker } from "@/components/admin/PairMemberPicker";
import {
  CharacterEditSectionNav,
  type CharacterEditSection,
} from "@/components/admin/CharacterEditSectionNav";
import { metaFieldGlitchPath, resolveMetaFields } from "@/lib/meta-fields";
import { characterFirestorePayload, omitUndefined } from "@/lib/firestore-helpers";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import {
  buildTextGlitchFirestorePatch,
  countRemovedGlitchPaths,
} from "@/lib/text-glitch-persistence";
import {
  readGlitchTextSelection,
  scheduleReadGlitchTextSelection,
  type GlitchTextSelection,
} from "@/lib/glitch-selection";
import { scheduleReadContentEditableSelection } from "@/lib/contenteditable-glitch";
import {
  isGlitchFieldTarget,
  isGlitchFloatToolbarTarget,
  readGlitchFieldSelection,
} from "@/lib/admin-interaction";
import {
  CHARACTER_KINDS,
  CHARACTER_KIND_ADMIN_LABELS,
  filterCharactersByKind,
  filterPairLinkableCharacters,
  normalizeCharacterKind,
} from "@/lib/character-kind";
import { characterKindToSection } from "@/lib/zone-links";
import { listNavigableSubPages, normalizeSubPages } from "@/lib/sub-pages";
import { formatPairDisplayName, normalizePairMemberIds } from "@/lib/pair-members";
import {
  buildWorldGlitchFieldOptions,
  countWorldDraftGlitchFields,
  getWorldDraftFieldValue,
  getWorldGlitchFieldLabel,
  updateWorldDraftFieldValue,
  updateWorldDraftGlitchPath,
} from "@/lib/world-glitch-fields";
import {
  normalizeSettingSections,
  moveSettingSection as reorderSettingSection,
} from "@/lib/setting-sections";
import {
  canRecoverFromLegacyPairMembers,
  recoverCharacterFromLegacyPairMember,
} from "@/lib/legacy-pair-member-recovery";

// 사이트 기본 문구와 자캐 카드 색상 선택지를 정의합니다.

/**
 * 관리자 폼 초기값 — 공개 페이지용 `defaultHomeContent`(constants/home)와 달리 전부 빈 문자열입니다.
 */
const emptyHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
  notice: "",
};

export default function AdminPage() {
  // 로그인, 관리자 패널, 선택된 자캐/세계관, 업로드 대기 목록 등 편집 화면 상태입니다.
  const { loginDraft, setLoginDraft, authNotice, isAuthLoading, signIn, signOut, isAdmin } =
    useAdminAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [draft, setDraft] = useState<CharacterDraft>(() => createBlankDraft());
  const [worldSettingsText, setWorldSettingsText] = useState("");
  const [worldWorkDraft, setWorldWorkDraft] = useState({
    title: "",
    kind: "세계관 연성",
    date: "",
    body: "",
  });
  const [workDraft, setWorkDraft] = useState({ title: "", kind: "새 연성", date: "", body: "" });
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
    uploadSingleImage,
    uploadPendingImages,
  } = useAdminUploads({
    isAdmin,
    onNotice: setNotice,
    onPaletteExtracted: (palette) => {
      setDraft((current) => ({ ...current, palette }));
    },
  });
  const {
    diaryEntries,
    diaryEntriesRef,
    activeDiaryId,
    setActiveDiaryId,
    diaryDraft,
    setDiaryDraft,
    startNewDiaryEntry,
    selectDiaryEntry,
    saveDiaryEntry,
    deleteDiaryEntry,
  } = useDiaryAdmin({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
  });
  const {
    extractBanners,
    extractBannersRef,
    activeExtractBannerId,
    setActiveExtractBannerId,
    extractBannerDraft,
    setExtractBannerDraft,
    extractBannerImageFile,
    startNewExtractBanner,
    selectExtractBanner,
    handleExtractBannerImageChange,
    saveExtractBanner,
    deleteExtractBanner,
  } = useExtractBannerAdmin({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
    uploadSingleImage,
  });
  const {
    bgmTracks,
    bgmTracksRef,
    activeBgmTrackId,
    setActiveBgmTrackId,
    bgmTrackDraft,
    setBgmTrackDraft,
    bgmAudioFile,
    startNewBgmTrack,
    selectBgmTrack,
    saveBgmTrack,
    deleteBgmTrack,
    handleBgmAudioChange,
    quickAddCharacterBgm,
  } = useBgmTrackAdmin({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
  });
  const {
    worlds,
    worldsRef,
    activeWorldId,
    setActiveWorldId,
    worldDraft,
    setWorldDraft,
    startNewWorld,
    selectWorld,
    saveWorld,
    deleteWorld,
  } = useWorldAdmin({
    isAdmin,
    onNotice: setNotice,
    setIsSaving,
  });
  // 캐릭터 편집의 "참가 세계관" 기본값 — 세계관 목록이 생기면 비어 있을 때만 채웁니다.
  useEffect(() => {
    setActiveCharacterWorldId((current) => current || worlds[0]?.id || "");
  }, [worlds]);
  const [homeContent, setHomeContent] = useState<HomeContent>(emptyHomeContent);
  const [archiveContent, setArchiveContent] = useState<HomeContent>(defaultArchiveContent);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [guestbookReplyDrafts, setGuestbookReplyDrafts] = useState<Record<string, string>>({});
  const [adminPanel, setAdminPanel] = useState<AdminPanel>("categories");
  const [characterEditSection, setCharacterEditSection] = useState<CharacterEditSection>("basics");
  const [activeCharacterKind, setActiveCharacterKind] = useState<CharacterKind>("oc");
  const [activeSubPageId, setActiveSubPageId] = useState("");
  const characterGlitch = useGlitchFieldEditing();
  const worldGlitch = useGlitchFieldEditing();
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
  const {
    activePath: activeWorldGlitchFieldPath,
    setActivePath: setActiveWorldGlitchFieldPath,
    selection: worldGlitchFieldSelection,
    setSelection: setWorldGlitchFieldSelection,
    anchorElement: worldGlitchFieldAnchorElement,
    setAnchorElement: setWorldGlitchFieldAnchorElement,
    reset: resetWorldGlitch,
    selectPath: selectWorldGlitchField,
    anchorRef: worldGlitchFieldAnchorRef,
    mountedRef: worldGlitchMountedRef,
  } = worldGlitch;
  const [activeCategory, setActiveCategory] = useState<AdminCategory>("home");
  const { characterOptions: bgmCharacterOptions } = useBgmCatalog();
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  const activeCharacter = useMemo(
    () =>
      activeCharacterId
        ? characters.find((character) => character.id === activeCharacterId)
        : undefined,
    [activeCharacterId, characters],
  );
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
  const worldGlitchFieldOptions = useMemo(
    () => buildWorldGlitchFieldOptions(worldDraft, worldDraft.textGlitch),
    [worldDraft],
  );
  const worldGlitchFieldPickerOptions = useMemo(
    () =>
      worldGlitchFieldOptions.map((option) => ({
        ...option,
        zoneCount: worldDraft.textGlitch[option.path]?.zones?.length ?? 0,
      })),
    [worldDraft, worldGlitchFieldOptions],
  );
  const activeWorldGlitchLabel = activeWorldGlitchFieldPath
    ? getWorldGlitchFieldLabel(activeWorldGlitchFieldPath)
    : null;
  const worldGlitchFieldCount = countWorldDraftGlitchFields(worldDraft);
  const kindLabel = CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(draft.kind)];
  const isPairDraft = normalizeCharacterKind(draft.kind) === "pair";
  const filteredCharacters = useMemo(
    () => filterCharactersByKind(characters, activeCharacterKind),
    [activeCharacterKind, characters],
  );
  const pairLinkableCharacters = useMemo(
    () => filterPairLinkableCharacters(characters),
    [characters],
  );
  const canRecoverLegacyPairMember = useMemo(
    () => (activeCharacter ? canRecoverFromLegacyPairMembers(activeCharacter) : false),
    [activeCharacter],
  );
  const activeCharacterWorldEntry = useMemo(
    () =>
      normalizeWorldEntries(activeCharacter?.worldEntries).find(
        (entry) => entry.worldId === activeCharacterWorldId,
      ),
    [activeCharacter, activeCharacterWorldId],
  );

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
      resetWorldGlitch();

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
    [resetCharacterGlitch, resetWorldGlitch, selectWorld],
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
    enabled: isAdmin,
    state: adminHistoryState,
    applyState: applyAdminHistoryState,
  });

  // Firestore 컬렉션 구독과 글리치 필드 포커스/선택 상호작용입니다.
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      const path = target.dataset.glitchField;
      if (!path || !target.closest(".admin-page") || target.closest("[data-text-scramble-tool]")) {
        return;
      }

      if (target.dataset.glitchScope === "world") {
        setActiveWorldGlitchFieldPath(path);
        return;
      }

      setActiveGlitchFieldPath(path);
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, []);

  const captureWorldGlitchFieldSelection = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
      const path = element.dataset.glitchField;
      if (!path || element.closest("[data-text-scramble-tool]")) {
        return;
      }

      const applySelection = (selection: GlitchTextSelection | null) => {
        if (!(characterGlitchMountedRef.current || worldGlitchMountedRef.current)) {
          return;
        }

        setActiveWorldGlitchFieldPath(path);
        setWorldGlitchFieldSelection(selection);
        setWorldGlitchFieldAnchorElement(selection ? element : null);
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
    [],
  );

  const captureGlitchFieldSelection = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
      const path = element.dataset.glitchField;
      if (!path) {
        return;
      }

      if (element.closest("[data-text-scramble-tool]")) {
        return;
      }

      const applySelection = (selection: GlitchTextSelection | null) => {
        if (!(characterGlitchMountedRef.current || worldGlitchMountedRef.current)) {
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
    [],
  );

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const syncAnchoredSelection = () => {
      if (!(characterGlitchMountedRef.current || worldGlitchMountedRef.current)) {
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

      const worldAnchor = worldGlitchFieldAnchorRef.current;
      if (worldAnchor) {
        const selection = readGlitchFieldSelection(worldAnchor);
        setWorldGlitchFieldSelection(selection);
        if (!selection) {
          setWorldGlitchFieldAnchorElement(null);
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

      if (active.isContentEditable && active.dataset.glitchField) {
        if (active.dataset.glitchScope === "world") {
          captureWorldGlitchFieldSelection(active);
        } else {
          captureGlitchFieldSelection(active);
        }
        return;
      }

      if (!(active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) {
        syncAnchoredSelection();
        return;
      }

      if (active.dataset.glitchScope === "world") {
        captureWorldGlitchFieldSelection(active);
        return;
      }

      if (active.dataset.glitchField) {
        captureGlitchFieldSelection(active);
        return;
      }

      syncAnchoredSelection();
    };

    const clearFloatingSelections = () => {
      if (!(characterGlitchMountedRef.current || worldGlitchMountedRef.current)) {
        return;
      }

      setGlitchFieldSelection(null);
      setGlitchFieldAnchorElement(null);
      setWorldGlitchFieldSelection(null);
      setWorldGlitchFieldAnchorElement(null);
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
  }, [captureGlitchFieldSelection, captureWorldGlitchFieldSelection, isAdmin]);

  const openCharacterGlitchAdvanced = useCallback(() => {
    setCharacterEditSection("glitch");
    window.requestAnimationFrame(() => {
      document
        .getElementById("admin-glitch-tool")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openWorldGlitchAdvanced = useCallback(() => {
    window.requestAnimationFrame(() => {
      document
        .getElementById("admin-world-glitch-tool")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

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
    [captureGlitchFieldSelection],
  );

  const bindWorldGlitchField = useCallback(
    (path: string) => ({
      "data-glitch-field": path,
      "data-glitch-scope": "world",
      onFocus: () => setActiveWorldGlitchFieldPath(path),
      onClick: () => setActiveWorldGlitchFieldPath(path),
      onSelect: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onKeyUp: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onMouseUp: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
    }),
    [captureWorldGlitchFieldSelection],
  );

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        const nextCharacters = snapshot.docs.map((characterDoc) => {
          const data = characterDoc.data() as Character & {
            profile?: { age?: string; height?: string; role?: string; keyword?: string };
          };
          const resolvedBgmUrl = resolveCharacterBgmUrl(data.bgmUrl);
          const normalizedDetailTheme = normalizeCaseFileDetailTheme(data.detailTheme);
          const {
            bgmUrl: _bgmUrl,
            profile: legacyProfile,
            detailTheme: _detailTheme,
            ...rest
          } = data;
          return {
            ...rest,
            id: data.id || characterDoc.id,
            kanjiName: data.kanjiName ?? "",
            metaFields: resolveMetaFields(data),
            statusTags: Array.isArray(data.statusTags) ? data.statusTags : [],
            classification: data.classification ?? "",
            profileFields: normalizeProfileFields(data.profileFields, legacyProfile),
            works: normalizeWorks(data.works),
            settings: Array.isArray(data.settings) ? data.settings : [],
            settingSections: normalizeSettingSections(data.settingSections),
            relationships: Array.isArray(data.relationships) ? data.relationships : [],
            relationshipEntries: normalizeRelationshipEntries(
              data.relationshipEntries,
              data.relationships,
            ),
            images: Array.isArray(data.images) ? data.images : [],
            worldEntries: normalizeWorldEntries(data.worldEntries),
            kind: normalizeCharacterKind(data.kind),
            subPages: normalizeSubPages(data.subPages),
            pairMemberIds: normalizePairMemberIds(data.pairMemberIds),
            textGlitch: normalizeTextGlitch(data.textGlitch),
            ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : {}),
            ...(normalizedDetailTheme ? { detailTheme: normalizedDetailTheme } : {}),
          };
        });

        setCharacters(nextCharacters);
      },
      (error) => setNotice(`Firestore 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "home"),
      (snapshot) => {
        const data = snapshot.data() as Partial<HomeContent> | undefined;
        setHomeContent({
          eyebrow: data?.eyebrow || emptyHomeContent.eyebrow,
          title: data?.title || emptyHomeContent.title,
          body: data?.body || emptyHomeContent.body,
          notice: typeof data?.notice === "string" ? data.notice : emptyHomeContent.notice,
        });
      },
      (error) => setNotice(`홈 문구 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "archive"),
      (snapshot) => {
        const data = snapshot.data() as Partial<HomeContent> | undefined;
        setArchiveContent({
          eyebrow: data?.eyebrow || defaultArchiveContent.eyebrow,
          title: data?.title || defaultArchiveContent.title,
          body: data?.body || defaultArchiveContent.body,
          notice: typeof data?.notice === "string" ? data.notice : defaultArchiveContent.notice,
        });
      },
      (error) => setNotice(`보관소 문구 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "guestbook"),
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((guestDoc) => {
            const data = guestDoc.data() as Partial<GuestbookEntry>;
            return {
              id: data.id || guestDoc.id,
              name: data.name || "익명",
              body: data.body || "",
              reply: data.reply || "",
              createdAtMillis: typeof data.createdAtMillis === "number" ? data.createdAtMillis : 0,
            };
          })
          .filter((entry) => entry.body)
          .sort((a, b) => b.createdAtMillis - a.createdAtMillis);

        setGuestbookEntries(nextEntries);
        setGuestbookReplyDrafts((current) => {
          const nextDrafts: Record<string, string> = {};
          nextEntries.forEach((entry) => {
            nextDrafts[entry.id] = current[entry.id] ?? entry.reply;
          });
          return nextDrafts;
        });
      },
      (error) => setNotice(`방명록 불러오기 실패: ${error.message}`),
    );
  }, []);

  // 관리자 로그인과 자캐/세계관 선택처럼 폼 저장 전의 화면 조작을 처리합니다.
  function selectCharacterWorld(worldId: string) {
    const entry = normalizeWorldEntries(activeCharacter?.worldEntries).find(
      (worldEntry) => worldEntry.worldId === worldId,
    );
    setActiveCharacterWorldId(worldId);
    setWorldSettingsText(entry?.settings.join("\n") ?? "");
    setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
  }

  // 선택된 자캐의 세계관별 설정, 로그, 참가 상태를 저장/삭제합니다.
  async function saveCharacterWorldSettings() {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId) return;

    const nextEntry: CharacterWorldEntry = {
      ...(activeCharacterWorldEntry ?? createBlankWorldEntry(activeCharacterWorldId)),
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
  }

  async function addWorldWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId) return;

    if (!worldWorkDraft.title.trim() || !worldWorkDraft.body.trim()) {
      setNotice("세계관 연성/로그 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const uploadedImages = await uploadWorkImages(
        activeCharacter.id,
        worldWorkImageFiles,
        activeCharacterWorldId,
      );
      const nextEntry: CharacterWorldEntry = {
        ...(activeCharacterWorldEntry ?? createBlankWorldEntry(activeCharacterWorldId)),
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
  }

  async function deleteWorldWork(workIndex: number) {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry)
      return;
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
  }

  async function deleteCharacterWorldEntry() {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry)
      return;

    const nextCharacter: Character = {
      ...activeCharacter,
      worldEntries: normalizeWorldEntries(activeCharacter.worldEntries).filter(
        (entry) => entry.worldId !== activeCharacterWorldId,
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
      setCharacters((current) =>
        current.map((character) =>
          character.id === activeCharacter.id ? nextCharacter : character,
        ),
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
  }

  // 자캐 기본 정보와 사이트 문구, 다이어리, 방명록, 세계관 카테고리를 저장/삭제합니다.
  async function saveCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!isAdmin) {
      setNotice("관리자만 저장할 수 있어요.");
      return;
    }

    const existingCharacter = characters.find((character) => character.id === draft.id);
    const migratedDraft = existingCharacter
      ? mergeDraftForKindMigration(draft, existingCharacter)
      : draft;
    const prunedDraft: CharacterDraft = {
      ...migratedDraft,
      textGlitch: pruneDraftTextGlitch(migratedDraft.textGlitch, migratedDraft),
      subPages: migratedDraft.subPages.map((subPage) => ({
        ...subPage,
        textGlitch: pruneSubPageTextGlitch(subPage.textGlitch, subPage),
      })),
    };
    const preservedBasicsFromExisting =
      existingCharacter &&
      migratedDraft !== draft &&
      draftBasicsLookEmpty(draft) &&
      draftBasicsHaveContent(characterToDraft(existingCharacter));
    const character = draftToCharacter(
      prunedDraft,
      existingCharacter?.works,
      existingCharacter?.images,
      normalizeWorldEntries(existingCharacter?.worldEntries),
      existingCharacter,
      characters,
    );

    const isPair = normalizeCharacterKind(character.kind) === "pair";
    const resolvedName = isPair
      ? character.name.trim() || formatPairDisplayName(character)
      : character.name;

    if (!character.id || (!isPair && !resolvedName) || (isPair && !resolvedName)) {
      setNotice(
        isPair
          ? "페어 이름 또는 멤버 이름 중 하나는 꼭 입력해주세요."
          : `${kindLabel} 이름은 꼭 입력해주세요.`,
      );
      return;
    }

    if (isPair && !character.name.trim()) {
      character.name = resolvedName;
    }

    const storedGlitch = existingCharacter?.textGlitch;
    const textGlitchPatch = buildTextGlitchFirestorePatch(character.textGlitch, storedGlitch);
    const removedGlitchPathCount = countRemovedGlitchPaths(character.textGlitch, storedGlitch);
    const hadGlitchDraft = Object.keys(prunedDraft.textGlitch).length > 0;
    const hadStoredGlitch = Boolean(storedGlitch && Object.keys(storedGlitch).length > 0);
    const resolvedBgmUrl = resolveCharacterBgmUrl(prunedDraft.bgmUrl);
    const compactedDetailTheme = compactCaseFileDetailTheme(character.detailTheme);
    const { textGlitch: _textGlitch, confidential, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(confidential ? { confidential: true } : { confidential: deleteField() }),
          ...(compactedDetailTheme
            ? { detailTheme: compactedDetailTheme }
            : { detailTheme: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair"
            ? { pairMemberIds: deleteField() }
            : {}),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterId(character.id);
      setActiveCharacterKind(normalizeCharacterKind(character.kind));
      setDraft({
        ...characterToDraft(character),
        textGlitch: character.textGlitch ?? prunedDraft.textGlitch,
      });
      if (hadGlitchDraft && !character.textGlitch) {
        setNotice(
          "자캐는 저장됐지만, 오류 구간이 텍스트와 맞지 않아 오류 설정은 빠졌어요. 구간을 다시 지정해주세요.",
        );
      } else if (!character.textGlitch && hadStoredGlitch) {
        setNotice("본 페이지에 반영되도록 저장했어요. 오류 구간은 모두 제거됐습니다.");
      } else if (character.textGlitch && removedGlitchPathCount > 0) {
        setNotice("본 페이지에 반영되도록 저장했어요. 제거한 오류 구간도 반영됐습니다.");
      } else if (preservedBasicsFromExisting) {
        setNotice(
          `분류만 바꿨는데 카드·레코드 칸이 비어 있어서, 기존 내용을 유지한 채 「${CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(character.kind)]}」로 저장했어요.`,
        );
      } else {
        setNotice(
          character.textGlitch
            ? "본 페이지에 반영되도록 저장했어요. 오류 구간도 함께 저장됐습니다."
            : `본 페이지에 반영되도록 저장했어요. 왼쪽 「${CHARACTER_KIND_ADMIN_LABELS[normalizeCharacterKind(character.kind)]}」 목록에서 확인할 수 있어요.`,
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${kindLabel} 저장에 실패했어요.`);
    } finally {
      setIsSaving(false);
    }
  }

  function addSettingSection() {
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
  }

  function updateSettingSection(
    id: string,
    updates: Partial<Pick<SettingSection, "title" | "body" | "kind" | "excerpt">>,
  ) {
    setDraft((current) => ({
      ...current,
      settingSections: current.settingSections.map((section) =>
        section.id === id ? { ...section, ...updates } : section,
      ),
    }));
  }

  function removeSettingSection(id: string) {
    setDraft((current) => ({
      ...current,
      settingSections: current.settingSections.filter((section) => section.id !== id),
    }));
  }

  function moveSettingSection(id: string, direction: "up" | "down") {
    setDraft((current) => ({
      ...current,
      settingSections: reorderSettingSection(current.settingSections, id, direction),
    }));
  }

  function reloadCharacterFromServer() {
    if (!activeCharacter) {
      setNotice("목록에서 항목을 먼저 선택해주세요.");
      return;
    }

    loadCharacterDraft(activeCharacter);
    setNotice(
      "서버에 저장된 내용을 다시 불러왔어요. 카드·레코드가 비어 보이면 이 버튼을 눌러보세요.",
    );
  }

  async function recoverLegacyPairMemberData() {
    if (!isAdmin) {
      setNotice("관리자만 복구할 수 있어요.");
      return;
    }

    if (!activeCharacter) {
      setNotice("목록에서 항목을 먼저 선택해주세요.");
      return;
    }

    const recovered = recoverCharacterFromLegacyPairMember(activeCharacter);
    if (!recovered) {
      setNotice("복구할 예전 페어 멤버 데이터가 없어요.");
      return;
    }

    const recoveredDraft = characterToDraft(recovered);
    const prunedDraft: CharacterDraft = {
      ...recoveredDraft,
      textGlitch: pruneDraftTextGlitch(recoveredDraft.textGlitch, recoveredDraft),
      subPages: recoveredDraft.subPages.map((subPage) => ({
        ...subPage,
        textGlitch: pruneSubPageTextGlitch(subPage.textGlitch, subPage),
      })),
    };
    const character = draftToCharacter(
      prunedDraft,
      recovered.works,
      recovered.images,
      normalizeWorldEntries(recovered.worldEntries),
      activeCharacter,
      characters,
    );
    const storedGlitch = activeCharacter.textGlitch;
    const textGlitchPatch = buildTextGlitchFirestorePatch(character.textGlitch, storedGlitch);
    const resolvedBgmUrl = resolveCharacterBgmUrl(prunedDraft.bgmUrl);
    const compactedDetailTheme = compactCaseFileDetailTheme(character.detailTheme);
    const { textGlitch: _textGlitch, confidential, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(confidential ? { confidential: true } : { confidential: deleteField() }),
          ...(compactedDetailTheme
            ? { detailTheme: compactedDetailTheme }
            : { detailTheme: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair"
            ? { pairMemberIds: deleteField() }
            : {}),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveCharacterId(character.id);
      setActiveCharacterKind(normalizeCharacterKind(character.kind));
      setDraft({
        ...characterToDraft(character),
        textGlitch: character.textGlitch ?? prunedDraft.textGlitch,
      });
      setNotice(
        "예전 페어 멤버 칸에 남아 있던 카드·레코드(대사, 프로필, 레코드 박스, 오류)를 복구해 저장했어요.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "페어 멤버 데이터 복구에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function loadCharacterDraft(character: Character) {
    const nextDraft = characterToDraft(character);
    setDraft(nextDraft);
    setActiveSubPageId(nextDraft.subPages[0]?.id ?? "");
    setActiveCharacterKind(normalizeCharacterKind(character.kind));
    const settingsMigrationNotice = getLegacySettingsMigrationNotice(character);
    const relationshipsMigrationNotice = getLegacyRelationshipsMigrationNotice(character);
    if (settingsMigrationNotice) {
      setNotice(settingsMigrationNotice);
    } else if (relationshipsMigrationNotice) {
      setNotice(relationshipsMigrationNotice);
    }
  }

  function selectCharacterFromList(character: Character) {
    setActiveCharacterId(character.id);
    setActiveCharacterKind(normalizeCharacterKind(character.kind));
    setCharacterEditSection("basics");
    loadCharacterDraft(character);
    setActiveCharacterWorldId("");
    setWorldSettingsText("");
    setWorldWorkDraft({ title: "", kind: "세계관 연성", date: "", body: "" });
  }

  function handleActiveKindChange(kind: CharacterKind) {
    setActiveCharacterKind(kind);

    if (activeCharacterId) {
      const editingCurrent = characters.find((character) => character.id === activeCharacterId);
      if (editingCurrent && draft.id === editingCurrent.id) {
        return;
      }
    }

    const current = activeCharacterId
      ? characters.find((character) => character.id === activeCharacterId)
      : undefined;

    if (current && normalizeCharacterKind(current.kind) === kind) {
      return;
    }

    const firstInKind = filterCharactersByKind(characters, kind)[0];
    if (firstInKind) {
      selectCharacterFromList(firstInKind);
      return;
    }

    startNewCharacter(kind);
  }

  function startNewCharacter(kind: CharacterKind = activeCharacterKind) {
    setActiveCharacterId("");
    setActiveCharacterWorldId("");
    setActiveSubPageId("");
    setCharacterEditSection("basics");
    setDraft(createBlankDraft(kind));
    setWorkDraft({ title: "", kind: "새 연성", date: "", body: "" });
    clearPendingUploads();
    setNotice(`새 ${CHARACTER_KIND_ADMIN_LABELS[kind]} 정보를 입력해주세요.`);
  }

  async function saveHomeContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice("관리자만 홈 문구를 저장할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const notice = homeContent.notice.trim().slice(0, 1000);
      await setDoc(
        doc(getFirebaseDb(), "site", "home"),
        {
          eyebrow: homeContent.eyebrow.trim() || emptyHomeContent.eyebrow,
          title: homeContent.title.trim() || emptyHomeContent.title,
          body: homeContent.body.trim() || emptyHomeContent.body,
          notice,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(getFirebaseDb(), "site", "archive"),
        {
          eyebrow: archiveContent.eyebrow.trim() || defaultArchiveContent.eyebrow,
          title: archiveContent.title.trim() || defaultArchiveContent.title,
          body: archiveContent.body.trim() || defaultArchiveContent.body,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setNotice("카테고리 문구를 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "홈 문구 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveGuestbookReply(entry: GuestbookEntry) {
    if (!isAdmin) {
      setNotice("관리자만 방명록 답글을 저장할 수 있어요.");
      return;
    }

    const reply = guestbookReplyDrafts[entry.id]?.trim() ?? "";

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "guestbook", entry.id),
        {
          reply,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setNotice("방명록 답글을 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "방명록 답글 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGuestbookEntry(entry: GuestbookEntry) {
    if (!isAdmin) {
      setNotice("관리자만 방명록을 삭제할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "guestbook", entry.id));
      setGuestbookReplyDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[entry.id];
        return nextDrafts;
      });
      setNotice("방명록을 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "방명록 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCharacter(character: Character) {
    if (!isAdmin) {
      setNotice("관리자만 삭제할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const worldImages = normalizeWorldEntries(character.worldEntries).flatMap(
        (entry) => entry.images,
      );
      const workImages = normalizeWorks(character.works).flatMap((work) => work.images ?? []);
      const worldWorkImages = normalizeWorldEntries(character.worldEntries).flatMap((entry) =>
        normalizeWorks(entry.works).flatMap((work) => work.images ?? []),
      );
      await deleteR2Images([
        ...(character.images ?? []),
        ...worldImages,
        ...workImages,
        ...worldWorkImages,
      ]);
      await deleteDoc(doc(getFirebaseDb(), "characters", character.id));
      setActiveCharacterId("");
      setDraft(createBlankDraft(activeCharacterKind));
      setNotice(`${character.name} 데이터를 Cloudflare R2와 Firestore에서 삭제했어요.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "자캐 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  // 이미지 업로드 후 Firestore 반영. R2/대기열은 useAdminUploads가 담당합니다.
  async function uploadImages() {
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
  }

  async function deleteImage(imageId: string) {
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
      setCharacters((current) =>
        current.map((character) =>
          character.id === activeCharacter.id ? nextCharacter : character,
        ),
      );
      setNotice("이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateImageInfo(
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) {
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
      setCharacters((current) =>
        current.map((character) =>
          character.id === activeCharacter.id ? nextCharacter : character,
        ),
      );
      setNotice("그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteWorldImage(imageId: string) {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry)
      return;

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
      setCharacters((current) =>
        current.map((character) =>
          character.id === activeCharacter.id ? nextCharacter : character,
        ),
      );
      setNotice("세계관 이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateWorldImageInfo(
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) {
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
      setCharacters((current) =>
        current.map((character) =>
          character.id === activeCharacter.id ? nextCharacter : character,
        ),
      );
      setNotice("세계관 그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addWork(event: FormEvent<HTMLFormElement>) {
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
  }

  async function deleteWork(workIndex: number) {
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
  }

  // 관리자 페이지 실제 레이아웃입니다: 좌측 선택 패널과 우측 편집 폼을 나눠 보여줍니다.
  return (
    <main className="admin-page min-h-screen bg-black px-5 py-8 text-emerald-50 md:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#0a0c12_0%,#080a10_78%,#070910_100%)]" />
      <div className="noise-layer" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-6">
        <header className="glass-card p-6 md:p-8">
          <p className="text-xs tracking-[0.35em] text-emerald-100/60 uppercase">Admin Edit Page</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold md:text-6xl">수정 페이지</h1>
              <p className="mt-3 text-sm text-emerald-100/65">
                여기서 저장한 내용은 본 페이지 카드와 상세 화면에 바로 반영됩니다.
              </p>
            </div>
            <Link
              href="/"
              className="border border-emerald-100/20 px-5 py-3 text-center text-sm text-emerald-50"
            >
              본 페이지로 돌아가기
            </Link>
          </div>
        </header>

        {!isAdmin ? (
          <section className="glass-card max-w-xl p-6">
            <h2 className="board-title">관리자 로그인</h2>
            <form onSubmit={signIn} className="mt-5 grid gap-3">
              <input
                value={loginDraft.loginId}
                onChange={(event) =>
                  setLoginDraft((current) => ({ ...current, loginId: event.target.value }))
                }
                placeholder="id"
                className="auth-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                value={loginDraft.password}
                onChange={(event) =>
                  setLoginDraft((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="password"
                type="text"
                className="auth-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                disabled={isAuthLoading}
                className="bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
              >
                {isAuthLoading ? "로그인 중..." : "로그인"}
              </button>
              {authNotice && (
                <p className="border border-stone-400/25 bg-stone-900/25 p-3 text-sm text-stone-200">
                  {authNotice}
                </p>
              )}
            </form>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="glass-card p-5">
              <div className="mb-5 grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminPanel("categories")}
                  className={`px-3 py-3 ${adminPanel === "categories" ? "bg-emerald-200 text-emerald-950" : "border border-emerald-100/20 text-emerald-100/70"}`}
                >
                  카테고리 관리
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPanel("characters")}
                  className={`px-3 py-3 ${adminPanel === "characters" ? "bg-emerald-200 text-emerald-950" : "border border-emerald-100/20 text-emerald-100/70"}`}
                >
                  자캐 · 페어 · 어나더
                </button>
              </div>
              {adminPanel === "characters" && (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                    {CHARACTER_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => handleActiveKindChange(kind)}
                        className={
                          activeCharacterKind === kind
                            ? "bg-emerald-200 px-2 py-2 font-semibold text-emerald-950"
                            : "border border-emerald-100/20 px-2 py-2 text-emerald-100/70"
                        }
                      >
                        {CHARACTER_KIND_ADMIN_LABELS[kind]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="board-title">
                      {CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind]} 목록
                    </h2>
                    <button
                      type="button"
                      onClick={() => startNewCharacter()}
                      className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
                    >
                      새 {CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind]}
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {filteredCharacters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => selectCharacterFromList(character)}
                        className={`border p-3 text-left text-sm ${
                          activeCharacter?.id === character.id
                            ? "border-stone-400/35 bg-emerald-100/10"
                            : "border-emerald-100/10 bg-black/30"
                        }`}
                      >
                        <span className="block text-lg font-semibold">{character.name}</span>
                        <span className="mt-1 block text-xs text-emerald-100/50">
                          {character.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {adminPanel === "categories" && (
                <>
                  <h2 className="board-title">카테고리 목록</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      { id: "home" as const, title: "상단문구 수정", subtitle: "home main text" },
                      {
                        id: "archive" as const,
                        title: "보관소 문구",
                        subtitle: "archive sidebar text",
                      },
                      { id: "diary" as const, title: "다이어리", subtitle: "diary category" },
                      { id: "guestbook" as const, title: "방명록", subtitle: "guest comments" },
                      { id: "extract" as const, title: "Banner", subtitle: "banner links" },
                      { id: "bgm" as const, title: "BGM", subtitle: "bgm playlist" },
                      { id: "worlds" as const, title: "World 관리", subtitle: "world archive" },
                    ].map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`border p-3 text-left text-sm ${
                          activeCategory === category.id
                            ? "border-stone-400/35 bg-emerald-100/10"
                            : "border-emerald-100/10 bg-black/30"
                        }`}
                      >
                        <span className="block text-lg font-semibold">{category.title}</span>
                        <span className="mt-1 block text-xs text-emerald-100/50">
                          {category.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                  {activeCategory === "diary" && (
                    <div className="mt-5 border-t border-emerald-100/10 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-emerald-50">일기 목록</h3>
                        <button
                          type="button"
                          onClick={startNewDiaryEntry}
                          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
                        >
                          새 일기
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {diaryEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                              selectDiaryEntry(entry);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeDiaryId === entry.id
                                ? "border-stone-400/35 bg-emerald-100/10"
                                : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{entry.title}</span>
                            <span className="mt-1 block text-xs text-emerald-100/50">
                              {entry.date || "no date"}
                            </span>
                          </button>
                        ))}
                        {diaryEntries.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                            아직 저장된 일기가 없어요.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeCategory === "extract" && (
                    <div className="mt-5 border-t border-emerald-100/10 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-emerald-50">배너 목록</h3>
                        <button
                          type="button"
                          onClick={startNewExtractBanner}
                          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
                        >
                          새 배너
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {extractBanners.map((banner) => (
                          <button
                            key={banner.id}
                            type="button"
                            onClick={() => {
                              selectExtractBanner(banner);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeExtractBannerId === banner.id
                                ? "border-stone-400/35 bg-emerald-100/10"
                                : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">
                              {banner.label || "제목 없음"}
                            </span>
                            <span className="mt-1 block truncate text-xs text-emerald-100/50">
                              {banner.linkUrl}
                            </span>
                          </button>
                        ))}
                        {extractBanners.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                            아직 저장된 배너가 없어요.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeCategory === "bgm" && (
                    <div className="mt-5 border-t border-emerald-100/10 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-emerald-50">BGM 목록</h3>
                        <button
                          type="button"
                          onClick={startNewBgmTrack}
                          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
                        >
                          새 BGM
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {bgmTracks.map((track) => (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => {
                              selectBgmTrack(track);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeBgmTrackId === track.id
                                ? "border-stone-400/35 bg-emerald-100/10"
                                : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{track.label}</span>
                            <span className="mt-1 block text-xs text-emerald-100/50">
                              {track.scope === "site" ? "사이트 기본" : "캐릭터 전용"}
                            </span>
                          </button>
                        ))}
                        {bgmTracks.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                            아직 추가된 BGM이 없어요.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeCategory === "worlds" && (
                    <div className="mt-5 border-t border-emerald-100/10 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-emerald-50">세계관 목록</h3>
                        <button
                          type="button"
                          onClick={startNewWorld}
                          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
                        >
                          새 세계관
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {worlds.map((world) => (
                          <button
                            key={world.id}
                            type="button"
                            onClick={() => {
                              selectWorld(world);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeWorldId === world.id
                                ? "border-stone-400/35 bg-emerald-100/10"
                                : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{world.title}</span>
                            <span className="mt-1 block text-xs text-emerald-100/50">
                              {world.id}
                            </span>
                          </button>
                        ))}
                        {worlds.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                            아직 저장된 세계관이 없어요.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="mt-5 w-full border border-emerald-100/20 px-4 py-3 text-sm text-emerald-50"
              >
                로그아웃
              </button>
            </aside>

            <section className="grid min-w-0 gap-6">
              {adminPanel === "categories" && (
                <form
                  onSubmit={(event) => {
                    if (activeCategory === "diary") return saveDiaryEntry(event);
                    if (activeCategory === "extract") return saveExtractBanner(event);
                    if (activeCategory === "bgm") return saveBgmTrack(event);
                    if (activeCategory === "worlds") return saveWorld(event);
                    event.preventDefault();
                    if (activeCategory === "guestbook") return;
                    return saveHomeContent(event);
                  }}
                  className="glass-card grid gap-6 p-5 md:p-6"
                >
                  {activeCategory === "home" && (
                    <section className="grid gap-4">
                      <h2 className="board-title">홈 상단 문구</h2>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        작은 문구
                        <input
                          value={homeContent.eyebrow}
                          onChange={(event) =>
                            setHomeContent((current) => ({
                              ...current,
                              eyebrow: event.target.value,
                            }))
                          }
                          placeholder="상단 작은 문구"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        큰 제목
                        <input
                          value={homeContent.title}
                          onChange={(event) =>
                            setHomeContent((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="상단 제목"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        본문 문구
                        <textarea
                          value={homeContent.body}
                          onChange={(event) =>
                            setHomeContent((current) => ({ ...current, body: event.target.value }))
                          }
                          placeholder="홈에 보일 소개 문구"
                          className="auth-input min-h-36"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        공지 / 메모
                        <textarea
                          value={homeContent.notice}
                          onChange={(event) =>
                            setHomeContent((current) => ({
                              ...current,
                              notice: event.target.value.slice(0, 1000),
                            }))
                          }
                          maxLength={1000}
                          placeholder="비우면 홈에 표시되지 않아요"
                          className="auth-input min-h-28"
                        />
                      </label>
                    </section>
                  )}

                  {activeCategory === "archive" && (
                    <section className="grid gap-4">
                      <h2 className="board-title">왼쪽 보관소 문구</h2>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        작은 문구
                        <input
                          value={archiveContent.eyebrow}
                          onChange={(event) =>
                            setArchiveContent((current) => ({
                              ...current,
                              eyebrow: event.target.value,
                            }))
                          }
                          placeholder="Archive"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        제목
                        <input
                          value={archiveContent.title}
                          onChange={(event) =>
                            setArchiveContent((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="보관소 제목"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        소개 문구
                        <textarea
                          value={archiveContent.body}
                          onChange={(event) =>
                            setArchiveContent((current) => ({
                              ...current,
                              body: event.target.value,
                            }))
                          }
                          placeholder="왼쪽 보관소 영역에 보일 문구"
                          className="auth-input min-h-32"
                        />
                      </label>
                    </section>
                  )}

                  {activeCategory === "diary" && (
                    <section className="grid gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="board-title">다이어리</h2>
                        {diaryDraft.id && (
                          <button
                            type="button"
                            onClick={() => deleteDiaryEntry(diaryDraft)}
                            disabled={isSaving}
                            className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                          >
                            현재 일기 삭제
                          </button>
                        )}
                      </div>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        일기 제목
                        <input
                          value={diaryDraft.title}
                          onChange={(event) =>
                            setDiaryDraft((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="다이어리 제목"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        날짜
                        <input
                          value={diaryDraft.date}
                          onChange={(event) =>
                            setDiaryDraft((current) => ({ ...current, date: event.target.value }))
                          }
                          placeholder="2026-06-15"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        일기 내용
                        <textarea
                          value={diaryDraft.body}
                          onChange={(event) =>
                            setDiaryDraft((current) => ({ ...current, body: event.target.value }))
                          }
                          placeholder="오늘의 기록을 적어주세요."
                          className="auth-input min-h-56"
                        />
                      </label>
                    </section>
                  )}

                  {activeCategory === "extract" && (
                    <section className="grid gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="board-title">Banner</h2>
                        {extractBannerDraft.id && extractBannerDraft.image && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteExtractBanner({
                                id: extractBannerDraft.id,
                                label: extractBannerDraft.label,
                                linkUrl: extractBannerDraft.linkUrl,
                                image: extractBannerDraft.image!,
                              })
                            }
                            disabled={isSaving}
                            className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                          >
                            현재 배너 삭제
                          </button>
                        )}
                      </div>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        배너 라벨 (선택)
                        <input
                          value={extractBannerDraft.label}
                          onChange={(event) =>
                            setExtractBannerDraft((current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="배너에 표시할 짧은 문구"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        이동 링크
                        <input
                          value={extractBannerDraft.linkUrl}
                          onChange={(event) =>
                            setExtractBannerDraft((current) => ({
                              ...current,
                              linkUrl: event.target.value,
                            }))
                          }
                          placeholder="https://example.com 또는 /guest"
                          className="auth-input"
                        />
                      </label>
                      <div className="grid gap-2 text-sm text-emerald-100/75">
                        배너 이미지
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleExtractBannerImageChange}
                          className="text-xs"
                        />
                        {(extractBannerImageFile || extractBannerDraft.image) && (
                          <div className="extract-banner-link overflow-hidden">
                            {extractBannerDraft.image ? (
                              <ThumbnailImage
                                image={extractBannerDraft.image}
                                src={
                                  extractBannerImageFile
                                    ? URL.createObjectURL(extractBannerImageFile)
                                    : extractBannerDraft.image.url
                                }
                                alt="Banner 미리보기"
                                className="extract-banner-image"
                              />
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element -- Local preview URL for banner upload. */
                              <img
                                src={
                                  extractBannerImageFile
                                    ? URL.createObjectURL(extractBannerImageFile)
                                    : ""
                                }
                                alt="Banner 미리보기"
                                className="extract-banner-image"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {activeCategory === "bgm" && (
                    <section className="grid gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="board-title">BGM</h2>
                        {bgmTrackDraft.id && bgmTrackDraft.url && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteBgmTrack({
                                id: bgmTrackDraft.id,
                                label: bgmTrackDraft.label,
                                url: bgmTrackDraft.url,
                                scope: bgmTrackDraft.scope,
                              })
                            }
                            disabled={isSaving}
                            className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                          >
                            현재 BGM 삭제
                          </button>
                        )}
                      </div>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        곡 이름
                        <input
                          value={bgmTrackDraft.label}
                          onChange={(event) =>
                            setBgmTrackDraft((current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="플레이어·선택 목록에 보일 이름"
                          className="auth-input"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        사용 범위
                        <select
                          value={bgmTrackDraft.scope}
                          onChange={(event) =>
                            setBgmTrackDraft((current) => ({
                              ...current,
                              scope: event.target.value as BgmTrackScope,
                            }))
                          }
                          className="auth-input"
                        >
                          <option value="site">사이트 기본 (플레이어 순환 + 캐릭터 선택)</option>
                          <option value="character-only">캐릭터 전용 (상세에서만)</option>
                        </select>
                      </label>
                      <div className="grid gap-2 text-sm text-emerald-100/75">
                        오디오 파일
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/aac,.mp3,.ogg,.wav,.m4a,.aac"
                          onChange={handleBgmAudioChange}
                          className="text-xs"
                        />
                        <p className="text-xs text-emerald-100/55">
                          mp3·ogg·wav 등, 파일 1개당 최대 15MB
                        </p>
                        {(bgmAudioFile || bgmTrackDraft.url) && (
                          <audio
                            controls
                            preload="none"
                            src={
                              bgmAudioFile ? URL.createObjectURL(bgmAudioFile) : bgmTrackDraft.url
                            }
                            className="w-full"
                          />
                        )}
                      </div>
                    </section>
                  )}

                  {activeCategory === "guestbook" && (
                    <section className="grid gap-4">
                      <div>
                        <h2 className="board-title">방명록 관리</h2>
                        <p className="mt-2 text-sm text-emerald-100/55">
                          본 페이지에 남겨진 방명록에 관리자 답글을 달 수 있어요.
                        </p>
                      </div>
                      <div className="grid gap-4">
                        {guestbookEntries.map((entry, index) => (
                          <article
                            key={entry.id}
                            className="border border-emerald-100/10 bg-black/30 p-4"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-semibold text-emerald-50">
                                  No.{guestbookEntries.length - index} {entry.name}
                                </p>
                                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-emerald-50/70">
                                  {entry.body}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteGuestbookEntry(entry)}
                                disabled={isSaving}
                                className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                              >
                                삭제
                              </button>
                            </div>
                            <label className="mt-4 grid gap-2 text-sm text-emerald-100/75">
                              관리자 답글
                              <textarea
                                value={guestbookReplyDrafts[entry.id] ?? ""}
                                onChange={(event) =>
                                  setGuestbookReplyDrafts((current) => ({
                                    ...current,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                placeholder="답글을 입력해주세요."
                                className="auth-input min-h-28"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => saveGuestbookReply(entry)}
                              disabled={isSaving}
                              className="mt-3 justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                            >
                              답글 저장
                            </button>
                          </article>
                        ))}
                        {guestbookEntries.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/55">
                            아직 남겨진 방명록이 없어요.
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                  {activeCategory === "worlds" && (
                    <section className="grid gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="board-title">World 관리</h2>
                          {activeWorldGlitchLabel ? (
                            <p className="mt-2 border border-amber-300/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
                              오류 대상:{" "}
                              <span className="font-semibold">{activeWorldGlitchLabel}</span>
                            </p>
                          ) : null}
                        </div>
                        {worldDraft.id && (
                          <button
                            type="button"
                            onClick={() => deleteWorld(worldDraft.id)}
                            disabled={isSaving}
                            className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                          >
                            현재 세계관 삭제
                          </button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          고유 ID
                          <input
                            value={worldDraft.id}
                            onChange={(event) =>
                              setWorldDraft((current) => ({ ...current, id: event.target.value }))
                            }
                            placeholder="예: coc-1920"
                            className="auth-input"
                          />
                        </label>
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          세계관 이름
                          <AdminInlineGlitchEditor
                            value={worldDraft.title}
                            onChange={(value) =>
                              setWorldDraft((current) =>
                                updateWorldDraftFieldValue(current, "title", value),
                              )
                            }
                            glitch={worldDraft.textGlitch.title}
                            onGlitchChange={(config) =>
                              setWorldDraft((current) =>
                                updateWorldDraftGlitchPath(current, "title", config),
                              )
                            }
                            glitchBindings={bindWorldGlitchField("title")}
                            placeholder="예: 크툴루 1920"
                            className={glitchFieldClass("title", activeWorldGlitchFieldPath, "")}
                            minHeightClass="min-h-10"
                          />
                        </label>
                      </div>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        한 줄 설명
                        <AdminInlineGlitchEditor
                          value={worldDraft.subtitle}
                          onChange={(value) =>
                            setWorldDraft((current) =>
                              updateWorldDraftFieldValue(current, "subtitle", value),
                            )
                          }
                          glitch={worldDraft.textGlitch.subtitle}
                          onGlitchChange={(config) =>
                            setWorldDraft((current) =>
                              updateWorldDraftGlitchPath(current, "subtitle", config),
                            )
                          }
                          glitchBindings={bindWorldGlitchField("subtitle")}
                          placeholder="세계관을 짧게 설명해주세요."
                          className={glitchFieldClass("subtitle", activeWorldGlitchFieldPath, "")}
                          minHeightClass="min-h-10"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        기록 열람 비밀번호
                        <input
                          value={worldDraft.password}
                          onChange={(event) =>
                            setWorldDraft((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="비워두면 공개 / 입력하면 기록 잠금"
                          className="auth-input"
                        />
                        <span className="text-xs leading-5 text-emerald-100/45">
                          본 페이지에서는 세계관 목록과 소개만 보이고, 참가 자캐 기록은 이
                          비밀번호를 입력해야 열립니다.
                        </span>
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        상세 설명
                        <AdminInlineGlitchEditor
                          value={worldDraft.description}
                          onChange={(value) =>
                            setWorldDraft((current) =>
                              updateWorldDraftFieldValue(current, "description", value),
                            )
                          }
                          glitch={worldDraft.textGlitch.description}
                          onGlitchChange={(config) =>
                            setWorldDraft((current) =>
                              updateWorldDraftGlitchPath(current, "description", config),
                            )
                          }
                          glitchBindings={bindWorldGlitchField("description")}
                          placeholder="룰, 시대, 분위기, 캠페인 설명 등"
                          className={glitchFieldClass(
                            "description",
                            activeWorldGlitchFieldPath,
                            "",
                          )}
                          minHeightClass="min-h-40"
                        />
                      </label>

                      <div id="admin-world-glitch-tool">
                        <TextScrambleTool
                          fieldPickerGroups={
                            worldGlitchFieldPickerOptions.length > 0
                              ? [
                                  {
                                    id: "world",
                                    label: "세계관 필드",
                                    options: worldGlitchFieldPickerOptions,
                                  },
                                ]
                              : []
                          }
                          onFieldSelect={selectWorldGlitchField}
                          activeFieldPath={activeWorldGlitchFieldPath}
                          fieldValue={
                            activeWorldGlitchFieldPath
                              ? getWorldDraftFieldValue(worldDraft, activeWorldGlitchFieldPath)
                              : ""
                          }
                          externalSelection={worldGlitchFieldSelection}
                          onExternalSelectionClear={() => setWorldGlitchFieldSelection(null)}
                          onFieldValueChange={(value) => {
                            if (!activeWorldGlitchFieldPath) {
                              return;
                            }

                            setWorldDraft((current) =>
                              updateWorldDraftFieldValue(
                                current,
                                activeWorldGlitchFieldPath,
                                value,
                              ),
                            );
                          }}
                          glitchConfig={
                            activeWorldGlitchFieldPath
                              ? worldDraft.textGlitch[activeWorldGlitchFieldPath]
                              : undefined
                          }
                          onGlitchChange={(config) => {
                            if (!activeWorldGlitchFieldPath) {
                              return;
                            }

                            setWorldDraft((current) =>
                              updateWorldDraftGlitchPath(
                                current,
                                activeWorldGlitchFieldPath,
                                config,
                              ),
                            );
                          }}
                          onNotice={setNotice}
                          allCharacters={characters}
                        />
                      </div>
                    </section>
                  )}

                  {activeCategory !== "guestbook" && (
                    <button
                      disabled={isSaving}
                      className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                    >
                      {activeCategory === "diary"
                        ? "일기 저장"
                        : activeCategory === "extract"
                          ? "배너 저장"
                          : activeCategory === "bgm"
                            ? "BGM 저장"
                            : activeCategory === "worlds"
                              ? "세계관 저장"
                              : "카테고리 저장"}
                    </button>
                  )}
                </form>
              )}

              {adminPanel === "characters" && (
                <>
                  <CharacterEditSectionNav
                    active={characterEditSection}
                    onChange={setCharacterEditSection}
                    characterName={draft.name || activeCharacter?.name || ""}
                    newItemLabel={`새 ${kindLabel}`}
                    glitchFieldCount={glitchFieldCount}
                    subPageCount={subPageCount}
                    isPair={isPairDraft}
                    activeGlitchLabel={activeGlitchLabel}
                  />
                  <form
                    onSubmit={saveCharacter}
                    className="glass-card admin-edit-form grid max-w-full min-w-0 gap-3 p-5 pb-28 md:p-6"
                  >
                    {characterEditSection === "basics" && (
                      <>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <h2 className="board-title">{kindLabel} 카드 · 레코드</h2>
                          <div className="flex flex-wrap gap-2">
                            {canRecoverLegacyPairMember && (
                              <button
                                type="button"
                                onClick={recoverLegacyPairMemberData}
                                disabled={isSaving}
                                className="border border-amber-300/35 bg-amber-950/25 px-4 py-2 text-sm text-amber-100 disabled:opacity-60"
                              >
                                페어 멤버 데이터 복구
                              </button>
                            )}
                            {activeCharacter && (
                              <button
                                type="button"
                                onClick={reloadCharacterFromServer}
                                disabled={isSaving}
                                className="border border-emerald-200/25 px-4 py-2 text-sm text-emerald-100/85 disabled:opacity-60"
                              >
                                서버에서 다시 불러오기
                              </button>
                            )}
                            {activeCharacter && (
                              <button
                                type="button"
                                onClick={() => deleteCharacter(activeCharacter)}
                                disabled={isSaving}
                                className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                              >
                                현재 {kindLabel} 삭제
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            고유 ID
                            <input
                              value={draft.id}
                              onChange={(event) =>
                                setDraft((current) => ({ ...current, id: event.target.value }))
                              }
                              placeholder="id 예: shin"
                              className="auth-input"
                            />
                          </label>
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            분류 (Archive)
                            <select
                              value={draft.kind}
                              onChange={(event) => {
                                const kind = event.target.value as CharacterKind;
                                setDraft((current) => ({
                                  ...current,
                                  kind,
                                  pairMemberIds: kind === "pair" ? current.pairMemberIds : ["", ""],
                                }));
                              }}
                              className="auth-input"
                            >
                              {CHARACTER_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {CHARACTER_KIND_ADMIN_LABELS[kind]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-start gap-3 rounded border border-stone-400/20 bg-black/25 px-3 py-3 text-sm text-emerald-100/75 md:col-span-2">
                            <input
                              type="checkbox"
                              checked={draft.confidential}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  confidential: event.target.checked,
                                }))
                              }
                              className="mt-1"
                            />
                            <span className="grid gap-1">
                              <span className="font-medium text-emerald-50">기밀 문서 경고</span>
                              <span className="text-xs leading-5 text-emerald-100/55">
                                켜면 공개 홈에서 이 자캐를 열 때 기밀 문서 경고와 경고음이 납니다.
                              </span>
                            </span>
                          </label>
                          <label className="grid gap-2 text-sm text-emerald-100/75 md:col-span-2">
                            {isPairDraft ? "페어 이름" : "이름"}
                            <AdminInlineGlitchEditor
                              value={draft.name}
                              onChange={(value) =>
                                setDraft((current) => updateDraftFieldValue(current, "name", value))
                              }
                              glitch={getDraftGlitchConfig(draft, "name")}
                              onGlitchChange={(config) =>
                                setDraft((current) =>
                                  updateDraftGlitchPath(current, "name", config),
                                )
                              }
                              glitchBindings={bindGlitchField("name")}
                              placeholder={
                                isPairDraft ? "비우면 멤버 이름으로 자동 표시" : `${kindLabel} 이름`
                              }
                              className={glitchFieldClass("name", activeGlitchFieldPath, "")}
                              minHeightClass="min-h-10"
                            />
                          </label>
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            한자 이름
                            <AdminInlineGlitchEditor
                              value={draft.kanjiName}
                              onChange={(value) =>
                                setDraft((current) =>
                                  updateDraftFieldValue(current, "kanjiName", value),
                                )
                              }
                              glitch={getDraftGlitchConfig(draft, "kanjiName")}
                              onGlitchChange={(config) =>
                                setDraft((current) =>
                                  updateDraftGlitchPath(current, "kanjiName", config),
                                )
                              }
                              glitchBindings={bindGlitchField("kanjiName")}
                              placeholder="예: 芥川"
                              className={glitchFieldClass("kanjiName", activeGlitchFieldPath, "")}
                              minHeightClass="min-h-10"
                            />
                          </label>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            한 줄 소개
                            <AdminInlineGlitchEditor
                              value={draft.subtitle}
                              onChange={(value) =>
                                setDraft((current) =>
                                  updateDraftFieldValue(current, "subtitle", value),
                                )
                              }
                              glitch={getDraftGlitchConfig(draft, "subtitle")}
                              onGlitchChange={(config) =>
                                setDraft((current) =>
                                  updateDraftGlitchPath(current, "subtitle", config),
                                )
                              }
                              glitchBindings={bindGlitchField("subtitle")}
                              placeholder="카드에 보일 짧은 소개"
                              className={glitchFieldClass("subtitle", activeGlitchFieldPath, "")}
                              minHeightClass="min-h-10"
                            />
                          </label>
                          <div className="grid gap-2">
                            <label className="text-sm text-emerald-100/75">색 분위기</label>
                            <PaletteEditor
                              palette={draft.palette}
                              onChange={(palette) =>
                                setDraft((current) => ({ ...current, palette }))
                              }
                              onExtractFromImage={extractCharacterPaletteFromImage}
                            />
                          </div>
                        </div>
                        <MetaFieldsEditor
                          fields={draft.metaFields}
                          onFieldsChange={(metaFields) => {
                            setDraft((current) => {
                              const removedField = current.metaFields.find(
                                (field) => !metaFields.some((next) => next.id === field.id),
                              );
                              const nextGlitch = { ...current.textGlitch };
                              if (removedField) {
                                delete nextGlitch[metaFieldGlitchPath(removedField.id)];
                              }
                              return { ...current, metaFields, textGlitch: nextGlitch };
                            });
                          }}
                          bindGlitchField={bindGlitchField}
                          activeGlitchFieldPath={activeGlitchFieldPath}
                          glitchFieldClass={glitchFieldClass}
                          onBodyChange={(fieldId, value) =>
                            setDraft((current) =>
                              updateDraftFieldValue(current, metaFieldGlitchPath(fieldId), value),
                            )
                          }
                          getFieldGlitch={(fieldId) =>
                            getDraftGlitchConfig(draft, metaFieldGlitchPath(fieldId))
                          }
                          onFieldGlitchChange={(fieldId, config) =>
                            setDraft((current) =>
                              updateDraftGlitchPath(current, metaFieldGlitchPath(fieldId), config),
                            )
                          }
                        />
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          {isPairDraft ? "페어 대표 대사" : "대표 대사"}
                          <AdminInlineGlitchEditor
                            value={draft.quote}
                            onChange={(value) =>
                              setDraft((current) => updateDraftFieldValue(current, "quote", value))
                            }
                            glitch={getDraftGlitchConfig(draft, "quote")}
                            onGlitchChange={(config) =>
                              setDraft((current) => updateDraftGlitchPath(current, "quote", config))
                            }
                            glitchBindings={bindGlitchField("quote")}
                            placeholder={
                              isPairDraft
                                ? "페어 관계를 보여 줄 대표 문장"
                                : "캐릭터 상세에 보일 대표 문장"
                            }
                            className={glitchFieldClass("quote", activeGlitchFieldPath, "")}
                            minHeightClass="min-h-20"
                          />
                        </label>
                        <CaseFileThemeEditor
                          theme={draft.detailTheme}
                          onChange={(detailTheme) =>
                            setDraft((current) => ({
                              ...current,
                              detailTheme,
                            }))
                          }
                        />
                        {!isPairDraft && (
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            상세 보기 BGM
                            <BgmQuickPicker
                              value={draft.bgmUrl}
                              options={bgmCharacterOptions}
                              disabled={isSaving}
                              onChange={(bgmUrl) =>
                                setDraft((current) => ({
                                  ...current,
                                  bgmUrl,
                                }))
                              }
                              onQuickUpload={quickAddCharacterBgm}
                            />
                          </label>
                        )}
                        <ProfileFieldsEditor
                          fields={draft.profileFields}
                          onFieldsChange={(profileFields) =>
                            setDraft((current) => {
                              const removedField = current.profileFields.find(
                                (field) => !profileFields.some((next) => next.id === field.id),
                              );
                              const nextGlitch = { ...current.textGlitch };
                              if (removedField) {
                                delete nextGlitch[profileFieldGlitchPath(removedField.id)];
                              }
                              return { ...current, profileFields, textGlitch: nextGlitch };
                            })
                          }
                          getFieldGlitchPath={profileFieldGlitchPath}
                          bindGlitchField={bindGlitchField}
                          activeGlitchFieldPath={activeGlitchFieldPath}
                          glitchFieldClass={glitchFieldClass}
                          onValueChange={(fieldId, value) =>
                            setDraft((current) =>
                              updateDraftFieldValue(
                                current,
                                profileFieldGlitchPath(fieldId),
                                value,
                              ),
                            )
                          }
                          getFieldGlitch={(fieldId) =>
                            getDraftGlitchConfig(draft, profileFieldGlitchPath(fieldId))
                          }
                          onFieldGlitchChange={(fieldId, config) =>
                            setDraft((current) =>
                              updateDraftGlitchPath(
                                current,
                                profileFieldGlitchPath(fieldId),
                                config,
                              ),
                            )
                          }
                        />

                        <section
                          id="admin-record-boxes"
                          className="mt-2 grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-emerald-50">레코드 박스</p>
                              <p className="mt-1 text-xs text-emerald-100/55">
                                {isPairDraft
                                  ? "페어 Record 탭에 나올 관계·특징 박스입니다."
                                  : "본 페이지 Record 탭에 나오는 상세 설정 박스입니다. ↑↓로 표시 순서를 바꿀 수 있어요."}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={addSettingSection}
                              className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
                            >
                              레코드 박스 추가
                            </button>
                          </div>
                          <div className="grid gap-3">
                            {draft.settingSections.map((section, index) => (
                              <article
                                key={section.id}
                                className="grid gap-2 border border-emerald-100/10 bg-black/35 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs tracking-[0.22em] text-emerald-100/45 uppercase">
                                    레코드 박스 {String(index + 1).padStart(2, "0")}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <SettingSectionOrderButtons
                                      index={index}
                                      total={draft.settingSections.length}
                                      onMoveUp={() => moveSettingSection(section.id, "up")}
                                      onMoveDown={() => moveSettingSection(section.id, "down")}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeSettingSection(section.id)}
                                      className="text-xs text-stone-300/70"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </div>
                                <AdminInlineGlitchEditor
                                  value={section.title}
                                  onChange={(value) =>
                                    setDraft((current) =>
                                      updateDraftFieldValue(
                                        current,
                                        settingSectionTitleGlitchPath(section.id),
                                        value,
                                      ),
                                    )
                                  }
                                  glitch={getDraftGlitchConfig(
                                    draft,
                                    settingSectionTitleGlitchPath(section.id),
                                  )}
                                  onGlitchChange={(config) =>
                                    setDraft((current) =>
                                      updateDraftGlitchPath(
                                        current,
                                        settingSectionTitleGlitchPath(section.id),
                                        config,
                                      ),
                                    )
                                  }
                                  glitchBindings={bindGlitchField(
                                    settingSectionTitleGlitchPath(section.id),
                                  )}
                                  placeholder="예: 성격"
                                  className={glitchFieldClass(
                                    settingSectionTitleGlitchPath(section.id),
                                    activeGlitchFieldPath,
                                    "",
                                  )}
                                  minHeightClass="min-h-10"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSettingSection(section.id, {
                                        kind: "record",
                                        excerpt: "",
                                      })
                                    }
                                    className={`border px-3 py-1.5 text-xs ${
                                      (section.kind ?? "record") === "record"
                                        ? "border-emerald-200/45 text-emerald-50"
                                        : "border-stone-400/25 text-stone-300/70"
                                    }`}
                                  >
                                    일반 레코드
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSettingSection(section.id, { kind: "story" })
                                    }
                                    className={`border px-3 py-1.5 text-xs ${
                                      section.kind === "story"
                                        ? "border-emerald-200/45 text-emerald-50"
                                        : "border-stone-400/25 text-stone-300/70"
                                    }`}
                                  >
                                    스토리 창
                                  </button>
                                </div>
                                {section.kind === "story" && (
                                  <AdminInlineGlitchEditor
                                    value={section.excerpt ?? ""}
                                    onChange={(value) =>
                                      setDraft((current) =>
                                        updateDraftFieldValue(
                                          current,
                                          settingSectionExcerptGlitchPath(section.id),
                                          value,
                                        ),
                                      )
                                    }
                                    glitch={getDraftGlitchConfig(
                                      draft,
                                      settingSectionExcerptGlitchPath(section.id),
                                    )}
                                    onGlitchChange={(config) =>
                                      setDraft((current) =>
                                        updateDraftGlitchPath(
                                          current,
                                          settingSectionExcerptGlitchPath(section.id),
                                          config,
                                        ),
                                      )
                                    }
                                    glitchBindings={bindGlitchField(
                                      settingSectionExcerptGlitchPath(section.id),
                                    )}
                                    placeholder="Record Box에 보일 짧은 소개 (비우면 본문 앞부분이 자동으로 사용됩니다)"
                                    className={glitchFieldClass(
                                      settingSectionExcerptGlitchPath(section.id),
                                      activeGlitchFieldPath,
                                      "",
                                    )}
                                    minHeightClass="min-h-16"
                                  />
                                )}
                                <AdminInlineGlitchEditor
                                  value={section.body}
                                  onChange={(value) =>
                                    setDraft((current) =>
                                      updateDraftFieldValue(
                                        current,
                                        settingSectionGlitchPath(section.id),
                                        value,
                                      ),
                                    )
                                  }
                                  glitch={getDraftGlitchConfig(
                                    draft,
                                    settingSectionGlitchPath(section.id),
                                  )}
                                  onGlitchChange={(config) =>
                                    setDraft((current) =>
                                      updateDraftGlitchPath(
                                        current,
                                        settingSectionGlitchPath(section.id),
                                        config,
                                      ),
                                    )
                                  }
                                  glitchBindings={bindGlitchField(
                                    settingSectionGlitchPath(section.id),
                                  )}
                                  placeholder={
                                    section.kind === "story" ? "스토리 본문" : "내용 입력"
                                  }
                                  className={glitchFieldClass(
                                    settingSectionGlitchPath(section.id),
                                    activeGlitchFieldPath,
                                    "",
                                  )}
                                  minHeightClass={
                                    section.kind === "story" ? "min-h-40" : "min-h-24"
                                  }
                                />
                              </article>
                            ))}
                            {draft.settingSections.length === 0 && (
                              <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                                「레코드 박스 추가」를 누르면 여기에 박스가 생깁니다.
                              </p>
                            )}
                          </div>
                        </section>

                        <RelationshipsEditor
                          entries={draft.relationshipEntries}
                          onEntriesChange={(relationshipEntries) =>
                            setDraft((current) => {
                              const removedEntry = current.relationshipEntries.find(
                                (entry) =>
                                  !relationshipEntries.some((next) => next.id === entry.id),
                              );
                              const nextGlitch = { ...current.textGlitch };
                              if (removedEntry) {
                                delete nextGlitch[relationshipEntryGlitchPath(removedEntry.id)];
                                delete nextGlitch[relationshipEntryNameGlitchPath(removedEntry.id)];
                                delete nextGlitch[
                                  relationshipEntryLabelGlitchPath(removedEntry.id)
                                ];
                              }
                              return { ...current, relationshipEntries };
                            })
                          }
                          linkableCharacters={characters}
                          currentCharacterId={draft.id}
                          ownSubPages={listNavigableSubPages(
                            { id: draft.id, subPages: draft.subPages } as Character,
                            characters,
                          )}
                          bindGlitchField={bindGlitchField}
                          activeGlitchFieldPath={activeGlitchFieldPath}
                          glitchFieldClass={glitchFieldClass}
                          onEntryFieldValueChange={(path, value) =>
                            setDraft((current) => updateDraftFieldValue(current, path, value))
                          }
                          getGlitchByPath={(path) => getDraftGlitchConfig(draft, path)}
                          onGlitchPathChange={(path, config) =>
                            setDraft((current) => updateDraftGlitchPath(current, path, config))
                          }
                        />
                      </>
                    )}

                    {characterEditSection === "members" && isPairDraft && (
                      <>
                        <div>
                          <h2 className="board-title">연결 캐릭터</h2>
                          <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                            OC 또는 어나더 항목을 선택해 페어에 연결합니다. 공개 페이지에서 각
                            캐릭터 상세로 이동할 수 있어요.
                          </p>
                        </div>
                        <PairMemberPicker
                          pairMemberIds={draft.pairMemberIds}
                          linkableCharacters={pairLinkableCharacters}
                          currentPairId={draft.id}
                          onChange={(pairMemberIds) =>
                            setDraft((current) => ({
                              ...current,
                              pairMemberIds,
                            }))
                          }
                        />
                      </>
                    )}

                    {characterEditSection === "glitch" && (
                      <div id="admin-glitch-tool">
                        <TextScrambleTool
                          fieldPickerGroups={glitchFieldPickerGroups}
                          onFieldSelect={selectGlitchField}
                          activeFieldPath={activeGlitchFieldPath}
                          fieldValue={
                            activeGlitchFieldPath
                              ? getCharacterDraftFieldValue(draft, activeGlitchFieldPath)
                              : ""
                          }
                          externalSelection={glitchFieldSelection}
                          onExternalSelectionClear={() => setGlitchFieldSelection(null)}
                          onFieldValueChange={(value) => {
                            if (!activeGlitchFieldPath) {
                              return;
                            }

                            setDraft((current) =>
                              updateDraftFieldValue(current, activeGlitchFieldPath, value),
                            );
                          }}
                          glitchConfig={
                            activeGlitchFieldPath
                              ? getDraftGlitchConfig(draft, activeGlitchFieldPath)
                              : undefined
                          }
                          onGlitchChange={(config) => {
                            if (!activeGlitchFieldPath) {
                              return;
                            }

                            setDraft((current) =>
                              updateDraftGlitchPath(current, activeGlitchFieldPath, config),
                            );
                          }}
                          onNotice={setNotice}
                          allCharacters={characters}
                          currentCharacterId={draft.id}
                          currentSection={characterKindToSection(
                            normalizeCharacterKind(draft.kind),
                          )}
                          onZoneApplied={() => {
                            setGlitchFieldSelection(null);
                            setGlitchFieldAnchorElement(null);
                          }}
                        />
                      </div>
                    )}

                    {characterEditSection === "subpages" && (
                      <>
                        <div>
                          <h2 className="board-title">상세 페이지</h2>
                          <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                            서브 캐릭터, 물건, 능력, 장소 등을 각각 상세 페이지로 추가할 수 있어요.
                            자캐 본 페이지와 같은 카드·레코드·그림·BGM·오류 설정을 모두 쓸 수
                            있습니다.
                          </p>
                        </div>
                        <SubPageEditor
                          subPages={draft.subPages}
                          activeSubPageId={activeSubPageId}
                          onActiveSubPageChange={setActiveSubPageId}
                          onSubPagesChange={(subPages) =>
                            setDraft((current) => ({
                              ...current,
                              subPages,
                            }))
                          }
                          linkableCharacters={characters}
                          parentCharacterId={draft.id}
                          allCharacters={characters}
                          onNotice={setNotice}
                          bgmOptions={bgmCharacterOptions}
                          onBgmQuickUpload={quickAddCharacterBgm}
                          bindGlitchField={bindGlitchField}
                          activeGlitchFieldPath={activeGlitchFieldPath}
                          glitchFieldClass={glitchFieldClass}
                          onGlitchFieldValueChange={(path, value) =>
                            setDraft((current) => updateDraftFieldValue(current, path, value))
                          }
                          getFieldGlitch={(path) => getDraftGlitchConfig(draft, path)}
                          onFieldGlitchChange={(path, config) =>
                            setDraft((current) => updateDraftGlitchPath(current, path, config))
                          }
                          isSaving={isSaving}
                        />
                      </>
                    )}

                    {(characterEditSection === "basics" ||
                      characterEditSection === "glitch" ||
                      characterEditSection === "subpages" ||
                      characterEditSection === "members") && (
                      <div className="pointer-events-none sticky bottom-3 z-10 -mx-1 border border-emerald-200/20 bg-black/85 p-3 backdrop-blur-sm [&_button]:pointer-events-auto">
                        <button
                          disabled={isSaving}
                          className="admin-action-btn w-full px-5 py-3 text-sm disabled:opacity-60 md:ml-auto md:w-auto"
                        >
                          {isSaving ? "저장 중..." : "본 페이지에 저장"}
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {adminPanel === "characters" &&
                activeCharacter &&
                characterEditSection === "world" && (
                  <section className="glass-card grid gap-4 p-5 md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="board-title">세계관별 자료</h2>
                        <p className="mt-2 text-xs text-emerald-100/55">
                          World마다 설정, 그림, 로그를 따로 정리합니다.
                        </p>
                      </div>
                      <select
                        value={activeCharacterWorldId}
                        onChange={(event) => selectCharacterWorld(event.target.value)}
                        className="auth-input md:max-w-xs"
                      >
                        <option value="">세계관 선택</option>
                        {worlds.map((world) => (
                          <option key={world.id} value={world.id}>
                            {world.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeCharacterWorldId ? (
                      <div className="grid gap-5">
                        <div className="flex flex-col gap-3 border border-stone-400/15 bg-stone-900/10 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-50">
                              참가 기록 관리
                            </h3>
                            <p className="mt-1 text-xs text-emerald-100/55">
                              이 자캐를 선택한 세계관에서 제거합니다. 세계관 전용 그림도 R2와
                              Firestore에서 함께 삭제돼요.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={deleteCharacterWorldEntry}
                            disabled={isSaving || !activeCharacterWorldEntry}
                            className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
                          >
                            참가 자캐 삭제
                          </button>
                        </div>
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          세계관별 설정
                          <textarea
                            value={worldSettingsText}
                            onChange={(event) => setWorldSettingsText(event.target.value)}
                            placeholder="한 줄에 하나씩 입력"
                            className="auth-input min-h-32"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={saveCharacterWorldSettings}
                          disabled={isSaving}
                          className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                        >
                          세계관 설정 저장
                        </button>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {(activeCharacterWorldEntry?.images ?? []).map((image) => (
                            <article key={image.id} className="gallery-tile">
                              <div className="aspect-[3/2] overflow-hidden">
                                <ThumbnailImage
                                  image={image}
                                  src={image.url}
                                  alt={image.name}
                                  className="opacity-90"
                                />
                              </div>
                              <div className="p-3 text-sm">
                                <form
                                  className="grid gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    const formData = new FormData(event.currentTarget);
                                    updateWorldImageInfo(image.id, {
                                      name:
                                        String(formData.get("name") ?? image.name).trim() ||
                                        image.name,
                                      category: String(formData.get("category")) as
                                        | "illustration"
                                        | "standing",
                                    });
                                  }}
                                >
                                  <input
                                    name="name"
                                    defaultValue={image.name}
                                    className="auth-input text-xs"
                                    placeholder="그림 이름"
                                  />
                                  <select
                                    name="category"
                                    defaultValue={image.category ?? "illustration"}
                                    className="auth-input text-xs"
                                  >
                                    <option value="illustration">일러스트 / 대표 썸네일</option>
                                    <option value="standing">스탠딩 / 표정 모음</option>
                                  </select>
                                  <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60"
                                  >
                                    정보 저장
                                  </button>
                                </form>
                                <button
                                  type="button"
                                  onClick={() => deleteWorldImage(image.id)}
                                  disabled={isSaving}
                                  className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                                >
                                  기록 삭제
                                </button>
                              </div>
                            </article>
                          ))}
                          {(activeCharacterWorldEntry?.images ?? []).length === 0 && (
                            <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
                              이 세계관에 등록된 그림이 없어요. 그림 관리에서 업로드 대상을 이
                              세계관으로 선택해주세요.
                            </p>
                          )}
                        </div>

                        <form
                          onSubmit={addWorldWork}
                          className="grid gap-3 border border-emerald-100/10 bg-black/30 p-4"
                        >
                          <h3 className="text-sm font-semibold text-emerald-50">
                            세계관 연성/로그 추가
                          </h3>
                          <div className="grid gap-3 md:grid-cols-3">
                            <input
                              value={worldWorkDraft.title}
                              onChange={(event) =>
                                setWorldWorkDraft((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="제목"
                              className="auth-input"
                            />
                            <input
                              value={worldWorkDraft.kind}
                              onChange={(event) =>
                                setWorldWorkDraft((current) => ({
                                  ...current,
                                  kind: event.target.value,
                                }))
                              }
                              placeholder="종류"
                              className="auth-input"
                            />
                            <input
                              value={worldWorkDraft.date}
                              onChange={(event) =>
                                setWorldWorkDraft((current) => ({
                                  ...current,
                                  date: event.target.value,
                                }))
                              }
                              placeholder="날짜"
                              className="auth-input"
                            />
                          </div>
                          <DocumentTextImport
                            disabled={isSaving}
                            onNotice={setNotice}
                            onImported={({ text, suggestedTitle }) => {
                              setWorldWorkDraft((current) => ({
                                ...current,
                                title: current.title.trim() || suggestedTitle,
                                body: text,
                              }));
                            }}
                          />
                          <textarea
                            value={worldWorkDraft.body}
                            onChange={(event) =>
                              setWorldWorkDraft((current) => ({
                                ...current,
                                body: event.target.value,
                              }))
                            }
                            placeholder="세계관 연성/로그 내용"
                            className="auth-input min-h-28"
                          />
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            세계관 연성 첨부 사진
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) =>
                                setWorldWorkImageFiles(Array.from(event.target.files ?? []))
                              }
                              className="auth-input"
                            />
                            {worldWorkImageFiles.length > 0 && (
                              <span className="text-xs text-emerald-100/50">
                                선택된 사진 {worldWorkImageFiles.length}장
                              </span>
                            )}
                          </label>
                          <button
                            disabled={isSaving}
                            className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                          >
                            세계관 연성/로그 추가
                          </button>
                        </form>

                        <div className="grid gap-3">
                          {(activeCharacterWorldEntry?.works ?? []).map((work, index) => (
                            <article
                              key={`${work.title}-${work.date}-${index}`}
                              className="border border-emerald-100/10 bg-black/30 p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs text-emerald-100/45">
                                    {work.kind} / {work.date}
                                  </p>
                                  <h3 className="mt-1 font-semibold">{work.title}</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteWorldWork(index)}
                                  disabled={isSaving}
                                  className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                                >
                                  삭제
                                </button>
                              </div>
                              {(work.images?.length ?? 0) > 0 && (
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                  {work.images?.map((image) => (
                                    <div
                                      key={image.id}
                                      className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                                    >
                                      <ThumbnailImage
                                        image={image}
                                        src={image.url}
                                        alt={image.name}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
                        먼저 세계관을 선택해주세요.
                      </p>
                    )}
                  </section>
                )}

              {adminPanel === "characters" && characterEditSection === "images" && (
                <>
                  {!activeCharacterId || !activeCharacter ? (
                    <section className="glass-card p-5">
                      <h2 className="board-title">그림 관리</h2>
                      <p className="mt-3 border border-amber-400/25 bg-amber-950/20 p-4 text-sm leading-7 text-amber-100/90">
                        사진을 추가하려면 먼저 <span className="font-semibold">기본 · 레코드</span>{" "}
                        탭에서 이름을 입력하고{" "}
                        <span className="font-semibold">「본 페이지에 저장」</span>을 눌러주세요.
                        저장된 뒤 다시 그림 탭으로 오면 업로드할 수 있어요.
                      </p>
                    </section>
                  ) : (
                    <section className="grid gap-6 xl:grid-cols-2">
                      <div className="glass-card p-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h2 className="board-title">그림 관리</h2>
                            <p className="mt-2 text-xs text-emerald-100/55">
                              파일 1개당 최대 {formatBytes(MAX_UPLOAD_SIZE)}.
                            </p>
                          </div>
                          <div className="grid gap-2 md:min-w-64">
                            <select
                              value={imageUploadWorldId}
                              onChange={(event) => setImageUploadWorldId(event.target.value)}
                              className="auth-input"
                            >
                              <option value="">기본 자료에 업로드</option>
                              {worlds.map((world) => (
                                <option key={world.id} value={world.id}>
                                  {world.title}
                                </option>
                              ))}
                            </select>
                            <select
                              value={imageUploadCategory}
                              onChange={(event) =>
                                setImageUploadCategory(
                                  event.target.value as "illustration" | "standing",
                                )
                              }
                              className="auth-input"
                            >
                              <option value="illustration">일러스트 / 대표 썸네일</option>
                              <option value="standing">스탠딩 / 표정 모음</option>
                            </select>
                            <label className="cursor-pointer bg-emerald-200 px-4 py-3 text-center text-sm font-semibold text-emerald-950">
                              사진 선택
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={isUploading}
                                className="sr-only"
                                onChange={(event) => {
                                  void selectPendingImages(event, activeCharacterId);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {pendingUploads.length > 0 && (
                          <div className="mt-4 border border-emerald-100/10 bg-black/30 p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-emerald-50">
                                  선택한 사진 썸네일 설정
                                </h3>
                                <p className="mt-1 text-xs text-emerald-100/55">
                                  사진을 드래그해서 위치를 맞추고, 마우스 휠로 확대/축소할 수
                                  있어요.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={uploadImages}
                                disabled={isUploading}
                                className="bg-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                              >
                                {isUploading ? "업로드 중..." : "선택한 사진 저장"}
                              </button>
                            </div>
                            <div className="mt-4 grid gap-4">
                              {pendingUploads.map((upload) => (
                                <article
                                  key={upload.id}
                                  className="grid gap-4 border border-emerald-100/10 bg-black/40 p-4"
                                >
                                  <div
                                    className="aspect-[3/2] cursor-move touch-none overflow-hidden border border-stone-400/25 bg-black"
                                    onPointerDown={(event) => startThumbnailDrag(upload, event)}
                                    onPointerMove={(event) => moveThumbnailDrag(upload.id, event)}
                                    onPointerUp={stopThumbnailDrag}
                                    onPointerCancel={stopThumbnailDrag}
                                    onWheel={(event) => zoomThumbnail(upload, event)}
                                    title="드래그로 위치 조정, 휠로 확대/축소"
                                  >
                                    <ThumbnailImage
                                      image={upload}
                                      src={upload.previewUrl}
                                      alt={upload.file.name}
                                      className="opacity-90 select-none"
                                      draggable={false}
                                    />
                                  </div>
                                  <div className="grid content-start gap-4">
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                      <label className="grid gap-2 text-sm font-semibold text-emerald-100/80">
                                        사이트에 표시할 이름
                                        <input
                                          value={upload.displayName}
                                          onChange={(event) =>
                                            updatePendingUpload(upload.id, {
                                              displayName: event.target.value,
                                            })
                                          }
                                          placeholder="예: 신 정장 전신"
                                          className="auth-input"
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => removePendingUpload(upload.id)}
                                        className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200"
                                      >
                                        선택 취소
                                      </button>
                                    </div>
                                    <label className="grid gap-2 text-xs text-emerald-100/70">
                                      크기 {Math.round(upload.thumbScale * 100)}%
                                      <input
                                        type="range"
                                        min="1"
                                        max="2.5"
                                        step="0.05"
                                        value={upload.thumbScale}
                                        onChange={(event) =>
                                          updatePendingUpload(upload.id, {
                                            thumbScale: Number(event.target.value),
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="grid gap-2 text-xs text-emerald-100/70">
                                      가로 위치 {upload.thumbX}%
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={upload.thumbX}
                                        onChange={(event) =>
                                          updatePendingUpload(upload.id, {
                                            thumbX: Number(event.target.value),
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="grid gap-2 text-xs text-emerald-100/70">
                                      세로 위치 {upload.thumbY}%
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={upload.thumbY}
                                        onChange={(event) =>
                                          updatePendingUpload(upload.id, {
                                            thumbY: Number(event.target.value),
                                          })
                                        }
                                      />
                                    </label>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {(activeCharacter.images ?? []).map((image) => (
                            <article key={image.id} className="gallery-tile">
                              <div className="aspect-[3/2] overflow-hidden">
                                <ThumbnailImage
                                  image={image}
                                  src={image.url}
                                  alt={image.name}
                                  className="opacity-90"
                                />
                              </div>
                              <div className="p-3 text-sm">
                                <form
                                  className="grid gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    const formData = new FormData(event.currentTarget);
                                    updateImageInfo(image.id, {
                                      name:
                                        String(formData.get("name") ?? image.name).trim() ||
                                        image.name,
                                      category: String(formData.get("category")) as
                                        | "illustration"
                                        | "standing",
                                    });
                                  }}
                                >
                                  <input
                                    name="name"
                                    defaultValue={image.name}
                                    className="auth-input text-xs"
                                    placeholder="그림 이름"
                                  />
                                  <select
                                    name="category"
                                    defaultValue={image.category ?? "illustration"}
                                    className="auth-input text-xs"
                                  >
                                    <option value="illustration">일러스트 / 대표 썸네일</option>
                                    <option value="standing">스탠딩 / 표정 모음</option>
                                  </select>
                                  <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60"
                                  >
                                    정보 저장
                                  </button>
                                </form>
                                <button
                                  type="button"
                                  onClick={() => deleteImage(image.id)}
                                  disabled={isSaving}
                                  className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                                >
                                  기록 삭제
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>

                      <div className="glass-card p-5">
                        <h2 className="board-title">글 관리</h2>
                        <form onSubmit={addWork} className="mt-4 grid gap-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <input
                              value={workDraft.title}
                              onChange={(event) =>
                                setWorkDraft((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="제목"
                              className="auth-input"
                            />
                            <input
                              value={workDraft.kind}
                              onChange={(event) =>
                                setWorkDraft((current) => ({
                                  ...current,
                                  kind: event.target.value,
                                }))
                              }
                              placeholder="종류"
                              className="auth-input"
                            />
                            <input
                              value={workDraft.date}
                              onChange={(event) =>
                                setWorkDraft((current) => ({
                                  ...current,
                                  date: event.target.value,
                                }))
                              }
                              placeholder="날짜"
                              className="auth-input"
                            />
                          </div>
                          <DocumentTextImport
                            disabled={isSaving}
                            onNotice={setNotice}
                            onImported={({ text, suggestedTitle }) => {
                              setWorkDraft((current) => ({
                                ...current,
                                title: current.title.trim() || suggestedTitle,
                                body: text,
                              }));
                            }}
                          />
                          <textarea
                            value={workDraft.body}
                            onChange={(event) =>
                              setWorkDraft((current) => ({ ...current, body: event.target.value }))
                            }
                            placeholder="글/연성 내용"
                            className="auth-input min-h-28"
                          />
                          <label className="grid gap-2 text-sm text-emerald-100/75">
                            글 첨부 사진
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) =>
                                setWorkImageFiles(Array.from(event.target.files ?? []))
                              }
                              className="auth-input"
                            />
                            {workImageFiles.length > 0 && (
                              <span className="text-xs text-emerald-100/50">
                                선택된 사진 {workImageFiles.length}장
                              </span>
                            )}
                          </label>
                          <button
                            disabled={isSaving}
                            className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
                          >
                            글 추가
                          </button>
                        </form>
                        <div className="mt-4 grid gap-3">
                          {activeCharacter.works.map((work, index) => (
                            <article
                              key={`${work.title}-${work.date}-${index}`}
                              className="border border-emerald-100/10 bg-black/30 p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs text-emerald-100/45">
                                    {work.kind} / {work.date}
                                  </p>
                                  <h3 className="mt-1 font-semibold">{work.title}</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteWork(index)}
                                  disabled={isSaving}
                                  className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60"
                                >
                                  삭제
                                </button>
                              </div>
                              {(work.images?.length ?? 0) > 0 && (
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                  {work.images?.map((image) => (
                                    <div
                                      key={image.id}
                                      className="aspect-square overflow-hidden border border-stone-400/15 bg-black"
                                    >
                                      <ThumbnailImage
                                        image={image}
                                        src={image.url}
                                        alt={image.name}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}

              {notice && (
                <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>
              )}
            </section>
          </div>
        )}
      </section>

      {isAdmin && adminPanel === "characters" && activeCharacterId && (
        <GlitchSelectionFloatingToolbar
          anchorElement={glitchFieldAnchorElement}
          selection={glitchFieldSelection}
          fieldValue={
            activeGlitchFieldPath ? getCharacterDraftFieldValue(draft, activeGlitchFieldPath) : ""
          }
          fieldLabel={activeGlitchLabel}
          glitchConfig={
            activeGlitchFieldPath ? getDraftGlitchConfig(draft, activeGlitchFieldPath) : undefined
          }
          onApply={(config, message) => {
            if (!activeGlitchFieldPath) {
              return;
            }

            setDraft((current) => updateDraftGlitchPath(current, activeGlitchFieldPath, config));
            setNotice(message);
          }}
          onNotice={setNotice}
        />
      )}

      {isAdmin && activeCategory === "worlds" && (
        <GlitchSelectionFloatingToolbar
          anchorElement={worldGlitchFieldAnchorElement}
          selection={worldGlitchFieldSelection}
          fieldValue={
            activeWorldGlitchFieldPath
              ? getWorldDraftFieldValue(worldDraft, activeWorldGlitchFieldPath)
              : ""
          }
          fieldLabel={
            activeWorldGlitchFieldPath ? getGlitchFieldLabel(activeWorldGlitchFieldPath) : null
          }
          glitchConfig={
            activeWorldGlitchFieldPath
              ? worldDraft.textGlitch[activeWorldGlitchFieldPath]
              : undefined
          }
          onApply={(config, message) => {
            if (!activeWorldGlitchFieldPath) {
              return;
            }

            setWorldDraft((current) =>
              updateWorldDraftGlitchPath(current, activeWorldGlitchFieldPath, config),
            );
            setNotice(message);
          }}
          onNotice={setNotice}
        />
      )}
    </main>
  );
}
