"use client";

import { useSyncExternalStore } from "react";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { defaultExtractContent } from "@/constants/home";
import { getFirebaseDb } from "@/lib/firebase";
import { normalizePersonalHomeBanners } from "@/lib/personal-home-banners";
import type { ExtractContent } from "@/lib/types";

type ExtractContentRaw = Partial<ExtractContent>;

type ExtractContentState = {
  data: ExtractContentRaw;
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: ExtractContentState = { data: {}, error: null };

let state: ExtractContentState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: ExtractContentState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;
  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    doc(db, "site", "extract"),
    (snapshot) => {
      const data = (snapshot.data() as ExtractContentRaw | undefined) ?? {};
      emit({ data, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `갠홈 배너 불러오기 실패: ${firestoreError.message}` });
    },
  );
};

const stop = () => {
  unsubscribe?.();
  unsubscribe = null;
  state = EMPTY_STATE;
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  if (listeners.size === 1) start();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
};

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY_STATE;

type ExtractContentResult = {
  content: ExtractContent;
  error: string | null;
};

/**
 * Firestore의 `site/extract` 문서 싱글톤 구독을 읽습니다.
 */
export const useExtractContent = (fallback = defaultExtractContent): ExtractContentResult => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    content: {
      banners: normalizePersonalHomeBanners(snapshot.data.banners ?? fallback.banners),
    },
    error: snapshot.error,
  };
};
