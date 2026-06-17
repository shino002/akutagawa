"use client";

import { type ReactNode, useEffect, useState } from "react";
import { AdminChoiceButton } from "@/components/admin/AdminChoiceButton";
import { filterCharactersByKind } from "@/lib/character-kind";
import { normalizeSubPages } from "@/lib/sub-pages";
import type { Character, ZoneLinkTarget } from "@/lib/types";
import {
  CHARACTER_DETAIL_SECTION_LABELS,
  CHARACTER_DETAIL_SECTIONS,
  type CharacterDetailSection,
  formatZoneLinkLabel,
  sectionToCharacterKind,
} from "@/lib/zone-links";

interface ZoneLinkEditorProps {
  target?: ZoneLinkTarget;
  allCharacters: Character[];
  currentCharacterId: string;
  currentSection: CharacterDetailSection;
  onChange: (target: ZoneLinkTarget | undefined) => void;
  immediateApply?: boolean;
}

function buildDefaultDraft(
  target: ZoneLinkTarget | undefined,
  currentSection: CharacterDetailSection,
  currentCharacterId: string,
  allCharacters: Character[],
): ZoneLinkTarget {
  if (target?.characterId) {
    return target;
  }

  const section = target?.section ?? currentSection;
  const sectionCharacters = filterCharactersByKind(allCharacters, sectionToCharacterKind(section));

  return {
    section,
    characterId: sectionCharacters[0]?.id ?? currentCharacterId,
    ...(target?.subPageId ? { subPageId: target.subPageId } : {}),
  };
}

function PickerField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 text-[11px] text-sky-100/75" data-admin-interactive>
      <span>{label}</span>
      {children}
    </div>
  );
}

export function ZoneLinkEditor({
  target,
  allCharacters,
  currentCharacterId,
  currentSection,
  onChange,
  immediateApply = false,
}: ZoneLinkEditorProps) {
  const [draftTarget, setDraftTarget] = useState<ZoneLinkTarget>(() =>
    buildDefaultDraft(target, currentSection, currentCharacterId, allCharacters),
  );

  useEffect(() => {
    setDraftTarget(buildDefaultDraft(target, currentSection, currentCharacterId, allCharacters));
  }, [allCharacters, currentCharacterId, currentSection, target]);

  const sectionCharacters = filterCharactersByKind(
    allCharacters,
    sectionToCharacterKind(draftTarget.section),
  );
  const selectedCharacter =
    sectionCharacters.find((character) => character.id === draftTarget.characterId) ??
    sectionCharacters[0];
  const subPages = normalizeSubPages(selectedCharacter?.subPages);
  const hasLink = Boolean(target?.characterId);

  const publishTarget = (next: ZoneLinkTarget) => {
    if (!next.characterId) {
      onChange(undefined);
      return;
    }

    onChange(
      next.subPageId
        ? {
            section: next.section,
            characterId: next.characterId,
            subPageId: next.subPageId,
          }
        : {
            section: next.section,
            characterId: next.characterId,
          },
    );
  };

  const updateDraft = (patch: Partial<ZoneLinkTarget>) => {
    setDraftTarget((current) => {
      const next: ZoneLinkTarget = {
        section: patch.section ?? current.section,
        characterId: patch.characterId ?? current.characterId,
        ...(patch.subPageId !== undefined
          ? patch.subPageId
            ? { subPageId: patch.subPageId }
            : {}
          : current.subPageId
            ? { subPageId: current.subPageId }
            : {}),
      };

      if (immediateApply) {
        publishTarget(next);
      }

      return next;
    });
  };

  const applyDraft = () => {
    publishTarget(draftTarget);
  };

  return (
    <div className="mt-3 border border-sky-300/20 bg-sky-950/20 p-3" data-admin-interactive>
      <p className="text-[11px] font-medium text-sky-100/85">페이지 이동 연결</p>
      <p className="mt-1 text-[11px] leading-5 text-sky-100/55">
        본 페이지에서 이 구간을 누르면 OC·페어·어나더 등 다른 항목이나 그 상세 페이지로 이동합니다.
      </p>

      <div className="mt-3 grid gap-3">
        <PickerField label="카테고리">
          <div className="flex flex-wrap gap-2">
            {CHARACTER_DETAIL_SECTIONS.map((section) => (
              <AdminChoiceButton
                key={section}
                active={draftTarget.section === section}
                onClick={() => {
                  const nextCharacters = filterCharactersByKind(
                    allCharacters,
                    sectionToCharacterKind(section),
                  );
                  updateDraft({
                    section,
                    characterId: nextCharacters[0]?.id ?? "",
                    subPageId: "",
                  });
                }}
              >
                {CHARACTER_DETAIL_SECTION_LABELS[section]}
              </AdminChoiceButton>
            ))}
          </div>
        </PickerField>

        <PickerField label="항목">
          {sectionCharacters.length === 0 ? (
            <p className="text-[11px] text-sky-100/45">등록된 항목 없음</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sectionCharacters.map((character) => (
                <AdminChoiceButton
                  key={character.id}
                  active={draftTarget.characterId === character.id}
                  onClick={() => updateDraft({ characterId: character.id, subPageId: "" })}
                >
                  {character.name || character.id}
                </AdminChoiceButton>
              ))}
            </div>
          )}
        </PickerField>

        <PickerField label="이동 위치">
          <div className="flex flex-wrap gap-2">
            <AdminChoiceButton
              active={!draftTarget.subPageId}
              disabled={!selectedCharacter}
              onClick={() => updateDraft({ subPageId: "" })}
            >
              본 페이지 (상세)
            </AdminChoiceButton>
            {subPages.map((subPage) => (
              <AdminChoiceButton
                key={subPage.id}
                active={draftTarget.subPageId === subPage.id}
                disabled={!selectedCharacter}
                onClick={() => updateDraft({ subPageId: subPage.id })}
              >
                {subPage.title || "제목 없음"}
              </AdminChoiceButton>
            ))}
          </div>
        </PickerField>
      </div>

      {!immediateApply ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminChoiceButton
            onClick={() => {
              if (hasLink) {
                onChange(undefined);
                return;
              }
              applyDraft();
            }}
            className="admin-ghost-btn"
            disabled={sectionCharacters.length === 0 && !hasLink}
          >
            {hasLink ? "이동 연결 해제" : "이동 연결 적용"}
          </AdminChoiceButton>
        </div>
      ) : hasLink ? (
        <div className="mt-3">
          <AdminChoiceButton onClick={() => onChange(undefined)} className="admin-btn-ghost">
            이동 연결 해제
          </AdminChoiceButton>
        </div>
      ) : null}

      {hasLink && target ? (
        <p className="mt-2 text-[11px] text-sky-100/70">
          연결됨: {formatZoneLinkLabel(target, allCharacters)}
        </p>
      ) : null}
    </div>
  );
}
