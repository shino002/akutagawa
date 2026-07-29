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

/** 저장 바가 폼 밖에서 submit 을 걸기 위한 연결 고리 */
const CHARACTER_FORM_ID = "character-edit-form";

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
        <>
          <form
            id={CHARACTER_FORM_ID}
            onSubmit={saveCharacter}
            className="glass-card admin-edit-form grid max-w-full min-w-0 gap-3 p-5 md:p-6"
          >
            {characterEditSection === "basics" && <CharacterBasicsEditor />}
            {characterEditSection === "members" && isPairDraft && <CharacterMembersEditor />}
            {characterEditSection === "glitch" && <CharacterGlitchEditor />}
            {characterEditSection === "subpages" && <CharacterSubPagesEditor />}
          </form>

          {/* 저장 바는 폼 「밖」 에 둡니다 — .admin-edit-form 의 overflow-x:clip 이
              양축 clip 으로 계산돼 그 안에서는 sticky 가 화면에 붙지 못합니다.
              단추는 form 속성으로 위 폼에 그대로 연결돼 있습니다. */}
          <div className="admin-savebar">
            <p className="admin-savebar-note">
              {isPairDraft
                ? "페어 카드 · 오류 · 상세 페이지 · 연결 캐릭터 탭이 함께 저장됩니다."
                : "카드 · 레코드 · 오류 · 상세 페이지 탭이 함께 저장됩니다."}
            </p>
            <button
              type="submit"
              form={CHARACTER_FORM_ID}
              disabled={isSaving}
              className="admin-action-btn w-full text-sm md:w-auto"
            >
              {isSaving ? "저장 중…" : "본 페이지에 저장"}
            </button>
          </div>
        </>
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
