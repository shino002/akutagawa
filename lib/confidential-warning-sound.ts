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

/* ── 결재 도장 소리 ────────────────────────────────────────────
   녹음 한 벌을 「눌리는 구간」만 잘라 씁니다.

   원본(1.53초)의 포락선을 보면 세 토막입니다 —
     0.00‥0.24s  도장을 들어 올려 겨누는 준비 소리 (0 → 0.19 로 서서히 커짐)
     0.24‥0.47s  타격과 그 감쇠 (0.27s 에 0.96 로 치솟았다가 0.04 까지 내려옴)
     0.47‥1.53s  방 울림만 남은 잔향 (0.02‥0.06 이 1 초 넘게 이어짐)

   앞을 그대로 두면 「찍었다」가 아니라 「들었다가 찍었다」가 되고,
   뒤를 그대로 두면 연출이 끝난 뒤에도 소리가 남습니다.

   다만 감쇠 도중에 끊으면 한창일 때 잘린 티가 납니다 — 0.39s 에서 잘랐더니
   그 지점 레벨이 아직 0.32 였습니다. 감쇠는 끝까지 들려주고, 이미 0.04 까지
   내려온 0.42s 부터 길게 깎아 잔향만 지웁니다. */
const STAMP_LAYER = {
  url: "/audio/stamp-classified.mp3",
  gain: 1,
  /** 타격 직전 — 여기서 시작해야 첫 프레임부터 소리가 섭니다 */
  offset: 0.235,
  /** 타격 + 감쇠 전체 */
  duration: 0.36,
  /** 감쇠가 끝난 뒤부터 천천히 깎아 내립니다 (0.42s 지점부터) */
  fadeOut: 0.18,
} as const;

let stampBuffer: AudioBuffer | null = null;
let stampLoading: Promise<void> | null = null;

const loadStampBuffer = (audioContext: AudioContext) => {
  if (stampBuffer) return Promise.resolve();
  if (stampLoading) return stampLoading;

  stampLoading = fetch(STAMP_LAYER.url)
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      stampBuffer = buffer;
    })
    .catch(() => {
      /* 파일이 없거나 디코드에 실패하면 소리 없이 넘어갑니다 */
    })
    .finally(() => {
      stampLoading = null;
    });

  return stampLoading;
};

/**
 * 도장 소리를 미리 받아 둡니다.
 * 누르는 순간에 fetch 하면 첫 결재만 소리가 늦거나 통째로 빠집니다.
 */
export const preloadConfidentialStampSound = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  void loadStampBuffer(audioContext);
};

/** 결재 도장이 종이에 닿는 순간의 「쾅」 */
export const playConfidentialStampThud = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  if (!stampBuffer) {
    /* 아직 안 왔으면 이번 판은 건너뛰고 다음을 위해 받아 둡니다 */
    void loadStampBuffer(audioContext);
    return;
  }

  const now = audioContext.currentTime;
  const { gain: level, offset, duration, fadeOut } = STAMP_LAYER;

  const source = audioContext.createBufferSource();
  source.buffer = stampBuffer;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(level, now);
  gain.gain.setValueAtTime(level, now + duration - fadeOut);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(gain);
  gain.connect(audioContext.destination);
  source.start(now, offset, duration);
};
