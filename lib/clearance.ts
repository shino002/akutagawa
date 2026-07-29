import type { Character } from "@/lib/types";

/**
 * 문서 열람등급. 상세 페이지의 고무도장 문구·색과 헤더의 등급 표기가 여기서 나옵니다.
 */
/** X 는 등급표 밖의 숨은 등급입니다 — 서식에는 「?」 칸으로만 인쇄돼 있습니다 */
export const CLEARANCE_GRADES = ["X", "S", "A", "B", "C"] as const;

export type ClearanceGrade = (typeof CLEARANCE_GRADES)[number];

export type ClearancePreset = {
  grade: ClearanceGrade;
  /** 該当欄 한 칸에 인쇄되는 글자. 숨은 등급은 제 이름을 적지 않습니다 */
  cellMark: string;
  /** 도장에 크게 찍히는 한자 */
  stampMain: string;
  /** 도장 아래 작게 찍히는 영문 */
  stampSub: string;
  /** 등급표에 읽히도록 적는 한국어 이름 */
  koLabel: string;
  /** 등급란에 한 줄로 박히는 표제 */
  koHeadline: string;
  /** 등급표 아래 붙는 한 줄 취급 지침 */
  koNote: string;
  /** 관리자 드롭다운에 보여줄 설명 */
  adminLabel: string;
  /** 도장 색 계열 — character.css 의 .dossier-stamp--{tone} 과 짝입니다 */
  tone: "void" | "crimson" | "amber" | "muted" | "plain";
};

const PRESETS: Record<ClearanceGrade, ClearancePreset> = {
  /* 등급표 위쪽으로 한 칸 더 있는, 이름이 지워진 등급.
     서식에는 「?」 칸만 인쇄돼 있고 무엇인지는 어디에도 적히지 않습니다. */
  X: {
    grade: "X",
    cellMark: "?",
    stampMain: "封印",
    stampSub: "SEALED",
    koLabel: "???",
    koHeadline: "??? — 분류 불능",
    koNote: "등급표 밖의 문서 · 열람 기록 없음",
    adminLabel: "X — 封印 / ??? (숨은 등급)",
    tone: "void",
  },
  S: {
    grade: "S",
    cellMark: "S",
    stampMain: "極秘",
    stampSub: "CLASSIFIED",
    koLabel: "최고 기밀",
    koHeadline: "S · 최고 기밀",
    koNote: "지정 인가자 외 열람 금지",
    adminLabel: "S — 極秘 / 최고 기밀",
    tone: "crimson",
  },
  A: {
    grade: "A",
    cellMark: "A",
    stampMain: "厳重",
    stampSub: "RESTRICTED",
    koLabel: "열람 제한",
    koHeadline: "A · 열람 제한",
    koNote: "반출·복제 시 결재 필요",
    adminLabel: "A — 厳重 / 열람 제한",
    tone: "amber",
  },
  B: {
    grade: "B",
    cellMark: "B",
    stampMain: "閲覧可",
    stampSub: "ON FILE",
    koLabel: "일반 기록",
    koHeadline: "B · 일반 기록",
    koNote: "관내 열람 허용",
    adminLabel: "B — 閲覧可 / 일반 기록",
    tone: "muted",
  },
  C: {
    grade: "C",
    cellMark: "C",
    stampMain: "公開",
    stampSub: "OPEN",
    koLabel: "완전 공개",
    koHeadline: "C · 완전 공개",
    koNote: "열람·인용 제한 없음",
    adminLabel: "C — 公開 / 완전 공개",
    tone: "plain",
  },
};

export const isClearanceGrade = (value: unknown): value is ClearanceGrade =>
  typeof value === "string" && (CLEARANCE_GRADES as readonly string[]).includes(value);

/**
 * 등급이 저장돼 있지 않은 기존 자캐는 기밀 체크박스로 판단합니다.
 * (등급 기능이 생기기 전 데이터도 지금과 같은 화면을 유지하도록)
 */
export const resolveClearanceGrade = (
  character: Pick<Character, "clearance" | "confidential">,
): ClearanceGrade => {
  if (isClearanceGrade(character.clearance)) {
    return character.clearance;
  }
  return character.confidential ? "S" : "B";
};

export const resolveClearancePreset = (
  character: Pick<Character, "clearance" | "confidential">,
): ClearancePreset => PRESETS[resolveClearanceGrade(character)];

/**
 * 열람 전에 받아야 하는 결재 도장 수.
 *
 * 0 이면 문이 없습니다 — 관내 열람이 허용된 등급(B·C)은 바로 펼쳐집니다.
 * 등급이 올라갈수록 결재란이 늘어납니다: A 는 一次, S·X 는 二次까지.
 */
export const CLEARANCE_GATE_STEPS: Record<ClearanceGrade, 0 | 1 | 2> = {
  X: 2,
  S: 2,
  A: 1,
  B: 0,
  C: 0,
};

export const resolveClearanceGateSteps = (
  character: Pick<Character, "clearance" | "confidential">,
): 0 | 1 | 2 => CLEARANCE_GATE_STEPS[resolveClearanceGrade(character)];

export const clearancePresetOf = (grade: ClearanceGrade): ClearancePreset => PRESETS[grade];
