import type { CSSProperties } from "react";

const paletteBackgrounds: Record<string, string> = {
  "from-zinc-950 via-black to-zinc-900": "linear-gradient(90deg, #09090b 0%, #000 52%, #18181b 100%)",
  "from-zinc-700 via-zinc-950 to-black": "linear-gradient(90deg, #3f3f46 0%, #09090b 52%, #000 100%)",
  "from-zinc-200 via-zinc-800 to-black": "linear-gradient(90deg, #e4e4e7 0%, #27272a 52%, #000 100%)",
  "from-stone-300 via-zinc-800 to-black": "linear-gradient(90deg, #d6d3d1 0%, #27272a 52%, #000 100%)",
  "from-neutral-700 via-neutral-950 to-black": "linear-gradient(90deg, #404040 0%, #0a0a0a 52%, #000 100%)",
  "from-slate-300 via-slate-900 to-black": "linear-gradient(90deg, #cbd5e1 0%, #0f172a 52%, #000 100%)",
};
const defaultPalette = "from-zinc-950 via-black to-zinc-900";

type PaletteStyle = CSSProperties & {
  "--character-palette-background": string;
};

export function characterPaletteStyle(palette: string): PaletteStyle {
  const trimmedPalette = palette.trim();

  return {
    "--character-palette-background":
      trimmedPalette.startsWith("linear-gradient(")
        ? trimmedPalette
        : paletteBackgrounds[trimmedPalette] ?? paletteBackgrounds[defaultPalette],
  };
}
