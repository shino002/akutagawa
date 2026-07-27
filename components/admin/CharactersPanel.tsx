"use client";

import { CharacterEditSectionNav } from "@/components/admin/CharacterEditSectionNav";
import { GlitchSelectionFloatingToolbar } from "@/components/admin/GlitchSelectionFloatingToolbar";
import { CharacterBasicsEditor } from "@/components/admin/sections/CharacterBasicsEditor";
import { CharacterGlitchEditor } from "@/components/admin/sections/CharacterGlitchEditor";
import { CharacterImagesEditor } from "@/components/admin/sections/CharacterImagesEditor";
import { CharacterMembersEditor } from "@/components/admin/sections/CharacterMembersEditor";
import { CharacterSubPagesEditor } from "@/components/admin/sections/CharacterSubPagesEditor";
import { CharacterWorldEditor } from "@/components/admin/sections/CharacterWorldEditor";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { getCharacterDraftFieldValue, getDraftGlitchConfig } from "@/lib/glitch-fields";

/**
 * 캐릭터 편집 패널: 섹션 네비 + 폼 셸 + 글리치 플로팅 툴바입니다.
 */
export function CharactersPanel() {
  const {
    characterEditSection,
    setCharacterEditSection,
    draft,
    activeCharacter,
    kindLabel,
    glitchFieldCount,
    subPageCount,
    isPairDraft,
    activeGlitchLabel,
    saveCharacter,
    isSaving,
    activeCharacterId,
    glitchFieldAnchorElement,
    glitchFieldSelection,
    activeGlitchFieldPath,
    applyGlitchFromToolbar,
    setNotice,
    notice,
  } = useCharactersAdmin();

  const showFormShell =
    characterEditSection === "basics" ||
    characterEditSection === "glitch" ||
    characterEditSection === "subpages" ||
    characterEditSection === "members";

  return (
    <>
      <CharacterEditSectionNav
        active={characterEditSection}
        onChange={setCharacterEditSection}
        characterName={draft.name || activeCharacter?.name || ""}
        newItemLabel={`새 ${kindLabel}`}
        glitchFieldCount={glitchFieldCount}
        subPageCount={subPageCount}
        isPair={isPairDraft}
        activeGlitchLabel={activeGlitchLabel}
      />

      {showFormShell && (
        <form
          onSubmit={saveCharacter}
          className="glass-card admin-edit-form grid max-w-full min-w-0 gap-3 p-5 pb-28 md:p-6"
        >
          {characterEditSection === "basics" && <CharacterBasicsEditor />}
          {characterEditSection === "members" && isPairDraft && <CharacterMembersEditor />}
          {characterEditSection === "glitch" && <CharacterGlitchEditor />}
          {characterEditSection === "subpages" && <CharacterSubPagesEditor />}
          <div className="pointer-events-none sticky bottom-3 z-10 -mx-1 border border-emerald-200/20 bg-black/85 p-3 backdrop-blur-sm [&_button]:pointer-events-auto">
            <button
              disabled={isSaving}
              className="admin-action-btn w-full px-5 py-3 text-sm disabled:opacity-60 md:ml-auto md:w-auto"
            >
              {isSaving ? "저장 중..." : "본 페이지에 저장"}
            </button>
          </div>
        </form>
      )}

      {characterEditSection === "world" && <CharacterWorldEditor />}
      {characterEditSection === "images" && <CharacterImagesEditor />}

      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}

      {activeCharacterId && (
        <GlitchSelectionFloatingToolbar
          anchorElement={glitchFieldAnchorElement}
          selection={glitchFieldSelection}
          fieldValue={
            activeGlitchFieldPath ? getCharacterDraftFieldValue(draft, activeGlitchFieldPath) : ""
          }
          fieldLabel={activeGlitchLabel}
          glitchConfig={
            activeGlitchFieldPath ? getDraftGlitchConfig(draft, activeGlitchFieldPath) : undefined
          }
          onApply={applyGlitchFromToolbar}
          onNotice={setNotice}
        />
      )}
    </>
  );
}
