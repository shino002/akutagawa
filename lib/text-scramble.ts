import type { FieldGlitchConfig, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import {
  resolveEffectiveScrambleMode,
  zoneUsesErrorAlternation,
} from "@/lib/glitch-scramble-options";
import {
  sanitizeErrorMessageText,
  sanitizePlainText,
} from "@/lib/glitch-display";

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
  const maxIterations = Math.min(targetLength + fillerWords.length, 512);

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

function buildBuiltinErrorText(
  selectedText: string,
  seed: string,
  tokenPool = DEFAULT_GLITCH_TOKENS,
) {
  const safeLength = Math.min(selectedText.length, 256);
  const targetLength = safeLength < selectedText.length ? safeLength : selectedText.length;
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

function assembleTextFromWordPool(targetLength: number, poolWords: string[], seed: string) {
  if (!poolWords.length || targetLength <= 0) {
    return "";
  }

  const random = createSeededRandom(`${seed}:assemble`);
  let result = "";
  let guard = 0;

  while (result.length < targetLength && guard < poolWords.length * 24) {
    const word = poolWords[Math.floor(random() * poolWords.length)] ?? poolWords[0];
    const piece = result.length > 0 ? ` ${word}` : word;

    if (result.length + piece.length > targetLength) {
      result += piece.slice(0, targetLength - result.length);
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

function referenceScrambleIntensity(textLength: number) {
  if (textLength <= 20) {
    return 0.4;
  }

  if (textLength <= 48) {
    return 0.28;
  }

  return 0.18;
}

function scrambleReferencePoolCharacters(
  text: string,
  poolWords: string[],
  seed: string,
  intensity = 0.42,
) {
  const poolChars = [...poolWords.join("")].filter((character) => character.trim());
  if (poolChars.length === 0) {
    return text;
  }

  const characters = text.split("");
  const eligibleIndexes = characters
    .map((character, index) => (character.trim() ? index : -1))
    .filter((index) => index >= 0);

  if (eligibleIndexes.length === 0) {
    return text;
  }

  const preserve = new Set<number>([
    eligibleIndexes[0],
    eligibleIndexes[eligibleIndexes.length - 1],
  ]);
  const random = createSeededRandom(`${seed}:ref-chars`);

  return characters
    .map((character, index) => {
      if (!character.trim() || preserve.has(index) || random() > intensity) {
        return character;
      }

      return poolChars[Math.floor(random() * poolChars.length)] ?? character;
    })
    .join("");
}

function shouldApplyZalgoToError(pool: string, scrambleMode?: GlitchScrambleMode) {
  return resolveEffectiveScrambleMode(pool, scrambleMode) !== "referenceOnly";
}

function scrambleFromReferencePool(
  selectedText: string,
  wordPoolText: string,
  mode: GlitchScrambleMode,
  seed: string,
  builtinTokens?: string[],
) {
  const poolWords = extractWords(wordPoolText);
  if (poolWords.length === 0) {
    return selectedText;
  }

  const targetLength = Math.min(selectedText.length, 256);
  const referenceText = assembleTextFromWordPool(targetLength, poolWords, seed);

  if (mode === "referenceOnly") {
    return referenceText;
  }

  return glitchCharacters(referenceText, 0.18, seed, resolveBuiltinGlitchChars(builtinTokens));
}

export interface ScrambleErrorOptions {
  wordPool?: string;
  scrambleMode?: GlitchScrambleMode;
  builtinTokens?: string[];
  seed: string;
}

export function scrambleErrorText(selectedText: string, options: ScrambleErrorOptions) {
  const pool = sanitizePlainText(options.wordPool?.trim() ?? "");
  const effectiveMode = resolveEffectiveScrambleMode(pool, options.scrambleMode);
  const tokenPool = resolveBuiltinTokenPool(options.builtinTokens);

  let result: string;

  if (effectiveMode === "builtinOnly") {
    result = buildBuiltinErrorText(selectedText, options.seed, tokenPool);
  } else if (effectiveMode === "referenceOnly") {
    const poolWords = extractWords(pool);
    const targetLength = Math.min(selectedText.length, 256);
    const assembled = assembleReferenceOnlyText(targetLength, poolWords, options.seed);
    result = scrambleReferencePoolCharacters(
      assembled,
      poolWords,
      options.seed,
      referenceScrambleIntensity(targetLength),
    );
  } else {
    result = scrambleFromReferencePool(
      selectedText,
      pool,
      "referenceWithBuiltin",
      options.seed,
      options.builtinTokens,
    );
  }

  return result;
}

export function generateErrorMessageCandidates(
  selectedText: string,
  options: Omit<ScrambleErrorOptions, "seed">,
  count = 4,
) {
  const seen = new Set<string>();
  const results: string[] = [];
  let attempt = 0;

  while (results.length < count && attempt < count * 10) {
    const seed = `candidate:${selectedText}:${attempt}`;
    const base = scrambleErrorText(selectedText, {
      ...options,
      seed,
    });
    const candidate = sanitizeErrorMessageText(
      shouldApplyZalgoToError(options.wordPool?.trim() ?? "", options.scrambleMode)
        ? applyControlledZalgoGlitch(base, seed)
        : base,
    );
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

  if (zone.errorMessageSource === "custom" && zone.errorMessage?.trim()) {
    const custom = zone.errorMessage.trim();
    const trimmed =
      custom.length > zone.original.length ? custom.slice(0, zone.original.length) : custom;
    return sanitizeErrorMessageText(trimmed);
  }

  const pool = config.wordPool?.trim() ?? "";
  const poolWords = extractWords(pool);
  const seed = `${zone.id}:${errorCycle}:${zone.original}`;

  const errorText = scrambleErrorText(zone.original, {
    wordPool: config.wordPool,
    scrambleMode: config.scrambleMode,
    builtinTokens: config.builtinTokens,
    seed,
  });

  const fitted = fitTextToLength(errorText, zone.original.length, poolWords);
  if (!shouldApplyZalgoToError(pool, config.scrambleMode)) {
    return sanitizeErrorMessageText(fitted);
  }

  return sanitizeErrorMessageText(applyControlledZalgoGlitch(fitted, seed));
}

export function buildZoneDisplayText(zones: GlitchZone[], config: FieldGlitchConfig, phase = 0) {
  const displayMode = config.errorDisplayMode ?? "alternate";

  if (displayMode === "alternate" && phase % 2 === 0) {
    return Object.fromEntries(zones.map((zone) => [zone.id, zone.original]));
  }

  const errorCycle = phase;

  return Object.fromEntries(
    zones.map((zone) => [zone.id, resolveZoneErrorText(zone, config, errorCycle)]),
  );
}
