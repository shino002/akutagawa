"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, PointerEvent, SyntheticEvent, WheelEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, deleteField, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ADMIN_AUTH_EMAIL, friendlyAuthError, resolveLoginEmail, validateLoginId } from "@/lib/auth-helpers";
import { normalizeBgmTracks, resolveCharacterBgmUrl } from "@/lib/bgm-catalog";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { characterPaletteStyle } from "@/lib/character-palette";
import { clamp, thumbnailStyle } from "@/lib/image-helpers";
import { ProfileFieldsEditor, profileFieldGlitchPath } from "@/components/admin/ProfileFieldsEditor";
import { BgmQuickPicker } from "@/components/admin/BgmQuickPicker";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import { createDefaultProfileFields, normalizeProfileFields, profileFieldsHaveContent } from "@/lib/profile-fields";
import { isAllowedBannerLinkUrl, normalizePersonalHomeBanners } from "@/lib/personal-home-banners";
import type {
  Character,
  CharacterKind,
  CharacterWorldEntry,
  DiaryEntry,
  ExtractContent,
  GuestbookEntry,
  HomeContent,
  BgmTrack,
  BgmTrackScope,
  PersonalHomeBanner,
  SettingSection,
  UploadedImage,
  Work,
  World,
} from "@/lib/types";
import type { CharacterDraft } from "@/lib/character-draft";
import {
  compactDraftTextGlitch,
  compactSubPageTextGlitch,
  buildGlitchFieldOptionGroups,
  countDraftGlitchFields,
  getCharacterDraftFieldValue,
  getDraftGlitchConfig,
  getGlitchFieldLabel,
  parseSubPageGlitchPath,
  pruneDraftTextGlitch,
  pruneSubPageTextGlitch,
  settingSectionGlitchPath,
  updateDraftFieldValue,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import { TextScrambleTool } from "@/components/admin/TextScrambleTool";
import { SubPageEditor } from "@/components/admin/SubPageEditor";
import { PairMemberPicker } from "@/components/admin/PairMemberPicker";
import { AdminCollapsiblePanel } from "@/components/admin/AdminCollapsiblePanel";
import {
  CharacterEditSectionNav,
  type CharacterEditSection,
} from "@/components/admin/CharacterEditSectionNav";
import { characterFirestorePayload, omitUndefined } from "@/lib/firestore-helpers";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";
import {
  buildTextGlitchFirestorePatch,
  countRemovedGlitchPaths,
} from "@/lib/text-glitch-persistence";
import { readGlitchTextSelection, type GlitchTextSelection } from "@/lib/glitch-selection";
import {
  CHARACTER_KINDS,
  CHARACTER_KIND_ADMIN_LABELS,
  filterCharactersByKind,
  filterPairLinkableCharacters,
  normalizeCharacterKind,
} from "@/lib/character-kind";
import { characterKindToSection } from "@/lib/zone-links";
import { normalizeSubPages } from "@/lib/sub-pages";
import {
  formatPairDisplayName,
  normalizePairMemberIds,
  resolvePairMemberIds,
} from "@/lib/pair-members";
import {
  buildWorldGlitchFieldOptions,
  compactWorldDraftTextGlitch,
  countWorldDraftGlitchFields,
  createBlankWorldDraft,
  getWorldDraftFieldValue,
  getWorldGlitchFieldLabel,
  pruneWorldDraftTextGlitch,
  updateWorldDraftFieldValue,
  updateWorldDraftGlitchPath,
  worldToDraft,
  type WorldDraft,
} from "@/lib/world-glitch-fields";
import {
  normalizeSettingSections,
  resolveDraftSettingSections,
} from "@/lib/setting-sections";
import {
  canRecoverFromLegacyPairMembers,
  recoverCharacterFromLegacyPairMember,
} from "@/lib/legacy-pair-member-recovery";

// 관리자 페이지에서만 쓰는 업로드 대기/폼 입력 타입입니다.
type PendingUpload = {
  displayName: string;
  id: string;
  file: File;
  previewUrl: string;
  thumbX: number;
  thumbY: number;
  thumbScale: number;
};

type ThumbnailDragState = {
  id: string;
  startPointerX: number;
  startPointerY: number;
  startThumbX: number;
  startThumbY: number;
};

type PaletteOption = {
  label: string;
  value: string;
};

// 사이트 기본 문구와 자캐 카드 색상 선택지를 정의합니다.
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_UPLOAD_SIZE = 15 * 1024 * 1024;
const paletteOptions: PaletteOption[] = [
  { label: "꺼진 화면", value: "from-zinc-950 via-black to-zinc-900" },
  { label: "잿빛 흑백", value: "from-zinc-200 via-zinc-800 to-black" },
  { label: "낡은 필름", value: "from-stone-300 via-zinc-800 to-black" },
  { label: "먹색 그림자", value: "from-neutral-700 via-neutral-950 to-black" },
  { label: "푸른 잔상", value: "from-slate-300 via-slate-900 to-black" },
];

const defaultHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

const defaultArchiveContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const rgbToHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

function createImagePaletteOptions(file: File): Promise<PaletteOption[]> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const sampleSize = 48;
      const scale = Math.min(sampleSize / image.width, sampleSize / image.height, 1);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve([]);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();

      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha < 180) continue;

        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const brightness = (red + green + blue) / 3;

        if (brightness < 18 || brightness > 242) continue;

        const key = `${Math.round(red / 32)}-${Math.round(green / 32)}-${Math.round(blue / 32)}`;
        const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
        bucket.count += 1;
        bucket.red += red;
        bucket.green += green;
        bucket.blue += blue;
        buckets.set(key, bucket);
      }

      const colors = [...buckets.values()]
        .sort((left, right) => right.count - left.count)
        .slice(0, 5)
        .map((bucket) => ({
          red: Math.round(bucket.red / bucket.count),
          green: Math.round(bucket.green / bucket.count),
          blue: Math.round(bucket.blue / bucket.count),
        }));

      URL.revokeObjectURL(objectUrl);

      if (colors.length === 0) {
        resolve([]);
        return;
      }

      const darkColor = colors.reduce((darkest, color) =>
        color.red + color.green + color.blue < darkest.red + darkest.green + darkest.blue
          ? color
          : darkest,
      );
      const lightColor = colors.reduce((lightest, color) =>
        color.red + color.green + color.blue > lightest.red + lightest.green + lightest.blue
          ? color
          : lightest,
      );
      const accentColor = colors[Math.min(1, colors.length - 1)];
      const shadow = "#020208";
      const gradients = [
        `linear-gradient(90deg, ${rgbToHex(lightColor.red, lightColor.green, lightColor.blue)} 0%, ${rgbToHex(accentColor.red, accentColor.green, accentColor.blue)} 48%, ${shadow} 100%)`,
        `linear-gradient(90deg, ${rgbToHex(accentColor.red, accentColor.green, accentColor.blue)} 0%, ${rgbToHex(darkColor.red, darkColor.green, darkColor.blue)} 54%, ${shadow} 100%)`,
        `linear-gradient(135deg, ${rgbToHex(lightColor.red, lightColor.green, lightColor.blue)} 0%, ${rgbToHex(darkColor.red, darkColor.green, darkColor.blue)} 58%, ${shadow} 100%)`,
      ];

      resolve(
        [...new Set(gradients)].map((value, index) => ({
          label: `일러스트 기반 ${index + 1}`,
          value,
        })),
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve([]);
    };

    image.src = objectUrl;
  });
}

function glitchFieldClass(path: string, activePath: string | null, baseClass = "auth-input") {
  return activePath === path ? `${baseClass} border-amber-300/50 ring-1 ring-amber-300/40` : baseClass;
}

function slugifyId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function characterToDraft(character: Character): CharacterDraft {
  const { settingSections } = resolveDraftSettingSections(
    character.settingSections,
    character.settings,
  );

  return {
    id: character.id,
    kind: normalizeCharacterKind(character.kind),
    name: character.name,
    kanjiName: character.kanjiName ?? "",
    statusTagsText: (character.statusTags ?? []).join("\n"),
    classification: character.classification ?? "",
    subtitle: character.subtitle,
    quote: character.quote,
    palette: character.palette,
    profileFields: character.profileFields,
    settingSections,
    relationshipsText: character.relationships.join("\n"),
    textGlitch: normalizeTextGlitch(character.textGlitch),
    subPages: normalizeSubPages(character.subPages),
    pairMemberIds: resolvePairMemberIds(character),
    bgmUrl: character.bgmUrl ?? "",
  };
}

function getLegacySettingsMigrationNotice(character: Character) {
  const resolved = resolveDraftSettingSections(character.settingSections, character.settings);
  return resolved.migratedFromLegacy
    ? "예전 상세 설정을 레코드 박스로 불러왔어요. 아래 내용을 확인한 뒤 「본 페이지에 저장」을 눌러주세요."
    : null;
}

function draftBasicsLookEmpty(draft: CharacterDraft) {
  return (
    !draft.quote.trim() &&
    !draft.subtitle.trim() &&
    !profileFieldsHaveContent(draft.profileFields) &&
    !draft.kanjiName.trim() &&
    !draft.statusTagsText.trim() &&
    !draft.classification.trim() &&
    !draft.relationshipsText.trim() &&
    normalizeSettingSections(draft.settingSections).length === 0
  );
}

function draftBasicsHaveContent(draft: CharacterDraft) {
  return !draftBasicsLookEmpty(draft);
}

