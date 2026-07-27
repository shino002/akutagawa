type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let sharedContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  const browserWindow = window as WindowWithWebkitAudioContext;
  const AudioContextClass = browserWindow.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextClass) return null;

  sharedContext ??= new AudioContextClass();
  if (sharedContext.state === "suspended") {
    void sharedContext.resume().catch(() => {
      // 자동재생 정책으로 resume이 막혀도 이후 제스처에서 재시도됨
    });
  }
  return sharedContext;
};

/**
 * 모달 열림 시 낮은 드론음 (secret-document-modal-v5 playOpenDrone).
 * 취소/확인 클릭 사운드는 쓰지 않음.
 */
export const playConfidentialOpenDrone = () => {
  if (typeof window === "undefined") return;

  const audioContext = getAudioContext();
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.14, now + 0.6);
  master.gain.linearRampToValueAtTime(0.09, now + 1.6);
  master.gain.linearRampToValueAtTime(0, now + 2.6);
  master.connect(audioContext.destination);

  for (const freq of [55, 58.5]) {
    const osc = audioContext.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const gain = audioContext.createGain();
    gain.gain.value = 0.5;
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 2.6);
  }
};
