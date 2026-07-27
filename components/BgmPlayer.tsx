"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_BGM_PLAYLIST } from "@/lib/bgm-playlist";
import { useBgmCatalog } from "@/hooks/useBgmCatalog";
import { useAuthUser } from "@/hooks/useAuth";
import { useBgmVolumePreference } from "@/hooks/useBgmVolumePreference";

const PROGRESS_INTERVAL_MS = 1000;
const ERROR_TITLE_CHARS = [
  "E",
  "R",
  "O",
  "M",
  "S",
  "G",
  "0",
  "1",
  "@",
  "/",
  "\\",
  "_",
  "-",
  "#",
  "?",
  "!",
  ".",
  ":",
];
const INITIAL_TRACK = {
  index: 0,
  title: "@/1_SIGNAL_LOST",
};

interface BgmPlayerProps {
  /** 캐릭터 상세 보기일 때 재생할 전용 트랙 URL */
  characterBgmUrl?: string | null;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function createErrorTitle(trackIndex: number) {
  const length = 8 + Math.floor(Math.random() * 14);
  const body = Array.from(
    { length },
    () => ERROR_TITLE_CHARS[Math.floor(Math.random() * ERROR_TITLE_CHARS.length)],
  ).join("");

  return `@/${trackIndex + 1}_${body}`;
}

function getRandomTrackIndex(playlistLength: number) {
  return Math.floor(Math.random() * playlistLength);
}

export function BgmPlayer({ characterBgmUrl = null }: BgmPlayerProps) {
  const authUser = useAuthUser();
  const { sitePlaylist } = useBgmCatalog();
  const { volume, setVolume, isReady: isVolumeReady } = useBgmVolumePreference(authUser);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const trackIndexRef = useRef(0);
  const autoPlayAttemptedRef = useRef(false);
  const loadedSrcRef = useRef<string | null>(null);
  const userPausedRef = useRef(false);
  const needsGestureUnlockRef = useRef(false);
  const playlistRef = useRef<string[]>([...SITE_BGM_PLAYLIST]);
  const loopPlaylistRef = useRef(false);
  const prevFocusedBgmUrlRef = useRef<string | null>(null);
  const playGenerationRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState(INITIAL_TRACK);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState("");

  const focusedBgmUrl = characterBgmUrl?.trim() || null;
  const playlist = useMemo(
    () => (focusedBgmUrl ? [focusedBgmUrl] : [...sitePlaylist]),
    [focusedBgmUrl, sitePlaylist],
  );
  const isCharacterMode = Boolean(focusedBgmUrl);
  // 단곡(캐릭터 테마·사이트 1곡)은 루프, 그 외 사이트 플레이리스트는 순차 재생
  const shouldLoopPlaylist = isCharacterMode || playlist.length <= 1;

  // effect 순서와 무관하게 playTrack이 최신 목록을 쓰도록 렌더 중 동기화
  playlistRef.current = playlist;
  loopPlaylistRef.current = shouldLoopPlaylist;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = shouldLoopPlaylist;
    }
  }, [shouldLoopPlaylist]);

  useEffect(() => {
    if (!isVolumeReady || !audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [isVolumeReady, volume]);

  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = window.setInterval(() => {
        const audio = audioRef.current;
        if (!audio) return;

        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
      }, PROGRESS_INTERVAL_MS);
    }

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        audioRef.current = null;
        loadedSrcRef.current = null;
      }
    };
  }, []);

  function updateTrackDisplay(nextTrackIndex: number) {
    trackIndexRef.current = nextTrackIndex;
    setTrack({
      index: nextTrackIndex,
      title: createErrorTitle(nextTrackIndex),
    });
    setProgress(0);
    setDuration(0);
  }

  async function playWhenReady(audio: HTMLAudioElement) {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      await audio.play();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      function cleanup() {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("error", onError);
      }

      function onReady() {
        cleanup();
        resolve();
      }

      function onError() {
        cleanup();
        reject(new Error("BGM load failed"));
      }

      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });

    await audio.play();
  }

  function getAudio() {
    if (audioRef.current) return audioRef.current;

    const currentPlaylist = playlistRef.current;
    const initialSrc = currentPlaylist[trackIndexRef.current] ?? currentPlaylist[0];
    const audio = new Audio(encodeURI(initialSrc));
    audio.loop = loopPlaylistRef.current;
    audio.preload = "none";
    audio.volume = volume;
    audio.addEventListener("loadedmetadata", () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener("ended", () => {
      if (loopPlaylistRef.current) {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          setIsPlaying(false);
          setNotice("Click anywhere");
        });
        return;
      }

      const nextIndex = (trackIndexRef.current + 1) % playlistRef.current.length;
      void playTrack(nextIndex, true);
    });
    audio.addEventListener("error", () => {
      setNotice("BGM Load Failed");
      setIsPlaying(false);
    });
    audioRef.current = audio;
    return audio;
  }

  async function playTrack(
    nextTrackIndex: number,
    shouldAutoPlay = isPlaying,
    options?: { forceReload?: boolean },
  ) {
    const generation = ++playGenerationRef.current;
    const currentPlaylist = playlistRef.current;
    const safeIndex = currentPlaylist.length > 0 ? nextTrackIndex % currentPlaylist.length : 0;
    const nextSrc = currentPlaylist[safeIndex];

    if (!nextSrc) {
      setNotice("BGM Load Failed");
      setIsPlaying(false);
      return;
    }

    updateTrackDisplay(safeIndex);

    const audio = getAudio();
    audio.loop = loopPlaylistRef.current;

    if (options?.forceReload || loadedSrcRef.current !== nextSrc) {
      audio.pause();
      audio.src = encodeURI(nextSrc);
      audio.currentTime = 0;
      loadedSrcRef.current = nextSrc;
      audio.load();
    }

    if (!shouldAutoPlay) return;

    try {
      await playWhenReady(audio);
      // 캐릭터 진입/이탈이 연달아 일어나면 이전 playTrack 결과가 덮어쓰지 않게 함
      if (generation !== playGenerationRef.current) {
        return;
      }
      setIsPlaying(true);
      setNotice("");
      needsGestureUnlockRef.current = false;
    } catch {
      if (generation !== playGenerationRef.current) {
        return;
      }
      setIsPlaying(false);
      needsGestureUnlockRef.current = true;
      setNotice("Click anywhere");
    }
  }

  async function playAudio() {
    const audio = getAudio();

    try {
      await audio.play();
      setIsPlaying(true);
      setNotice("");
      needsGestureUnlockRef.current = false;
    } catch {
      needsGestureUnlockRef.current = true;
      setNotice("Click anywhere");
    }
  }

  async function togglePlayback() {
    const audio = getAudio();

    try {
      if (audio.paused) {
        userPausedRef.current = false;
        await playAudio();
      } else {
        audio.pause();
        userPausedRef.current = true;
        setIsPlaying(false);
        setNotice("");
      }
    } catch {
      setNotice("Click anywhere");
    }
  }

  function seek(nextProgress: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    audio.currentTime = (nextProgress / 100) * duration;
    setProgress(nextProgress);
  }

  function collapsePlayer() {
    setIsCollapsed(true);
  }

  function expandPlayer() {
    setIsCollapsed(false);
  }

  useEffect(() => {
    if (autoPlayAttemptedRef.current) return;

    autoPlayAttemptedRef.current = true;
    const initialTrackIndex = getRandomTrackIndex(playlistRef.current.length);
    void playTrack(initialTrackIndex, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoPlayAttemptedRef.current) {
      prevFocusedBgmUrlRef.current = focusedBgmUrl;
      return;
    }

    const previousFocused = prevFocusedBgmUrlRef.current;
    prevFocusedBgmUrlRef.current = focusedBgmUrl;

    if (previousFocused === focusedBgmUrl) {
      return;
    }

    const audio = audioRef.current;
    const wasPlaying = Boolean(audio && !audio.paused) || isPlaying;
    const leavingCharacterMode = Boolean(previousFocused) && !focusedBgmUrl;
    // 캐릭터 테마에서 나올 때는 사이트 BGM으로 반드시 되돌림 (재생 중이었으면 이어서 재생)
    const shouldAutoPlay = isCharacterMode || leavingCharacterMode || wasPlaying;
    const nextIndex = isCharacterMode ? 0 : getRandomTrackIndex(playlistRef.current.length);

    userPausedRef.current = false;
    void playTrack(nextIndex, shouldAutoPlay, { forceReload: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedBgmUrl]);

  useEffect(() => {
    function startAfterUserGesture() {
      if (userPausedRef.current || !needsGestureUnlockRef.current) return;

      void playTrack(trackIndexRef.current, true).then(() => {
        if (!userPausedRef.current) {
          needsGestureUnlockRef.current = false;
        }
      });
    }

    window.addEventListener("pointerdown", startAfterUserGesture, { capture: true });
    window.addEventListener("keydown", startAfterUserGesture);

    return () => {
      window.removeEventListener("pointerdown", startAfterUserGesture, { capture: true });
      window.removeEventListener("keydown", startAfterUserGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedBgmUrl]);

  return (
    <aside
      className={`bgm-player archive-panel relative w-full px-3 pt-2 pb-3 text-emerald-50 backdrop-blur-sm select-none ${isCollapsed ? "is-collapsed" : ""}`}
      onClick={isCollapsed ? expandPlayer : undefined}
      aria-label={isCollapsed ? "BGM 플레이어 펼치기" : undefined}
    >
      <div className="bgm-collapsed-content" aria-hidden={!isCollapsed}>
        <span className={`bgm-mini-record ${isPlaying ? "is-playing" : ""}`}>
          <span className="bgm-mini-record-hole" />
        </span>
      </div>

      <div className="bgm-expanded-content grid items-center gap-3 sm:grid-cols-[4.8rem_minmax(0,1fr)]">
        <button
          type="button"
          onClick={togglePlayback}
          className="bgm-record-button grid shrink-0 place-items-center rounded-full"
          aria-label={isPlaying ? "BGM 일시정지" : "BGM 재생"}
        >
          <span
            className={`bgm-record-disc grid place-items-center rounded-full ${isPlaying ? "is-playing" : ""}`}
          >
            <span className="bgm-record-hole" aria-hidden="true" />
          </span>
        </button>

        <div className="min-w-0 self-center">
          <div className="flex items-center justify-between gap-3">
            <p className="archive-kicker">{isCharacterMode ? "Character BGM" : "BGM Player"}</p>
            <button
              type="button"
              onClick={collapsePlayer}
              className="bgm-collapse-button"
              aria-label="BGM 플레이어 접기"
            >
              ×
            </button>
          </div>
          <h2 className="mt-1 truncate text-sm font-semibold text-emerald-50">{track.title}</h2>
          <p className="mt-2 text-[10px] tracking-[0.22em] text-stone-300/55 uppercase">
            {isCharacterMode ? "character theme" : isPlaying ? "playing" : "paused"}
          </p>
          {notice && <p className="mt-1 text-xs text-stone-300/70">{notice}</p>}
        </div>
      </div>

      <div className="bgm-expanded-content mt-3 grid gap-2 border-t border-stone-400/15 pt-2.5">
        <label className="grid gap-1.5 text-[10px] tracking-[0.18em] text-emerald-100/50 uppercase">
          <span>
            {formatTime((progress / 100) * duration)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className="accent-stone-400"
          />
        </label>
        <label className="grid gap-1.5 text-[10px] tracking-[0.18em] text-emerald-100/50 uppercase">
          <span>Volume {Math.round(volume * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="accent-stone-400"
          />
        </label>
      </div>
    </aside>
  );
}
