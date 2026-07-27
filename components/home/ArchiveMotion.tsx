"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/utils/cn";

type ArchiveMotionVariant = "enter" | "scan" | "stagger";

type ArchiveMotionProps<T extends ElementType = "div"> = {
  children: ReactNode;
  className?: string;
  motionKey?: string | number;
  variant?: ArchiveMotionVariant;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Fade/reveal timing. Kept deliberate so section switches read as
 * “gone → back” without feeling abrupt.
 */
const MOTION_TIMING = {
  enter: { duration: 780, offsetY: 10 },
  scan: { duration: 700, offsetY: 6 },
  stagger: { duration: 720, delay: 90, offsetY: 12 },
} as const;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const hiddenStyle = (variant: ArchiveMotionVariant): CSSProperties => {
  if (variant === "stagger") return {};

  const offsetY = variant === "scan" ? MOTION_TIMING.scan.offsetY : MOTION_TIMING.enter.offsetY;

  return variant === "scan"
    ? {
        opacity: 0,
        clipPath: "inset(0 0 100% 0)",
        transform: `translate3d(0, ${offsetY}px, 0)`,
      }
    : {
        opacity: 0,
        transform: `translate3d(0, ${offsetY}px, 0)`,
      };
};

const applyHiddenState = (node: HTMLElement, variant: ArchiveMotionVariant) => {
  if (variant !== "stagger") {
    Object.assign(node.style, hiddenStyle(variant));
    return;
  }

  Array.from(node.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .forEach((child) => {
      child.style.opacity = "0";
      child.style.transform = `translate3d(0, ${MOTION_TIMING.stagger.offsetY}px, 0)`;
    });
};

const applyVisibleState = (node: HTMLElement, variant: ArchiveMotionVariant) => {
  if (variant !== "stagger") {
    node.style.opacity = "1";
    node.style.transform = "translate3d(0, 0, 0)";
    node.style.clipPath = "";
    return;
  }

  Array.from(node.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .forEach((child) => {
      child.style.opacity = "1";
      child.style.transform = "translate3d(0, 0, 0)";
    });
};

const playEnterAnimation = (node: HTMLElement, variant: ArchiveMotionVariant) => {
  if (prefersReducedMotion()) return [];

  if (variant === "stagger") {
    return Array.from(node.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map((child, index) =>
        child.animate(
          [
            {
              opacity: 0,
              transform: `translate3d(0, ${MOTION_TIMING.stagger.offsetY}px, 0)`,
            },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: MOTION_TIMING.stagger.duration,
            delay: index * MOTION_TIMING.stagger.delay,
            easing: MOTION_EASING,
            fill: "forwards",
          },
        ),
      );
  }

  const preset = variant === "scan" ? MOTION_TIMING.scan : MOTION_TIMING.enter;

  if (variant === "scan") {
    return [
      node.animate(
        [
          {
            opacity: 0,
            clipPath: "inset(0 0 100% 0)",
            transform: `translate3d(0, ${preset.offsetY}px, 0)`,
          },
          {
            opacity: 1,
            clipPath: "inset(0 0 0 0)",
            transform: "translate3d(0, 0, 0)",
          },
        ],
        {
          duration: preset.duration,
          easing: MOTION_EASING,
          fill: "forwards",
        },
      ),
    ];
  }

  return [
    node.animate(
      [
        { opacity: 0, transform: `translate3d(0, ${preset.offsetY}px, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: preset.duration,
        easing: MOTION_EASING,
        fill: "forwards",
      },
    ),
  ];
};

/**
 * Replays a fade/reveal whenever `motionKey` changes (section enter, file switch, tab scan).
 * Uses WAAPI so performance-mode CSS `animation-duration: 0.001ms` does not kill it.
 */
export function ArchiveMotion<T extends ElementType = "div">({
  children,
  className,
  motionKey,
  variant = "enter",
  as,
  style,
  ...rest
}: ArchiveMotionProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const nodeRef = useRef<HTMLElement | null>(null);
  const motionToken = motionKey ?? "static";

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const reduceMotion = prefersReducedMotion();

    if (reduceMotion) {
      applyVisibleState(node, variant);
      return;
    }

    applyHiddenState(node, variant);

    const animations = playEnterAnimation(node, variant);

    if (animations.length === 0) {
      applyVisibleState(node, variant);
      return;
    }

    let cancelled = false;

    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (cancelled) return;
        applyVisibleState(node, variant);
      })
      .catch(() => {
        if (cancelled) return;
        applyVisibleState(node, variant);
      });

    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
      applyVisibleState(node, variant);
    };
  }, [motionToken, variant]);

  return (
    <Tag
      ref={nodeRef as never}
      className={cn(
        variant === "stagger" ? "archive-motion-stagger" : "archive-motion-host",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
