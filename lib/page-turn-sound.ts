/** CC0 page-turn sample (AardsReal via Freesound preview). */
const PAGE_TURN_SRC = "/audio/page-turn.mp3";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 짧은 책장 넘김 효과음. 이북 리더 열기·닫기 등에 사용합니다.
 */
export function playPageTurnSound() {
  if (prefersReducedMotion() || typeof window === "undefined") return;

  const audio = new Audio(PAGE_TURN_SRC);
  audio.volume = 0.72;
  void audio.play().catch(() => {
    // 브라우저 자동재생 정책 등으로 실패할 수 있음 — 조용히 무시
  });
}
