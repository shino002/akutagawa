export type GlitchTextSelection = {
  start: number;
  end: number;
  text: string;
};

export function createGlitchSelectionFromRange(
  text: string,
  startIndex: number,
  endIndex: number,
): GlitchTextSelection | null {
  const start = Math.max(0, Math.min(startIndex, text.length));
  const end = Math.max(start, Math.min(endIndex, text.length));

  if (start >= end) {
    return null;
  }

  return {
    start,
    end,
    text: text.slice(start, end),
  };
}

export function findGlitchTextSelection(text: string, query: string): GlitchTextSelection | null {
  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  const index = text.indexOf(trimmed);

  if (index === -1) {
    return null;
  }

  return {
    start: index,
    end: index + trimmed.length,
    text: trimmed,
  };
}

export function getGlitchTextTokenSpans(text: string) {
  const spans: GlitchTextSelection[] = [];
  const pattern = /\S+/g;
  let match = pattern.exec(text);

  while (match) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
    match = pattern.exec(text);
  }

  return spans;
}

export function readGlitchTextSelection(element: HTMLInputElement | HTMLTextAreaElement) {
  const start = element.selectionStart ?? 0;
  const end = element.selectionEnd ?? 0;

  if (start === end) {
    return null;
  }

  return {
    start,
    end,
    text: element.value.slice(start, end),
  } satisfies GlitchTextSelection;
}

/** mouseup 직후에는 selectionStart/End가 아직 갱신되지 않은 경우가 있어 한 틱 미룹니다. */
export function scheduleReadGlitchTextSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
  callback: (selection: GlitchTextSelection | null) => void,
) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      callback(readGlitchTextSelection(element));
    });
  });
}
