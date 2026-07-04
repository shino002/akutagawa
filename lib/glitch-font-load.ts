import { GLITCH_FONT_PRESETS, normalizeGlitchFontPreset } from "@/constants/glitch-font-presets";

/**
 * 구간 폰트 프리셋용 웹폰트를 최초 1회만 lazy-load 합니다.
 * `woff:` 접두사는 단일 @font-face 주입, 그 외는 stylesheet link.
 */
const loaded = new Set<string>();

function woffFormat(url: string) {
  return url.endsWith(".woff2") ? "woff2" : "woff";
}

function primaryFontFamily(family: string) {
  const first = family.split(",")[0]?.trim() ?? family;
  return first.replace(/^["']|["']$/g, "");
}

export function ensureGlitchFontLoaded(href: string | undefined, family?: string) {
  if (!href || typeof document === "undefined") {
    return;
  }

  if (href.startsWith("woff:")) {
    const url = href.slice(5);
    const key = `woff:${family ?? ""}:${url}`;
    if (loaded.has(key) || !family) {
      return;
    }

    loaded.add(key);
    const format = woffFormat(url);
    const faceFamily = primaryFontFamily(family);
    const style = document.createElement("style");
    style.textContent = `@font-face{font-family:'${faceFamily.replace(/'/g, "\\'")}';src:url('${url}') format('${format}');font-display:swap;font-weight:400;font-style:normal}`;
    document.head.appendChild(style);
    return;
  }

  if (loaded.has(href)) {
    return;
  }

  loaded.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const PRESET_BY_ID = new Map(GLITCH_FONT_PRESETS.map((preset) => [preset.id, preset]));

export function ensureGlitchFontPresetLoaded(presetId?: string) {
  const id = normalizeGlitchFontPreset(presetId);
  if (!id || typeof document === "undefined") {
    return;
  }

  const preset = PRESET_BY_ID.get(id);
  if (!preset?.load) {
    return;
  }

  ensureGlitchFontLoaded(preset.load, preset.family);
}
