"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface TextCorruptorProviderProps {
  children: ReactNode;
}

type CorruptCandidate =
  | {
      type: "text";
      node: Text;
      value: string;
    }
  | {
      type: "attribute";
      element: HTMLElement;
      attribute: "data-character-id";
      value: string;
    };

type RestoreAction = () => void;

const DEFAULT_GLITCH_CHARS = ["0", "1", "/", "\\", "_", "-", "#", "?", "!", "."];
const CORRUPT_INTERVALS_MS = [4000, 5000, 6000, 7000, 8000];
const CORRUPT_VISIBLE_MS = 520;
const MIN_CORRUPT_TEXTS = 4;
const MAX_CORRUPT_TEXTS = 6;

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomCorruptCount() {
  return MIN_CORRUPT_TEXTS + Math.floor(Math.random() * (MAX_CORRUPT_TEXTS - MIN_CORRUPT_TEXTS + 1));
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function corruptText(text: string, preserveFirstLetter = false) {
  return text
    .split("")
    .map((letter, index) => {
      if (!letter.trim() || (preserveFirstLetter && index === 0) || Math.random() > 0.42) {
        return letter;
      }

      return getRandomItem(DEFAULT_GLITCH_CHARS);
    })
    .join("");
}

function isCorruptableElement(element: Element) {
  if (
    element.closest(
      "script, style, noscript, textarea, select, option, [data-text-corruptor-ignore]",
    )
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

function collectCorruptCandidates() {
  const candidates: CorruptCandidate[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      const value = node.nodeValue?.trim() ?? "";

      if (!parent || value.length < 2 || !isCorruptableElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    candidates.push({ type: "text", node, value: node.nodeValue ?? "" });
  }

  document.querySelectorAll<HTMLElement>("[data-character-id]").forEach((element) => {
    const value = element.getAttribute("data-character-id") ?? "";

    if (value.length >= 2 && isCorruptableElement(element)) {
      candidates.push({ type: "attribute", element, attribute: "data-character-id", value });
    }
  });

  return candidates;
}

function applyCorruption(candidates: CorruptCandidate[]) {
  return candidates.map<RestoreAction>((candidate) => {
    if (candidate.type === "attribute") {
      candidate.element.setAttribute(candidate.attribute, corruptText(candidate.value, true));

      return () => {
        if (candidate.element.isConnected) {
          candidate.element.setAttribute(candidate.attribute, candidate.value);
        }
      };
    }

    candidate.node.nodeValue = corruptText(candidate.value);

    return () => {
      if (candidate.node.isConnected) {
        candidate.node.nodeValue = candidate.value;
      }
    };
  });
}

export function TextCorruptorProvider({ children }: TextCorruptorProviderProps) {
  const restoreActionsRef = useRef<RestoreAction[]>([]);

  useEffect(() => {
    let corruptTimer: number | undefined;
    let clearTimer: number | undefined;

    const restoreTexts = () => {
      restoreActionsRef.current.forEach((restore) => restore());
      restoreActionsRef.current = [];
    };

    const scheduleNextCorruption = () => {
      corruptTimer = window.setTimeout(() => {
        restoreTexts();

        const candidates = collectCorruptCandidates();
        const corruptCount = Math.min(getRandomCorruptCount(), candidates.length);
        const selectedCandidates = shuffleItems(candidates).slice(0, corruptCount);

        restoreActionsRef.current = applyCorruption(selectedCandidates);
        clearTimer = window.setTimeout(() => {
          restoreTexts();
          scheduleNextCorruption();
        }, CORRUPT_VISIBLE_MS);
      }, getRandomItem(CORRUPT_INTERVALS_MS));
    };

    scheduleNextCorruption();

    return () => {
      if (corruptTimer) window.clearTimeout(corruptTimer);
      if (clearTimer) window.clearTimeout(clearTimer);
      restoreTexts();
    };
  }, []);

  return <>{children}</>;
}
