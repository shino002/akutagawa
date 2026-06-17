import type { ProfileField } from "@/lib/types";
import { createDefaultProfileFields } from "@/lib/profile-fields";

/** 예전 고정 종류 값 → 표시/입력용 한글 라벨 */
const LEGACY_ENTRY_KIND_LABELS: Record<string, string> = {
  character: "",
  item: "물건",
  ability: "능력",
  place: "장소",
};

export type SubPageEntryCopy = {
  titleLabel: string;
  titlePlaceholder: string;
  kanjiLabel: string;
  kanjiPlaceholder: string;
  subtitleLabel: string;
  subtitlePlaceholder: string;
  quoteLabel: string;
  quotePlaceholder: string;
  classificationPlaceholder: string;
  statusTagsPlaceholder: string;
  recordBoxHint: string;
};

const DEFAULT_SUB_PAGE_ENTRY_COPY: SubPageEntryCopy = {
  titleLabel: "이름",
  titlePlaceholder: "상세 페이지 제목",
  kanjiLabel: "한자·원어 표기",
  kanjiPlaceholder: "예: 芥川",
  subtitleLabel: "한 줄 소개",
  subtitlePlaceholder: "카드에 보일 짧은 소개",
  quoteLabel: "대표 문장",
  quotePlaceholder: "상세에 보일 핵심 문장·메모",
  classificationPlaceholder: "예: 개인 기록 / 세계관 관련 / 비밀 파일",
  statusTagsPlaceholder: "예: 관찰중\n기록 불완전\n비공개 기록",
  recordBoxHint: "설정, 특징, 배경 등 상세 내용을 레코드 박스로 추가하세요.",
};

export function normalizeSubPageEntryLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return LEGACY_ENTRY_KIND_LABELS[trimmed] ?? trimmed;
}

export function getSubPageEntryCopy(): SubPageEntryCopy {
  return DEFAULT_SUB_PAGE_ENTRY_COPY;
}

export function getSubPageEntryKicker(entryLabel: string) {
  const trimmedLabel = entryLabel.trim();
  if (!trimmedLabel) {
    return "Private Archive / Sub Record";
  }

  return `Private Archive / ${trimmedLabel}`;
}

export function createDefaultProfileFieldsForSubPage(): ProfileField[] {
  return createDefaultProfileFields();
}

export function formatSubPageEntryTitle(title: string, entryLabel: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "제목 없음";
  }

  const trimmedLabel = entryLabel.trim();
  if (!trimmedLabel) {
    return trimmedTitle;
  }

  return `${trimmedTitle} (${trimmedLabel})`;
}
