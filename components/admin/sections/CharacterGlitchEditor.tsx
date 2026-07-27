"use client";

import { TextScrambleTool } from "@/components/admin/TextScrambleTool";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import {
  getCharacterDraftFieldValue,
  getDraftGlitchConfig,
  updateDraftFieldValue,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import { normalizeCharacterKind } from "@/lib/character-kind";
import { characterKindToSection } from "@/lib/zone-links";

/**
 * 캐릭터 글리치(오류) 도구 섹션입니다.
 */
export function CharacterGlitchEditor() {
  const {
    draft,
    setDraft,
    characters,
    setNotice,
    glitchFieldPickerGroups,
    selectGlitchField,
    activeGlitchFieldPath,
    glitchFieldSelection,
    setGlitchFieldSelection,
    setGlitchFieldAnchorElement,
  } = useCharactersAdmin();

  return (
    <div id="admin-glitch-tool">
      <TextScrambleTool
        fieldPickerGroups={glitchFieldPickerGroups}
        onFieldSelect={selectGlitchField}
        activeFieldPath={activeGlitchFieldPath}
        fieldValue={
          activeGlitchFieldPath ? getCharacterDraftFieldValue(draft, activeGlitchFieldPath) : ""
        }
        externalSelection={glitchFieldSelection}
        onExternalSelectionClear={() => setGlitchFieldSelection(null)}
        onFieldValueChange={(value) => {
          if (!activeGlitchFieldPath) {
            return;
          }

          setDraft((current) => updateDraftFieldValue(current, activeGlitchFieldPath, value));
        }}
        glitchConfig={
          activeGlitchFieldPath ? getDraftGlitchConfig(draft, activeGlitchFieldPath) : undefined
        }
        onGlitchChange={(config) => {
          if (!activeGlitchFieldPath) {
            return;
          }

          setDraft((current) => updateDraftGlitchPath(current, activeGlitchFieldPath, config));
        }}
        onNotice={setNotice}
        allCharacters={characters}
        currentCharacterId={draft.id}
        currentSection={characterKindToSection(normalizeCharacterKind(draft.kind))}
        onZoneApplied={() => {
          setGlitchFieldSelection(null);
          setGlitchFieldAnchorElement(null);
        }}
      />
    </div>
  );
}
