"use client";

import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { MAX_AUDIO_UPLOAD_SIZE } from "@/constants/upload";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import {
  bgmTrackDraftFromTrack,
  createBlankBgmTrackDraft,
  type BgmTrackDraft,
} from "@/lib/bgm-catalog";
import { createAdminDraftStore } from "@/lib/admin-draft-store";
import { getFirebaseDb } from "@/lib/firebase";
import type { BgmTrack } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type BgmTrackAdminState = {
  activeId: string;
  draft: BgmTrackDraft;
  audioFile: File | null;
  isSaving: boolean;
  notice: string;
};

const bgmTrackStore = createAdminDraftStore<BgmTrackAdminState>({
  activeId: "",
  draft: createBlankBgmTrackDraft(),
  audioFile: null,
  isSaving: false,
  notice: "",
});

type UseBgmTrackAdminOptions = {
  isAdmin?: boolean;
  onNotice?: (message: string) => void;
  setIsSaving?: (value: boolean) => void;
};

/**
 * 관리자 BGM 트랙 편집 상태입니다.
 * 목록 읽기는 useBgmCatalog 싱글톤을 재사용하고,
 * activeId/draft/audioFile/isSaving/notice 는 createAdminDraftStore 로 공유합니다.
 */
export const useBgmTrackAdmin = (options: UseBgmTrackAdminOptions = {}) => {
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = options.isAdmin ?? authIsAdmin;
  const { tracks: bgmTracks, error: bgmError } = useBgmCatalog();
  const state = useSyncExternalStore(
    bgmTrackStore.subscribe,
    bgmTrackStore.getSnapshot,
    bgmTrackStore.getSnapshot,
  );
  const bgmTracksRef = useRef(bgmTracks);
  useEffect(() => {
    bgmTracksRef.current = bgmTracks;
  }, [bgmTracks]);

  const emitNotice = (message: string) => {
    bgmTrackStore.setState((current) => ({ ...current, notice: message }));
    options.onNotice?.(message);
  };

  const setSaving = (value: boolean) => {
    bgmTrackStore.setState((current) => ({ ...current, isSaving: value }));
    options.setIsSaving?.(value);
  };

  useEffect(() => {
    const current = bgmTrackStore.getSnapshot();
    if (current.activeId) return;
    const firstTrack = bgmTracks[0];
    if (!firstTrack) return;
    bgmTrackStore.setState({
      ...current,
      activeId: firstTrack.id,
      draft: bgmTrackDraftFromTrack(firstTrack),
    });
  }, [bgmTracks]);

  const setActiveBgmTrackId: Dispatch<SetStateAction<string>> = (updater) => {
    bgmTrackStore.setState((current) => ({
      ...current,
      activeId: typeof updater === "function" ? updater(current.activeId) : updater,
    }));
  };

  const setBgmTrackDraft: Dispatch<SetStateAction<BgmTrackDraft>> = (updater) => {
    bgmTrackStore.setState((current) => ({
      ...current,
      draft: typeof updater === "function" ? updater(current.draft) : updater,
    }));
  };

  const setBgmAudioFile: Dispatch<SetStateAction<File | null>> = (updater) => {
    bgmTrackStore.setState((current) => ({
      ...current,
      audioFile: typeof updater === "function" ? updater(current.audioFile) : updater,
    }));
  };

  const startNewBgmTrack = () => {
    bgmTrackStore.setState((current) => ({
      ...current,
      activeId: "",
      draft: createBlankBgmTrackDraft(),
      audioFile: null,
      notice: "새 BGM을 추가해주세요.",
    }));
    options.onNotice?.("새 BGM을 추가해주세요.");
  };

  const selectBgmTrack = (track: BgmTrack) => {
    bgmTrackStore.setState((current) => ({
      ...current,
      activeId: track.id,
      draft: bgmTrackDraftFromTrack(track),
      audioFile: null,
    }));
  };

  const uploadBgmAudio = async (file: File, displayName = "") => {
    if (file.size > MAX_AUDIO_UPLOAD_SIZE) {
      throw new Error(`${file.name}은 15MB를 넘어서 업로드할 수 없어요.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("displayName", displayName);

    const response = await fetch("/api/r2-upload-audio", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as {
      error?: string;
      url?: string | null;
    };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "BGM 업로드에 실패했어요.");
    }

    return result.url;
  };

  const persistBgmTracks = async (nextTracks: BgmTrack[]) => {
    await setDoc(
      doc(getFirebaseDb(), "site", "bgm"),
      {
        tracks: nextTracks,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const saveBgmTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      emitNotice("관리자만 BGM을 저장할 수 있어요.");
      return;
    }

    const label = state.draft.label.trim();

    if (!label) {
      emitNotice("BGM 이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      let url = state.draft.url.trim();

      if (state.audioFile) {
        url = await uploadBgmAudio(state.audioFile, label);
      }

      if (!url) {
        emitNotice("BGM 파일을 업로드해주세요.");
        return;
      }

      const id = slugifyId(state.draft.id || label) || crypto.randomUUID();
      const nextTrack: BgmTrack = {
        id,
        label,
        url,
        scope: state.draft.scope,
      };
      const nextTracks = bgmTracks.some((track) => track.id === id)
        ? bgmTracks.map((track) => (track.id === id ? nextTrack : track))
        : [...bgmTracks, nextTrack];

      await persistBgmTracks(nextTracks);
      bgmTrackStore.setState((current) => ({
        ...current,
        activeId: id,
        draft: bgmTrackDraftFromTrack(nextTrack),
        audioFile: null,
        notice: "BGM을 저장했어요.",
      }));
      options.onNotice?.("BGM을 저장했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "BGM 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBgmTrack = async (track: BgmTrack) => {
    if (!isAdmin) {
      emitNotice("관리자만 BGM을 삭제할 수 있어요.");
      return;
    }

    if (!track.id) {
      emitNotice("삭제할 BGM을 찾지 못했어요.");
      return;
    }

    try {
      setSaving(true);
      if (track.url.startsWith("http")) {
        const response = await fetch("/api/r2-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [{ url: track.url }] }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Cloudflare R2 삭제에 실패했어요.");
        }
      }

      const nextTracks = bgmTracks.filter((entry) => entry.id !== track.id);
      await persistBgmTracks(nextTracks);
      bgmTrackStore.setState((current) => ({
        ...current,
        activeId: "",
        draft: createBlankBgmTrackDraft(),
        audioFile: null,
        notice: "BGM을 삭제했어요.",
      }));
      options.onNotice?.("BGM을 삭제했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "BGM 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleBgmAudioChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!/\.(mp3|mpeg|ogg|wav|m4a|aac)$/i.test(file.name) && !file.type.startsWith("audio/")) {
      emitNotice("mp3, ogg, wav, m4a, aac 오디오만 업로드할 수 있어요.");
      return;
    }

    setBgmAudioFile(file);
    if (!state.draft.label.trim()) {
      setBgmTrackDraft((current) => ({
        ...current,
        label: file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  };

  const quickAddCharacterBgm = async (file: File) => {
    const label = file.name.replace(/\.[^/.]+$/, "");
    const url = await uploadBgmAudio(file, label);
    const id = slugifyId(label) || crypto.randomUUID();
    const nextTrack: BgmTrack = {
      id,
      label,
      url,
      scope: "character-only",
    };
    const nextTracks = bgmTracks.some((track) => track.url === url)
      ? bgmTracks
      : bgmTracks.some((track) => track.id === id)
        ? bgmTracks.map((track) => (track.id === id ? nextTrack : track))
        : [...bgmTracks, nextTrack];

    await persistBgmTracks(nextTracks);
    emitNotice(`「${label}」을(를) 캐릭터 BGM으로 추가했어요.`);
    return url;
  };

  return {
    bgmTracks,
    bgmTracksRef,
    activeBgmTrackId: state.activeId,
    setActiveBgmTrackId,
    bgmTrackDraft: state.draft,
    setBgmTrackDraft,
    bgmAudioFile: state.audioFile,
    setBgmAudioFile,
    isSaving: state.isSaving,
    notice: bgmError || state.notice,
    startNewBgmTrack,
    selectBgmTrack,
    saveBgmTrack,
    deleteBgmTrack,
    handleBgmAudioChange,
    quickAddCharacterBgm,
  };
};
