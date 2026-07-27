"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appHistoryStatesEqual,
  buildAppHistoryUrl,
  createAppHistoryState,
  parseAppHistoryState,
  readAppHistoryStateFromUrl,
} from "@/lib/app-history";
import type { AppHistoryState } from "@/types/home.types";

type UseAppHistoryNavigationOptions = {
  state: AppHistoryState;
  /** 상태만 반영 (초기 URL hydrate 포함) */
  applyState: (state: AppHistoryState) => void;
  /**
   * browser history 복원(popstate) 전용.
   * 없으면 applyState 를 쓰되, onBackNavigate 로 방향을 표시합니다.
   */
  applyHistoryRestore?: (state: AppHistoryState) => void;
  /** goBack() 직전 — 전환 방향 플래그용 */
  onBackNavigate?: () => void;
};

/**
 * SPA 화면 전환을 browser history와 동기화합니다.
 * 뒤로가기(브라우저·앱 버튼) 시 직전 화면으로 복원됩니다.
 */
export const useAppHistoryNavigation = ({
  state,
  applyState,
  applyHistoryRestore,
  onBackNavigate,
}: UseAppHistoryNavigationOptions) => {
  const depthRef = useRef(1);
  const skipPushRef = useRef(false);
  const mountedRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const syncCanGoBack = useCallback(() => {
    setCanGoBack(depthRef.current > 1);
  }, []);

  useEffect(() => {
    const restore = applyHistoryRestore ?? applyState;

    const handlePopState = (event: PopStateEvent) => {
      skipPushRef.current = true;
      depthRef.current = Math.max(1, depthRef.current - 1);
      syncCanGoBack();

      const parsed = parseAppHistoryState(event.state);
      if (parsed) {
        restore(parsed);
        return;
      }

      restore(createAppHistoryState({ section: "home" }));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyHistoryRestore, applyState, syncCanGoBack]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      const fromUrl = readAppHistoryStateFromUrl(window.location.search);
      if (fromUrl) {
        skipPushRef.current = true;
        applyState(fromUrl);
        window.history.replaceState(fromUrl, "", buildAppHistoryUrl(fromUrl));
      } else {
        window.history.replaceState(state, "", buildAppHistoryUrl(state));
      }
      syncCanGoBack();
      return;
    }

    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }

    const current = parseAppHistoryState(window.history.state);
    if (current && appHistoryStatesEqual(current, state)) {
      return;
    }

    const url = buildAppHistoryUrl(state);
    window.history.pushState(state, "", url);
    depthRef.current += 1;
    syncCanGoBack();
  }, [state, syncCanGoBack, applyState]);

  const goBack = useCallback(() => {
    if (depthRef.current <= 1) {
      return false;
    }

    onBackNavigate?.();
    window.history.back();
    return true;
  }, [onBackNavigate]);

  return {
    canGoBack,
    goBack,
  };
};
