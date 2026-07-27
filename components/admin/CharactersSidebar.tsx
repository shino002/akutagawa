"use client";

import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { CHARACTER_KINDS, CHARACTER_KIND_ADMIN_LABELS } from "@/lib/character-kind";

/**
 * 사이드바 · 자캐/페어/어나더 목록입니다.
 */
export function CharactersSidebar() {
  const {
    activeCharacterKind,
    handleActiveKindChange,
    filteredCharacters,
    activeCharacter,
    selectCharacterFromList,
    startNewCharacter,
  } = useCharactersAdmin();

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
        {CHARACTER_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => handleActiveKindChange(kind)}
            className={
              activeCharacterKind === kind
                ? "bg-emerald-200 px-2 py-2 font-semibold text-emerald-950"
                : "border border-emerald-100/20 px-2 py-2 text-emerald-100/70"
            }
          >
            {CHARACTER_KIND_ADMIN_LABELS[kind]}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="board-title">{CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind]} 목록</h2>
        <button
          type="button"
          onClick={() => startNewCharacter()}
          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
        >
          새 {CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind]}
        </button>
      </div>
      <div className="mt-5 grid gap-3">
        {filteredCharacters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => selectCharacterFromList(character)}
            className={`border p-3 text-left text-sm ${
              activeCharacter?.id === character.id
                ? "border-stone-400/35 bg-emerald-100/10"
                : "border-emerald-100/10 bg-black/30"
            }`}
          >
            <span className="block text-lg font-semibold">{character.name}</span>
            <span className="mt-1 block text-xs text-emerald-100/50">{character.id}</span>
          </button>
        ))}
      </div>
    </>
  );
}
