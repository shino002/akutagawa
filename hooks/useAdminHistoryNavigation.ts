"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminHistoryStatesEqual,
  buildAdminHistoryUrl,
  createAdminHistoryState,
  parseAdminHistoryState,
  readAdminHistoryStateFromUrl,
} from "@/lib/admin-history";
import type { AdminHistoryState } from "@/types/admin.types";

type UseAdminHistoryNavigationOptions = {
  enabled: boolean;
  state: AdminHistoryState;
  applyState: (state: AdminHistoryState) => void;
};

/**
 * 관리자 SPA 화면 전환을 browser history와 동기화합니다.
 * 뒤로가기(브라우저) 시 직전 화면으로 복원됩니다.
 */
export const useAdminHistoryNavigation = ({
  enabled,
  state,
  applyState,
}: UseAdminHistoryNavigationOptions) => {
  const depthRef = useRef(1);
  const skipPushRef = useRef(false);
  const mountedRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const syncCanGoBack = useCallback(() => {
    setCanGoBack(depthRef.current > 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePopState = (event: PopStateEvent) => {
      skipPushRef.current = true;
      depthRef.current = Math.max(1, depthRef.current - 1);
      syncCanGoBack();

      const parsed = parseAdminHistoryState(event.state);
      if (parsed) {
        applyState(parsed);
        return;
      }

      applyState(createAdminHistoryState({ panel: "categories" }));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyState, enabled, syncCanGoBack]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      const fromUrl = readAdminHistoryStateFromUrl(window.location.search);
      if (fromUrl) {
        skipPushRef.current = true;
        queueMicrotask(() => {
          applyState(fromUrl);
        });
        window.history.replaceState(fromUrl, "", buildAdminHistoryUrl(fromUrl));
      } else {
        window.history.replaceState(state, "", buildAdminHistoryUrl(state));
      }
      syncCanGoBack();
      return;
    }

    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }

    const current = parseAdminHistoryState(window.history.state);
    if (current && adminHistoryStatesEqual(current, state)) {
      return;
    }

    const url = buildAdminHistoryUrl(state);
    window.history.pushState(state, "", url);
    depthRef.current += 1;
    syncCanGoBack();
  }, [state, syncCanGoBack, applyState, enabled]);

  const goBack = useCallback(() => {
    if (depthRef.current <= 1) {
      return false;
    }

    window.history.back();
    return true;
  }, []);

  return {
    canGoBack,
    goBack,
  };
};