/** 분류만 바꾸다 빈 폼이 저장되며 카드·레코드가 지워지는 실수를 막습니다. */
function mergeDraftForKindMigration(draft: CharacterDraft, existing: Character): CharacterDraft {
  const existingDraft = characterToDraft(existing);
  const kindChanged = normalizeCharacterKind(draft.kind) !== normalizeCharacterKind(existing.kind);

  if (!kindChanged || !draftBasicsLookEmpty(draft) || !draftBasicsHaveContent(existingDraft)) {
    return draft;
  }

  return {
    ...existingDraft,
    kind: draft.kind,
    id: draft.id.trim() || existingDraft.id,
    name: draft.name.trim() || existingDraft.name,
    pairMemberIds: draft.kind === "pair" ? existingDraft.pairMemberIds : ["", ""],
    textGlitch: Object.keys(draft.textGlitch).length > 0 ? draft.textGlitch : existingDraft.textGlitch,
    subPages: draft.subPages.length > 0 ? draft.subPages : existingDraft.subPages,
    bgmUrl: draft.bgmUrl.trim() ? draft.bgmUrl : existingDraft.bgmUrl,
  };
}

// Firestore 문서와 관리자 입력 폼 사이를 오가는 변환 함수들입니다.
function createBlankDraft(kind: CharacterKind = "oc"): CharacterDraft {
  return {
    id: "",
    kind,
    name: "",
    kanjiName: "",
    statusTagsText: "",
    classification: "",
    subtitle: "",
    quote: "",
    palette: "from-zinc-950 via-black to-zinc-900",
    profileFields: createDefaultProfileFields(),
    settingSections: [],
    relationshipsText: "",
    textGlitch: {},
    subPages: [],
    pairMemberIds: ["", ""],
    bgmUrl: "",
  };
}

function draftToCharacter(
  draft: CharacterDraft,
  currentWorks: Work[] = [],
  currentImages: UploadedImage[] = [],
  currentWorldEntries: CharacterWorldEntry[] = [],
  existingCharacter?: Character,
  allCharacters: Character[] = [],
): Character {
  const name = draft.name.trim();
  const id = slugifyId(draft.id || name);
  const kind = normalizeCharacterKind(draft.kind);

  const textGlitch = compactDraftTextGlitch(draft.textGlitch, draft);
  const bgmUrl = resolveCharacterBgmUrl(draft.bgmUrl);

  const characterBase: Character = {
    id,
    kind,
    name,
    kanjiName: draft.kanjiName.trim(),
    statusTags: linesToList(draft.statusTagsText),
    classification: draft.classification.trim(),
    subtitle: draft.subtitle.trim(),
    quote: draft.quote.trim(),
    palette: draft.palette.trim() || "from-zinc-950 via-black to-zinc-900",
    profileFields: draft.profileFields.map((field) => ({
      id: field.id,
      label: field.label.trim(),
      value: field.value.trim(),
    })),
    settings: [],
    settingSections: normalizeSettingSections(draft.settingSections),
    relationships: linesToList(draft.relationshipsText),
    images: currentImages,
    works: currentWorks,
    worldEntries: currentWorldEntries,
    subPages: normalizeSubPages(draft.subPages).map((subPage) => {
      const subPageGlitch = compactSubPageTextGlitch(subPage);
      return subPageGlitch ? { ...subPage, textGlitch: subPageGlitch } : subPage;
    }),
  };

  if (kind === "pair") {
    const pairMemberIds = normalizePairMemberIds(draft.pairMemberIds);
    const pairCharacter: Character = {
      ...characterBase,
      name: name || formatPairDisplayName({ ...characterBase, pairMemberIds }, allCharacters),
      pairMemberIds,
    };

    return {
      ...pairCharacter,
      ...(bgmUrl ? { bgmUrl } : {}),
      ...(textGlitch ? { textGlitch } : {}),
    };
  }

  const character: Character = {
    ...characterBase,
    ...(bgmUrl ? { bgmUrl } : {}),
    ...(textGlitch ? { textGlitch } : {}),
  };

  return character;
}

function createBlankDiaryEntry(): DiaryEntry {
  return {
    id: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    body: "",
  };
}

type ExtractBannerDraft = {
  id: string;
  label: string;
  linkUrl: string;
  image: UploadedImage | null;
};

function createBlankExtractBannerDraft(): ExtractBannerDraft {
  return {
    id: "",
    label: "",
    linkUrl: "",
    image: null,
  };
}

function extractBannerDraftFromBanner(banner: PersonalHomeBanner): ExtractBannerDraft {
  return {
    id: banner.id,
    label: banner.label,
    linkUrl: banner.linkUrl,
    image: banner.image,
  };
}

type BgmTrackDraft = {
  id: string;
  label: string;
  url: string;
  scope: BgmTrackScope;
};

function createBlankBgmTrackDraft(): BgmTrackDraft {
  return {
    id: "",
    label: "",
    url: "",
    scope: "site",
  };
}

function bgmTrackDraftFromTrack(track: BgmTrack): BgmTrackDraft {
  return {
    id: track.id,
    label: track.label,
    url: track.url,
    scope: track.scope,
  };
}

function createBlankWorldEntry(worldId: string): CharacterWorldEntry {
  return {
    worldId,
    settings: [],
    images: [],
    works: [],
  };
}

function normalizeWorks(works: Work[] | undefined): Work[] {
  return Array.isArray(works)
    ? works.map((work) => ({
        ...work,
        images: Array.isArray(work.images) ? work.images : [],
      }))
    : [];
}

function normalizeWorldEntries(entries: CharacterWorldEntry[] | undefined): CharacterWorldEntry[] {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        worldId: entry.worldId,
        settings: Array.isArray(entry.settings) ? entry.settings : [],
        images: Array.isArray(entry.images) ? entry.images : [],
        works: normalizeWorks(entry.works),
      }))
    : [];
}

function upsertWorldEntry(entries: CharacterWorldEntry[] | undefined, nextEntry: CharacterWorldEntry) {
  const normalizedEntries = normalizeWorldEntries(entries);
  const existingIndex = normalizedEntries.findIndex((entry) => entry.worldId === nextEntry.worldId);

  if (existingIndex === -1) {
    return [...normalizedEntries, nextEntry];
  }

  return normalizedEntries.map((entry, index) => (index === existingIndex ? nextEntry : entry));
}

// 이미지 기록을 삭제할 때 Firestore뿐 아니라 Cloudflare R2 객체도 함께 지웁니다.
async function deleteR2Images(images: UploadedImage[]) {
  if (images.length === 0) return;

  const response = await fetch("/api/r2-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ images }),
  });
  const result = (await response.json()) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "Cloudflare R2 삭제에 실패했어요.");
  }
}

