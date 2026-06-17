type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  size: number;
};

type PdfLine = {
  text: string;
  paragraphBreak: boolean;
};

const LINE_Y_TOLERANCE = 2;
const PARAGRAPH_GAP_FACTOR = 1.85;
const WORD_GAP_FACTOR = 0.35;
const SENTENCE_END = /[.!?…"'」』)]\s*$/;
const DIALOGUE_START = /^[-–—]/;

function toPdfTextItems(
  items: Array<{ str?: string; transform: number[]; width?: number }>,
): PdfTextItem[] {
  return items
    .filter((item): item is { str: string; transform: number[]; width?: number } => {
      return typeof item.str === "string" && item.str.length > 0;
    })
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      size: Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 12,
    }));
}

function buildLines(items: PdfTextItem[]): PdfLine[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x);
  const groupedLines: PdfTextItem[][] = [];
  let currentLine = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const item = sorted[index];
    if (Math.abs(item.y - currentLine[0].y) <= LINE_Y_TOLERANCE) {
      currentLine.push(item);
      continue;
    }

    groupedLines.push(currentLine);
    currentLine = [item];
  }
  groupedLines.push(currentLine);

  const gaps: number[] = [];
  for (let index = 1; index < groupedLines.length; index += 1) {
    gaps.push(groupedLines[index - 1][0].y - groupedLines[index][0].y);
  }
  gaps.sort((left, right) => left - right);
  const medianGap = gaps[Math.floor(gaps.length / 2)] || 16;
  const paragraphGap = medianGap * PARAGRAPH_GAP_FACTOR;

  const rawLines: PdfLine[] = [];
  for (let lineIndex = 0; lineIndex < groupedLines.length; lineIndex += 1) {
    const line = groupedLines[lineIndex].sort((left, right) => left.x - right.x);
    let text = "";
    let previousEnd: number | null = null;

    for (const item of line) {
      if (previousEnd !== null && item.x - previousEnd > item.size * WORD_GAP_FACTOR) {
        text += " ";
      }
      text += item.str;
      previousEnd = item.x + item.str.length * item.size * 0.5;
    }

    rawLines.push({
      text: text.replace(/\s+/g, " ").trim(),
      paragraphBreak:
        lineIndex < groupedLines.length - 1 &&
        groupedLines[lineIndex][0].y - groupedLines[lineIndex + 1][0].y >= paragraphGap,
    });
  }

  const merged: string[] = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const currentLine = rawLines[index];
    if (!merged.length) {
      merged.push(currentLine.text);
      continue;
    }

    const previousLine = rawLines[index - 1];
    const shouldJoin =
      !previousLine.paragraphBreak &&
      !SENTENCE_END.test(previousLine.text) &&
      !DIALOGUE_START.test(currentLine.text) &&
      !DIALOGUE_START.test(previousLine.text);

    if (shouldJoin) {
      merged[merged.length - 1] += currentLine.text;
    } else {
      merged.push(currentLine.text);
    }
  }

  return merged.filter(Boolean).map((text, index, lines) => ({
    text,
    paragraphBreak: index < lines.length - 1,
  }));
}

function fixKoreanPunctuationSpacing(text: string): string {
  return text
    .replace(/([.!?…])(?=[가-힣])/g, "$1 ")
    .replace(/,(?=[가-힣])/g, ", ")
    .replace(/\.{3}(?=[가-힣])/g, "... ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyDialogueMarkup(paragraph: string): string {
  const trimmed = paragraph.trim();
  if (!DIALOGUE_START.test(trimmed)) {
    return trimmed;
  }

  return `$${trimmed}$`;
}

export function layoutPdfTextContent(
  items: Array<{ str?: string; transform: number[]; width?: number }>,
): string {
  const lines = buildLines(toPdfTextItems(items));
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    currentParagraph.push(fixKoreanPunctuationSpacing(line.text));

    if (line.paragraphBreak) {
      paragraphs.push(currentParagraph.map(applyDialogueMarkup).join("\n"));
      currentParagraph = [];
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.map(applyDialogueMarkup).join("\n"));
  }

  return paragraphs.filter(Boolean).join("\n\n");
}
