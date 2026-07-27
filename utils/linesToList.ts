/**
 * 줄바꿈으로 구분된 텍스트를 트림된 비어 있지 않은 문자열 배열로 바꿉니다.
 */
export const linesToList = (value: string): string[] => {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};
