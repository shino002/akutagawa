"use client";

import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { CHARACTER_KINDS, CHARACTER_KIND_ADMIN_LABELS } from "@/lib/character-kind";

/**
 * 사이드바 · 자캐/페어/어나더 목록입니다.
 * 종류 전환 → 목록 → 새로 만들기 순서로, 카테고리 목록과 같은 어휘를 씁니다.
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

  const kindLabel = CHARACTER_KIND_ADMIN_LABELS[activeCharacterKind];

  return (
    <>
      <div className="admin-aside-kinds" role="tablist" aria-label="종류">
        {CHARACTER_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={activeCharacterKind === kind}
            onClick={() => handleActiveKindChange(kind)}
            className={activeCharacterKind === kind ? "is-active" : undefined}
          >
            {CHARACTER_KIND_ADMIN_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="admin-aside-listhead">
        <p className="adm-label">
          {kindLabel} 목록
          <span className="adm-count">{filteredCharacters.length}</span>
        </p>
        <button
          type="button"
          onClick={() => startNewCharacter()}
          className="admin-action-btn admin-aside-new"
        >
          + 새 {kindLabel}
        </button>
      </div>

      <nav className="admin-aside-list" aria-label={`${kindLabel} 목록`}>
        {filteredCharacters.map((character) => {
          const isActive = activeCharacter?.id === character.id;

          return (
            <button
              key={character.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => selectCharacterFromList(character)}
              className={isActive ? "admin-aside-item is-active" : "admin-aside-item"}
            >
              <span className="admin-aside-item-title">{character.name || "이름 없음"}</span>
              <span className="admin-aside-item-sub">{character.id}</span>
            </button>
          );
        })}

        {filteredCharacters.length === 0 && (
          <p className="adm-hint">등록된 {kindLabel}가 없어요.</p>
        )}
      </nav>
    </>
  );
}
