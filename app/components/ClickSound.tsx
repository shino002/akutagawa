"use client";

import { useEffect, useRef } from "react";

type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function isClickableElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, label, input[type='button'], input[type='submit']"));
}

export default function ClickSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    function playClickSound(event: PointerEvent) {
      if (!isClickableElement(event.target)) return;

      const browserWindow = window as WindowWithWebkitAudioContext;
      const AudioContextClass = browserWindow.AudioContext || browserWindow.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = audioContext;

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(95, now);
      oscillator.frequency.exponentialRampToValueAtTime(38, now + 0.055);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.055);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.065);
    }

    document.addEventListener("pointerdown", playClickSound, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", playClickSound, { capture: true });
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return null;
}
