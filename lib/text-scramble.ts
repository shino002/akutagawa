import type { FieldGlitchConfig, GlitchScrambleMode, GlitchZone } from "@/lib/types";
import { resolveEffectiveScrambleMode, zoneUsesErrorAlternation } from "@/lib/glitch-scramble-options";

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

export type { GlitchZone };

export function extractWords(text: string) {
  return text.match(/[^\s]+/g) ?? [];
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

function glitchCharacters(text: string, intensity = 0.22, seed?: string) {
  const random = seed ? createSeededRandom(`${seed}:glitch`) : Math.random;

  return text
    .split("")
    .map((character) => {
      if (!character.trim() || random() > intensity) {
        return character;
      }

      const glitchIndex = seed
        ? Math.floor(random() * GLITCH_CHARS.length)
        : Math.floor(Math.random() * GLITCH_CHARS.length);

      return GLITCH_CHARS[glitchIndex] ?? character;
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

  if (result.length < targetLength || result.endsWith(" ")) {
    const paddingSource = (fillerWords[0] ?? text).replace(/\s/g, "") || text;
    if (paddingSource) {
      result = paddingSource.repeat(Math.ceil(targetLength / paddingSource.length)).slice(0, targetLength);
    }
  }

  return result;
}

function buildBuiltinErrorText(selectedText: string, seed: string) {
  const safeLength = Math.min(selectedText.length, 256);
  const targetLength = safeLength < selectedText.length ? safeLength : selectedText.length;
  const random = createSeededRandom(`${seed}:builtin`);
  const tokens = shuffleItemsSeeded(DEFAULT_GLITCH_TOKENS, `${seed}:tokens`);
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

function collectPoolCharacters(poolWords: string[]) {
  return poolWords.flatMap((word) => [...word]);
}

function pickRandomReferenceText(targetLength: number, poolWords: string[], seed: string) {
  const characters = collectPoolCharacters(poolWords);
  if (!characters.length || targetLength <= 0) {
    return "";
  }

  const random = createSeededRandom(`${seed}:ref`);
  let result = "";

  for (let index = 0; index < targetLength; index += 1) {
    result += characters[Math.floor(random() * characters.length)] ?? characters[0];
  }

  return result;
}

function assembleReferenceOnlyText(targetLength: number, poolWords: string[], seed: string) {
  return pickRandomReferenceText(targetLength, poolWords, seed);
}

function scrambleFromReferencePool(
  selectedText: string,
  wordPoolText: string,
  mode: GlitchScrambleMode,
  seed: string,
) {
  const poolWords = extractWords(wordPoolText);
  if (poolWords.length === 0) {
    return selectedText;
  }

  const targetLength = Math.min(selectedText.length, 256);
  const referenceText = pickRandomReferenceText(targetLength, poolWords, seed);

  if (mode === "referenceOnly") {
    return referenceText;
  }

  return glitchCharacters(referenceText, 0.22, seed);
}

export interface ScrambleErrorOptions {
  wordPool?: string;
  scrambleMode?: GlitchScrambleMode;
  seed: string;
}

export function scrambleErrorText(selectedText: string, options: ScrambleErrorOptions) {
  const pool = options.wordPool?.trim() ?? "";
  const effectiveMode = resolveEffectiveScrambleMode(pool, options.scrambleMode);

  if (effectiveMode === "builtinOnly") {
    return buildBuiltinErrorText(selectedText, options.seed);
  }

  if (effectiveMode === "referenceOnly") {
    const poolWords = extractWords(pool);
    const targetLength = Math.min(selectedText.length, 256);
    return assembleReferenceOnlyText(targetLength, poolWords, options.seed);
  }

  return scrambleFromReferencePool(selectedText, pool, "referenceWithBuiltin", options.seed);
}

export function generateErrorMessageCandidates(
  selectedText: string,
  options: Omit<ScrambleErrorOptions, "seed">,
  count = 4,
) {
  return Array.from({ length: count }, (_, index) =>
    scrambleErrorText(selectedText, {
      ...options,
      seed: `candidate:${index}:${Date.now()}`,
    }),
  );
}

export function scrambleWithWordPool(selectedText: string, wordPoolText: string) {
  return scrambleErrorText(selectedText, {
    wordPool: wordPoolText,
    scrambleMode: "referenceWithBuiltin",
    seed: `legacy:${selectedText}:${wordPoolText}`,
  });
}

export function scrambleWithWordPoolSeeded(selectedText: string, wordPoolText: string, seed: string) {
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
    return fitTextToLength(zone.errorMessage.trim(), zone.original.length);
  }

  const pool = config.wordPool?.trim() ?? "";
  const seed = `${zone.id}:${errorCycle}`;

  const errorText = scrambleErrorText(zone.original, {
    wordPool: config.wordPool,
    scrambleMode: config.scrambleMode,
    seed,
  });

  if (errorText.length === zone.original.length) {
    return errorText;
  }

  return fitTextToLength(errorText, zone.original.length, extractWords(pool));
}

export function buildZoneDisplayText(zones: GlitchZone[], config: FieldGlitchConfig, phase = 0) {
  if (phase % 2 === 0) {
    return Object.fromEntries(zones.map((zone) => [zone.id, zone.original]));
  }

  const errorCycle = Math.floor(phase / 2);

  return Object.fromEntries(
    zones.map((zone) => [zone.id, resolveZoneErrorText(zone, config, errorCycle)]),
  );
}
