"use client";

import { useMemo } from "react";
import { AdminInlineGlitchEditor } from "@/components/admin/AdminInlineGlitchEditor";
import type { Character, FieldGlitchConfig, RelationshipEntry } from "@/lib/types";
import {
  createBlankRelationshipEntry,
  relationshipEntryGlitchPath,
  relationshipEntryLabelGlitchPath,
  relationshipEntryNameGlitchPath,
} from "@/lib/relationship-entries";
import { listNavigableSubPages, type NavigableSubPageOption } from "@/lib/sub-pages";

type GlitchFieldBindings = {
  "data-glitch-field"?: string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
};

interface RelationshipsEditorProps {
  entries: RelationshipEntry[];
  onEntriesChange: (entries: RelationshipEntry[]) => void;
  linkableCharacters: Character[];
  currentCharacterId?: string;
  ownSubPages?: NavigableSubPageOption[];
  bindGlitchField?: (path: string) => GlitchFieldBindings;
  activeGlitchFieldPath?: string | null;
  glitchFieldClass?: (path: string, activePath: string | null, baseClass?: string) => string;
  prefixGlitchPath?: (path: string) => string;
  onEntryFieldValueChange?: (path: string, value: string) => void;
  getGlitchByPath?: (path: string) => FieldGlitchConfig | undefined;
  onGlitchPathChange?: (path: string, config: FieldGlitchConfig | undefined) => void;
  /** @deprecated use onEntryFieldValueChange */
  onBodyChange?: (entryId: string, body: string) => void;
  /** @deprecated use prefixGlitchPath + relationshipEntryGlitchPath */
  getGlitchPath?: (entryId: string) => string;
  /** @deprecated use getGlitchByPath */
  getFieldGlitch?: (entryId: string) => FieldGlitchConfig | undefined;
  /** @deprecated use onGlitchPathChange */
  onFieldGlitchChange?: (entryId: string, config: FieldGlitchConfig | undefined) => void;
}

