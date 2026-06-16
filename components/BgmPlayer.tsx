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
const INITIAL_TRACK = {
  index: 0,
  title: "@/1_SIGNAL_LOST",
};

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

function getRandomTrackIndex() {
  return Math.floor(Math.random() * BGM_PLAYLIST.length);
}

export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const trackIndexRef = useRef(0);
  const autoPlayAttemptedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState(INITIAL_TRACK);
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
    setTrack({
      index: nextTrackIndex,
      title: createErrorTitle(nextTrackIndex),
    });
    setProgress(0);
    setDuration(0);
  }

  function getAudio() {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(BGM_PLAYLIST[track.index]);
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
      setNotice("Click anywhere");
    }
  }

  async function playAudio() {
    const audio = getAudio();

    try {
      await audio.play();
      setIsPlaying(true);
      setNotice("");
    } catch {
      setNotice("Click anywhere");
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
    const initialTrackIndex = getRandomTrackIndex();
    trackIndexRef.current = initialTrackIndex;
    void playTrack(initialTrackIndex, true);
    // 첫 렌더는 고정 제목으로 맞추고, 접속 후 클라이언트에서만 랜덤 첫 곡을 정합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function startAfterUserGesture() {
      const audio = audioRef.current;

      if (audio && !audio.paused) return;
      void playTrack(trackIndexRef.current, true);
    }

    window.addEventListener("pointerdown", startAfterUserGesture, { capture: true, once: true });
    window.addEventListener("keydown", startAfterUserGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", startAfterUserGesture, { capture: true });
      window.removeEventListener("keydown", startAfterUserGesture);
    };
    // 자동재생이 막힌 브라우저에서 첫 사용자 입력으로만 재생을 재시도합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <p className="archive-kicker">BGM Player</p>
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
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-stone-300/55">{isPlaying ? "playing" : "paused"}</p>
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
