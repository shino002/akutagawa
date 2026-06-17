"use client";

import { useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getMergedCharacterBgmOptions, getMergedSiteBgmPlaylist, normalizeBgmTracks, setDynamicBgmUrls } from "@/lib/bgm-catalog";
import { getFirebaseDb } from "@/lib/firebase";
import type { BgmContent, BgmTrack } from "@/lib/types";

type BgmContentRaw = Partial<BgmContent>;

type BgmCatalogState = {
  tracks: BgmTrack[];
  error: string | null;
};

type Listener = () => void;

const EMPTY_STATE: BgmCatalogState = { tracks: [], error: null };

let state: BgmCatalogState = EMPTY_STATE;
let unsubscribe: Unsubscribe | null = null;
const listeners = new Set<Listener>();

const emit = (next: BgmCatalogState) => {
  state = next;
  setDynamicBgmUrls(next.tracks.map((track) => track.url));
  listeners.forEach((listener) => listener());
};

const start = () => {
  if (unsubscribe) return;

  const db = getFirebaseDb();
  unsubscribe = onSnapshot(
    doc(db, "site", "bgm"),
    (snapshot) => {
      const data = (snapshot.data() as BgmContentRaw | undefined) ?? {};
      emit({
        tracks: normalizeBgmTracks(data.tracks),
        error: null,
      });
    },
    (firestoreError) => {
      emit({
        tracks: state.tracks,
        error: `BGM 목록 불러오기 실패: ${firestoreError.message}`,
      });
    },
  );
};

const stop = () => {
  unsubscribe?.();
  unsubscribe = null;
  state = EMPTY_STATE;
  setDynamicBgmUrls([]);
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

export function useBgmCatalog() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    setDynamicBgmUrls(snapshot.tracks.map((track) => track.url));
  }, [snapshot.tracks]);

  const sitePlaylist = useMemo(
    () => getMergedSiteBgmPlaylist(snapshot.tracks),
    [snapshot.tracks],
  );
  const characterOptions = useMemo(
    () => getMergedCharacterBgmOptions(snapshot.tracks),
    [snapshot.tracks],
  );

  return {
    tracks: snapshot.tracks,
    sitePlaylist,
    characterOptions,
    error: snapshot.error,
  };
}
