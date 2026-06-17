const MIRROR_PROPERTIES = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "MozTabSize",
] as const;

function copyTextareaStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  for (const property of MIRROR_PROPERTIES) {
    target.style.setProperty(property, computed.getPropertyValue(property));
  }

  target.style.position = "absolute";
  target.style.visibility = "hidden";
  target.style.whiteSpace = "pre-wrap";
  target.style.wordWrap = "break-word";
  target.style.top = "0";
  target.style.left = "-9999px";
}

function createRangeAtTextOffset(root: HTMLElement, offset: number): Range {
  const range = document.createRange();
  let remaining = Math.max(0, offset);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;

  while (node) {
    const length = node.data.length;
    if (remaining <= length) {
      range.setStart(node, remaining);
      range.collapse(true);
      return range;
    }

    remaining -= length;
    node = walker.nextNode() as Text | null;
  }

  range.selectNodeContents(root);
  range.collapse(false);
  return range;
}

function getContentEditableCaretRect(root: HTMLElement, position?: number): DOMRect | null {
  let range: Range | null = null;

  if (position !== undefined) {
    range = createRangeAtTextOffset(root, position);
  } else {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
      range.collapse(false);
    }
  }

  if (!range) {
    return root.getBoundingClientRect();
  }

  const rects = range.getClientRects();
  if (rects.length > 0) {
    return rects[rects.length - 1] ?? range.getBoundingClientRect();
  }

  return range.getBoundingClientRect();
}

export function getTextareaSelectionRect(
  element: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
  position?: number,
): DOMRect | null {
  if (element instanceof HTMLElement && element.isContentEditable) {
    return getContentEditableCaretRect(element, position);
  }

  if (!(element instanceof HTMLTextAreaElement)) {
    const rect = element.getBoundingClientRect();
    return new DOMRect(rect.left + rect.width / 2, rect.top, 0, rect.height);
  }

  const textarea = element;
  const caret = position ?? textarea.selectionEnd ?? textarea.selectionStart ?? 0;

  if (caret <= 0 && !textarea.value) {
    return textarea.getBoundingClientRect();
  }

  const mirror = document.createElement("div");
  copyTextareaStyles(textarea, mirror);
  mirror.textContent = textarea.value.slice(0, caret);

  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(caret) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  document.body.removeChild(mirror);

  const left = textareaRect.left + (markerRect.left - mirrorRect.left) - textarea.scrollLeft;
  const top =
    textareaRect.top + (markerRect.top - mirrorRect.top) - textarea.scrollTop + markerRect.height;

  return new DOMRect(left, top, 0, 0);
}

export function clampFloatingToolbarPosition(
  anchor: DOMRect,
  toolbarWidth: number,
  toolbarHeight: number,
  gap = 10,
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;

  let left = anchor.left - toolbarWidth / 2;
  let top = anchor.top - toolbarHeight - gap;

  if (top < margin) {
    top = anchor.top + gap;
  }

  if (left < margin) {
    left = margin;
  }

  if (left + toolbarWidth > viewportWidth - margin) {
    left = viewportWidth - toolbarWidth - margin;
  }

  if (top + toolbarHeight > viewportHeight - margin) {
    top = viewportHeight - toolbarHeight - margin;
  }

  return { left, top };
}
