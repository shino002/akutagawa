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
import { sanitizePlainText } from "@/lib/glitch-display";
import type { FieldGlitchConfig, ZoneLinkTarget } from "@/lib/types";
import { cn } from "@/utils/cn";
import { resolveZoneLink, type CharacterDetailSection } from "@/lib/zone-links";

function noopGlitchPulseSubscribe() {
  return () => {};
}

function staticGlitchPulseSnapshot() {
  return 0;
}

interface GlitchedTextProps {
  text: string;
  glitch?: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  useCssGlitchFallback?: boolean;
  /** false면 관리자 미리보기처럼 번갈아 바뀌지 않고 고정 표시 */
  animate?: boolean;
  onZoneLinkClick?: (target: ZoneLinkTarget) => void;
  linkContext?: {
    section: CharacterDetailSection;
    characterId: string;
  };
}

interface GlitchedTextLiveProps {
  text: string;
  glitch: FieldGlitchConfig;
  className?: string;
  glitchClassName?: string;
  preserveWhitespace?: boolean;
  animate?: boolean;
  onZoneLinkClick?: (target: ZoneLinkTarget) => void;
  linkContext?: {
    section: CharacterDetailSection;
    characterId: string;
  };
}

function GlitchedTextLive({
  text,
  glitch,
  className,
  glitchClassName,
  preserveWhitespace = false,
  animate = true,
  onZoneLinkClick,
  linkContext,
}: GlitchedTextLiveProps) {
  const shouldScramble = fieldGlitchHasScramble(glitch);
  const pulse = useSyncExternalStore(
    animate ? subscribeGlitchPulse : noopGlitchPulseSubscribe,
    animate ? getGlitchPulseSnapshot : staticGlitchPulseSnapshot,
    getGlitchPulseServerSnapshot,
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
  const zoneLinkById = useMemo(
    () =>
      Object.fromEntries(
        zones
          .map((zone) => {
            const target = resolveZoneLink(zone, linkContext);
            return target ? ([zone.id, target] as const) : null;
          })
          .filter((entry): entry is readonly [string, ZoneLinkTarget] => entry !== null),
      ),
    [linkContext, zones],
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
            linkTarget={zoneLinkById[segment.zoneId]}
            onLinkClick={onZoneLinkClick}
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
  onZoneLinkClick,
  linkContext,
}: GlitchedTextProps) {
  const safeText = useMemo(() => sanitizePlainText(text), [text]);

  const zoneFingerprint = glitch?.zones
    ?.map((zone) => `${zone.id}:${zone.start}:${zone.end}:${zone.original}`)
    .join("|");

  const loopSignature = useMemo(
    () => glitchConfigSignature(safeText, glitch),
    [
      glitch?.wordPool,
      glitch?.scrambleMode,
      glitch?.builtinScramble,
      glitch?.errorDisplayMode,
      glitch?.builtinTokens,
      glitch?.tickMs,
      glitch?.defaultStyle,
      safeText,
      zoneFingerprint,
    ],
  );

  const resolvedGlitch = useMemo(
    () => (loopSignature ? reanchorGlitchConfig(safeText, glitch) : undefined),
    [glitch, loopSignature, safeText],
  );

  const hasLiveGlitch = Boolean(loopSignature && resolvedGlitch && resolvedGlitch.zones.length > 0);

  if (!hasLiveGlitch || !resolvedGlitch) {
    if (useCssGlitchFallback) {
      return <TextGlitch className={cn(className, glitchClassName)} text={safeText} />;
    }

    return (
      <span className={cn(className, preserveWhitespace && "whitespace-pre-line")}>{safeText}</span>
    );
  }

  return (
    <GlitchedTextLive
      text={safeText}
      glitch={resolvedGlitch}
      className={className}
      glitchClassName={glitchClassName}
      preserveWhitespace={preserveWhitespace}
      animate={animate}
      onZoneLinkClick={onZoneLinkClick}
      linkContext={linkContext}
    />
  );
}
