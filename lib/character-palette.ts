import type { CSSProperties } from "react";
import { normalizeColorInput } from "@/lib/glitch-style";

const paletteBackgrounds: Record<string, string> = {
  "from-zinc-950 via-black to-zinc-900": "linear-gradient(90deg, #09090b 0%, #000 52%, #18181b 100%)",
  "from-zinc-700 via-zinc-950 to-black": "linear-gradient(90deg, #3f3f46 0%, #09090b 52%, #000 100%)",
  "from-zinc-200 via-zinc-800 to-black": "linear-gradient(90deg, #e4e4e7 0%, #27272a 52%, #000 100%)",
  "from-stone-300 via-zinc-800 to-black": "linear-gradient(90deg, #d6d3d1 0%, #27272a 52%, #000 100%)",
  "from-neutral-700 via-neutral-950 to-black": "linear-gradient(90deg, #404040 0%, #0a0a0a 52%, #000 100%)",
  "from-slate-300 via-slate-900 to-black": "linear-gradient(90deg, #cbd5e1 0%, #0f172a 52%, #000 100%)",
};

const defaultPaletteKey = "from-zinc-950 via-black to-zinc-900";

export type CharacterPaletteColors = {
  start: string;
  mid: string;
  end: string;
};

export const DEFAULT_CHARACTER_PALETTE_COLORS: CharacterPaletteColors = {
  start: "#09090b",
  mid: "#000000",
  end: "#18181b",
};

type PaletteStyle = CSSProperties & {
  "--character-palette-background": string;
  "--character-palette-background-vertical": string;
};

function normalizePaletteColor(value: string | undefined, fallback: string) {
  return normalizeColorInput(value?.trim()) ?? fallback;
}

function extractGradientColorStops(gradient: string) {
  return gradient.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g) ?? [];
}

export function buildCharacterPaletteGradient(colors: CharacterPaletteColors): string {
  const start = normalizePaletteColor(colors.start, DEFAULT_CHARACTER_PALETTE_COLORS.start);
  const mid = normalizePaletteColor(colors.mid, DEFAULT_CHARACTER_PALETTE_COLORS.mid);
  const end = normalizePaletteColor(colors.end, DEFAULT_CHARACTER_PALETTE_COLORS.end);

  return `linear-gradient(90deg, ${start} 0%, ${mid} 52%, ${end} 100%)`;
}

export function buildCharacterPaletteGradientVertical(colors: CharacterPaletteColors): string {
  const start = normalizePaletteColor(colors.start, DEFAULT_CHARACTER_PALETTE_COLORS.start);
  const mid = normalizePaletteColor(colors.mid, DEFAULT_CHARACTER_PALETTE_COLORS.mid);
  const end = normalizePaletteColor(colors.end, DEFAULT_CHARACTER_PALETTE_COLORS.end);

  return `linear-gradient(180deg, ${start} 0%, ${mid} 46%, ${end} 100%)`;
}

export const DEFAULT_CHARACTER_PALETTE = buildCharacterPaletteGradient(
  DEFAULT_CHARACTER_PALETTE_COLORS,
);

export function parseCharacterPalette(palette: string | undefined): CharacterPaletteColors {
  const trimmed = palette?.trim() ?? "";
  if (!trimmed) {
    return { ...DEFAULT_CHARACTER_PALETTE_COLORS };
  }

  if (trimmed.startsWith("linear-gradient(")) {
    const stops = extractGradientColorStops(trimmed);
    if (stops.length >= 3) {
      return {
        start: stops[0] ?? DEFAULT_CHARACTER_PALETTE_COLORS.start,
        mid: stops[Math.floor(stops.length / 2)] ?? DEFAULT_CHARACTER_PALETTE_COLORS.mid,
        end: stops[stops.length - 1] ?? DEFAULT_CHARACTER_PALETTE_COLORS.end,
      };
    }
  }

  const legacyGradient = paletteBackgrounds[trimmed];
  if (legacyGradient) {
    return parseCharacterPalette(legacyGradient);
  }

  return { ...DEFAULT_CHARACTER_PALETTE_COLORS };
}

export function resolveCharacterPalette(palette: string | undefined): string {
  const trimmed = palette?.trim() ?? "";
  if (!trimmed) {
    return DEFAULT_CHARACTER_PALETTE;
  }

  if (trimmed.startsWith("linear-gradient(")) {
    return buildCharacterPaletteGradient(parseCharacterPalette(trimmed));
  }

  if (paletteBackgrounds[trimmed]) {
    return paletteBackgrounds[trimmed];
  }

  return DEFAULT_CHARACTER_PALETTE;
}

export function characterPaletteStyle(palette: string): PaletteStyle {
  const resolved = resolveCharacterPalette(palette);
  const colors = parseCharacterPalette(resolved);

  return {
    "--character-palette-background": resolved,
    "--character-palette-background-vertical": buildCharacterPaletteGradientVertical(colors),
  };
}

export function normalizeCharacterPaletteInput(palette: string | undefined): string {
  return resolveCharacterPalette(palette);
}

const rgbToHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

export function extractCharacterPaletteFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const sampleSize = 48;
      const scale = Math.min(sampleSize / image.width, sampleSize / image.height, 1);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();

      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha < 180) continue;

        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const brightness = (red + green + blue) / 3;

        if (brightness < 18 || brightness > 242) continue;

        const key = `${Math.round(red / 32)}-${Math.round(green / 32)}-${Math.round(blue / 32)}`;
        const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
        bucket.count += 1;
        bucket.red += red;
        bucket.green += green;
        bucket.blue += blue;
        buckets.set(key, bucket);
      }

      const colors = [...buckets.values()]
        .sort((left, right) => right.count - left.count)
        .slice(0, 5)
        .map((bucket) => ({
          red: Math.round(bucket.red / bucket.count),
          green: Math.round(bucket.green / bucket.count),
          blue: Math.round(bucket.blue / bucket.count),
        }));

      URL.revokeObjectURL(objectUrl);

      if (colors.length === 0) {
        resolve(null);
        return;
      }

      const darkColor = colors.reduce((darkest, color) =>
        color.red + color.green + color.blue < darkest.red + darkest.green + darkest.blue
          ? color
          : darkest,
      );
      const lightColor = colors.reduce((lightest, color) =>
        color.red + color.green + color.blue > lightest.red + lightest.green + lightest.blue
          ? color
          : lightest,
      );
      const accentColor = colors[Math.min(1, colors.length - 1)];

      resolve(
        buildCharacterPaletteGradient({
          start: rgbToHex(lightColor.red, lightColor.green, lightColor.blue),
          mid: rgbToHex(accentColor.red, accentColor.green, accentColor.blue),
          end: rgbToHex(darkColor.red, darkColor.green, darkColor.blue),
        }),
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

export { defaultPaletteKey as LEGACY_DEFAULT_PALETTE_KEY };
