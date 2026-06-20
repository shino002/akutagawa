"use client";

import { formatZoneLinkLabel, resolveZoneLink, type CharacterDetailSection } from "@/lib/zone-links";
import type { Character, GlitchZone } from "@/lib/types";

function truncateMiddle(text: string, maxLength = 36) {
  if (text.length <= maxLength) {
    return text;
  }

  const half = Math.floor((maxLength - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}

interface GlitchZoneListItemProps {
  zone: GlitchZone;
  index: number;
  allCharacters: Character[];
  currentCharacterId: string;
  currentSection: CharacterDetailSection;
  isActive?: boolean;
  onSelectZone: (zone: GlitchZone) => void;
  onRemoveZone: (zoneId: string) => void;
}

export function GlitchZoneListItem({
  zone,
  index,
  allCharacters,
  currentCharacterId,
  currentSection,
  isActive = false,
  onSelectZone,
  onRemoveZone,
}: GlitchZoneListItemProps) {
  const linkContext = { section: currentSection, characterId: currentCharacterId };
  const resolvedLink = resolveZoneLink(zone, linkContext);

  const tags: string[] = [];
  if (zone.errorMessageSource === "none" || !zone.errorMessageSource) {
    tags.push("서식");
  } else if (zone.errorMessageSource === "custom" && zone.errorMessage) {
    tags.push(`오류「${truncateMiddle(zone.errorMessage, 12)}」`);
  } else {
    tags.push("오류");
  }
  if (resolvedLink) {
    tags.push(formatZoneLinkLabel(resolvedLink, allCharacters));
  }

  return (
    <div
      className={
        isActive
          ? "flex flex-wrap items-center justify-between gap-2 border border-amber-300/35 bg-amber-950/20 px-3 py-2"
          : "flex flex-wrap items-center justify-between gap-2 border border-emerald-100/10 bg-black/20 px-3 py-2"
      }
    >
      <p className="min-w-0 flex-1 text-xs leading-5 text-emerald-50/90">
        <span className="font-semibold text-emerald-100">{index + 1}.</span> {zone.start + 1}~
        {zone.end} 「{truncateMiddle(zone.original, 28)}」
        <span className="text-emerald-100/45"> · {tags.join(" · ")}</span>
      </p>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelectZone(zone)}
          className="border border-emerald-100/20 px-2 py-1 text-[11px] text-emerald-50"
        >
          수정
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
  );
}
