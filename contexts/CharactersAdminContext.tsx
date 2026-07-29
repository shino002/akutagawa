"use client";

import {
  createContext,
  useContext,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
  type WheelEvent,
} from "react";
import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import type { PendingUpload } from "@/hooks/useAdminUploads";
import type { BgmOption } from "@/lib/bgm-catalog";
import type { CharacterDraft } from "@/lib/character-draft";
import type { GlitchFieldOptionGroup } from "@/lib/glitch-fields";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import type {
  Character,
  CharacterKind,
  CharacterWorldEntry,
  FieldGlitchConfig,
  SettingSection,
  UploadedImage,
  World,
} from "@/lib/types";

type GlitchFieldBindings = {
  "data-glitch-field": string;
  onFocus: () => void;
  onClick: () => void;
  onSelect: (event: {
    currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  }) => void;
  onKeyUp: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
  onMouseUp: (event: {
    currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  }) => void;
};

type GlitchPickerGroup = {
  id: string;
  label: string;
  options: Array<GlitchFieldOptionGroup["options"][number] & { zoneCount: number }>;
};

/**
 * 캐릭터 관리 패널이 공유하는 상태·액션입니다.
 * CharactersAdminProvider가 한 번만 훅을 호출하고 하위 섹션 편집기가 구독합니다.
 */
export type CharactersAdminContextValue = {
  isAdmin: boolean;
  notice: string;
  setNotice: Dispatch<SetStateAction<string>>;
  isSaving: boolean;
  characterEditSection: CharacterEditSection;
  setCharacterEditSection: Dispatch<SetStateAction<CharacterEditSection>>;
  activeCharacterWorldId: string;
  setActiveCharacterWorldId: Dispatch<SetStateAction<string>>;
  worldSettingsText: string;
  setWorldSettingsText: Dispatch<SetStateAction<string>>;
  worldWorkDraft: { title: string; kind: string; date: string; body: string };
  setWorldWorkDraft: Dispatch<
    SetStateAction<{ title: string; kind: string; date: string; body: string }>
  >;
  characters: Character[];
  charactersRef: { current: Character[] };
  activeCharacterId: string;
  setActiveCharacterId: Dispatch<SetStateAction<string>>;
  activeCharacterKind: CharacterKind;
  setActiveCharacterKind: Dispatch<SetStateAction<CharacterKind>>;
  activeSubPageId: string;
  setActiveSubPageId: Dispatch<SetStateAction<string>>;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  workDraft: { title: string; kind: string; date: string; body: string };
  setWorkDraft: Dispatch<
    SetStateAction<{ title: string; kind: string; date: string; body: string }>
  >;
  activeCharacter: Character | undefined;
  filteredCharacters: Character[];
  pairLinkableCharacters: Character[];
  canRecoverLegacyPairMember: boolean;
  kindLabel: string;
  isPairDraft: boolean;
  selectCharacterFromList: (character: Character) => void;
  startNewCharacter: (kind?: CharacterKind) => void;
  handleActiveKindChange: (kind: CharacterKind) => void;
  reloadCharacterFromServer: () => void;
  saveCharacter: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  recoverLegacyPairMemberData: () => Promise<void>;
  deleteCharacter: (character: Character) => Promise<void>;
  worlds: World[];
  activeCharacterWorldEntry: CharacterWorldEntry | undefined;
  worldWorkImageFiles: File[];
  setWorldWorkImageFiles: Dispatch<SetStateAction<File[]>>;
  workImageFiles: File[];
  setWorkImageFiles: Dispatch<SetStateAction<File[]>>;
  imageUploadCategory: "illustration" | "standing";
  setImageUploadCategory: Dispatch<SetStateAction<"illustration" | "standing">>;
  imageUploadWorldId: string;
  setImageUploadWorldId: Dispatch<SetStateAction<string>>;
  isUploading: boolean;
  pendingUploads: PendingUpload[];
  selectPendingImages: (event: ChangeEvent<HTMLInputElement>, characterId: string) => Promise<void>;
  updatePendingUpload: (
    id: string,
    updates: Partial<Pick<PendingUpload, "displayName" | "thumbX" | "thumbY" | "thumbScale">>,
  ) => void;
  startThumbnailDrag: (upload: PendingUpload, event: PointerEvent<HTMLDivElement>) => void;
  moveThumbnailDrag: (id: string, event: PointerEvent<HTMLDivElement>) => void;
  stopThumbnailDrag: () => void;
  zoomThumbnail: (upload: PendingUpload, event: WheelEvent<HTMLDivElement>) => void;
  removePendingUpload: (id: string) => void;
  activeGlitchFieldPath: string | null;
  glitchFieldSelection: GlitchTextSelection | null;
  setGlitchFieldSelection: Dispatch<SetStateAction<GlitchTextSelection | null>>;
  glitchFieldAnchorElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
  setGlitchFieldAnchorElement: Dispatch<
    SetStateAction<HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>
  >;
  resetCharacterGlitch: () => void;
  selectGlitchField: (path: string) => void;
  glitchFieldPickerGroups: GlitchPickerGroup[];
  activeGlitchLabel: string | null;
  glitchFieldCount: number;
  subPageCount: number;
  bgmCharacterOptions: BgmOption[];
  quickAddCharacterBgm: (file: File) => Promise<string>;
  bindGlitchField: (path: string) => GlitchFieldBindings;
  selectCharacterWorld: (worldId: string) => void;
  saveCharacterWorldSettings: () => Promise<void>;
  addWorldWork: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteWorldWork: (workIndex: number) => Promise<void>;
  deleteCharacterWorldEntry: () => Promise<void>;
  addSettingSection: () => void;
  updateSettingSection: (
    id: string,
    updates: Partial<Pick<SettingSection, "title" | "body">>,
  ) => void;
  removeSettingSection: (id: string) => void;
  moveSettingSection: (id: string, direction: "up" | "down") => void;
  uploadImages: () => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  updateImageInfo: (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => Promise<void>;
  deleteWorldImage: (imageId: string) => Promise<void>;
  updateWorldImageInfo: (
    imageId: string,
    updates: Partial<Pick<UploadedImage, "category" | "name">>,
  ) => Promise<void>;
  addWork: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteWork: (workIndex: number) => Promise<void>;
  applyGlitchFromToolbar: (config: FieldGlitchConfig, message: string) => void;
};

const CharactersAdminContext = createContext<CharactersAdminContextValue | null>(null);

/**
 * 캐릭터 관리 컨텍스트를 구독합니다. Provider 밖에서는 호출할 수 없습니다.
 */
export const useCharactersAdmin = (): CharactersAdminContextValue => {
  const value = useContext(CharactersAdminContext);
  if (!value) {
    throw new Error("useCharactersAdmin must be used within CharactersAdminProvider");
  }
  return value;
};

interface CharactersAdminProviderProps {
  children: ReactNode;
  value: CharactersAdminContextValue;
}

/**
 * 캐릭터 훅·액션을 하위 섹션 편집기에 제공합니다.
 */
export function CharactersAdminProvider({ children, value }: CharactersAdminProviderProps) {
  return (
    <CharactersAdminContext.Provider value={value}>{children}</CharactersAdminContext.Provider>
  );
}
