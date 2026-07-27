"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GlitchTextSelection } from "@/lib/glitch-selection";

type GlitchAnchorElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

/**
 * 캐릭터/세계관 글리치 필드 편집 UI 상태를 한 인스턴스씩 관리합니다.
 * 두 번 호출해도 서로 간섭하지 않도록 path·selection·anchor·ref를 인스턴스마다 둡니다.
 */
export const useGlitchFieldEditing = () => {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [selection, setSelection] = useState<GlitchTextSelection | null>(null);
  const [anchorElement, setAnchorElement] = useState<GlitchAnchorElement | null>(null);
  const anchorRef = useRef<GlitchAnchorElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    anchorRef.current = anchorElement;
  }, [anchorElement]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setActivePath(null);
    setSelection(null);
    setAnchorElement(null);
  }, []);

  const selectPath = useCallback((path: string) => {
    setActivePath(path);
    setSelection(null);
    setAnchorElement(null);
  }, []);

  return {
    activePath,
    setActivePath,
    selection,
    setSelection,
    anchorElement,
    setAnchorElement,
    reset,
    selectPath,
    anchorRef,
    mountedRef,
  };
};
