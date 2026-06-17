"use client";

import { useState } from "react";
import { keepAdminTextSelection } from "@/lib/admin-interaction";
import { GlitchStyleEditor } from "@/components/admin/GlitchStyleEditor";
import { GlitchZoneMark } from "@/components/GlitchZoneMark";
import { ZoneErrorMessageEditor } from "@/components/admin/ZoneErrorMessageEditor";
import { ZoneLinkEditor } from "@/components/admin/ZoneLinkEditor";
import { formatZoneLinkLabel, resolveZoneLink, type CharacterDetailSection } from "@/lib/zone-links";
import type { Character, GlitchScrambleMode, GlitchZone, GlitchZoneStyle, ZoneLinkTarget } from "@/lib/types";

function truncateMiddle(text: string, maxLength = 40) {
  if (text.length <= maxLength) {
    return text;
  }

  const half = Math.floor((maxLength - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}

interface GlitchZoneListItemProps {
  zone: GlitchZone;
  index: number;
  zoneStyle: GlitchZoneStyle;
  wordPool: string;
  scrambleMode: GlitchScrambleMode;
  builtinScramble: boolean;
  builtinTokens?: string[];
  allCharacters: Character[];
  currentCharacterId: string;
  currentSection: CharacterDetailSection;
  defaultExpanded?: boolean;
  onSelectZone: (zone: GlitchZone) => void;
  onRemoveZone: (zoneId: string) => void;
  onZoneErrorUpdate: (zoneId: string, patch: Partial<GlitchZone>) => void;
  onZoneStyleUpdate: (zoneId: string, style: GlitchZoneStyle) => void;
  onZoneLinkChange: (zoneId: string, target: ZoneLinkTarget | undefined) => void;
}

export function GlitchZoneListItem({
  zone,
  index,
  zoneStyle,
  wordPool,
  scrambleMode,
  builtinScramble,
  builtinTokens,
  allCharacters,
  currentCharacterId,
  currentSection,
  defaultExpanded = false,
  onSelectZone,
  onRemoveZone,
  onZoneErrorUpdate,
  onZoneStyleUpdate,
  onZoneLinkChange,
}: GlitchZoneListItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const linkContext = { section: currentSection, characterId: currentCharacterId };
  const resolvedLink = resolveZoneLink(zone, linkContext);

  const summaryParts = [
    `구간 ${index + 1}`,
    `${zone.start + 1}~${zone.end}`,
    `「${truncateMiddle(zone.original, 20)}」`,
  ];

  if (zone.errorMessageSource === "custom" && zone.errorMessage) {
    summaryParts.push(`→「${truncateMiddle(zone.errorMessage, 16)}」`);
  } else if (zone.errorMessageSource === "none") {
    summaryParts.push("서식만");
  }

  if (resolvedLink) {
    summaryParts.push(formatZoneLinkLabel(resolvedLink, allCharacters));
  }

  return (
    <div className="overflow-visible border border-emerald-100/15 bg-black/25">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="text-xs leading-6 text-emerald-50/90">
            <span className="font-semibold text-emerald-100">{summaryParts[0]}</span>
            <span className="mx-1.5 text-emerald-100/35">·</span>
            <span className="text-emerald-100/75">{summaryParts.slice(1).join(" · ")}</span>
          </span>
          <span className="mt-0.5 block text-[10px] text-emerald-100/45">
            {isExpanded ? "세부 설정 접기" : "세부 설정 펼치기"}
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelectZone(zone);
              setIsExpanded(true);
            }}
            className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
          >
            구간 선택
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onRemoveZone(zone.id)}
            className="admin-ghost-btn px-2 py-1 text-[11px]"
          >
            제거
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-emerald-100/10 px-3 py-3" onMouseDown={keepAdminTextSelection}>
          <div className="mb-3 text-xs leading-6 break-all text-emerald-50/90">
            {zone.style || zoneStyle ? (
              <GlitchZoneMark
                text={truncateMiddle(zone.original, 48)}
                original={truncateMiddle(zone.original, 48)}
                zoneStyle={zone.style}
              />
            ) : (
              <span className="text-emerald-100/45">서식 없음</span>
            )}
          </div>
          <GlitchStyleEditor
            compact
            style={zone.style ?? zoneStyle}
            onStyleChange={(nextStyle) => onZoneStyleUpdate(zone.id, nextStyle)}
          />
          <ZoneErrorMessageEditor
            zone={zone}
            wordPool={wordPool}
            scrambleMode={scrambleMode}
            builtinScramble={builtinScramble}
            builtinTokens={builtinTokens}
            onChange={(patch) => onZoneErrorUpdate(zone.id, patch)}
          />
          <ZoneLinkEditor
            target={resolvedLink}
            allCharacters={allCharacters}
            currentCharacterId={currentCharacterId}
            currentSection={currentSection}
            onChange={(nextTarget) => onZoneLinkChange(zone.id, nextTarget)}
            immediateApply
          />
        </div>
      ) : null}
    </div>
  );
}
