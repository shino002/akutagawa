"use client";

import { useSyncExternalStore } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { DiaryEntry } from "@/lib/types";

type DiaryEntriesState = {
  data: DiaryEntry[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: DiaryEntriesState = { data: [], error: null };

let state: DiaryEntriesState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: DiaryEntriesState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;
  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    collection(db, "diaryEntries"),
    (snapshot) => {
      const nextData = snapshot.docs
        .map((diaryDoc) => {
          const data = diaryDoc.data() as Partial<DiaryEntry>;
          return {
            id: data.id || diaryDoc.id,
            title: data.title || "",
            date: data.date || "",
            body: data.body || "",
          };
        })
        .filter((entry) => entry.title || entry.body)
        .sort((a, b) => b.date.localeCompare(a.date));
      emit({ data: nextData, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `다이어리 불러오기 실패: ${firestoreError.message}` });
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

const getSnapshot = (): DiaryEntriesState => state;
const getServerSnapshot = (): DiaryEntriesState => EMPTY_STATE;

/**
 * Firestore의 `diaryEntries` 컬렉션 싱글톤 구독을 읽습니다.
 * 빈 일기는 제외하고 날짜 내림차순으로 정렬됩니다.
 */
export const useDiaryEntries = (): DiaryEntriesState => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
