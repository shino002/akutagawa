"use client";

import {
  CHARACTER_KIND_ADMIN_LABELS,
  filterCharactersByKind,
  normalizeCharacterKind,
} from "@/lib/character-kind";
import type { Character } from "@/lib/types";
import { PAIR_MEMBER_SLOTS } from "@/lib/pair-members";

interface PairMemberPickerProps {
  pairMemberIds: string[];
  linkableCharacters: Character[];
  currentPairId: string;
  onChange: (pairMemberIds: string[]) => void;
}

function slotValue(pairMemberIds: string[], index: number) {
  return pairMemberIds[index] ?? "";
}

function formatCharacterOptionLabel(character: Character) {
  const name = character.name.trim() || character.id;
  const kind = normalizeCharacterKind(character.kind);
  if (kind === "other") {
    return `${name} (어나더)`;
  }

  return name;
}

export function PairMemberPicker({
  pairMemberIds,
  linkableCharacters,
  currentPairId,
  onChange,
}: PairMemberPickerProps) {
  const selectableCharacters = linkableCharacters.filter(
    (character) => character.id !== currentPairId,
  );
  const ocCharacters = filterCharactersByKind(selectableCharacters, "oc");
  const otherCharacters = filterCharactersByKind(selectableCharacters, "other");

  const updateSlot = (index: number, characterId: string) => {
    const next = [...pairMemberIds];
    while (next.length < PAIR_MEMBER_SLOTS) {
      next.push("");
    }

    next[index] = characterId;
    onChange(
      next
        .map((id) => id.trim())
        .filter((id, slotIndex, array) => id && array.indexOf(id) === slotIndex)
        .slice(0, PAIR_MEMBER_SLOTS),
    );
  };

  const renderCharacterOptions = (characters: Character[]) =>
    characters.map((character) => (
      <option key={character.id} value={character.id}>
        {formatCharacterOptionLabel(character)}
      </option>
    ));

  return (
    <div className="grid gap-4" data-admin-interactive>
      {Array.from({ length: PAIR_MEMBER_SLOTS }, (_, index) => {
        const value = slotValue(pairMemberIds, index);

        return (
          <label key={index} className="grid gap-2 text-sm text-emerald-100/75">
            멤버 {index + 1}
            <select
              value={value}
              onChange={(event) => updateSlot(index, event.target.value)}
              className="auth-input"
            >
              <option value="">캐릭터 선택</option>
              {ocCharacters.length > 0 && (
                <optgroup label={CHARACTER_KIND_ADMIN_LABELS.oc}>
                  {renderCharacterOptions(ocCharacters)}
                </optgroup>
              )}
              {otherCharacters.length > 0 && (
                <optgroup label={CHARACTER_KIND_ADMIN_LABELS.other}>
                  {renderCharacterOptions(otherCharacters)}
                </optgroup>
              )}
            </select>
          </label>
        );
      })}

      {selectableCharacters.length === 0 && (
        <p className="border border-amber-400/25 bg-amber-950/20 p-4 text-sm leading-7 text-amber-100/90">
          연결할 캐릭터가 없어요. 먼저{" "}
          <span className="font-semibold">자캐</span> 또는{" "}
          <span className="font-semibold">어나더</span> 탭에서 항목을 만든 뒤 다시 선택해주세요.
        </p>
      )}
    </div>
  );
}
