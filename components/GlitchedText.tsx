"use client";

import { useMemo, useSyncExternalStore } from "react";
import { GlitchZoneMark } from "@/components/GlitchZoneMark";
import { TextGlitch } from "@/components/TextGlitch";
import { glitchConfigSignature, reanchorGlitchConfig } from "@/lib/glitch-fields";
import { fieldGlitchHasScramble, glitchScramblePhase } from "@/lib/glitch-style";
import {
  getGlitchPulseServerSnapshot,
  getGlitchPulseSnapshot,
  subscribeGlitchPulse,
} from "@/lib/glitch-ticker";
import { buildZoneDisplayText, composeTextSegments } from "@/lib/text-scramble";
import type { FieldGlitchConfig } from "@/lib/types";
import { cn } from "@/utils/cn";

interface GlitchedTextProps {
  text: string;
  glitch?: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  useCssGlitchFallback?: boolean;
  /** false면 관리자 미리보기처럼 번갈아 바뀌지 않고 고정 표시 */
  animate?: boolean;
}

interface GlitchedTextLiveProps {
  text: string;
  glitch: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  animate?: boolean;
}

function GlitchedTextLive({
  text,
  glitch,
  className,
  glitchClassName,
  preserveWhitespace = false,
  animate = true,
}: GlitchedTextLiveProps) {
  const shouldScramble = fieldGlitchHasScramble(glitch);
  const pulse = useSyncExternalStore(
    animate ? subscribeGlitchPulse : () => () => {},
    animate ? getGlitchPulseSnapshot : () => 0,
    animate ? getGlitchPulseServerSnapshot : () => 0,
  );

  const zones = glitch.zones;
  const scramblePhase = useMemo(() => {
    if (!shouldScramble) {
      return 0;
    }

    if (!animate) {
      return 1;
    }

    return glitchScramblePhase(pulse, glitch.tickMs);
  }, [animate, glitch.tickMs, pulse, shouldScramble]);

  const displayByZone = useMemo(
    () => buildZoneDisplayText(zones, glitch, scramblePhase),
    [glitch, scramblePhase, zones],
  );

  const segments = useMemo(
    () => composeTextSegments(text, zones, displayByZone),
    [displayByZone, text, zones],
  );

  const zoneStyleById = useMemo(
    () => Object.fromEntries(zones.map((zone) => [zone.id, zone.style])),
    [zones],
  );

  return (
    <span
      className={cn(className, preserveWhitespace && "whitespace-pre-line")}
      data-text-corruptor-ignore
    >
      {segments.map((segment, index) =>
        segment.type === "plain" ? (
          <span key={`plain-${index}`}>{segment.text}</span>
        ) : (
          <GlitchZoneMark
            key={segment.zoneId}
            text={segment.text}
            original={segment.original}
            zoneStyle={zoneStyleById[segment.zoneId]}
            className={glitchClassName}
          />
        ),
      )}
    </span>
  );
}

export function GlitchedText({
  text,
  glitch,
  className,
  glitchClassName,
  preserveWhitespace = false,
  useCssGlitchFallback = false,
  animate = true,
}: GlitchedTextProps) {
  const zoneFingerprint = glitch?.zones
    ?.map((zone) => `${zone.id}:${zone.start}:${zone.end}:${zone.original}`)
    .join("|");

  const loopSignature = useMemo(
    () => glitchConfigSignature(text, glitch),
    [glitch?.wordPool, glitch?.scrambleMode, glitch?.builtinScramble, glitch?.tickMs, glitch?.defaultStyle, text, zoneFingerprint],
  );

  const resolvedGlitch = useMemo(
    () => (loopSignature ? reanchorGlitchConfig(text, glitch) : undefined),
    [glitch, loopSignature, text],
  );

  const hasLiveGlitch = Boolean(loopSignature && resolvedGlitch && resolvedGlitch.zones.length > 0);

  if (!hasLiveGlitch || !resolvedGlitch) {
    if (useCssGlitchFallback) {
      return <TextGlitch className={cn(className, glitchClassName)} text={text} />;
    }

    return (
      <span className={cn(className, preserveWhitespace && "whitespace-pre-line")}>{text}</span>
    );
  }

  return (
    <GlitchedTextLive
      text={text}
      glitch={resolvedGlitch}
      className={className}
      glitchClassName={glitchClassName}
      preserveWhitespace={preserveWhitespace}
      animate={animate}
    />
  );
}
