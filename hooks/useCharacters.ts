"use client";

import { useSyncExternalStore } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Character } from "@/lib/types";
import { normalizeWorldEntries, normalizeWorks } from "@/utils/normalizers";

type CharactersState = {
  data: Character[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: CharactersState = { data: [], error: null };

let state: CharactersState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: CharactersState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;
  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    collection(db, "characters"),
    (snapshot) => {
      const nextData = snapshot.docs.map((characterDoc) => {
        const data = characterDoc.data() as Character;
        return {
          ...data,
          id: data.id || characterDoc.id,
          works: normalizeWorks(data.works),
          settings: Array.isArray(data.settings) ? data.settings : [],
          relationships: Array.isArray(data.relationships) ? data.relationships : [],
          images: Array.isArray(data.images) ? data.images : [],
          worldEntries: normalizeWorldEntries(data.worldEntries),
        };
      });
      emit({ data: nextData, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `Firestore 불러오기 실패: ${firestoreError.message}` });
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

const getSnapshot = (): CharactersState => state;
const getServerSnapshot = (): CharactersState => EMPTY_STATE;

/**
 * Firestore의 `characters` 컬렉션 싱글톤 구독을 읽습니다.
 * 첫 번째 호출 시 구독을 시작하고, 마지막 구독자가 사라지면 정리합니다.
 * 여러 컴포넌트가 동시에 호출해도 Firestore 구독은 1개만 유지됩니다.
 */
export const useCharacters = (): CharactersState => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
