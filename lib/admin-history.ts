import type { CharacterEditSection } from "@/components/admin/CharacterEditSectionNav";
import { CHARACTER_KINDS } from "@/lib/character-kind";
import type {
  AdminCategory,
  AdminHistoryState,
  AdminPanel,
} from "@/types/admin.types";
import type { CharacterKind } from "@/lib/types";

export const ADMIN_HISTORY_VERSION = 1 as const;

const VALID_PANELS = new Set<AdminPanel>(["categories", "characters"]);
const VALID_CATEGORIES = new Set<AdminCategory>([
  "home",
  "archive",
  "diary",
  "guestbook",
  "worlds",
  "extract",
  "bgm",
]);
const VALID_KINDS = new Set<CharacterKind>(CHARACTER_KINDS);
const VALID_EDIT_SECTIONS = new Set<CharacterEditSection>([
  "basics",
  "glitch",
  "subpages",
  "members",
  "world",
  "images",
]);

const DEFAULT_PANEL: AdminPanel = "categories";
const DEFAULT_CATEGORY: AdminCategory = "home";
const DEFAULT_KIND: CharacterKind = "oc";
const DEFAULT_EDIT_SECTION: CharacterEditSection = "basics";

/**
 * 현재 관리자 화면 상태를 browser history state로 직렬화합니다.
 */
export const createAdminHistoryState = (
  params: Partial<AdminHistoryState> & Pick<AdminHistoryState, "panel">,
): AdminHistoryState => ({
  v: ADMIN_HISTORY_VERSION,
  panel: params.panel,
  category: params.category ?? DEFAULT_CATEGORY,
  characterKind: params.characterKind ?? DEFAULT_KIND,
  characterId: params.characterId ?? "",
  editSection: params.editSection ?? DEFAULT_EDIT_SECTION,
  subPageId: params.subPageId ?? "",
  diaryId: params.diaryId ?? "",
  extractBannerId: params.extractBannerId ?? "",
  bgmTrackId: params.bgmTrackId ?? "",
  worldId: params.worldId ?? "",
  characterWorldId: params.characterWorldId ?? "",
});

/**
 * history.state 또는 URL 쿼리에서 관리자 내비게이션 상태를 복원합니다.
 */
export const parseAdminHistoryState = (value: unknown): AdminHistoryState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<AdminHistoryState>;
  if (raw.v !== ADMIN_HISTORY_VERSION || !raw.panel || !VALID_PANELS.has(raw.panel)) {
    return null;
  }

  const category =
    raw.category && VALID_CATEGORIES.has(raw.category) ? raw.category : DEFAULT_CATEGORY;
  const characterKind =
    raw.characterKind && VALID_KINDS.has(raw.characterKind) ? raw.characterKind : DEFAULT_KIND;
  const editSection =
    raw.editSection && VALID_EDIT_SECTIONS.has(raw.editSection)
      ? raw.editSection
      : DEFAULT_EDIT_SECTION;

  return createAdminHistoryState({
    panel: raw.panel,
    category,
    characterKind,
    characterId: typeof raw.characterId === "string" ? raw.characterId : "",
    editSection,
    subPageId: typeof raw.subPageId === "string" ? raw.subPageId : "",
    diaryId: typeof raw.diaryId === "string" ? raw.diaryId : "",
    extractBannerId: typeof raw.extractBannerId === "string" ? raw.extractBannerId : "",
    bgmTrackId: typeof raw.bgmTrackId === "string" ? raw.bgmTrackId : "",
    worldId: typeof raw.worldId === "string" ? raw.worldId : "",
    characterWorldId: typeof raw.characterWorldId === "string" ? raw.characterWorldId : "",
  });
};

export const adminHistoryStatesEqual = (left: AdminHistoryState, right: AdminHistoryState) =>
  left.panel === right.panel &&
  left.category === right.category &&
  left.characterKind === right.characterKind &&
  left.characterId === right.characterId &&
  left.editSection === right.editSection &&
  left.subPageId === right.subPageId &&
  left.diaryId === right.diaryId &&
  left.extractBannerId === right.extractBannerId &&
  left.bgmTrackId === right.bgmTrackId &&
  left.worldId === right.worldId &&
  left.characterWorldId === right.characterWorldId;

/**
 * 공유·새로고침용 URL 쿼리를 생성합니다.
 */
export const buildAdminHistoryUrl = (state: AdminHistoryState, pathname = "/admin") => {
  const params = new URLSearchParams();

  if (state.panel !== DEFAULT_PANEL) {
    params.set("p", state.panel === "characters" ? "chr" : "cat");
  }

  if (state.panel === "categories" && state.category !== DEFAULT_CATEGORY) {
    params.set("cat", state.category);
  }

  if (state.panel === "characters") {
    if (state.characterKind !== DEFAULT_KIND) {
      params.set("k", state.characterKind);
    }

    if (state.characterId) {
      params.set("c", state.characterId);
    }

    if (state.editSection !== DEFAULT_EDIT_SECTION) {
      params.set("es", state.editSection);
    }

    if (state.subPageId) {
      params.set("sp", state.subPageId);
    }

    if (state.characterWorldId) {
      params.set("cw", state.characterWorldId);
    }
  }

  if (state.panel === "categories") {
    if (state.category === "diary" && state.diaryId) {
      params.set("d", state.diaryId);
    }

    if (state.category === "extract" && state.extractBannerId) {
      params.set("eb", state.extractBannerId);
    }

    if (state.category === "bgm" && state.bgmTrackId) {
      params.set("bgm", state.bgmTrackId);
    }

    if (state.category === "worlds" && state.worldId) {
      params.set("w", state.worldId);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

/**
 * 최초 진입 시 URL 쿼리로부터 관리자 내비게이션 상태를 읽습니다.
 */
export const readAdminHistoryStateFromUrl = (search: string): AdminHistoryState | null => {
  const params = new URLSearchParams(search);
  const panelParam = params.get("p");

  let panel: AdminPanel = DEFAULT_PANEL;
  if (panelParam === "chr" || panelParam === "characters") {
    panel = "characters";
  } else if (panelParam === "cat" || panelParam === "categories") {
    panel = "categories";
  } else if (panelParam) {
    return null;
  }

  const categoryParam = params.get("cat");
  const category =
    categoryParam && VALID_CATEGORIES.has(categoryParam as AdminCategory)
      ? (categoryParam as AdminCategory)
      : DEFAULT_CATEGORY;

  const kindParam = params.get("k");
  const characterKind =
    kindParam && VALID_KINDS.has(kindParam as CharacterKind)
      ? (kindParam as CharacterKind)
      : DEFAULT_KIND;

  const editSectionParam = params.get("es");
  const editSection =
    editSectionParam && VALID_EDIT_SECTIONS.has(editSectionParam as CharacterEditSection)
      ? (editSectionParam as CharacterEditSection)
      : DEFAULT_EDIT_SECTION;

  return createAdminHistoryState({
    panel,
    category,
    characterKind,
    characterId: params.get("c") ?? "",
    editSection,
    subPageId: params.get("sp") ?? "",
    diaryId: params.get("d") ?? "",
    extractBannerId: params.get("eb") ?? "",
    bgmTrackId: params.get("bgm") ?? "",
    worldId: params.get("w") ?? "",
    characterWorldId: params.get("cw") ?? "",
  });
};
