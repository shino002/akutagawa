import type { DiaryEntry } from "@/lib/types";

/**
 * 빈 일기 편집 draft를 만듭니다. 날짜는 오늘(YYYY-MM-DD)로 채웁니다.
 */
export const createBlankDiaryEntry = (): DiaryEntry => {
  return {
    id: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    body: "",
  };
};
