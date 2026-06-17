/**
 * 노션 등에서 쓰는 방식: 문자를 바꾸지 않고 기호·이모지 폰트 폴백으로 표시한다.
 * CSS 변수 --font-ui-stack / --font-emoji-stack 과 같은 순서를 유지한다.
 */
export const UI_FONT_STACK =
  '"Noto Sans KR", "Noto Sans Symbols 2", "Segoe UI Symbol", "Apple Symbols", "Malgun Gothic", "Apple SD Gothic Neo", ui-sans-serif, system-ui, sans-serif';

export const EMOJI_FONT_STACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

/** 배경 글리치(TextCorruptor)용 — 본문 폰트와 섞이기 쉬운 ASCII만 */
export const TEXT_CORRUPTOR_CHARS = ["0", "1", "/", "\\", "_", "-", "#", "?", "!", "."] as const;

const COMBINING_MARK = /\p{M}/gu;
const HAS_COMBINING_MARK = /\p{M}/u;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** 본문·참조 단어용 — 합성 문자 제거(레이아웃 보호) */
export function sanitizePlainText(text: string): string {
  if (!text) {
    return text;
  }

  return text
    .normalize("NFKC")
    .replace(COMBINING_MARK, "")
    .replace(CONTROL_CHARS, "")
    .replace(/\u00B7/g, "");
}

/** @deprecated sanitizePlainText */
export function sanitizeGlitchText(text: string): string {
  return sanitizePlainText(text);
}

/** 오류 메시지용 — 합성 문자는 유지, 제어문자만 제거 */
export function sanitizeErrorMessageText(text: string): string {
  if (!text) {
    return text;
  }

  return text.normalize("NFKC").replace(CONTROL_CHARS, "").replace(/\u00B7/g, "");
}

export function hasCombiningMarks(text: string): boolean {
  return HAS_COMBINING_MARK.test(text);
}

export function glitchTextWasSanitized(before: string, after: string): boolean {
  return before !== after;
}
