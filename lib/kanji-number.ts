const KANJI_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/**
 * 1~99 를 한자 수사로. 조서의 항번호(第三項)에 씁니다.
 * 범위를 벗어나면 숫자를 그대로 돌려줍니다.
 */
export const toKanjiNumber = (value: number): string => {
  if (!Number.isFinite(value) || value < 1 || value > 99) {
    return String(value);
  }

  const n = Math.floor(value);
  if (n < 10) {
    return KANJI_DIGITS[n];
  }

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 1 ? "十" : `${KANJI_DIGITS[tens]}十`;
  return ones === 0 ? tensPart : `${tensPart}${KANJI_DIGITS[ones]}`;
};
