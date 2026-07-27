/**
 * 글리치 편집 중인지에 따라 입력 필드 className을 고릅니다.
 * 활성 path와 같으면 강조 테두리·링을 붙입니다.
 */
export const glitchFieldClass = (
  path: string,
  activePath: string | null,
  baseClass = "auth-input",
): string => {
  return activePath === path
    ? `${baseClass} border-amber-300/50 ring-1 ring-amber-300/40`
    : baseClass;
};
