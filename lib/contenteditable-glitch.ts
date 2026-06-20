import { glitchConfigSignature } from "@/lib/glitch-fields";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import { mergeGlitchZoneStyles, resolveGlitchZonePresentation, glitchZoneHasCustomTextColor } from "@/lib/glitch-style";
import { parseStoryMarkup, storyTextHasMarkup } from "@/lib/story-text";
import type { FieldGlitchConfig, GlitchZone } from "@/lib/types";
import { zoneUsesErrorAlternation } from "@/lib/glitch-scramble-options";
import { cn } from "@/utils/cn";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleToAttribute(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        key !== "backgroundColor" &&
        key !== "background" &&
        key !== "boxShadow" &&
        key !== "textShadow",
    )
    .map(([key, value]) => {
      if (key.startsWith("--")) {
        return `${key}:${value}`;
      }

      const cssKey = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
      return `${cssKey}:${value}`;
    })
    .join(";");
}

function wrapZoneText(text: string, zone: GlitchZone, config?: FieldGlitchConfig): string {
  const mergedStyle = mergeGlitchZoneStyles(zone.style, config?.defaultStyle);
  const { inlineStyle, decoration } = resolveGlitchZonePresentation(mergedStyle);
  const isError = config ? zoneUsesErrorAlternation(zone, config) : false;
  const className = cn(
    "admin-inline-zone glitch-zone-mark",
    decoration.bold && "glitch-zone-has-bold",
    decoration.italic && "glitch-zone-has-italic",
    decoration.underline && "glitch-zone-has-underline",
    decoration.strikethrough && "glitch-zone-has-strikethrough",
    mergedStyle.storyQuote && "story-inline-quote",
    glitchZoneHasCustomTextColor(mergedStyle) && "glitch-zone-has-custom-color",
    isError && "admin-inline-zone-error",
  );
  const styleAttr = styleToAttribute(inlineStyle as Record<string, string | number | undefined>);

  return `<span class="${className}"${styleAttr ? ` style="${styleAttr}"` : ""} data-zone-id="${zone.id}">${escapeHtml(text).replace(/\n/g, "<br>")}</span>`;
}

function renderStorySegmentHtml(segment: ReturnType<typeof parseStoryMarkup>[number]): string {
  const content = escapeHtml(segment.text).replace(/\n/g, "<br>");

  switch (segment.type) {
    case "bold":
      return `<strong class="admin-inline-story-mark">${content}</strong>`;
    case "italic":
      return `<em class="admin-inline-story-mark">${content}</em>`;
    case "boldItalic":
      return `<strong class="admin-inline-story-mark"><em>${content}</em></strong>`;
    case "boldQuote":
      return `<strong class="admin-inline-story-mark"><span class="story-inline-quote">${content}</span></strong>`;
    case "quote":
      return `<span class="story-inline-quote admin-inline-story-mark">${content}</span>`;
    default:
      return content;
  }
}

function buildStoryMarkupPreviewHtml(text: string): string {
  return parseStoryMarkup(text).map((segment) => renderStorySegmentHtml(segment)).join("");
}

export function buildFormattedEditorHtml(
  text: string,
  glitch?: FieldGlitchConfig,
  options?: { storyMarkup?: boolean },
): string {
  if (!text) {
    return "";
  }

  if (options?.storyMarkup && storyTextHasMarkup(text)) {
    return buildStoryMarkupPreviewHtml(text);
  }

  const zones = [...(glitch?.zones ?? [])].sort((left, right) => left.start - right.start);
  if (zones.length === 0) {
    return escapeHtml(text).replace(/\n/g, "<br>");
  }

  let html = "";
  let cursor = 0;

  for (const zone of zones) {
    const start = Math.max(0, Math.min(zone.start, text.length));
    const end = Math.max(start, Math.min(zone.end, text.length));

    if (start > cursor) {
      html += escapeHtml(text.slice(cursor, start)).replace(/\n/g, "<br>");
    }

    if (end > start) {
      html += wrapZoneText(text.slice(start, end), zone, glitch);
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor)).replace(/\n/g, "<br>");
  }

  return html;
}

export function readPlainTextFromEditor(root: HTMLElement): string {
  let result = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue ?? "";
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      result += "\n";
      return;
    }

    element.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return result.replace(/\r\n/g, "\n");
}

function walkTextNodes(root: Node, callback: (node: Text, offsetInRoot: number) => void) {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    callback(textNode, offset);
    offset += textNode.data.length;
    node = walker.nextNode();
  }
}

function locateTextPosition(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number {
  if (targetNode === root) {
    return Math.min(targetOffset, readPlainTextFromEditor(root).length);
  }

  let found = 0;
  let resolved = 0;
  let done = false;

  walkTextNodes(root, (textNode, offsetInRoot) => {
    if (done) {
      return;
    }

    if (textNode === targetNode) {
      resolved = offsetInRoot + targetOffset;
      done = true;
      return;
    }

    found = offsetInRoot + textNode.data.length;
  });

  return done ? resolved : found;
}

export function readContentEditableSelection(root: HTMLElement): GlitchTextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return null;
  }

  const start = locateTextPosition(root, range.startContainer, range.startOffset);
  const end = locateTextPosition(root, range.endContainer, range.endOffset);
  const normalizedStart = Math.min(start, end);
  const normalizedEnd = Math.max(start, end);

  if (normalizedStart === normalizedEnd) {
    return null;
  }

  const plain = readPlainTextFromEditor(root);

  return {
    start: normalizedStart,
    end: normalizedEnd,
    text: plain.slice(normalizedStart, normalizedEnd),
  };
}

export function scheduleReadContentEditableSelection(
  root: HTMLElement,
  callback: (selection: GlitchTextSelection | null) => void,
) {
  let cancelled = false;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      callback(readContentEditableSelection(root));
    });
  });

  return () => {
    cancelled = true;
  };
}

export function getZoneForSelection(
  glitch: FieldGlitchConfig | undefined,
  selection: GlitchTextSelection,
): GlitchZone | undefined {
  if (!glitch?.zones?.length) {
    return undefined;
  }

  const exact = glitch.zones.find(
    (zone) =>
      zone.start === selection.start &&
      zone.end === selection.end &&
      zone.original === selection.text,
  );

  if (exact) {
    return exact;
  }

  return glitch.zones.find(
    (zone) => selection.start >= zone.start && selection.end <= zone.end,
  );
}

export function getSelectionStyle(glitch: FieldGlitchConfig | undefined, selection: GlitchTextSelection) {
  const zone = getZoneForSelection(glitch, selection);
  return mergeGlitchZoneStyles(zone?.style, glitch?.defaultStyle);
}

export function editorGlitchSignature(text: string, glitch?: FieldGlitchConfig) {
  return glitchConfigSignature(text, glitch) ?? "plain";
}
