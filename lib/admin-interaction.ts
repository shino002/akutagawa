import type { MouseEvent } from "react";

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
