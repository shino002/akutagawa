import type { Character, HomeContent } from "@/lib/types";

/**
 * Firestore의 site/home 문서가 비어 있을 때 사용할 기본 문구입니다.
 */
export const defaultHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

/**
 * Firestore의 site/archive 문서가 비어 있을 때 사용할 기본 문구입니다.
 */
export const defaultArchiveContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

/**
 * 왼쪽 메뉴에 표시할 섹션 목록입니다.
 */
export const sections = [
  { id: "home", label: "Home" },
  { id: "characters", label: "Character" },
  { id: "worlds", label: "World" },
  { id: "diary", label: "Diary" },
  { id: "guest", label: "Guest" },
  { id: "extract", label: "@/1_R#0?/@..." },
] as const;

export type SectionId = (typeof sections)[number]["id"];

/**
 * 자캐 데이터가 아직 없을 때 화면을 비우지 않기 위한 기본 자캐 값입니다.
 */
export const emptyCharacter: Character = {
  id: "",
  name: "자캐 없음",
  subtitle: "관리자 로그인 후 Character에서 자캐를 추가해주세요.",
  quote: "아직 등록된 자캐가 없어요.",
  palette: "from-red-600 via-zinc-900 to-black",
  profile: {
    age: "",
    height: "",
    role: "",
    keyword: "",
  },
  settings: [],
  relationships: [],
  images: [],
  works: [],
  worldEntries: [],
};
