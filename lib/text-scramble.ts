import type { FieldGlitchConfig, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import {
  resolveEffectiveScrambleMode,
  resolveZoneErrorMessageSource,
  resolveZoneScrambleOptions,
  zoneUsesErrorAlternation,
} from "@/lib/glitch-scramble-options";
import { DEFAULT_GLITCH_TICK_MS, glitchScramblePhase } from "@/lib/glitch-style";
import { sanitizeErrorMessageText, sanitizePlainText } from "@/lib/glitch-display";

const ZALGO_COMBINING = [
  "\u030D",
  "\u0315",
  "\u0310",
  "\u034E",
  "\u0334",
  "\u0335",
  "\u0336",
  "\u0338",
  "\u0339",
  "\u0347",
];

export const GLITCH_CHARS = ["#", "?", "!", "/", "\\", "0", "1", "_", "§", "¤", "×", "▓"];

export const DEFAULT_GLITCH_TOKENS = [
  "ERR",
  "NULL",
  "???",
  "404",
  "#ERR",
  "×_×",
  "▓▓▓",
  "!?",
  "0x00",
  "NaN",
  "§§",
  ...GLITCH_CHARS,
];

export const BUILTIN_TOKEN_GROUPS = [
  { id: "block", label: "네모·블록", tokens: ["▓", "▓▓▓", "§", "§§", "¤", "×", "×_×"] },
  { id: "symbol", label: "기호", tokens: ["#", "?", "!", "/", "\\", "_", "#ERR", "???", "!?"] },
  { id: "code", label: "오류 코드", tokens: ["ERR", "NULL", "404", "0x00", "NaN"] },
  { id: "digit", label: "숫자", tokens: ["0", "1"] },
] as const;

const BUILTIN_TOKEN_SET = new Set<string>([
  ...DEFAULT_GLITCH_TOKENS,
  ...BUILTIN_TOKEN_GROUPS.flatMap((group) => group.tokens),
]);

export function normalizeBuiltinTokens(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const next = [
    ...new Set(
      raw.filter(
        (token): token is string => typeof token === "string" && BUILTIN_TOKEN_SET.has(token),
      ),
    ),
  ];
  return next.length > 0 ? next : undefined;
}

export function resolveBuiltinTokenPool(selected?: string[]) {
  const normalized = normalizeBuiltinTokens(selected);
  if (!normalized?.length) {
    return DEFAULT_GLITCH_TOKENS;
  }

  return normalized;
}

export function resolveBuiltinGlitchChars(selected?: string[]) {
  const pool = resolveBuiltinTokenPool(selected);
  const singleChars = pool.filter((token) => token.length === 1);
  return singleChars.length > 0 ? singleChars : GLITCH_CHARS;
}

export type { GlitchZone };

export function extractWords(text: string) {
  const sanitized = sanitizePlainText(text);
  return sanitized.match(/[^\s]+/g) ?? [];
}

/** 긴 구간 오류 텍스트는 이 크기로 나눠 생성합니다. */
const ERROR_TEXT_CHUNK_SIZE = 256;

function buildTextInChunks(
  targetLength: number,
  seed: string,
  buildChunk: (chunkLength: number, chunkSeed: string) => string,
) {
  if (targetLength <= 0) {
    return "";
  }

  if (targetLength <= ERROR_TEXT_CHUNK_SIZE) {
    return buildChunk(targetLength, seed).slice(0, targetLength);
  }

  let result = "";

  for (let offset = 0; offset < targetLength; offset += ERROR_TEXT_CHUNK_SIZE) {
    const chunkLength = Math.min(ERROR_TEXT_CHUNK_SIZE, targetLength - offset);
    result += buildChunk(chunkLength, `${seed}:${offset}`);
  }

  return result.slice(0, targetLength);
}

function hashSeed(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** 오류 문구에만 쓰는 제한 Zalgo — 글자당 합성 기호 1~2개 */
export function applyControlledZalgoGlitch(text: string, seed: string, intensity = 0.52) {
  const random = createSeededRandom(`${seed}:zalgo`);

  return text
    .split("")
    .map((character) => {
      if (!character.trim() || random() > intensity) {
        return character;
      }

      const markCount = 1 + Math.floor(random() * 2);
      let marks = "";
      for (let index = 0; index < markCount; index += 1) {
        marks += ZALGO_COMBINING[Math.floor(random() * ZALGO_COMBINING.length)] ?? "\u0336";
      }

      return character + marks;
    })
    .join("");
}

export function shuffleItems<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function shuffleItemsSeeded<T>(items: T[], seed: string) {
  const random = createSeededRandom(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function glitchCharacters(
  text: string,
  intensity = 0.22,
  seed?: string,
  glitchChars = GLITCH_CHARS,
) {
  const random = seed ? createSeededRandom(`${seed}:glitch`) : Math.random;
  const chars = glitchChars.length > 0 ? glitchChars : GLITCH_CHARS;
  const characters = text.split("");
  const eligibleIndexes = characters
    .map((character, index) => (character.trim() ? index : -1))
    .filter((index) => index >= 0);
  const preserve = new Set<number>(
    eligibleIndexes.length > 0
      ? [eligibleIndexes[0], eligibleIndexes[eligibleIndexes.length - 1]]
      : [],
  );

  return characters
    .map((character, index) => {
      if (!character.trim() || preserve.has(index) || random() > intensity) {
        return character;
      }

      const glitchIndex = seed
        ? Math.floor(random() * chars.length)
        : Math.floor(Math.random() * chars.length);

      return chars[glitchIndex] ?? character;
    })
    .join("");
}

function estimateScrambleWordCount(selectedText: string) {
  const explicitWords = extractWords(selectedText);
  if (explicitWords.length > 1) {
    return explicitWords.length;
  }

  const meaningfulLength = selectedText.replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(meaningfulLength / 2));
}

export function fitTextToLength(text: string, targetLength: number, fillerWords: string[] = []) {
  if (targetLength <= 0) {
    return "";
  }

  if (!text) {
    return fillerWords.join(" ").slice(0, targetLength);
  }

  if (text.length >= targetLength) {
    return text.slice(0, targetLength);
  }

  const chunks: string[] = [text];
  let totalLength = text.length;
  let poolIndex = 0;
  const maxIterations = Math.min(targetLength + fillerWords.length, Math.max(512, targetLength));

  while (totalLength < targetLength && poolIndex < maxIterations) {
    const word = fillerWords[poolIndex % fillerWords.length] ?? "";
    if (!word) {
      break;
    }

    chunks.push(totalLength > 0 ? ` ${word}` : word);
    totalLength += (totalLength > 0 ? 1 : 0) + word.length;
    poolIndex += 1;
  }

  let result = chunks.join("").slice(0, targetLength);

  if (result.length < targetLength) {
    const pool = fillerWords.length > 0 ? fillerWords : extractWords(text);
    if (pool.length > 0) {
      const padded = assembleTextFromWordPool(targetLength, pool, `fit:${text}:${targetLength}`);
      if (padded.length > result.length) {
        result = padded.slice(0, targetLength);
      }
    }
  }

  return result.slice(0, targetLength);
}

function buildBuiltinErrorTextAtLength(
  targetLength: number,
  seed: string,
  tokenPool = DEFAULT_GLITCH_TOKENS,
) {
  if (targetLength <= 0) {
    return "";
  }

  const random = createSeededRandom(`${seed}:builtin`);
  const tokens = shuffleItemsSeeded(tokenPool, `${seed}:tokens`);
  const parts: string[] = [];
  let length = 0;

  while (length < targetLength) {
    const token = tokens[Math.floor(random() * tokens.length)] ?? "#";
    const spacer = parts.length > 0 && length < targetLength ? " " : "";
    const next = `${spacer}${token}`;
    if (length + next.length > targetLength && parts.length > 0) {
      const remaining = targetLength - length;
      if (remaining > 0) {
        parts.push(token.slice(0, remaining));
        length += remaining;
      }
      break;
    }

    parts.push(parts.length > 0 ? ` ${token}` : token);
    length += parts.length > 0 ? 1 + token.length : token.length;
  }

  return parts.join("").slice(0, targetLength);
}

function buildBuiltinErrorTextToLength(
  targetLength: number,
  seed: string,
  tokenPool = DEFAULT_GLITCH_TOKENS,
) {
  return buildTextInChunks(targetLength, seed, (chunkLength, chunkSeed) =>
    buildBuiltinErrorTextAtLength(chunkLength, chunkSeed, tokenPool),
  );
}

function takeSeededWordSlice(word: string, length: number, random: () => number) {
  if (length <= 0) {
    return "";
  }

  if (word.length <= length) {
    return word.slice(0, length);
  }

  const maxStart = word.length - length;
  const start = Math.floor(random() * (maxStart + 1));
  return word.slice(start, start + length);
}

function assembleCharsFromCompactPool(targetLength: number, pool: string, seed: string) {
  const chars = [...pool.replace(/\s+/g, "")];
  if (!chars.length || targetLength <= 0) {
    return "";
  }

  const random = createSeededRandom(`${seed}:compact-pool`);
  let result = "";

  for (let index = 0; index < targetLength; index += 1) {
    result += chars[Math.floor(random() * chars.length)] ?? chars[0];
  }

  return result;
}

function assembleTextFromWordPool(targetLength: number, poolWords: string[], seed: string) {
  if (!poolWords.length || targetLength <= 0) {
    return "";
  }

  if (poolWords.length === 1 && !/\s/.test(poolWords[0])) {
    return assembleCharsFromCompactPool(targetLength, poolWords[0], seed);
  }

  const random = createSeededRandom(`${seed}:assemble`);
  let result = "";
  let guard = 0;

  while (result.length < targetLength && guard < poolWords.length * 24) {
    const word = poolWords[Math.floor(random() * poolWords.length)] ?? poolWords[0];
    const piece = result.length > 0 ? ` ${word}` : word;

    if (result.length + piece.length > targetLength) {
      const remaining = targetLength - result.length;
      const source = result.length > 0 ? word : piece;
      result += takeSeededWordSlice(source, remaining, random);
      break;
    }

    result += piece;
    guard += 1;
  }

  return result.slice(0, targetLength);
}

function assembleReferenceOnlyText(targetLength: number, poolWords: string[], seed: string) {
  return assembleTextFromWordPool(targetLength, poolWords, seed);
}

function assembleReferenceOnlyTextToLength(
  targetLength: number,
  poolWords: string[],
  seed: string,
) {
  return buildTextInChunks(targetLength, seed, (chunkLength, chunkSeed) =>
    assembleReferenceOnlyText(chunkLength, poolWords, chunkSeed),
  );
}

function assembleReferenceWithBuiltinText(
  targetLength: number,
  poolWords: string[],
  tokenPool: string[],
  seed: string,
) {
  if (targetLength <= 0 || poolWords.length === 0) {
    return "";
  }

  const random = createSeededRandom(`${seed}:ref-builtin`);
  const parts: string[] = [];
  let length = 0;
  let guard = 0;

  while (length < targetLength && guard < targetLength * 12) {
    const useBuiltin = tokenPool.length > 0 && random() < 0.42;
    const token = useBuiltin
      ? (tokenPool[Math.floor(random() * tokenPool.length)] ?? "#")
      : (poolWords[Math.floor(random() * poolWords.length)] ?? poolWords[0]);

    if (length + token.length > targetLength && parts.length > 0) {
      const remaining = targetLength - length;
      if (remaining > 0) {
        parts.push(token.slice(0, remaining));
        length += remaining;
      }
      break;
    }

    const piece = parts.length > 0 ? ` ${token}` : token;
    if (length + piece.length > targetLength && parts.length > 0) {
      const remaining = targetLength - length;
      if (remaining > 0) {
        parts.push(token.slice(0, remaining));
        length += remaining;
      }
      break;
    }

    parts.push(piece);
    length += piece.length;
    guard += 1;
  }

  let result = parts.join("").slice(0, targetLength);

  if (result.length < targetLength) {
    const padded = assembleTextFromWordPool(targetLength, poolWords, `${seed}:pad`);
    if (padded.length > result.length) {
      result = padded.slice(0, targetLength);
    }
  }

  return result.slice(0, targetLength);
}

function assembleReferenceWithBuiltinTextToLength(
  targetLength: number,
  poolWords: string[],
  tokenPool: string[],
  seed: string,
) {
  return buildTextInChunks(targetLength, seed, (chunkLength, chunkSeed) =>
    assembleReferenceWithBuiltinText(chunkLength, poolWords, tokenPool, chunkSeed),
  );
}

function buildScrambleErrorTextToLength(targetLength: number, options: ScrambleErrorOptions) {
  if (targetLength <= 0) {
    return "";
  }

  const pool = sanitizePlainText(options.wordPool?.trim() ?? "");
  const effectiveMode = resolveEffectiveScrambleMode(pool, options.scrambleMode);
  const tokenPool = resolveBuiltinTokenPool(options.builtinTokens);
  const poolWords = extractWords(pool);

  if (effectiveMode === "builtinOnly" || poolWords.length === 0) {
    return buildBuiltinErrorTextToLength(targetLength, options.seed, tokenPool);
  }

  if (effectiveMode === "referenceOnly") {
    return assembleReferenceOnlyTextToLength(targetLength, poolWords, options.seed);
  }

  return assembleReferenceWithBuiltinTextToLength(targetLength, poolWords, tokenPool, options.seed);
}

export interface ScrambleErrorOptions {
  wordPool?: string;
  scrambleMode?: GlitchScrambleMode;
  builtinTokens?: string[];
  seed: string;
}

export interface GenerateErrorMessageCandidateOptions extends Omit<ScrambleErrorOptions, "seed"> {
  /** 바꿀 때마다 다른 후보가 나오도록 구분하는 값 */
  seedSalt?: string | number;
}

export function scrambleErrorText(selectedText: string, options: ScrambleErrorOptions) {
  return buildScrambleErrorTextToLength(selectedText.length, options);
}

export function generateErrorMessageCandidates(
  selectedText: string,
  options: GenerateErrorMessageCandidateOptions,
  count = 4,
) {
  const { seedSalt = 0, ...scrambleOptions } = options;
  const seen = new Set<string>();
  const results: string[] = [];
  let attempt = 0;

  while (results.length < count && attempt < count * 10) {
    const seed = `candidate:${selectedText}:${seedSalt}:${attempt}`;
    const base = scrambleErrorText(selectedText, {
      ...scrambleOptions,
      seed,
    });
    const candidate = sanitizeErrorMessageText(base);
    attempt += 1;

    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    results.push(candidate);
  }

  return results;
}

export function scrambleWithWordPool(selectedText: string, wordPoolText: string) {
  return scrambleErrorText(selectedText, {
    wordPool: wordPoolText,
    scrambleMode: "referenceWithBuiltin",
    seed: `legacy:${selectedText}:${wordPoolText}`,
  });
}

export function scrambleWithWordPoolSeeded(
  selectedText: string,
  wordPoolText: string,
  seed: string,
) {
  return scrambleErrorText(selectedText, {
    wordPool: wordPoolText,
    scrambleMode: "referenceWithBuiltin",
    seed,
  });
}

export function applyScrambleToTextValue(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  wordPoolText: string,
) {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const scrambled = scrambleWithWordPool(selectedText, wordPoolText);

  return `${value.slice(0, selectionStart)}${scrambled}${value.slice(selectionEnd)}`;
}

export type TextSegment =
  | { type: "plain"; text: string }
  | { type: "glitch"; zoneId: string; text: string; original: string };

export function zonesOverlap(
  left: Pick<GlitchZone, "start" | "end">,
  right: Pick<GlitchZone, "start" | "end">,
) {
  return left.start < right.end && right.start < left.end;
}

export function composeTextSegments(
  fullText: string,
  zones: GlitchZone[],
  scrambledById: Record<string, string>,
): TextSegment[] {
  const sortedZones = [...zones].sort((left, right) => left.start - right.start);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const zone of sortedZones) {
    if (zone.start > cursor) {
      segments.push({ type: "plain", text: fullText.slice(cursor, zone.start) });
    }

    segments.push({
      type: "glitch",
      zoneId: zone.id,
      text: scrambledById[zone.id] ?? zone.original,
      original: zone.original,
    });
    cursor = zone.end;
  }

  if (cursor < fullText.length) {
    segments.push({ type: "plain", text: fullText.slice(cursor) });
  }

  return segments;
}

export function composePreviewText(
  fullText: string,
  zones: GlitchZone[],
  scrambledById: Record<string, string>,
) {
  return composeTextSegments(fullText, zones, scrambledById)
    .map((segment) => segment.text)
    .join("");
}

function resolveZoneErrorText(zone: GlitchZone, config: FieldGlitchConfig, errorCycle: number) {
  if (!zoneUsesErrorAlternation(zone, config)) {
    return zone.original;
  }

  const errorMessageSource = resolveZoneErrorMessageSource(zone, config);

  const targetLength = zone.original.length;

  if (errorMessageSource === "custom" && zone.errorMessage?.trim()) {
    const custom = sanitizeErrorMessageText(zone.errorMessage.trim());
    if (custom.length >= targetLength) {
      return custom.slice(0, targetLength);
    }

    return sanitizeErrorMessageText(fitTextToLength(custom, targetLength, extractWords(custom)));
  }

  const scrambleOptions = resolveZoneScrambleOptions(zone, config);
  const seed = `${zone.id}:${errorCycle}:${zone.original}`;

  return sanitizeErrorMessageText(
    buildScrambleErrorTextToLength(targetLength, {
      wordPool: scrambleOptions.wordPool,
      scrambleMode: scrambleOptions.scrambleMode,
      builtinTokens: scrambleOptions.builtinTokens,
      seed,
    }),
  );
}

export type BuildZoneDisplayTextOptions = {
  /** 글로벌 펄스 시각(ms). 구간별 tickMs로 phase를 계산합니다. */
  pulse?: number;
  /** animate=false 등 고정 phase가 필요할 때 */
  fixedPhase?: number;
};

export function buildZoneDisplayText(
  zones: GlitchZone[],
  config: FieldGlitchConfig,
  options: BuildZoneDisplayTextOptions = {},
) {
  const pulse = options.pulse ?? 0;
  const useFixedPhase = options.fixedPhase !== undefined;

  return Object.fromEntries(
    zones.map((zone) => {
      const scrambleOptions = resolveZoneScrambleOptions(zone, config);
      const tickMs = scrambleOptions.tickMs ?? config.tickMs ?? DEFAULT_GLITCH_TICK_MS;
      const phase = useFixedPhase ? options.fixedPhase! : glitchScramblePhase(pulse, tickMs);
      const displayMode = scrambleOptions.errorDisplayMode ?? "alternate";
      const errorCycle = phase;

      if (displayMode === "alternate" && phase % 2 === 0) {
        return [zone.id, zone.original];
      }

      return [zone.id, resolveZoneErrorText(zone, config, errorCycle)];
    }),
  );
}
