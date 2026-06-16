"use client";

import { useSyncExternalStore } from "react";
import { collection, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { GuestbookEntry } from "@/lib/types";

type GuestbookState = {
  data: GuestbookEntry[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: GuestbookState = { data: [], error: null };

let state: GuestbookState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: GuestbookState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;
  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    collection(db, "guestbook"),
    (snapshot) => {
      const nextData = snapshot.docs
        .map((guestDoc) => {
          const data = guestDoc.data() as Partial<GuestbookEntry>;
          return {
            id: data.id || guestDoc.id,
            name: data.name || "익명",
            body: data.body || "",
            reply: data.reply || "",
            createdAtMillis: typeof data.createdAtMillis === "number" ? data.createdAtMillis : 0,
          };
        })
        .filter((entry) => entry.body)
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      emit({ data: nextData, error: null });
    },
    (firestoreError) => {
      emit({ data: state.data, error: `방명록 불러오기 실패: ${firestoreError.message}` });
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

const getSnapshot = (): GuestbookState => state;
const getServerSnapshot = (): GuestbookState => EMPTY_STATE;

/**
 * Firestore의 `guestbook` 컬렉션 싱글톤 구독을 읽습니다.
 * 본문이 빈 항목은 제외하고 최신순으로 정렬됩니다.
 */
export const useGuestbook = (): GuestbookState => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
