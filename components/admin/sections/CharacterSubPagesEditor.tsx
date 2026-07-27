"use client";

import { SubPageEditor } from "@/components/admin/SubPageEditor";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import {
  getDraftGlitchConfig,
  updateDraftFieldValue,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import { glitchFieldClass } from "@/utils/glitchFieldClass";

/**
 * 캐릭터 상세 페이지(서브페이지) 섹션입니다.
 */
export function CharacterSubPagesEditor() {
  const {
    draft,
    setDraft,
    characters,
    activeSubPageId,
    setActiveSubPageId,
    setNotice,
    bgmCharacterOptions,
    quickAddCharacterBgm,
    bindGlitchField,
    activeGlitchFieldPath,
    isSaving,
  } = useCharactersAdmin();

  return (
    <>
      <div>
        <h2 className="board-title">상세 페이지</h2>
        <p className="mt-1 text-xs leading-5 text-emerald-100/55">
          서브 캐릭터, 물건, 능력, 장소 등을 각각 상세 페이지로 추가할 수 있어요. 자캐 본 페이지와
          같은 카드·레코드·그림·BGM·오류 설정을 모두 쓸 수 있습니다.
        </p>
      </div>
      <SubPageEditor
        subPages={draft.subPages}
        activeSubPageId={activeSubPageId}
        onActiveSubPageChange={setActiveSubPageId}
        onSubPagesChange={(subPages) =>
          setDraft((current) => ({
            ...current,
            subPages,
          }))
        }
        linkableCharacters={characters}
        parentCharacterId={draft.id}
        allCharacters={characters}
        onNotice={setNotice}
        bgmOptions={bgmCharacterOptions}
        onBgmQuickUpload={quickAddCharacterBgm}
        bindGlitchField={bindGlitchField}
        activeGlitchFieldPath={activeGlitchFieldPath}
        glitchFieldClass={glitchFieldClass}
        onGlitchFieldValueChange={(path, value) =>
          setDraft((current) => updateDraftFieldValue(current, path, value))
        }
        getFieldGlitch={(path) => getDraftGlitchConfig(draft, path)}
        onFieldGlitchChange={(path, config) =>
          setDraft((current) => updateDraftGlitchPath(current, path, config))
        }
        isSaving={isSaving}
      />
    </>
  );
}
