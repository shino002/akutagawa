/**
 * 바이트 수를 사람이 읽기 쉬운 단위(B / KB / MB) 문자열로 변환합니다.
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};
