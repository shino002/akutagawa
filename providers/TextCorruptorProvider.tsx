"use client";

import { type ReactNode } from "react";

interface TextCorruptorProviderProps {
  children: ReactNode;
}

/**
 * 전역 텍스트 글리치 효과는 모든 텍스트 노드를 수집하고 감시해서 자료가 많을 때 렉을 만들 수 있습니다.
 * 분위기는 CSS 질감으로 유지하고, 공개 화면 성능을 위해 현재는 no-op으로 둡니다.
 */
export function TextCorruptorProvider({ children }: TextCorruptorProviderProps) {
  return <>{children}</>;
}
