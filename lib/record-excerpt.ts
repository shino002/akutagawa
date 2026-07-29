import { splitStoryParagraphs } from "@/lib/story-text";

/**
 * 열람판(記録閲覧台)에 실을 최대 분량.
 * 이 선을 넘으면 뒷부분은 별지로 넘기고 「전문 열람」이 붙습니다.
 */
export const PLATE_BODY_LIMIT = 620;

/** 한 문단만으로 한도를 넘길 때, 문단 안에서 끊어도 될 만큼 긴지 판단하는 여유폭 */
const SINGLE_PARAGRAPH_SLACK = 1.25;

/** 문장이 끝나는 자리 — 여기서 끊어야 말이 잘리지 않습니다 */
const SENTENCE_END = /[.!?。！？…]["'”’)\]』」]?\s/g;

export type PlateExcerpt = {
  /** 열람판에 실을 문단 */
  paragraphs: string[];
  /** 별지로 넘어간 문단 수 (문단 중간에서 끊었으면 그 문단도 셉니다) */
  hiddenParagraphs: number;
  truncated: boolean;
};

const emptyExcerpt: PlateExcerpt = {
  paragraphs: [],
  hiddenParagraphs: 0,
  truncated: false,
};

/**
 * 문단 안에서 끊어야 할 때, 한도 앞의 마지막 문장 끝을 찾습니다.
 * 문장 끝이 너무 앞이면(=한 문장이 통째로 길면) 그냥 한도에서 자릅니다.
 */
function cutAtSentence(paragraph: string, limit: number): string {
  const window = paragraph.slice(0, limit);
  let cut = -1;

  SENTENCE_END.lastIndex = 0;
  for (let match = SENTENCE_END.exec(window); match; match = SENTENCE_END.exec(window)) {
    cut = match.index + match[0].trimEnd().length;
  }

  // 한도의 절반도 못 채우는 자리라면 문장 경계를 포기합니다
  if (cut < limit * 0.5) {
    cut = limit;
  }

  return `${paragraph.slice(0, cut).trimEnd()}…`;
}

/**
 * 본문을 열람판 몫과 별지 몫으로 가릅니다.
 * 문단 경계에서 끊는 것을 기본으로 하되, 첫 문단 하나만으로 한도를 크게 넘으면
 * 그 문단 안에서 문장 단위로 끊습니다 (아무것도 안 보이는 것보다 낫습니다).
 */
export function excerptForPlate(body: string, limit: number = PLATE_BODY_LIMIT): PlateExcerpt {
  const paragraphs = splitStoryParagraphs(body);
  if (paragraphs.length === 0) {
    return emptyExcerpt;
  }

  const total = paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
  if (total <= limit) {
    return { paragraphs, hiddenParagraphs: 0, truncated: false };
  }

  const shown: string[] = [];
  let used = 0;

  for (const paragraph of paragraphs) {
    if (shown.length > 0 && used + paragraph.length > limit) {
      break;
    }
    shown.push(paragraph);
    used += paragraph.length;
  }

  // 첫 문단 하나로 한도를 크게 넘겼다면 그 문단 안에서 끊습니다
  if (shown.length === 1 && shown[0].length > limit * SINGLE_PARAGRAPH_SLACK) {
    return {
      paragraphs: [cutAtSentence(shown[0], limit)],
      hiddenParagraphs: paragraphs.length,
      truncated: true,
    };
  }

  return {
    paragraphs: shown,
    hiddenParagraphs: paragraphs.length - shown.length,
    truncated: true,
  };
}