export function RelationshipsEditor({
  entries,
  onEntriesChange,
  linkableCharacters,
  currentCharacterId = "",
  ownSubPages = [],
  bindGlitchField,
  activeGlitchFieldPath = null,
  glitchFieldClass,
  prefixGlitchPath,
  onEntryFieldValueChange,
  getGlitchByPath,
  onGlitchPathChange,
  onBodyChange,
  getGlitchPath = relationshipEntryGlitchPath,
  getFieldGlitch,
  onFieldGlitchChange,
}: RelationshipsEditorProps) {
  const selectableCharacters = linkableCharacters.filter((character) => character.id !== currentCharacterId);
  const resolvedOwnSubPages = useMemo(() => {
    if (ownSubPages.length > 0) {
      return ownSubPages;
    }

    const currentCharacter = linkableCharacters.find((character) => character.id === currentCharacterId);
    if (!currentCharacter) {
      return [];
    }

    return listNavigableSubPages(currentCharacter, linkableCharacters);
  }, [currentCharacterId, linkableCharacters, ownSubPages]);
  const subPagesByCharacterId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof listNavigableSubPages>>();

    for (const character of linkableCharacters) {
      map.set(character.id, listNavigableSubPages(character, linkableCharacters));
    }

    return map;
  }, [linkableCharacters]);

  const updateEntry = (
    entryId: string,
    patch: Partial<Pick<RelationshipEntry, "name" | "label" | "body" | "linkedCharacterId" | "linkedSubPageId">>,
  ) => {
    onEntriesChange(
      entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    );
  };

  const removeEntry = (entryId: string) => {
    onEntriesChange(entries.filter((entry) => entry.id !== entryId));
  };

  const addEntry = () => {
    onEntriesChange([...entries, createBlankRelationshipEntry()]);
  };

  return (
    <section className="grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-50">관계</p>
          <p className="mt-1 text-xs text-emerald-100/55">
            대상 이름·관계 유형·설명을 카드로 정리하고, 내 하위 페이지나 다른 캐릭터와 연결할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
        >
          관계 카드 추가
        </button>
      </div>

      <div className="grid gap-3">
        {entries.map((entry, index) => {
          const resolvePath = (fieldPath: string) =>
            prefixGlitchPath ? prefixGlitchPath(fieldPath) : fieldPath;
          const namePath = resolvePath(relationshipEntryNameGlitchPath(entry.id));
          const labelPath = resolvePath(relationshipEntryLabelGlitchPath(entry.id));
          const bodyPath = resolvePath(getGlitchPath(entry.id));
          const nameClassName = glitchFieldClass
            ? glitchFieldClass(namePath, activeGlitchFieldPath, "")
            : "";
          const labelClassName = glitchFieldClass
            ? glitchFieldClass(labelPath, activeGlitchFieldPath, "")
            : "";
          const bodyClassName = glitchFieldClass
            ? glitchFieldClass(bodyPath, activeGlitchFieldPath, "")
            : "";
          const linkedCharacterSubPages = entry.linkedCharacterId
            ? subPagesByCharacterId.get(entry.linkedCharacterId) ?? []
            : [];
          const ownSubPageLinkId =
            entry.linkedSubPageId && !entry.linkedCharacterId ? entry.linkedSubPageId : "";

          return (
            <article key={entry.id} className="grid gap-2 border border-emerald-100/10 bg-black/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs tracking-[0.22em] text-emerald-100/45 uppercase">
                  관계 {String(index + 1).padStart(2, "0")}
                </p>
                <button type="button" onClick={() => removeEntry(entry.id)} className="text-xs text-stone-300/70">
                  삭제
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <AdminInlineGlitchEditor
                  value={entry.name}
                  onChange={(value) => {
                    updateEntry(entry.id, { name: value });
                    onEntryFieldValueChange?.(namePath, value);
                  }}
                  glitch={getGlitchByPath?.(namePath)}
                  onGlitchChange={(config) =>
                    onGlitchPathChange?.(namePath, config) ?? onFieldGlitchChange?.(entry.id, config)
                  }
                  glitchBindings={bindGlitchField?.(namePath) ?? { "data-glitch-field": namePath }}
                  placeholder="대상 이름"
                  className={nameClassName}
                  minHeightClass="min-h-10"
                />
                <AdminInlineGlitchEditor
                  value={entry.label}
                  onChange={(value) => {
                    updateEntry(entry.id, { label: value });
                    onEntryFieldValueChange?.(labelPath, value);
                  }}
                  glitch={getGlitchByPath?.(labelPath)}
                  onGlitchChange={(config) => onGlitchPathChange?.(labelPath, config)}
                  glitchBindings={bindGlitchField?.(labelPath) ?? { "data-glitch-field": labelPath }}
                  placeholder="관계 유형 (예: 형제, 라이벌)"
                  className={labelClassName}
                  minHeightClass="min-h-10"
                />
              </div>
              {resolvedOwnSubPages.length > 0 && (
                <label className="grid gap-2 text-xs text-emerald-100/55">
                  내 하위 페이지 연결 (선택)
                  <select
                    value={ownSubPageLinkId}
                    onChange={(event) => {
                      const nextSubPageId = event.target.value || undefined;
                      updateEntry(entry.id, {
                        linkedCharacterId: undefined,
                        linkedSubPageId: nextSubPageId,
                      });
                    }}
                    className="auth-input"
                  >
                    <option value="">연결 없음</option>
                    {resolvedOwnSubPages.map((subPage) => (
                      <option key={subPage.id} value={subPage.id}>
                        {subPage.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-2 text-xs text-emerald-100/55">
                다른 캐릭터 연결 (선택)
                <select
                  value={entry.linkedCharacterId ?? ""}
                  onChange={(event) =>
                    updateEntry(entry.id, {
                      linkedCharacterId: event.target.value || undefined,
                      linkedSubPageId: undefined,
                    })
                  }
                  className="auth-input"
                >
                  <option value="">연결 없음</option>
                  {selectableCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name} ({character.id})
                    </option>
                  ))}
                </select>
              </label>
              {entry.linkedCharacterId && (
                <label className="grid gap-2 text-xs text-emerald-100/55">
                  그 캐릭터의 하위 페이지 (선택)
                  <select
                    value={entry.linkedSubPageId ?? ""}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        linkedSubPageId: event.target.value || undefined,
                      })
                    }
                    className="auth-input"
                  >
                    <option value="">본 페이지 (상세)</option>
                    {linkedCharacterSubPages.map((subPage) => (
                      <option key={subPage.id} value={subPage.id}>
                        {subPage.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <AdminInlineGlitchEditor
                value={entry.body}
                onChange={(value) => {
                  updateEntry(entry.id, { body: value });
                  onEntryFieldValueChange?.(bodyPath, value);
                  onBodyChange?.(entry.id, value);
                }}
                glitch={getGlitchByPath?.(bodyPath) ?? getFieldGlitch?.(entry.id)}
                onGlitchChange={(config) =>
                  onGlitchPathChange?.(bodyPath, config) ?? onFieldGlitchChange?.(entry.id, config)
                }
                glitchBindings={bindGlitchField?.(bodyPath) ?? { "data-glitch-field": bodyPath }}
                placeholder="관계 설명"
                className={bodyClassName}
                minHeightClass="min-h-24"
              />
            </article>
          );
        })}
        {entries.length === 0 && (
          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
            「관계 카드 추가」를 누르면 이름·유형·설명을 넣을 수 있어요.
          </p>
        )}
      </div>
    </section>
  );
}
