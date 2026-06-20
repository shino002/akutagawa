import { readContentEditableSelection } from "@/lib/contenteditable-glitch";
import { readGlitchTextSelection, type GlitchTextSelection } from "@/lib/glitch-selection";
import type { MouseEvent } from "react";

export const GLITCH_FLOAT_TOOLBAR_SELECTOR = "[data-glitch-float-toolbar]";

function resolvePointerElement(target: EventTarget | null) {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Text) {
    return target.parentElement;
  }

  return null;
}

/** 관리자 폼에서 textarea 선택 유지용. 인터랙티브 요소는 네이티브 동작을 막지 않습니다. */
export function shouldPreserveAdminPointerDown(event: MouseEvent | globalThis.MouseEvent) {
  const element = resolvePointerElement(event.target);
  if (!element) {
    return false;
  }

  return Boolean(
    element.closest(
      "input, select, textarea, button, option, label, a, [data-admin-interactive], [data-text-corruptor-ignore]",
    ),
  );
}

export function keepAdminTextSelection(event: MouseEvent) {
  if (shouldPreserveAdminPointerDown(event)) {
    return;
  }

  event.preventDefault();
}

/**
 * TextScrambleTool 안 버튼·칩 클릭 시 textarea DOM 선택이 풀리며 구간 편집이 닫히는 것을 막습니다.
 * textarea·input·select·summary는 포커스/토글을 그대로 둡니다.
 */
export function preserveAdminGlitchToolPointerDown(event: MouseEvent | globalThis.MouseEvent) {
  const element = resolvePointerElement(event.target);
  if (!element?.closest("[data-text-scramble-tool]")) {
    return;
  }

  if (element.closest("textarea, input, select, option, summary")) {
    return;
  }

  event.preventDefault();
}

/** 플로팅 툴바 클릭 시 원본 필드의 텍스트 선택이 풀리지 않게 합니다. */
export function preserveGlitchToolbarSourceSelection(event: MouseEvent | globalThis.MouseEvent) {
  event.preventDefault();
}

export function isGlitchFloatToolbarTarget(target: EventTarget | null) {
  const element = resolvePointerElement(target);
  return Boolean(element?.closest(GLITCH_FLOAT_TOOLBAR_SELECTOR));
}

export function isGlitchFieldTarget(target: EventTarget | null) {
  const element = resolvePointerElement(target);
  return Boolean(element?.closest("[data-glitch-field], [data-text-scramble-tool]"));
}

export function readGlitchFieldSelection(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
): GlitchTextSelection | null {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return readGlitchTextSelection(element);
  }

  if (element.isContentEditable) {
    return readContentEditableSelection(element);
  }

  return null;
}
