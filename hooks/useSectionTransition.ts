"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export type SectionTransitionPhase = "idle" | "out" | "in";
export type SectionTransitionVariant = "full" | "soft" | "slide";

type UseSectionTransitionOptions = {
  key: string;
  /**
   * 뒤로가기 방향 플래그. 렌더 중에는 읽지 않고, key 전환 effect 에서만 소비합니다.
   */
  isBackRef: MutableRefObject<boolean>;
};

type ParsedTransitionKey = {
  section: string;
  characterId: string;
  subPageId: string;
};

type SectionTransitionState = {
  displayedKey: string;
  phase: SectionTransitionPhase;
  variant: SectionTransitionVariant;
  isBack: boolean;
};

/**
 * page-turn.css 의 out / in 지속시간과 맞춰야 합니다.
 * soft/slide 의 in 은 CSS에 하드코딩되어 있습니다.
 */
const OUT_MS: Record<SectionTransitionVariant, number> = {
  full: 300,
  soft: 150,
  slide: 130,
};

const IN_MS: Record<SectionTransitionVariant, number> = {
  full: 300,
  soft: 190,
  slide: 170,
};

const parseTransitionKey = (key: string): ParsedTransitionKey => {
  const [section = "", characterId = "", subPageId = ""] = key.split("|");
  return { section, characterId, subPageId };
};

/**
 * 이전 key → 새 key 비교로 전환 강도를 고릅니다.
 * 1) subPageId 만 변경 → full
 * 2) 캐릭터 상세 진입(빈 id → 값) → full
 * 3) section 변경 → soft
 * 4) 그 외 → slide
 */
const resolveVariant = (previousKey: string, nextKey: string): SectionTransitionVariant => {
  const prev = parseTransitionKey(previousKey);
  const next = parseTransitionKey(nextKey);

  if (
    prev.section === next.section &&
    prev.characterId === next.characterId &&
    prev.subPageId !== next.subPageId
  ) {
    return "full";
  }

  if (prev.section === next.section && prev.characterId === "" && next.characterId !== "") {
    return "full";
  }

  if (prev.section !== next.section) {
    return "soft";
  }

  return "slide";
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

/**
 * 화면에 그리는 key(displayed)를 실제 key보다 한 박자 늦춰
 * 나가는 애니메이션이 끝난 뒤 내용을 교체합니다.
 */
export const useSectionTransition = ({ key, isBackRef }: UseSectionTransitionOptions) => {
  const [state, setState] = useState<SectionTransitionState>(() => ({
    displayedKey: key,
    phase: "idle",
    variant: "soft",
    isBack: false,
  }));

  const displayedKeyRef = useRef(key);
  const phaseRef = useRef<SectionTransitionPhase>("idle");
  const targetKeyRef = useRef(key);

  useEffect(() => {
    targetKeyRef.current = key;
    let cancelled = false;

    const run = async () => {
      // effect 본문에서 동기 setState 를 피하기 위해 한 틱 양보
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (key === displayedKeyRef.current && phaseRef.current === "idle") {
        return;
      }

      // 연타로 다시 현재 표시 key 로 돌아온 경우 — 진행 중 전환 취소
      if (key === displayedKeyRef.current) {
        phaseRef.current = "idle";
        setState((prev) => ({
          ...prev,
          displayedKey: key,
          phase: "idle",
        }));
        return;
      }

      if (prefersReducedMotion()) {
        displayedKeyRef.current = key;
        phaseRef.current = "idle";
        setState({
          displayedKey: key,
          phase: "idle",
          variant: "soft",
          isBack: false,
        });
        return;
      }

      const fromKey = displayedKeyRef.current;
      const variant = resolveVariant(fromKey, key);
      const back = isBackRef.current;
      isBackRef.current = false;

      phaseRef.current = "out";
      setState({
        displayedKey: fromKey,
        phase: "out",
        variant,
        isBack: back,
      });

      await wait(OUT_MS[variant]);
      if (cancelled || targetKeyRef.current !== key) {
        return;
      }

      displayedKeyRef.current = key;
      phaseRef.current = "in";
      setState({
        displayedKey: key,
        phase: "in",
        variant,
        isBack: back,
      });

      await wait(IN_MS[variant]);
      if (cancelled || targetKeyRef.current !== key) {
        return;
      }

      phaseRef.current = "idle";
      setState((prev) => ({
        ...prev,
        phase: "idle",
      }));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [key, isBackRef]);

  const turnClass =
    state.phase === "idle"
      ? ""
      : `turn-${state.variant}-${state.phase}${state.isBack ? "-back" : ""}`;

  const displayed = parseTransitionKey(state.displayedKey);

  return {
    displayedKey: state.displayedKey,
    displayedSection: displayed.section,
    displayedCharacterId: displayed.characterId,
    displayedSubPageId: displayed.subPageId,
    phase: state.phase,
    variant: state.variant,
    isBack: state.isBack,
    className: cn(state.phase !== "idle" && "is-turning", turnClass),
  };
};
