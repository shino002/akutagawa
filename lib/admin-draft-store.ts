/**
 * 관리자 draft 상태를 여러 컴포넌트/훅 호출부가 공유하기 위한 초경량 스토어입니다.
 * (사이드바 목록 + 본문 편집기 + history 복원이 같은 activeId/draft를 봅니다.)
 */
export const createAdminDraftStore = <T,>(initial: T) => {
  let state = initial;
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => state;

  const setState = (updater: T | ((prev: T) => T)) => {
    const next = typeof updater === "function" ? (updater as (prev: T) => T)(state) : updater;
    state = next;
    emit();
  };

  return {
    subscribe,
    getSnapshot,
    setState,
  };
};
