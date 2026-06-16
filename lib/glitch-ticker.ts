import { GLITCH_TICK_PULSE_MS } from "@/lib/glitch-style";

type GlitchPulseListener = () => void;

let pulse = 0;
let timerId: number | null = null;
const listeners = new Set<GlitchPulseListener>();

function runPulse() {
  pulse += 1;
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribeGlitchPulse(listener: GlitchPulseListener) {
  listeners.add(listener);

  if (timerId === null && typeof window !== "undefined") {
    timerId = window.setInterval(runPulse, GLITCH_TICK_PULSE_MS);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };
}

export function getGlitchPulseSnapshot() {
  return pulse;
}

export function getGlitchPulseServerSnapshot() {
  return 0;
}

/** @deprecated Use subscribeGlitchPulse */
export const subscribeGlitchTick = subscribeGlitchPulse;

/** @deprecated Use getGlitchPulseSnapshot */
export const getGlitchTickSnapshot = getGlitchPulseSnapshot;

/** @deprecated Use getGlitchPulseServerSnapshot */
export const getGlitchTickServerSnapshot = getGlitchPulseServerSnapshot;
