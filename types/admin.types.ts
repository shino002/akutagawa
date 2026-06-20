import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import type { CharacterKind } from "@/lib/types";

export type AdminPanel = "categories" | "characters";

export type AdminCategory =
  | "home"
  | "archive"
  | "diary"
  | "guestbook"
  | "worlds"
  | "extract"
  | "bgm";

/**
 * 관리자 SPA 화면 상태를 browser history와 동기화할 때 사용합니다.
 */
export type AdminHistoryState = {
  v: 1;
  panel: AdminPanel;
  category: AdminCategory;
  characterKind: CharacterKind;
  characterId: string;
  editSection: CharacterEditSection;
  subPageId: string;
  diaryId: string;
  extractBannerId: string;
  bgmTrackId: string;
  worldId: string;
  characterWorldId: string;
};
