"use client";

import { useEffect, useRef, useState } from "react";

const BGM_PLAYLIST = [
  "/audio/les-murmures-des-flots-lullaby.mp3",
  "/audio/compass.mp3",
  "/audio/old-doll.mp3",
  "/audio/fontaine-musicbox.mp3",
];
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

export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const trackIndexRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [displayTitle, setDisplayTitle] = useState(() => createErrorTitle(0));
  const [volume, setVolume] = useState(0.55);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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
      }
    };
  }, []);

  function updateTrackDisplay(nextTrackIndex: number) {
    trackIndexRef.current = nextTrackIndex;
    setTrackIndex(nextTrackIndex);
    setDisplayTitle(createErrorTitle(nextTrackIndex));
    setProgress(0);
    setDuration(0);
  }

  function getAudio() {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(BGM_PLAYLIST[trackIndex]);
    audio.loop = false;
    audio.preload = "none";
    audio.volume = volume;
    audio.addEventListener("loadedmetadata", () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener("ended", () => {
      void playTrack((trackIndexRef.current + 1) % BGM_PLAYLIST.length, true);
    });
    audio.addEventListener("error", () => {
      setNotice("BGM Load Failed");
      setIsPlaying(false);
    });
    audioRef.current = audio;
    return audio;
  }

  async function playTrack(nextTrackIndex: number, shouldAutoPlay = isPlaying) {
    const audio = getAudio();
    updateTrackDisplay(nextTrackIndex);
    audio.src = BGM_PLAYLIST[nextTrackIndex];
    audio.currentTime = 0;
    audio.load();

    if (!shouldAutoPlay) return;

    try {
      await audio.play();
      setIsPlaying(true);
      setNotice("");
    } catch {
      setIsPlaying(false);
      setNotice("Click again");
    }
  }

  async function playAudio() {
    const audio = getAudio();

    try {
      await audio.play();
      setIsPlaying(true);
      setNotice("");
    } catch {
      setNotice("Click again");
    }
  }

  async function togglePlayback() {
    const audio = getAudio();

    try {
      if (audio.paused) {
        await playAudio();
      } else {
        audio.pause();
        setIsPlaying(false);
        setNotice("");
      }
    } catch {
      setNotice("Click again");
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

  return (
    <aside
      className={`bgm-player relative w-full rounded-2xl border border-red-600/70 px-3 pt-2 pb-3 text-emerald-50 shadow-[0_0_24px_rgba(0,0,0,0.9)] backdrop-blur-sm select-none ${isCollapsed ? "is-collapsed" : ""}`}
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
            <p className="text-[10px] tracking-[0.35em] text-red-200/70 uppercase">BGM Player</p>
            <button
              type="button"
              onClick={collapsePlayer}
              className="bgm-collapse-button"
              aria-label="BGM 플레이어 접기"
            >
              ×
            </button>
          </div>
          {/* displayTitle은 Math.random 기반의 글리치 텍스트라서 서버와 클라이언트가 서로 다른 값을 만들어요.
              의도된 비결정적 표현이므로 suppressHydrationWarning으로 미스매치 경고만 막습니다. */}
          <h2
            className="mt-1 truncate text-sm font-semibold text-emerald-50"
            suppressHydrationWarning
          >
            {displayTitle}
          </h2>
          <p className="mt-2 text-[10px] tracking-[0.22em] text-red-100/55 uppercase">
            {isPlaying ? "playing" : "paused"}
          </p>
          {notice && <p className="mt-1 text-xs text-red-100/70">{notice}</p>}
        </div>
      </div>

      <div className="bgm-expanded-content mt-3 grid gap-2 border-t border-red-600/20 pt-2.5">
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
            className="accent-red-700"
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
            className="accent-red-700"
          />
        </label>
      </div>
    </aside>
  );
}