export default function AdminPage() {
  // 로그인, 관리자 패널, 선택된 자캐/세계관, 업로드 대기 목록 등 편집 화면 상태입니다.
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loginDraft, setLoginDraft] = useState({ loginId: "", password: "" });
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeWorldId, setActiveWorldId] = useState("");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [draft, setDraft] = useState<CharacterDraft>(() => createBlankDraft());
  const [worldDraft, setWorldDraft] = useState<WorldDraft>(() => createBlankWorldDraft());
  const [worldSettingsText, setWorldSettingsText] = useState("");
  const [worldWorkDraft, setWorldWorkDraft] = useState({ title: "", kind: "세계관 연성", date: "", body: "" });
  const [workDraft, setWorkDraft] = useState({ title: "", kind: "새 연성", date: "", body: "" });
  const [worldWorkImageFiles, setWorldWorkImageFiles] = useState<File[]>([]);
  const [workImageFiles, setWorkImageFiles] = useState<File[]>([]);
  const [imageUploadCategory, setImageUploadCategory] = useState<"illustration" | "standing">("illustration");
  const [imageUploadWorldId, setImageUploadWorldId] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [illustrationPaletteOptions, setIllustrationPaletteOptions] = useState<PaletteOption[]>([]);
  const [thumbnailDrag, setThumbnailDrag] = useState<ThumbnailDragState | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [archiveContent, setArchiveContent] = useState<HomeContent>(defaultArchiveContent);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [guestbookReplyDrafts, setGuestbookReplyDrafts] = useState<Record<string, string>>({});
  const [activeDiaryId, setActiveDiaryId] = useState("");
  const [diaryDraft, setDiaryDraft] = useState<DiaryEntry>(() => createBlankDiaryEntry());
  const [extractBanners, setExtractBanners] = useState<PersonalHomeBanner[]>([]);
  const [activeExtractBannerId, setActiveExtractBannerId] = useState("");
  const [extractBannerDraft, setExtractBannerDraft] = useState<ExtractBannerDraft>(() => createBlankExtractBannerDraft());
  const [extractBannerImageFile, setExtractBannerImageFile] = useState<File | null>(null);
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>([]);
  const [activeBgmTrackId, setActiveBgmTrackId] = useState("");
  const [bgmTrackDraft, setBgmTrackDraft] = useState<BgmTrackDraft>(() => createBlankBgmTrackDraft());
  const [bgmAudioFile, setBgmAudioFile] = useState<File | null>(null);
  const [adminPanel, setAdminPanel] = useState<"categories" | "characters">("categories");
  const [characterEditSection, setCharacterEditSection] = useState<CharacterEditSection>("basics");
  const [activeCharacterKind, setActiveCharacterKind] = useState<CharacterKind>("oc");
  const [activeSubPageId, setActiveSubPageId] = useState("");
  const [activeGlitchFieldPath, setActiveGlitchFieldPath] = useState<string | null>(null);
  const [glitchFieldSelection, setGlitchFieldSelection] = useState<GlitchTextSelection | null>(null);
  const [activeWorldGlitchFieldPath, setActiveWorldGlitchFieldPath] = useState<string | null>(null);
  const [worldGlitchFieldSelection, setWorldGlitchFieldSelection] = useState<GlitchTextSelection | null>(null);
  const [activeCategory, setActiveCategory] = useState<"home" | "archive" | "diary" | "guestbook" | "worlds" | "extract" | "bgm">("home");
  const { characterOptions: bgmCharacterOptions } = useBgmCatalog();

  const isAdmin = authUser?.email === ADMIN_AUTH_EMAIL;
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
  const activeGlitchLabel = activeGlitchFieldPath ? getGlitchFieldLabel(activeGlitchFieldPath) : null;
  const glitchFieldCount = countDraftGlitchFields(draft);
  const subPageCount = draft.subPages.length;
  const worldGlitchFieldOptions = useMemo(
    () => buildWorldGlitchFieldOptions(worldDraft, worldDraft.textGlitch),
    [worldDraft],
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
    () => normalizeWorldEntries(activeCharacter?.worldEntries).find((entry) => entry.worldId === activeCharacterWorldId),
    [activeCharacter, activeCharacterWorldId],
  );
  const resolvedPaletteOptions = useMemo(() => {
    const options = [...paletteOptions, ...illustrationPaletteOptions];
    const hasCurrentPalette = options.some((option) => option.value === draft.palette);

    return hasCurrentPalette || !draft.palette
      ? options
      : [{ label: "저장된 사용자 팔레트", value: draft.palette }, ...options];
  }, [draft.palette, illustrationPaletteOptions]);

  // Auth, 썸네일 드래그, Firestore 컬렉션 구독을 담당하는 효과들입니다.
  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => setAuthUser(user));
  }, []);

  useEffect(() => {
    if (!thumbnailDrag) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [thumbnailDrag]);

  useEffect(() => {
    setGlitchFieldSelection(null);
  }, [activeGlitchFieldPath]);

  useEffect(() => {
    setWorldGlitchFieldSelection(null);
  }, [activeWorldGlitchFieldPath]);

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
    (element: HTMLInputElement | HTMLTextAreaElement) => {
      const path = element.dataset.glitchField;
      if (!path || element.closest("[data-text-scramble-tool]")) {
        return;
      }

      setActiveWorldGlitchFieldPath(path);
      setWorldGlitchFieldSelection(readGlitchTextSelection(element));
    },
    [],
  );

  const captureGlitchFieldSelection = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement) => {
      const path = element.dataset.glitchField;
      if (!path || element.closest("[data-text-scramble-tool]")) {
        return;
      }

      setActiveGlitchFieldPath(path);
      setGlitchFieldSelection(readGlitchTextSelection(element));
    },
    [],
  );

  const bindGlitchField = useCallback(
    (path: string) => ({
      "data-glitch-field": path,
      onFocus: () => setActiveGlitchFieldPath(path),
      onClick: () => setActiveGlitchFieldPath(path),
      onSelect: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        captureGlitchFieldSelection(event.currentTarget);
      },
      onKeyUp: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        captureGlitchFieldSelection(event.currentTarget);
      },
      onMouseUp: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      onSelect: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onKeyUp: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onMouseUp: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          const { bgmUrl: _bgmUrl, profile: legacyProfile, ...rest } = data;
          return {
            ...rest,
            id: data.id || characterDoc.id,
            kanjiName: data.kanjiName ?? "",
            statusTags: Array.isArray(data.statusTags) ? data.statusTags : [],
            classification: data.classification ?? "",
            profileFields: normalizeProfileFields(data.profileFields, legacyProfile),
            works: normalizeWorks(data.works),
            settings: Array.isArray(data.settings) ? data.settings : [],
            settingSections: normalizeSettingSections(data.settingSections),
            relationships: Array.isArray(data.relationships) ? data.relationships : [],
            images: Array.isArray(data.images) ? data.images : [],
            worldEntries: normalizeWorldEntries(data.worldEntries),
            kind: normalizeCharacterKind(data.kind),
            subPages: normalizeSubPages(data.subPages),
            pairMemberIds: normalizePairMemberIds(data.pairMemberIds),
            textGlitch: normalizeTextGlitch(data.textGlitch),
            ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : {}),
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
      collection(db, "worlds"),
      (snapshot) => {
        const nextWorlds = snapshot.docs
          .map((worldDoc) => {
            const data = worldDoc.data() as Partial<World>;
            return {
              id: data.id || worldDoc.id,
              title: data.title || "",
              subtitle: data.subtitle || "",
              description: data.description || "",
              password: data.password || "",
              textGlitch: normalizeTextGlitch(data.textGlitch),
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        setWorlds(nextWorlds);
        setActiveWorldId((current) => current || nextWorlds[0]?.id || "");
        setActiveCharacterWorldId((current) => current || nextWorlds[0]?.id || "");
        setWorldDraft((current) => {
          if (current.id) return current;
          const firstWorld = nextWorlds[0];
          return firstWorld ? worldToDraft(firstWorld) : current;
        });
      },
      (error) => setNotice(`세계관 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "home"),
      (snapshot) => {
        const data = snapshot.data() as Partial<HomeContent> | undefined;
        setHomeContent({
          eyebrow: data?.eyebrow || defaultHomeContent.eyebrow,
          title: data?.title || defaultHomeContent.title,
          body: data?.body || defaultHomeContent.body,
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
        });
      },
      (error) => setNotice(`보관소 문구 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "extract"),
      (snapshot) => {
        const data = snapshot.data() as Partial<ExtractContent> | undefined;
        const nextBanners = normalizePersonalHomeBanners(data?.banners);
        setExtractBanners(nextBanners);
        setActiveExtractBannerId((current) => {
          if (current) return current;
          const firstBanner = nextBanners[0];
          if (firstBanner) {
            setExtractBannerDraft(extractBannerDraftFromBanner(firstBanner));
          }
          return firstBanner?.id || "";
        });
      },
      (error) => setNotice(`갠홈 배너 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "bgm"),
      (snapshot) => {
        const data = snapshot.data() as Partial<{ tracks: BgmTrack[] }> | undefined;
        const nextTracks = normalizeBgmTracks(data?.tracks);
        setBgmTracks(nextTracks);
        setActiveBgmTrackId((current) => {
          if (current) return current;
          const firstTrack = nextTracks[0];
          if (firstTrack) {
            setBgmTrackDraft(bgmTrackDraftFromTrack(firstTrack));
          }
          return firstTrack?.id || "";
        });
      },
      (error) => setNotice(`BGM 목록 불러오기 실패: ${error.message}`),
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "diaryEntries"),
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((diaryDoc) => {
            const data = diaryDoc.data() as Partial<DiaryEntry>;
            return {
              id: data.id || diaryDoc.id,
              title: data.title || "",
              date: data.date || "",
              body: data.body || "",
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        setDiaryEntries(nextEntries);
        setActiveDiaryId((current) => {
          if (current) return current;
          const firstEntry = nextEntries[0];
          if (firstEntry) {
            setDiaryDraft(firstEntry);
          }
          return firstEntry?.id || "";
        });
      },
      (error) => setNotice(`다이어리 불러오기 실패: ${error.message}`),
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
  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice("");

    const loginIdError = validateLoginId(loginDraft.loginId);

    if (loginIdError) {
      setAuthNotice(loginIdError);
      return;
    }

    if (!loginDraft.password) {
      setAuthNotice("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsAuthLoading(true);
      await signInWithEmailAndPassword(getFirebaseAuth(), resolveLoginEmail(loginDraft.loginId), loginDraft.password);
      setLoginDraft({ loginId: "", password: "" });
      setAuthNotice("로그인 완료.");
    } catch (error) {
      setAuthNotice(friendlyAuthError(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

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
      const uploadedImages = await uploadWorkImages(worldWorkImageFiles, activeCharacterWorldId);
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
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry) return;
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
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry) return;

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
      setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? nextCharacter : character)));
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
    const { textGlitch: _textGlitch, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair" ? { pairMemberIds: deleteField() } : {}),
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
        setNotice("자캐는 저장됐지만, 오류 구간이 텍스트와 맞지 않아 오류 설정은 빠졌어요. 구간을 다시 지정해주세요.");
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

  function updateSettingSection(id: string, updates: Partial<Pick<SettingSection, "title" | "body">>) {
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

  function reloadCharacterFromServer() {
    if (!activeCharacter) {
      setNotice("목록에서 항목을 먼저 선택해주세요.");
      return;
    }

    loadCharacterDraft(activeCharacter);
    setNotice("서버에 저장된 내용을 다시 불러왔어요. 카드·레코드가 비어 보이면 이 버튼을 눌러보세요.");
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
    const { textGlitch: _textGlitch, ...characterBody } = character;

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "characters", character.id),
        omitUndefined({
          ...characterBody,
          ...textGlitchPatch,
          ...(resolvedBgmUrl ? { bgmUrl: resolvedBgmUrl } : { bgmUrl: deleteField() }),
          ...(normalizeCharacterKind(character.kind) !== "pair" ? { pairMemberIds: deleteField() } : {}),
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
    const migrationNotice = getLegacySettingsMigrationNotice(character);
    if (migrationNotice) {
      setNotice(migrationNotice);
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
    setPendingUploads((current) => {
      current.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
      return [];
    });
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
      await setDoc(
        doc(getFirebaseDb(), "site", "home"),
        {
          eyebrow: homeContent.eyebrow.trim() || defaultHomeContent.eyebrow,
          title: homeContent.title.trim() || defaultHomeContent.title,
          body: homeContent.body.trim() || defaultHomeContent.body,
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

  function startNewDiaryEntry() {
    setActiveDiaryId("");
    setDiaryDraft(createBlankDiaryEntry());
    setNotice("새 일기를 작성해주세요.");
  }

  async function saveDiaryEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice("관리자만 일기를 저장할 수 있어요.");
      return;
    }

    const title = diaryDraft.title.trim();
    const date = diaryDraft.date.trim();
    const body = diaryDraft.body.trim();

    if (!title || !body) {
      setNotice("일기 제목과 내용을 입력해주세요.");
      return;
    }

    const id = slugifyId(diaryDraft.id || `${date}-${title}`) || crypto.randomUUID();

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "diaryEntries", id),
        {
          id,
          title,
          date: date || new Date().toISOString().slice(0, 10),
          body,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setActiveDiaryId(id);
      setDiaryDraft({ id, title, date: date || new Date().toISOString().slice(0, 10), body });
      setNotice("일기를 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "일기 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDiaryEntry(entry: DiaryEntry) {
    if (!isAdmin) {
      setNotice("관리자만 일기를 삭제할 수 있어요.");
      return;
    }

    if (!entry.id) {
      setNotice("삭제할 일기를 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "diaryEntries", entry.id));
      setActiveDiaryId("");
      setDiaryDraft(createBlankDiaryEntry());
      setNotice("일기를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "일기 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function startNewExtractBanner() {
    setActiveExtractBannerId("");
    setExtractBannerDraft(createBlankExtractBannerDraft());
    setExtractBannerImageFile(null);
    setNotice("새 갠홈 배너를 추가해주세요.");
  }

  async function uploadExtractBannerImage(file: File) {
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error(`${file.name}은 10MB를 넘어서 업로드할 수 없어요.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("characterId", "site-extract");
    formData.append("displayName", "");

    const response = await fetch("/api/r2-upload", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as {
      error?: string;
      key?: string;
      name?: string;
      size?: number;
      url?: string | null;
    };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "배너 이미지 업로드에 실패했어요.");
    }

    return {
      id: result.key ?? `${file.name}-${file.lastModified}`,
      name: result.name ?? "",
      url: result.url,
      size: result.size ?? file.size,
    } satisfies UploadedImage;
  }

  async function persistExtractBanners(nextBanners: PersonalHomeBanner[]) {
    await setDoc(
      doc(getFirebaseDb(), "site", "extract"),
      {
        banners: nextBanners,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setExtractBanners(nextBanners);
  }

  async function saveExtractBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice("관리자만 갠홈 배너를 저장할 수 있어요.");
      return;
    }

    const label = extractBannerDraft.label.trim();
    const linkUrl = extractBannerDraft.linkUrl.trim();

    if (!isAllowedBannerLinkUrl(linkUrl)) {
      setNotice("http:// 또는 https:// 로 시작하는 링크, 또는 / 로 시작하는 내부 경로를 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      let image = extractBannerDraft.image;
      if (extractBannerImageFile) {
        image = await uploadExtractBannerImage(extractBannerImageFile);
      }

      if (!image) {
        setNotice("배너 이미지를 업로드해주세요.");
        return;
      }

      const id = slugifyId(extractBannerDraft.id || label || image.id) || crypto.randomUUID();
      const nextBanner: PersonalHomeBanner = {
        id,
        label,
        linkUrl,
        image,
      };
      const nextBanners = extractBanners.some((banner) => banner.id === id)
        ? extractBanners.map((banner) => (banner.id === id ? nextBanner : banner))
        : [...extractBanners, nextBanner];

      await persistExtractBanners(nextBanners);
      setActiveExtractBannerId(id);
      setExtractBannerDraft(extractBannerDraftFromBanner(nextBanner));
      setExtractBannerImageFile(null);
      setNotice("갠홈 배너를 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "갠홈 배너 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteExtractBanner(banner: PersonalHomeBanner) {
    if (!isAdmin) {
      setNotice("관리자만 갠홈 배너를 삭제할 수 있어요.");
      return;
    }

    if (!banner.id) {
      setNotice("삭제할 배너를 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteR2Images([banner.image]);
      const nextBanners = extractBanners.filter((entry) => entry.id !== banner.id);
      await persistExtractBanners(nextBanners);
      setActiveExtractBannerId("");
      setExtractBannerDraft(createBlankExtractBannerDraft());
      setExtractBannerImageFile(null);
      setNotice("갠홈 배너를 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "갠홈 배너 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function startNewBgmTrack() {
    setActiveBgmTrackId("");
    setBgmTrackDraft(createBlankBgmTrackDraft());
    setBgmAudioFile(null);
    setNotice("새 BGM을 추가해주세요.");
  }

  async function uploadBgmAudio(file: File, displayName = "") {
    if (file.size > MAX_AUDIO_UPLOAD_SIZE) {
      throw new Error(`${file.name}은 15MB를 넘어서 업로드할 수 없어요.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("displayName", displayName);

    const response = await fetch("/api/r2-upload-audio", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as {
      error?: string;
      url?: string | null;
    };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "BGM 업로드에 실패했어요.");
    }

    return result.url;
  }

  async function persistBgmTracks(nextTracks: BgmTrack[]) {
    await setDoc(
      doc(getFirebaseDb(), "site", "bgm"),
      {
        tracks: nextTracks,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setBgmTracks(nextTracks);
  }

  async function saveBgmTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice("관리자만 BGM을 저장할 수 있어요.");
      return;
    }

    const label = bgmTrackDraft.label.trim();

    if (!label) {
      setNotice("BGM 이름을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      let url = bgmTrackDraft.url.trim();

      if (bgmAudioFile) {
        url = await uploadBgmAudio(bgmAudioFile, label);
      }

      if (!url) {
        setNotice("BGM 파일을 업로드해주세요.");
        return;
      }

      const id = slugifyId(bgmTrackDraft.id || label) || crypto.randomUUID();
      const nextTrack: BgmTrack = {
        id,
        label,
        url,
        scope: bgmTrackDraft.scope,
      };
      const nextTracks = bgmTracks.some((track) => track.id === id)
        ? bgmTracks.map((track) => (track.id === id ? nextTrack : track))
        : [...bgmTracks, nextTrack];

      await persistBgmTracks(nextTracks);
      setActiveBgmTrackId(id);
      setBgmTrackDraft(bgmTrackDraftFromTrack(nextTrack));
      setBgmAudioFile(null);
      setNotice("BGM을 저장했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "BGM 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteBgmTrack(track: BgmTrack) {
    if (!isAdmin) {
      setNotice("관리자만 BGM을 삭제할 수 있어요.");
      return;
    }

    if (!track.id) {
      setNotice("삭제할 BGM을 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      if (track.url.startsWith("http")) {
        const response = await fetch("/api/r2-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [{ url: track.url }] }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Cloudflare R2 삭제에 실패했어요.");
        }
      }

      const nextTracks = bgmTracks.filter((entry) => entry.id !== track.id);
      await persistBgmTracks(nextTracks);
      setActiveBgmTrackId("");
      setBgmTrackDraft(createBlankBgmTrackDraft());
      setBgmAudioFile(null);
      setNotice("BGM을 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "BGM 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleBgmAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!/\.(mp3|mpeg|ogg|wav|m4a|aac)$/i.test(file.name) && !file.type.startsWith("audio/")) {
      setNotice("mp3, ogg, wav, m4a, aac 오디오만 업로드할 수 있어요.");
      return;
    }

    setBgmAudioFile(file);
    if (!bgmTrackDraft.label.trim()) {
      setBgmTrackDraft((current) => ({
        ...current,
        label: file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  }

  async function quickAddCharacterBgm(file: File) {
    const label = file.name.replace(/\.[^/.]+$/, "");
    const url = await uploadBgmAudio(file, label);
    const id = slugifyId(label) || crypto.randomUUID();
    const nextTrack: BgmTrack = {
      id,
      label,
      url,
      scope: "character-only",
    };
    const nextTracks = bgmTracks.some((track) => track.url === url)
      ? bgmTracks
      : bgmTracks.some((track) => track.id === id)
        ? bgmTracks.map((track) => (track.id === id ? nextTrack : track))
        : [...bgmTracks, nextTrack];

    await persistBgmTracks(nextTracks);
    setNotice(`「${label}」을(를) 캐릭터 BGM으로 추가했어요.`);
    return url;
  }

  function handleExtractBannerImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    setExtractBannerImageFile(file);
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

  function startNewWorld() {
    setActiveWorldId("");
    setWorldDraft(createBlankWorldDraft());
    setNotice("새 World 정보를 입력해주세요.");
  }

  async function saveWorld(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice("관리자만 세계관을 저장할 수 있어요.");
      return;
    }

    const title = worldDraft.title.trim();
    const id = slugifyId(worldDraft.id || title);

    if (!id || !title) {
      setNotice("세계관 이름은 꼭 입력해주세요.");
      return;
    }

    const existingWorld = worlds.find((world) => world.id === id);
    const prunedDraft: WorldDraft = {
      ...worldDraft,
      textGlitch: pruneWorldDraftTextGlitch(worldDraft.textGlitch, worldDraft),
    };
    const textGlitch = compactWorldDraftTextGlitch(prunedDraft);
    const textGlitchPatch = buildTextGlitchFirestorePatch(textGlitch, existingWorld?.textGlitch);

    try {
      setIsSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "worlds", id),
        omitUndefined({
          id,
          title,
          subtitle: prunedDraft.subtitle.trim(),
          description: prunedDraft.description.trim(),
          password: prunedDraft.password.trim(),
          ...textGlitchPatch,
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setActiveWorldId(id);
      setWorldDraft({
        ...prunedDraft,
        id,
        title,
        password: prunedDraft.password.trim(),
        textGlitch: textGlitch ?? prunedDraft.textGlitch,
      });
      setNotice(
        textGlitch
          ? "세계관을 저장했어요. 오류 구간도 함께 저장됐습니다."
          : "세계관을 저장했어요.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteWorld(worldId: string) {
    if (!isAdmin || !worldId) return;

    try {
      setIsSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "worlds", worldId));
      setActiveWorldId("");
      setWorldDraft(createBlankWorldDraft());
      setNotice("세계관 목록에서 삭제했어요. 자캐 안의 참가 기록은 보존됩니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 삭제에 실패했어요.");
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
      const worldImages = normalizeWorldEntries(character.worldEntries).flatMap((entry) => entry.images);
      const workImages = normalizeWorks(character.works).flatMap((work) => work.images ?? []);
      const worldWorkImages = normalizeWorldEntries(character.worldEntries).flatMap((entry) => normalizeWorks(entry.works).flatMap((work) => work.images ?? []));
      await deleteR2Images([...(character.images ?? []), ...worldImages, ...workImages, ...worldWorkImages]);
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

  async function selectPendingImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !activeCharacterId || !activeCharacter) {
      if (!activeCharacterId) {
        setNotice("사진을 추가하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      }
      return;
    }

    if (!isAdmin) {
      setNotice("관리자만 사진을 선택할 수 있어요.");
      event.target.value = "";
      return;
    }

    const allowedFiles = files.filter((file) => file.size <= MAX_UPLOAD_SIZE);
    const blockedFiles = files.filter((file) => file.size > MAX_UPLOAD_SIZE);

    if (blockedFiles.length > 0) {
      setNotice(`${blockedFiles.map((file) => `${file.name} (${formatBytes(file.size)})`).join(", ")} 파일은 10MB를 넘어 제외했어요.`);
    }

    if (!allowedFiles.length) {
      event.target.value = "";
      return;
    }

    const nextPaletteOptions = await createImagePaletteOptions(allowedFiles[0]);
    if (nextPaletteOptions.length > 0) {
      setIllustrationPaletteOptions(nextPaletteOptions);
      setDraft((current) => ({ ...current, palette: nextPaletteOptions[0].value }));
    }

    setPendingUploads((current) => [
      ...current,
      ...allowedFiles.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        displayName: "",
        file,
        previewUrl: URL.createObjectURL(file),
        thumbX: 50,
        thumbY: 50,
        thumbScale: 1,
      })),
    ]);
    setNotice("썸네일 위치와 크기를 조절한 뒤 저장해주세요.");
    event.target.value = "";
  }

  function updatePendingUpload(id: string, updates: Partial<Pick<PendingUpload, "displayName" | "thumbX" | "thumbY" | "thumbScale">>) {
    setPendingUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload)));
  }

  function startThumbnailDrag(upload: PendingUpload, event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setThumbnailDrag({
      id: upload.id,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startThumbX: upload.thumbX,
      startThumbY: upload.thumbY,
    });
  }

  function moveThumbnailDrag(uploadId: string, event: PointerEvent<HTMLDivElement>) {
    if (!thumbnailDrag || thumbnailDrag.id !== uploadId) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = thumbnailDrag.startThumbX - ((event.clientX - thumbnailDrag.startPointerX) / rect.width) * 100;
    const nextY = thumbnailDrag.startThumbY - ((event.clientY - thumbnailDrag.startPointerY) / rect.height) * 100;

    updatePendingUpload(uploadId, {
      thumbX: Math.round(clamp(nextX, 0, 100)),
      thumbY: Math.round(clamp(nextY, 0, 100)),
    });
  }

  function stopThumbnailDrag() {
    setThumbnailDrag(null);
  }

  function zoomThumbnail(upload: PendingUpload, event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextScale = upload.thumbScale + (event.deltaY < 0 ? 0.08 : -0.08);
    updatePendingUpload(upload.id, { thumbScale: Number(clamp(nextScale, 1, 2.5).toFixed(2)) });
  }

  function removePendingUpload(id: string) {
    setPendingUploads((current) => {
      const removed = current.find((upload) => upload.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((upload) => upload.id !== id);
    });
  }

  async function uploadWorkImages(files: File[], worldId?: string) {
    if (!activeCharacter || files.length === 0) return [];

    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`${file.name}은 10MB를 넘어서 업로드할 수 없어요.`);
      }
    }

    return Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("characterId", activeCharacter.id);
        formData.append("displayName", "");
        if (worldId) {
          formData.append("worldId", worldId);
        }

        const response = await fetch("/api/r2-upload", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as {
          error?: string;
          key?: string;
          name?: string;
          size?: number;
          url?: string | null;
        };

        if (!response.ok || !result.url) {
          throw new Error(result.error ?? "로그 첨부 이미지 업로드에 실패했어요.");
        }

        return {
          id: result.key ?? `${file.name}-${file.lastModified}`,
          category: "illustration" as const,
          name: result.name ?? "",
          url: result.url,
          size: result.size ?? file.size,
        };
      }),
    );
  }

  // 이미지 업로드, 썸네일 위치 조정, 이미지 정보 수정/삭제를 처리합니다.
  async function uploadImages() {
    if (!activeCharacterId || !activeCharacter) {
      setNotice("사진을 저장하려면 먼저 기본 · 레코드 탭에서 「본 페이지에 저장」을 눌러주세요.");
      return;
    }

    if (!pendingUploads.length) {
      setNotice("먼저 사진을 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      const uploaded = await Promise.all(
        pendingUploads.map(async (upload) => {
          const formData = new FormData();
          formData.append("file", upload.file);
          formData.append("characterId", activeCharacter.id);
          formData.append("displayName", upload.displayName.trim());
          if (imageUploadWorldId) {
            formData.append("worldId", imageUploadWorldId);
          }

          const response = await fetch("/api/r2-upload", {
            method: "POST",
            body: formData,
          });
          const result = (await response.json()) as {
            error?: string;
            key?: string;
            name?: string;
            size?: number;
            url?: string | null;
          };

          if (!response.ok || !result.url) {
            throw new Error(result.error ?? "R2 업로드에 실패했어요.");
          }

          return {
            id: result.key ?? `${upload.file.name}-${upload.file.lastModified}`,
            category: imageUploadCategory,
            name: result.name ?? "",
            url: result.url,
            size: result.size ?? upload.file.size,
            thumbX: upload.thumbX,
            thumbY: upload.thumbY,
            thumbScale: upload.thumbScale,
          };
        }),
      );

      if (imageUploadWorldId) {
        const targetEntry =
          normalizeWorldEntries(activeCharacter.worldEntries).find(
            (entry) => entry.worldId === imageUploadWorldId,
          ) ?? createBlankWorldEntry(imageUploadWorldId);
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
        setNotice("세계관별 이미지를 저장했어요.");
      } else {
        await setDoc(
          doc(getFirebaseDb(), "characters", activeCharacter.id),
          characterFirestorePayload(activeCharacter, {
            images: [...(activeCharacter.images ?? []), ...uploaded],
            updatedAt: serverTimestamp(),
          }),
          { merge: true },
        );
        setNotice("이미지를 저장했어요. 본 페이지 카드와 상세에 반영됩니다.");
      }
      pendingUploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl));
      setPendingUploads([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "R2 업로드에 실패했어요.");
    } finally {
      setIsUploading(false);
    }
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
      setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? nextCharacter : character)));
      setNotice("이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateImageInfo(imageId: string, updates: Partial<Pick<UploadedImage, "category" | "name">>) {
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
      setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? nextCharacter : character)));
      setNotice("그림 정보를 수정했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "그림 정보 수정에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteWorldImage(imageId: string) {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldId || !activeCharacterWorldEntry) return;

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
      setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? nextCharacter : character)));
      setNotice("세계관 이미지를 Cloudflare R2와 Firestore 기록에서 삭제했어요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세계관 이미지 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateWorldImageInfo(imageId: string, updates: Partial<Pick<UploadedImage, "category" | "name">>) {
    if (!isAdmin || !activeCharacter || !activeCharacterWorldEntry) return;

    const nextEntry: CharacterWorldEntry = {
      ...activeCharacterWorldEntry,
      images: activeCharacterWorldEntry.images.map((image) => (image.id === imageId ? { ...image, ...updates } : image)),
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
      setCharacters((current) => current.map((character) => (character.id === activeCharacter.id ? nextCharacter : character)));
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
      const uploadedImages = await uploadWorkImages(workImageFiles);
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
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,#000000_0%,#000000_78%,#080000_100%)] pointer-events-none" />
      <div className="noise-layer" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-6">
        <header className="glass-card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/60">Admin Edit Page</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold md:text-6xl">수정 페이지</h1>
              <p className="mt-3 text-sm text-emerald-100/65">
                여기서 저장한 내용은 본 페이지 카드와 상세 화면에 바로 반영됩니다.
              </p>
            </div>
            <Link href="/" className="border border-emerald-100/20 px-5 py-3 text-center text-sm text-emerald-50">
              본 페이지로 돌아가기
            </Link>
          </div>
        </header>

        {!isAdmin ? (
          <section className="glass-card max-w-xl p-6">
            <h2 className="board-title">관리자 로그인</h2>
            <form onSubmit={submitLogin} className="mt-5 grid gap-3">
              <input
                value={loginDraft.loginId}
                onChange={(event) => setLoginDraft((current) => ({ ...current, loginId: event.target.value }))}
                placeholder="id"
                className="auth-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <input
                value={loginDraft.password}
                onChange={(event) => setLoginDraft((current) => ({ ...current, password: event.target.value }))}
                placeholder="password"
                type="text"
                className="auth-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button disabled={isAuthLoading} className="bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60">
                {isAuthLoading ? "로그인 중..." : "로그인"}
              </button>
              {authNotice && <p className="border border-stone-400/25 bg-stone-900/25 p-3 text-sm text-stone-200">{authNotice}</p>}
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
                    <h2 className="board-title">{CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind]} 목록</h2>
                    <button type="button" onClick={() => startNewCharacter()} className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950">
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
                          activeCharacter?.id === character.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
                        }`}
                      >
                        <span className="block text-lg font-semibold">{character.name}</span>
                        <span className="mt-1 block text-xs text-emerald-100/50">{character.id}</span>
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
                      { id: "archive" as const, title: "보관소 문구", subtitle: "archive sidebar text" },
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
                          activeCategory === category.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
                        }`}
                      >
                        <span className="block text-lg font-semibold">{category.title}</span>
                        <span className="mt-1 block text-xs text-emerald-100/50">{category.subtitle}</span>
                      </button>
                    ))}
                  </div>
                  {activeCategory === "diary" && (
                    <div className="mt-5 border-t border-emerald-100/10 pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-emerald-50">일기 목록</h3>
                        <button type="button" onClick={startNewDiaryEntry} className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950">
                          새 일기
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {diaryEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                              setActiveDiaryId(entry.id);
                              setDiaryDraft(entry);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeDiaryId === entry.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{entry.title}</span>
                            <span className="mt-1 block text-xs text-emerald-100/50">{entry.date || "no date"}</span>
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
                        <button type="button" onClick={startNewExtractBanner} className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950">
                          새 배너
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {extractBanners.map((banner) => (
                          <button
                            key={banner.id}
                            type="button"
                            onClick={() => {
                              setActiveExtractBannerId(banner.id);
                              setExtractBannerDraft(extractBannerDraftFromBanner(banner));
                              setExtractBannerImageFile(null);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeExtractBannerId === banner.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{banner.label || "제목 없음"}</span>
                            <span className="mt-1 block truncate text-xs text-emerald-100/50">{banner.linkUrl}</span>
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
                        <button type="button" onClick={startNewBgmTrack} className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950">
                          새 BGM
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {bgmTracks.map((track) => (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => {
                              setActiveBgmTrackId(track.id);
                              setBgmTrackDraft(bgmTrackDraftFromTrack(track));
                              setBgmAudioFile(null);
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeBgmTrackId === track.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
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
                        <button type="button" onClick={startNewWorld} className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950">
                          새 세계관
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {worlds.map((world) => (
                          <button
                            key={world.id}
                            type="button"
                            onClick={() => {
                              setActiveWorldId(world.id);
                              setWorldDraft(worldToDraft(world));
                            }}
                            className={`border p-3 text-left text-sm ${
                              activeWorldId === world.id ? "border-stone-400/35 bg-emerald-100/10" : "border-emerald-100/10 bg-black/30"
                            }`}
                          >
                            <span className="block text-base font-semibold">{world.title}</span>
                            <span className="mt-1 block text-xs text-emerald-100/50">{world.id}</span>
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
                onClick={() => signOut(getFirebaseAuth())}
                className="mt-5 w-full border border-emerald-100/20 px-4 py-3 text-sm text-emerald-50"
              >
                로그아웃
              </button>
            </aside>

            <section className="grid gap-6">
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
                        onChange={(event) => setHomeContent((current) => ({ ...current, eyebrow: event.target.value }))}
                        placeholder="상단 작은 문구"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      큰 제목
                      <input
                        value={homeContent.title}
                        onChange={(event) => setHomeContent((current) => ({ ...current, title: event.target.value }))}
                        placeholder="상단 제목"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      본문 문구
                      <textarea
                        value={homeContent.body}
                        onChange={(event) => setHomeContent((current) => ({ ...current, body: event.target.value }))}
                        placeholder="홈에 보일 소개 문구"
                        className="auth-input min-h-36"
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
                        onChange={(event) => setArchiveContent((current) => ({ ...current, eyebrow: event.target.value }))}
                        placeholder="Archive"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      제목
                      <input
                        value={archiveContent.title}
                        onChange={(event) => setArchiveContent((current) => ({ ...current, title: event.target.value }))}
                        placeholder="보관소 제목"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      소개 문구
                      <textarea
                        value={archiveContent.body}
                        onChange={(event) => setArchiveContent((current) => ({ ...current, body: event.target.value }))}
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
                        onChange={(event) => setDiaryDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="다이어리 제목"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      날짜
                      <input
                        value={diaryDraft.date}
                        onChange={(event) => setDiaryDraft((current) => ({ ...current, date: event.target.value }))}
                        placeholder="2026-06-15"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      일기 내용
                      <textarea
                        value={diaryDraft.body}
                        onChange={(event) => setDiaryDraft((current) => ({ ...current, body: event.target.value }))}
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
                        onChange={(event) => setExtractBannerDraft((current) => ({ ...current, label: event.target.value }))}
                        placeholder="배너에 표시할 짧은 문구"
                        className="auth-input"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-emerald-100/75">
                      이동 링크
                      <input
                        value={extractBannerDraft.linkUrl}
                        onChange={(event) => setExtractBannerDraft((current) => ({ ...current, linkUrl: event.target.value }))}
                        placeholder="https://example.com 또는 /guest"
                        className="auth-input"
                      />
                    </label>
                    <div className="grid gap-2 text-sm text-emerald-100/75">
                      배너 이미지
                      <input type="file" accept="image/*" onChange={handleExtractBannerImageChange} className="text-xs" />
                      {(extractBannerImageFile || extractBannerDraft.image) && (
                        <div className="extract-banner-link overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                          <img
                            src={
                              extractBannerImageFile
                                ? URL.createObjectURL(extractBannerImageFile)
                                : extractBannerDraft.image?.url
                            }
                            alt="Banner 미리보기"
                            className="extract-banner-image"
                            style={extractBannerDraft.image ? thumbnailStyle(extractBannerDraft.image) : undefined}
                          />
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
                        onChange={(event) => setBgmTrackDraft((current) => ({ ...current, label: event.target.value }))}
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
                      <p className="text-xs text-emerald-100/55">mp3·ogg·wav 등, 파일 1개당 최대 15MB</p>
                      {(bgmAudioFile || bgmTrackDraft.url) && (
                        <audio
                          controls
                          preload="none"
                          src={bgmAudioFile ? URL.createObjectURL(bgmAudioFile) : bgmTrackDraft.url}
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
                        <p className="mt-2 text-sm text-emerald-100/55">본 페이지에 남겨진 방명록에 관리자 답글을 달 수 있어요.</p>
                      </div>
                      <div className="grid gap-4">
                        {guestbookEntries.map((entry, index) => (
                          <article key={entry.id} className="border border-emerald-100/10 bg-black/30 p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div>
                                <p className="font-semibold text-emerald-50">No.{guestbookEntries.length - index} {entry.name}</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-emerald-50/70">{entry.body}</p>
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
                                  setGuestbookReplyDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
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
                              오류 대상: <span className="font-semibold">{activeWorldGlitchLabel}</span>
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
                            onChange={(event) => setWorldDraft((current) => ({ ...current, id: event.target.value }))}
                            placeholder="예: coc-1920"
                            className="auth-input"
                          />
                        </label>
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          세계관 이름
                          <input
                            value={worldDraft.title}
                            onChange={(event) =>
                              setWorldDraft((current) => updateWorldDraftFieldValue(current, "title", event.target.value))
                            }
                            {...bindWorldGlitchField("title")}
                            placeholder="예: 크툴루 1920"
                            className={glitchFieldClass("title", activeWorldGlitchFieldPath)}
                          />
                        </label>
                      </div>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        한 줄 설명
                        <input
                          value={worldDraft.subtitle}
                          onChange={(event) =>
                            setWorldDraft((current) => updateWorldDraftFieldValue(current, "subtitle", event.target.value))
                          }
                          {...bindWorldGlitchField("subtitle")}
                          placeholder="세계관을 짧게 설명해주세요."
                          className={glitchFieldClass("subtitle", activeWorldGlitchFieldPath)}
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        기록 열람 비밀번호
                        <input
                          value={worldDraft.password}
                          onChange={(event) => setWorldDraft((current) => ({ ...current, password: event.target.value }))}
                          placeholder="비워두면 공개 / 입력하면 기록 잠금"
                          className="auth-input"
                        />
                        <span className="text-xs leading-5 text-emerald-100/45">
                          본 페이지에서는 세계관 목록과 소개만 보이고, 참가 자캐 기록은 이 비밀번호를 입력해야 열립니다.
                        </span>
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        상세 설명
                        <textarea
                          value={worldDraft.description}
                          onChange={(event) =>
                            setWorldDraft((current) =>
                              updateWorldDraftFieldValue(current, "description", event.target.value),
                            )
                          }
                          {...bindWorldGlitchField("description")}
                          placeholder="룰, 시대, 분위기, 캠페인 설명 등"
                          className={glitchFieldClass("description", activeWorldGlitchFieldPath, "auth-input min-h-40")}
                        />
                      </label>

                      <section className="grid gap-3 border border-emerald-100/10 bg-black/25 p-4">
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-50">텍스트 오류 · 서식</h3>
                          <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                            세계관 이름, 한 줄 설명, 상세 설명에 글자 효과를 넣을 수 있어요.
                            {worldGlitchFieldCount > 0 ? ` · 적용 중 ${worldGlitchFieldCount}개` : ""}
                          </p>
                        </div>
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          오류 넣을 필드
                          <select
                            value={activeWorldGlitchFieldPath ?? ""}
                            onChange={(event) => {
                              const path = event.target.value;
                              setActiveWorldGlitchFieldPath(path || null);
                              setWorldGlitchFieldSelection(null);
                            }}
                            className="auth-input"
                          >
                            <option value="">필드를 선택하세요</option>
                            {worldGlitchFieldOptions.map((option) => (
                              <option key={option.path} value={option.path}>
                                {option.label}
                                {option.hasGlitch ? " · 적용됨" : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <TextScrambleTool
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
                              updateWorldDraftFieldValue(current, activeWorldGlitchFieldPath, value),
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
                              updateWorldDraftGlitchPath(current, activeWorldGlitchFieldPath, config),
                            );
                          }}
                          onNotice={setNotice}
                          allCharacters={characters}
                        />
                      </section>
                    </section>
                  )}

                  {activeCategory !== "guestbook" && (
                    <button disabled={isSaving} className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60">
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
              <form onSubmit={saveCharacter} className="glass-card grid gap-3 p-5 md:p-6">
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
                    <input value={draft.id} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} placeholder="id 예: shin" className="auth-input" />
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
                  <label className="grid gap-2 text-sm text-emerald-100/75 md:col-span-2">
                    {isPairDraft ? "페어 이름" : "이름"}
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "name", event.target.value))}
                      {...bindGlitchField("name")}
                      placeholder={isPairDraft ? "비우면 멤버 이름으로 자동 표시" : `${kindLabel} 이름`}
                      className={glitchFieldClass("name", activeGlitchFieldPath)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-emerald-100/75">
                    한자 이름
                    <input
                      value={draft.kanjiName}
                      onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "kanjiName", event.target.value))}
                      {...bindGlitchField("kanjiName")}
                      placeholder="예: 芥川"
                      className={glitchFieldClass("kanjiName", activeGlitchFieldPath)}
                    />
                  </label>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <label className="grid gap-2 text-sm text-emerald-100/75">
                    한 줄 소개
                    <input
                      value={draft.subtitle}
                      onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "subtitle", event.target.value))}
                      {...bindGlitchField("subtitle")}
                      placeholder="카드에 보일 짧은 소개"
                      className={glitchFieldClass("subtitle", activeGlitchFieldPath)}
                    />
                  </label>
                  <div className="grid gap-2">
                    <label className="text-sm text-emerald-100/75" htmlFor="admin-palette">색 분위기</label>
                    <select id="admin-palette" value={draft.palette} onChange={(event) => setDraft((current) => ({ ...current, palette: event.target.value }))} className="auth-input">
                      {resolvedPaletteOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div
                      className="character-palette-surface h-7 border border-emerald-100/10"
                      style={characterPaletteStyle(draft.palette)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <AdminCollapsiblePanel
                    title="기록 상태 · 분류"
                    description="카드에 보이는 기록 태그와 분류입니다. 자주 안 쓰면 접어두세요."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        기록 상태
                        <textarea
                          value={draft.statusTagsText}
                          onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "statusTags", event.target.value))}
                          {...bindGlitchField("statusTags")}
                          placeholder={"예: 관찰중\n기록 불완전\n비공개 기록"}
                          className={glitchFieldClass("statusTags", activeGlitchFieldPath, "auth-input min-h-24")}
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        기록 분류
                        <input
                          value={draft.classification}
                          onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "classification", event.target.value))}
                          {...bindGlitchField("classification")}
                          placeholder="예: 개인 기록 / 세계관 관련 / 비밀 파일"
                          className={glitchFieldClass("classification", activeGlitchFieldPath)}
                        />
                      </label>
                    </div>
                  </AdminCollapsiblePanel>
                </div>
                <label className="grid gap-2 text-sm text-emerald-100/75">
                  {isPairDraft ? "페어 대표 대사" : "대표 대사"}
                  <textarea
                    value={draft.quote}
                    onChange={(event) => setDraft((current) => updateDraftFieldValue(current, "quote", event.target.value))}
                    {...bindGlitchField("quote")}
                    placeholder={isPairDraft ? "페어 관계를 보여 줄 대표 문장" : "캐릭터 상세에 보일 대표 문장"}
                    className={glitchFieldClass("quote", activeGlitchFieldPath, "auth-input min-h-20")}
                  />
                </label>
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
                    setDraft((current) => updateDraftFieldValue(current, profileFieldGlitchPath(fieldId), value))
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
                          : "본 페이지 Record 탭에 나오는 상세 설정 박스입니다. 성격, 외형 등을 추가하세요."}
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
                          <button
                            type="button"
                            onClick={() => removeSettingSection(section.id)}
                            className="text-xs text-stone-300/70"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={section.title}
                          onChange={(event) =>
                            updateSettingSection(section.id, { title: event.target.value })
                          }
                          placeholder="예: 성격"
                          className="auth-input"
                        />
                        <textarea
                          value={section.body}
                          onChange={(event) =>
                            setDraft((current) =>
                              updateDraftFieldValue(
                                current,
                                settingSectionGlitchPath(section.id),
                                event.target.value,
                              ),
                            )
                          }
                          {...bindGlitchField(settingSectionGlitchPath(section.id))}
                          placeholder="이 박스 안에 들어갈 내용을 입력"
                          className={glitchFieldClass(
                            settingSectionGlitchPath(section.id),
                            activeGlitchFieldPath,
                            "auth-input min-h-24",
                          )}
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

                <label className="grid gap-2 text-sm text-emerald-100/75">
                  관계
                  <textarea
                    value={draft.relationshipsText}
                    onChange={(event) =>
                      setDraft((current) => updateDraftFieldValue(current, "relationships", event.target.value))
                    }
                    {...bindGlitchField("relationships")}
                    placeholder={"한 줄에 하나씩 입력"}
                    className={glitchFieldClass("relationships", activeGlitchFieldPath, "auth-input min-h-32")}
                  />
                </label>
                </>
                )}

                {characterEditSection === "members" && isPairDraft && (
                <>
                <div>
                  <h2 className="board-title">연결 캐릭터</h2>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                    OC 또는 어나더 항목을 선택해 페어에 연결합니다. 공개 페이지에서 각 캐릭터 상세로
                    이동할 수 있어요.
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
                <>
                <div>
                  <h2 className="board-title">텍스트 오류 · 서식</h2>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                    1. 필드 선택 → 2. 참조 단어 입력 → 3. 「전체에 바로 적용」 또는 문구 찾기
                  </p>
                </div>
                <label className="grid gap-2 text-sm text-emerald-100/75">
                  오류 넣을 필드
                  <select
                    value={activeGlitchFieldPath ?? ""}
                    onChange={(event) => {
                      const path = event.target.value;
                      setActiveGlitchFieldPath(path || null);
                      setGlitchFieldSelection(null);
                      const subPagePath = path ? parseSubPageGlitchPath(path) : null;
                      if (subPagePath) {
                        setCharacterEditSection("subpages");
                        setActiveSubPageId(subPagePath.subPageId);
                      }
                    }}
                    className="auth-input"
                  >
                    <option value="">필드를 선택하세요</option>
                    {glitchFieldOptionGroups.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.path} value={option.path}>
                            {option.label}
                            {option.hasGlitch ? " · 적용됨" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <TextScrambleTool
                  activeFieldPath={activeGlitchFieldPath}
                  fieldValue={
                    activeGlitchFieldPath ? getCharacterDraftFieldValue(draft, activeGlitchFieldPath) : ""
                  }
                  externalSelection={glitchFieldSelection}
                  onExternalSelectionClear={() => setGlitchFieldSelection(null)}
                  onFieldValueChange={(value) => {
                    if (!activeGlitchFieldPath) {
                      return;
                    }

                    setDraft((current) => updateDraftFieldValue(current, activeGlitchFieldPath, value));
                  }}
                  glitchConfig={
                    activeGlitchFieldPath ? getDraftGlitchConfig(draft, activeGlitchFieldPath) : undefined
                  }
                  onGlitchChange={(config) => {
                    if (!activeGlitchFieldPath) {
                      return;
                    }

                    setDraft((current) => updateDraftGlitchPath(current, activeGlitchFieldPath, config));
                  }}
                  onNotice={setNotice}
                  allCharacters={characters}
                  currentCharacterId={draft.id}
                  currentSection={characterKindToSection(normalizeCharacterKind(draft.kind))}
                />
                </>
                )}

                {characterEditSection === "subpages" && (
                <>
                <div>
                  <h2 className="board-title">상세 페이지</h2>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                    이 항목 안에 보여 줄 상세 페이지를 만듭니다. 「오류」 탭에서 구간을 다른 항목·상세 페이지로 연결할 수 있어요.
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
                />
                </>
                )}

                {(characterEditSection === "basics" || characterEditSection === "glitch" || characterEditSection === "subpages" || characterEditSection === "members") && (
                <div className="pointer-events-none sticky bottom-3 z-10 -mx-1 border border-emerald-200/20 bg-black/85 p-3 backdrop-blur-sm [&_button]:pointer-events-auto">
                  <button disabled={isSaving} className="admin-action-btn w-full px-5 py-3 text-sm disabled:opacity-60 md:ml-auto md:w-auto">
                    {isSaving ? "저장 중..." : "본 페이지에 저장"}
                  </button>
                </div>
                )}
              </form>
              </>
              )}

              {adminPanel === "characters" && activeCharacter && characterEditSection === "world" && (
                <section className="glass-card grid gap-4 p-5 md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="board-title">세계관별 자료</h2>
                      <p className="mt-2 text-xs text-emerald-100/55">World마다 설정, 그림, 로그를 따로 정리합니다.</p>
                    </div>
                    <select
                      value={activeCharacterWorldId}
                      onChange={(event) => selectCharacterWorld(event.target.value)}
                      className="auth-input md:max-w-xs"
                    >
                      <option value="">세계관 선택</option>
                      {worlds.map((world) => (
                        <option key={world.id} value={world.id}>{world.title}</option>
                      ))}
                    </select>
                  </div>

                  {activeCharacterWorldId ? (
                    <div className="grid gap-5">
                      <div className="flex flex-col gap-3 border border-stone-400/15 bg-stone-900/10 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-50">참가 기록 관리</h3>
                          <p className="mt-1 text-xs text-emerald-100/55">이 자캐를 선택한 세계관에서 제거합니다. 세계관 전용 그림도 R2와 Firestore에서 함께 삭제돼요.</p>
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
                      <button type="button" onClick={saveCharacterWorldSettings} disabled={isSaving} className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60">
                        세계관 설정 저장
                      </button>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {(activeCharacterWorldEntry?.images ?? []).map((image) => (
                          <article key={image.id} className="gallery-tile">
                            <div className="aspect-[3/2] overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                              <img src={image.url} alt={image.name} className="h-full w-full object-cover opacity-90" style={thumbnailStyle(image)} />
                            </div>
                            <div className="p-3 text-sm">
                              <form
                                className="grid gap-2"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  updateWorldImageInfo(image.id, {
                                    name: String(formData.get("name") ?? image.name).trim() || image.name,
                                    category: String(formData.get("category")) as "illustration" | "standing",
                                  });
                                }}
                              >
                                <input name="name" defaultValue={image.name} className="auth-input text-xs" placeholder="그림 이름" />
                                <select name="category" defaultValue={image.category ?? "illustration"} className="auth-input text-xs">
                                  <option value="illustration">일러스트 / 대표 썸네일</option>
                                  <option value="standing">스탠딩 / 표정 모음</option>
                                </select>
                                <button type="submit" disabled={isSaving} className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60">
                                  정보 저장
                                </button>
                              </form>
                              <button type="button" onClick={() => deleteWorldImage(image.id)} disabled={isSaving} className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60">
                                기록 삭제
                              </button>
                            </div>
                          </article>
                        ))}
                        {(activeCharacterWorldEntry?.images ?? []).length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">
                            이 세계관에 등록된 그림이 없어요. 그림 관리에서 업로드 대상을 이 세계관으로 선택해주세요.
                          </p>
                        )}
                      </div>

                      <form onSubmit={addWorldWork} className="grid gap-3 border border-emerald-100/10 bg-black/30 p-4">
                        <h3 className="text-sm font-semibold text-emerald-50">세계관 연성/로그 추가</h3>
                        <div className="grid gap-3 md:grid-cols-3">
                          <input value={worldWorkDraft.title} onChange={(event) => setWorldWorkDraft((current) => ({ ...current, title: event.target.value }))} placeholder="제목" className="auth-input" />
                          <input value={worldWorkDraft.kind} onChange={(event) => setWorldWorkDraft((current) => ({ ...current, kind: event.target.value }))} placeholder="종류" className="auth-input" />
                          <input value={worldWorkDraft.date} onChange={(event) => setWorldWorkDraft((current) => ({ ...current, date: event.target.value }))} placeholder="날짜" className="auth-input" />
                        </div>
                        <textarea value={worldWorkDraft.body} onChange={(event) => setWorldWorkDraft((current) => ({ ...current, body: event.target.value }))} placeholder="세계관 연성/로그 내용" className="auth-input min-h-28" />
                        <label className="grid gap-2 text-sm text-emerald-100/75">
                          세계관 연성 첨부 사진
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => setWorldWorkImageFiles(Array.from(event.target.files ?? []))}
                            className="auth-input"
                          />
                          {worldWorkImageFiles.length > 0 && (
                            <span className="text-xs text-emerald-100/50">선택된 사진 {worldWorkImageFiles.length}장</span>
                          )}
                        </label>
                        <button disabled={isSaving} className="justify-self-end bg-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60">
                          세계관 연성/로그 추가
                        </button>
                      </form>

                      <div className="grid gap-3">
                        {(activeCharacterWorldEntry?.works ?? []).map((work, index) => (
                          <article key={`${work.title}-${work.date}-${index}`} className="border border-emerald-100/10 bg-black/30 p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-emerald-100/45">{work.kind} / {work.date}</p>
                                <h3 className="mt-1 font-semibold">{work.title}</h3>
                              </div>
                              <button type="button" onClick={() => deleteWorldWork(index)} disabled={isSaving} className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60">
                                삭제
                              </button>
                            </div>
                            {(work.images?.length ?? 0) > 0 && (
                              <div className="mt-3 grid grid-cols-4 gap-2">
                                {work.images?.map((image) => (
                                  <div key={image.id} className="aspect-square overflow-hidden border border-stone-400/15 bg-black">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                    <img src={image.url} alt={image.name} className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="mt-3 leading-6 text-emerald-50/70">{work.body}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">먼저 세계관을 선택해주세요.</p>
                  )}
                </section>
              )}

              {adminPanel === "characters" && characterEditSection === "images" && (
                <>
                  {!activeCharacterId || !activeCharacter ? (
                    <section className="glass-card p-5">
                      <h2 className="board-title">그림 관리</h2>
                      <p className="mt-3 border border-amber-400/25 bg-amber-950/20 p-4 text-sm leading-7 text-amber-100/90">
                        사진을 추가하려면 먼저 <span className="font-semibold">기본 · 레코드</span> 탭에서
                        이름을 입력하고 <span className="font-semibold">「본 페이지에 저장」</span>을 눌러주세요.
                        저장된 뒤 다시 그림 탭으로 오면 업로드할 수 있어요.
                      </p>
                    </section>
                  ) : (
                    <section className="grid gap-6 xl:grid-cols-2">
                  <div className="glass-card p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="board-title">그림 관리</h2>
                        <p className="mt-2 text-xs text-emerald-100/55">파일 1개당 최대 {formatBytes(MAX_UPLOAD_SIZE)}.</p>
                      </div>
                      <div className="grid gap-2 md:min-w-64">
                        <select value={imageUploadWorldId} onChange={(event) => setImageUploadWorldId(event.target.value)} className="auth-input">
                          <option value="">기본 자료에 업로드</option>
                          {worlds.map((world) => (
                            <option key={world.id} value={world.id}>{world.title}</option>
                          ))}
                        </select>
                        <select value={imageUploadCategory} onChange={(event) => setImageUploadCategory(event.target.value as "illustration" | "standing")} className="auth-input">
                          <option value="illustration">일러스트 / 대표 썸네일</option>
                          <option value="standing">스탠딩 / 표정 모음</option>
                        </select>
                        <label className="cursor-pointer bg-emerald-200 px-4 py-3 text-center text-sm font-semibold text-emerald-950">
                          사진 선택
                          <input type="file" accept="image/*" multiple disabled={isUploading} className="sr-only" onChange={selectPendingImages} />
                        </label>
                      </div>
                    </div>
                    {pendingUploads.length > 0 && (
                      <div className="mt-4 border border-emerald-100/10 bg-black/30 p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-50">선택한 사진 썸네일 설정</h3>
                            <p className="mt-1 text-xs text-emerald-100/55">사진을 드래그해서 위치를 맞추고, 마우스 휠로 확대/축소할 수 있어요.</p>
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
                            <article key={upload.id} className="grid gap-4 border border-emerald-100/10 bg-black/40 p-4">
                              <div
                                className="aspect-[3/2] cursor-move touch-none overflow-hidden border border-stone-400/25 bg-black"
                                onPointerDown={(event) => startThumbnailDrag(upload, event)}
                                onPointerMove={(event) => moveThumbnailDrag(upload.id, event)}
                                onPointerUp={stopThumbnailDrag}
                                onPointerCancel={stopThumbnailDrag}
                                onWheel={(event) => zoomThumbnail(upload, event)}
                                title="드래그로 위치 조정, 휠로 확대/축소"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- Local preview URL for thumbnail adjustment. */}
                                <img
                                  src={upload.previewUrl}
                                  alt={upload.file.name}
                                  className="h-full w-full select-none object-cover opacity-90"
                                  style={thumbnailStyle(upload)}
                                  draggable={false}
                                />
                              </div>
                              <div className="grid content-start gap-4">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                  <label className="grid gap-2 text-sm font-semibold text-emerald-100/80">
                                    사이트에 표시할 이름
                                    <input
                                      value={upload.displayName}
                                      onChange={(event) => updatePendingUpload(upload.id, { displayName: event.target.value })}
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
                                    onChange={(event) => updatePendingUpload(upload.id, { thumbScale: Number(event.target.value) })}
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
                                    onChange={(event) => updatePendingUpload(upload.id, { thumbX: Number(event.target.value) })}
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
                                    onChange={(event) => updatePendingUpload(upload.id, { thumbY: Number(event.target.value) })}
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
                            {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                            <img
                              src={image.url}
                              alt={image.name}
                              className="h-full w-full object-cover opacity-90"
                              style={thumbnailStyle(image)}
                            />
                          </div>
                          <div className="p-3 text-sm">
                            <form
                              className="grid gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const formData = new FormData(event.currentTarget);
                                updateImageInfo(image.id, {
                                  name: String(formData.get("name") ?? image.name).trim() || image.name,
                                  category: String(formData.get("category")) as "illustration" | "standing",
                                });
                              }}
                            >
                              <input name="name" defaultValue={image.name} className="auth-input text-xs" placeholder="그림 이름" />
                              <select name="category" defaultValue={image.category ?? "illustration"} className="auth-input text-xs">
                                <option value="illustration">일러스트 / 대표 썸네일</option>
                                <option value="standing">스탠딩 / 표정 모음</option>
                              </select>
                              <button type="submit" disabled={isSaving} className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50 disabled:opacity-60">
                                정보 저장
                              </button>
                            </form>
                            <button type="button" onClick={() => deleteImage(image.id)} disabled={isSaving} className="mt-3 border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60">
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
                        <input value={workDraft.title} onChange={(event) => setWorkDraft((current) => ({ ...current, title: event.target.value }))} placeholder="제목" className="auth-input" />
                        <input value={workDraft.kind} onChange={(event) => setWorkDraft((current) => ({ ...current, kind: event.target.value }))} placeholder="종류" className="auth-input" />
                        <input value={workDraft.date} onChange={(event) => setWorkDraft((current) => ({ ...current, date: event.target.value }))} placeholder="날짜" className="auth-input" />
                      </div>
                      <textarea value={workDraft.body} onChange={(event) => setWorkDraft((current) => ({ ...current, body: event.target.value }))} placeholder="글/연성 내용" className="auth-input min-h-28" />
                      <label className="grid gap-2 text-sm text-emerald-100/75">
                        글 첨부 사진
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => setWorkImageFiles(Array.from(event.target.files ?? []))}
                          className="auth-input"
                        />
                        {workImageFiles.length > 0 && (
                          <span className="text-xs text-emerald-100/50">선택된 사진 {workImageFiles.length}장</span>
                        )}
                      </label>
                      <button disabled={isSaving} className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60">
                        글 추가
                      </button>
                    </form>
                    <div className="mt-4 grid gap-3">
                      {activeCharacter.works.map((work, index) => (
                        <article key={`${work.title}-${work.date}-${index}`} className="border border-emerald-100/10 bg-black/30 p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-emerald-100/45">{work.kind} / {work.date}</p>
                              <h3 className="mt-1 font-semibold">{work.title}</h3>
                            </div>
                            <button type="button" onClick={() => deleteWork(index)} disabled={isSaving} className="border border-stone-400/30 px-3 py-2 text-xs text-stone-200 disabled:opacity-60">
                              삭제
                            </button>
                          </div>
                          {(work.images?.length ?? 0) > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                              {work.images?.map((image) => (
                                <div key={image.id} className="aspect-square overflow-hidden border border-stone-400/15 bg-black">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                  <img src={image.url} alt={image.name} className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="mt-3 leading-6 text-emerald-50/70">{work.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                    </section>
                  )}
                </>
              )}

              {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
