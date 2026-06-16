"use client";

import { type ReactNode, useEffect, useRef } from "react";

const GLITCH_CHARS = ["�", "█", "▓", "▒", "░", "?", "/", "\\", "#"];
const EXCLUDED_SELECTOR =
  "script, style, textarea, input, select, option, [contenteditable='true'], [aria-hidden='true'], .auth-input, .bgm-player";
const CORRUPTION_DURATION_MS = 500;
const MIN_CORRUPTION_INTERVAL_MS = 4000;
const MAX_CORRUPTION_INTERVAL_MS = 8000;
const MAX_CORRUPTED_NODES = 5;

type CorruptedTextNode = {
  corruptedText: string;
  node: Text;
  originalText: string;
};

type WindowWithTextCorruptor = Window &
  typeof globalThis & {
    __textCorruptorCleanup?: () => void;
  };

const canCorruptTextNode = (node: Text): boolean => {
  const parent = node.parentElement;
  if (!parent || parent.closest(EXCLUDED_SELECTOR)) return false;

  const text = node.data;
  if (!text.trim() || text.trim().length < 2) return false;

  return true;
};

const isTextNodeInViewport = (node: Text): boolean => {
  const parent = node.parentElement;
  if (!parent) return false;

  const rect = parent.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

const pickRandomNodes = (nodes: Text[], count: number): Text[] => {
  const selectedNodes: Text[] = [];
  const usedIndexes = new Set<number>();

  while (selectedNodes.length < count && usedIndexes.size < nodes.length) {
    const index = Math.floor(Math.random() * nodes.length);

    if (!usedIndexes.has(index)) {
      usedIndexes.add(index);
      selectedNodes.push(nodes[index]);
    }
  }

  return selectedNodes;
};

const getNextCorruptionDelay = (): number => {
  return (
    MIN_CORRUPTION_INTERVAL_MS +
    Math.random() * (MAX_CORRUPTION_INTERVAL_MS - MIN_CORRUPTION_INTERVAL_MS)
  );
};

const corruptText = (text: string): string => {
  const chars = Array.from(text);
  const visibleIndexes = chars
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => char.trim().length > 0)
    .map(({ index }) => index);

  if (visibleIndexes.length === 0) return text;

  const changes = 1;

  for (let count = 0; count < changes; count += 1) {
    const index = visibleIndexes[Math.floor(Math.random() * visibleIndexes.length)];
    chars[index] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }

  return chars.join("");
};

interface TextCorruptorProviderProps {
  children: ReactNode;
}

/**
 * 화면에 보이는 텍스트 일부를 잠깐 깨뜨렸다가 되돌리는 전역 글리치 효과를 적용합니다.
 * 자식 트리를 그대로 렌더링하며, 페이지의 <main> 안 텍스트 노드를 주기적으로 변형합니다.
 */
export function TextCorruptorProvider({ children }: TextCorruptorProviderProps) {
  const corruptedNodesRef = useRef<CorruptedTextNode[]>([]);
  const isCorruptingRef = useRef(false);
  const nextRunTimeoutRef = useRef<number | null>(null);
  const textNodesRef = useRef<Text[]>([]);
  const restoreTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const browserWindow = window as WindowWithTextCorruptor;
    browserWindow.__textCorruptorCleanup?.();

    function collectTextNodes(root: Element) {
      const nodes: Text[] = [];

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return canCorruptTextNode(node as Text)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      });

      let currentNode = walker.nextNode();

      while (currentNode) {
        nodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }

      return nodes;
    }

    function refreshTextNodes() {
      const root = document.querySelector("main");
      textNodesRef.current = root ? collectTextNodes(root) : [];
    }

    function restoreTextNodes() {
      corruptedNodesRef.current.forEach(({ node, originalText }) => {
        if (node.isConnected) {
          node.data = originalText;
        }
      });
      corruptedNodesRef.current = [];
      isCorruptingRef.current = false;
    }

    function runCorruption() {
      if (isCorruptingRef.current) {
        scheduleNextCorruption();
        return;
      }

      const nodes = textNodesRef.current.filter(
        (node) => canCorruptTextNode(node) && isTextNodeInViewport(node),
      );
      if (nodes.length === 0) {
        scheduleNextCorruption();
        return;
      }

      isCorruptingRef.current = true;
      const selectedNodes = pickRandomNodes(nodes, Math.min(nodes.length, MAX_CORRUPTED_NODES));
      const corruptedNodes = selectedNodes.map((node) => {
        const originalText = node.data;
        const corruptedText = corruptText(originalText);
        return { corruptedText, node, originalText };
      });
      corruptedNodesRef.current = corruptedNodes;

      corruptedNodes.forEach(({ corruptedText, node }) => {
        node.data = corruptedText;
      });

      restoreTimeoutRef.current = window.setTimeout(() => {
        restoreTextNodes();
        scheduleNextCorruption();
      }, CORRUPTION_DURATION_MS);
    }

    function scheduleNextCorruption() {
      if (nextRunTimeoutRef.current) {
        window.clearTimeout(nextRunTimeoutRef.current);
      }
      nextRunTimeoutRef.current = window.setTimeout(runCorruption, getNextCorruptionDelay());
    }

    refreshTextNodes();

    const root = document.querySelector("main");
    const observer = root
      ? new MutationObserver(() => {
          if (!isCorruptingRef.current) {
            refreshTextNodes();
          }
        })
      : null;

    if (root && observer) {
      observer.observe(root, { childList: true, subtree: true });
    }

    const initialTimeoutId = window.setTimeout(runCorruption, 1400);

    function cleanup() {
      window.clearTimeout(initialTimeoutId);
      if (nextRunTimeoutRef.current) {
        window.clearTimeout(nextRunTimeoutRef.current);
      }
      if (restoreTimeoutRef.current) {
        window.clearTimeout(restoreTimeoutRef.current);
      }
      observer?.disconnect();
      restoreTextNodes();
      if (browserWindow.__textCorruptorCleanup === cleanup) {
        browserWindow.__textCorruptorCleanup = undefined;
      }
    }

    browserWindow.__textCorruptorCleanup = cleanup;

    return cleanup;
  }, []);

  return <>{children}</>;
}
