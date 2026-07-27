"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { MAX_AUDIO_UPLOAD_SIZE } from "@/constants/upload";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import {
  bgmTrackDraftFromTrack,
  createBlankBgmTrackDraft,
  type BgmTrackDraft,
} from "@/lib/bgm-catalog";
import { getFirebaseDb } from "@/lib/firebase";
import type { BgmTrack } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type UseBgmTrackAdminOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
};

/**
 * 관리자 BGM 트랙 편집 상태입니다.
 * 목록 읽기는 useBgmCatalog(읽기 전용 싱글톤)를 재사용하고, draft만 로컬로 둡니다.
 */
export const useBgmTrackAdmin = ({ isAdmin, onNotice, setIsSaving }: UseBgmTrackAdminOptions) => {
  const { tracks: bgmTracks, error: bgmError } = useBgmCatalog();
  const [activeBgmTrackId, setActiveBgmTrackId] = useState("");
  const [bgmTrackDraft, setBgmTrackDraft] = useState<BgmTrackDraft>(() =>
    createBlankBgmTrackDraft(),
  );
  const [bgmAudioFile, setBgmAudioFile] = useState<File | null>(null);
  const bgmTracksRef = useRef(bgmTracks);
  bgmTracksRef.current = bgmTracks;

  useEffect(() => {
    if (bgmError) {
      onNotice(bgmError);
    }
  }, [bgmError, onNotice]);

  useEffect(() => {
    setActiveBgmTrackId((current) => {
      if (current) return current;
      const firstTrack = bgmTracks[0];
      if (firstTrack) {
        setBgmTrackDraft(bgmTrackDraftFromTrack(firstTrack));
        return firstTrack.id;
      }
      return "";
    });
  }, [bgmTracks]);

  const startNewBgmTrack = () => {
    setActiveBgmTrackId("");
    setBgmTrackDraft(createBlankBgmTrackDraft());
    setBgmAudioFile(null);
    onNotice("새 BGM을 추가해주세요.");
  };

  const selectBgmTrack = (track: BgmTrack) => {
    setActiveBgmTrackId(track.id);
    setBgmTrackDraft(bgmTrackDraftFromTrack(track));
    setBgmAudioFile(null);
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
      onNotice("관리자만 BGM을 저장할 수 있어요.");
      return;
    }

    const label = bgmTrackDraft.label.trim();

    if (!label) {
      onNotice("BGM 이름을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      let url = bgmTrackDraft.url.trim();

      if (bgmAudioFile) {
        url = await uploadBgmAudio(bgmAudioFile, label);
      }

      if (!url) {
        onNotice("BGM 파일을 업로드해주세요.");
        return;
      }

      const id = slugifyId(bgmTrackDraft.id || label) || crypto.randomUUID();
      const nextTrack: BgmTrack = {
        id,
        label,
        url,
        scope: bgmTrackDraft.scope,
      };
      const nextTracks = bgmTracks.some((track) => track.id === id)
        ? bgmTracks.map((track) => (track.id === id ? nextTrack : track))
        : [...bgmTracks, nextTrack];

      await persistBgmTracks(nextTracks);
      setActiveBgmTrackId(id);
      setBgmTrackDraft(bgmTrackDraftFromTrack(nextTrack));
      setBgmAudioFile(null);
      onNotice("BGM을 저장했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "BGM 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBgmTrack = async (track: BgmTrack) => {
    if (!isAdmin) {
      onNotice("관리자만 BGM을 삭제할 수 있어요.");
      return;
    }

    if (!track.id) {
      onNotice("삭제할 BGM을 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
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
      setActiveBgmTrackId("");
      setBgmTrackDraft(createBlankBgmTrackDraft());
      setBgmAudioFile(null);
      onNotice("BGM을 삭제했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "BGM 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBgmAudioChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!/\.(mp3|mpeg|ogg|wav|m4a|aac)$/i.test(file.name) && !file.type.startsWith("audio/")) {
      onNotice("mp3, ogg, wav, m4a, aac 오디오만 업로드할 수 있어요.");
      return;
    }

    setBgmAudioFile(file);
    if (!bgmTrackDraft.label.trim()) {
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
    onNotice(`「${label}」을(를) 캐릭터 BGM으로 추가했어요.`);
    return url;
  };

  return {
    bgmTracks,
    bgmTracksRef,
    activeBgmTrackId,
    setActiveBgmTrackId,
    bgmTrackDraft,
    setBgmTrackDraft,
    bgmAudioFile,
    setBgmAudioFile,
    startNewBgmTrack,
    selectBgmTrack,
    saveBgmTrack,
    deleteBgmTrack,
    handleBgmAudioChange,
    quickAddCharacterBgm,
  };
};
