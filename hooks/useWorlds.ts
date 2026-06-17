"use client";

import { useSyncExternalStore } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { World } from "@/lib/types";
import { normalizeTextGlitch } from "@/lib/normalize-text-glitch";

type WorldsState = {
  data: World[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: WorldsState = { data: [], error: null };

let state: WorldsState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: WorldsState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;
  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    collection(db, "worlds"),
    (snapshot) => {
      const nextData = snapshot.docs
        .map((worldDoc) => {
          const data = worldDoc.data() as Partial<World>;
          return {
            id: data.id || worldDoc.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            description: data.description || "",
            password: data.password?.trim() ?? "",
            textGlitch: normalizeTextGlitch(data.textGlitch),
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
      emit({ data: nextData, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `세계관 불러오기 실패: ${firestoreError.message}` });
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

const getSnapshot = (): WorldsState => state;
const getServerSnapshot = (): WorldsState => EMPTY_STATE;

/**
 * Firestore의 `worlds` 컬렉션 싱글톤 구독을 읽습니다.
 * 결과는 title 기준 가나다순으로 정렬됩니다.
 */
export const useWorlds = (): WorldsState => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
