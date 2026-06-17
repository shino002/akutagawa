"use client";

import { ProfileFieldsEditor } from "@/components/admin/ProfileFieldsEditor";
import { RelationshipsEditor } from "@/components/admin/RelationshipsEditor";
import { SubPageMediaEditor } from "@/components/admin/SubPageMediaEditor";
import { CaseFileThemeEditor } from "@/components/admin/CaseFileThemeEditor";
import type { Character, CharacterSubPage, SettingSection } from "@/lib/types";
import { settingSectionGlitchPath, subPageFieldGlitchPath } from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import { relationshipEntryGlitchPath } from "@/lib/relationship-entries";
import {
  characterAlreadyImportsSharedSubPage,
  collectSharedSubPageCatalog,
  createBlankSubPage,
  createSharedSubPageRef,
  isSubPageReference,
  listNavigableSubPages,
  resolveSubPage,
} from "@/lib/sub-pages";

interface SubPageEditorProps {
  subPages: CharacterSubPage[];
  activeSubPageId: string;
  onActiveSubPageChange: (subPageId: string) => void;
  onSubPagesChange: (subPages: CharacterSubPage[]) => void;
  linkableCharacters?: Character[];
  parentCharacterId?: string;
  allCharacters?: Character[];
  onNotice?: (message: string) => void;
}

function removeSubPage(subPages: CharacterSubPage[], subPageId: string) {
  return subPages.filter((subPage) => subPage.id !== subPageId);
}

function createSettingSectionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SubPageEditor({
  subPages,
  activeSubPageId,
  onActiveSubPageChange,
  onSubPagesChange,
  linkableCharacters = [],
  parentCharacterId = "",
  allCharacters = [],
  onNotice,
}: SubPageEditorProps) {
  const activeSubPage =
    subPages.find((subPage) => subPage.id === activeSubPageId) ?? subPages[0] ?? null;
  const activeSettingSections = activeSubPage?.settingSections ?? [];
  const isImportedSubPage = activeSubPage ? isSubPageReference(activeSubPage) : false;
  const sharedCatalog = collectSharedSubPageCatalog(allCharacters, {
    excludeCharacterId: parentCharacterId,
  });

  const getSubPageTabLabel = (subPage: CharacterSubPage) => {
    if (isSubPageReference(subPage)) {
      const resolved = resolveSubPage(
        { id: parentCharacterId, subPages } as Character,
        subPage.id,
        allCharacters,
      );
      return resolved?.title?.trim() || "공용 페이지";
    }

    return subPage.title?.trim() || "제목 없음";
  };

  const updateActiveSubPage = (patch: Partial<CharacterSubPage>) => {
    if (!activeSubPage) {
      return;
    }

    onSubPagesChange(
      subPages.map((subPage) =>
        subPage.id === activeSubPage.id ? { ...subPage, ...patch } : subPage,
      ),
    );
  };

  const updateSettingSection = (sectionId: string, patch: Partial<SettingSection>) => {
    if (!activeSubPage) {
      return;
    }

    updateActiveSubPage({
      settingSections: activeSettingSections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    });
  };

  const addSettingSection = () => {
    if (!activeSubPage) {
      return;
    }

    updateActiveSubPage({
      settingSections: [
        ...activeSettingSections,
        { id: createSettingSectionId(), title: "", body: "" },
      ],
    });
  };

  const removeSettingSection = (sectionId: string) => {
    if (!activeSubPage) {
      return;
    }

    updateActiveSubPage({
      settingSections: activeSettingSections.filter((section) => section.id !== sectionId),
    });
  };

  if (subPages.length === 0) {
    return (
      <div className="grid gap-3 border border-emerald-100/15 bg-black/25 p-4 text-sm leading-7 text-emerald-100/60">
        <p>아직 상세 페이지가 없어요. 다른 항목에서 이 페이지로 연결하려면 먼저 상세 페이지를 추가해주세요.</p>
        <button
          type="button"
          data-admin-interactive
          onClick={() => {
            const nextSubPage = createBlankSubPage();
            onSubPagesChange([nextSubPage]);
            onActiveSubPageChange(nextSubPage.id);
          }}
          className="justify-self-start border border-emerald-100/20 px-3 py-2 text-xs text-emerald-50"
        >
          상세 페이지 추가
        </button>
      </div>
    );
  }

  const addSubPage = () => {
    const nextSubPage = createBlankSubPage();
    onSubPagesChange([...subPages, nextSubPage]);
    onActiveSubPageChange(nextSubPage.id);
  };

  const importSharedSubPage = (characterId: string, sourceSubPageId: string) => {
    const source = { characterId, subPageId: sourceSubPageId };
    if (characterAlreadyImportsSharedSubPage({ id: parentCharacterId, subPages } as Character, source)) {
      return;
    }

    const nextRef = createSharedSubPageRef(source);
    onSubPagesChange([...subPages, nextRef]);
    onActiveSubPageChange(nextRef.id);
  };

  const detachImportedSubPage = () => {
    if (!activeSubPage || !isImportedSubPage) {
      return;
    }

    deleteActiveSubPage();
  };

  const deleteActiveSubPage = () => {
    if (!activeSubPage) {
      return;
    }

    const nextSubPages = removeSubPage(subPages, activeSubPage.id);
    onSubPagesChange(nextSubPages);
    onActiveSubPageChange(nextSubPages[0]?.id ?? "");
  };

  return (
    <div className="grid gap-4" data-admin-interactive>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
        {subPages.map((subPage) => (
          <button
            key={subPage.id}
            type="button"
            data-admin-interactive
            onClick={() => onActiveSubPageChange(subPage.id)}
            className={
              activeSubPage?.id === subPage.id
                ? "admin-tab-btn admin-tab-btn-active px-3 py-2 text-xs"
                : "admin-tab-btn px-3 py-2 text-xs"
            }
          >
            {getSubPageTabLabel(subPage)}
            {subPage.sharedFrom ? " · 불러옴" : subPage.isShared ? " · 공용" : ""}
          </button>
        ))}
        </div>
        <button
          type="button"
          data-admin-interactive
          onClick={addSubPage}
          className="border border-emerald-100/20 px-3 py-2 text-xs text-emerald-100/75"
        >
          상세 페이지 추가
        </button>
        <button
          type="button"
          data-admin-interactive
          onClick={deleteActiveSubPage}
          disabled={!activeSubPage}
          className="border border-stone-400/35 px-3 py-2 text-xs text-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          선택 페이지 삭제
        </button>
      </div>

      {sharedCatalog.length > 0 && (
        <section className="grid gap-2 border border-emerald-100/15 bg-black/25 p-4">
          <div>
            <p className="text-sm font-semibold text-emerald-50">공용 상세 페이지 불러오기</p>
            <p className="mt-1 text-xs text-emerald-100/55">
              다른 캐릭터의 하위 전체가 아니라, 원본에서 「공용」으로 켠 상세 페이지 하나만 가져와 쓸 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sharedCatalog.map((item) => (
              <button
                key={`${item.characterId}-${item.subPageId}`}
                type="button"
                data-admin-interactive
                onClick={() => importSharedSubPage(item.characterId, item.subPageId)}
                className="border border-emerald-100/20 px-3 py-2 text-left text-xs text-emerald-100/80"
              >
                <span className="block font-semibold text-emerald-50">{item.title}</span>
                <span className="mt-1 block text-emerald-100/45">
                  {item.characterName} ({item.characterId})
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeSubPage ? (
        <div className="grid gap-3 border border-emerald-100/15 bg-black/25 p-4">
          {isImportedSubPage ? (
            <div className="border border-sky-300/20 bg-sky-950/20 p-3 text-sm leading-6 text-sky-100/75">
              <p className="font-semibold text-sky-50">공용 상세 페이지 (불러온 항목)</p>
              <p className="mt-1 text-xs text-sky-100/55">
                원본: {activeSubPage.sharedFrom?.characterId} / {activeSubPage.sharedFrom?.subPageId}
              </p>
              <p className="mt-2 text-xs text-sky-100/55">
                제목·설정·그림·글은 원본 캐릭터의 그 상세 페이지에서만 수정됩니다. 이 항목에서는 연결만 유지해요.
              </p>
              {(() => {
                const resolved = resolveSubPage(
                  { id: parentCharacterId, subPages } as Character,
                  activeSubPage.id,
                  allCharacters,
                );
                if (!resolved) return null;
                const imageCount = resolved.images?.length ?? 0;
                const workCount = resolved.works?.length ?? 0;
                if (imageCount === 0 && workCount === 0) return null;
                return (
                  <p className="mt-2 text-xs text-sky-100/55">
                    원본 내용: 그림 {imageCount}장 · 글 {workCount}개
                  </p>
                );
              })()}
              <button
                type="button"
                onClick={detachImportedSubPage}
                className="mt-3 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
              >
                불러오기 해제
              </button>
            </div>
          ) : (
            <>
          <label className="grid gap-1 text-sm text-emerald-100/75">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(activeSubPage.isShared)}
                onChange={(event) => updateActiveSubPage({ isShared: event.target.checked })}
              />
              이 상세 페이지를 공용으로 설정
            </span>
            <span className="text-xs text-emerald-100/50">
              켜 두면 다른 캐릭터가 이 페이지만 불러와서 쓸 수 있어요. (다른 캐릭터 하위 전체가 공유되는 것은 아닙니다)
            </span>
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            하위 페이지 제목
            <input
              value={activeSubPage.title}
              onChange={(event) => updateActiveSubPage({ title: event.target.value })}
              placeholder="구간에서 연결된 문구"
              data-glitch-field={subPageFieldGlitchPath(activeSubPage.id, "name")}
              className="auth-input"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-emerald-100/75">
              표시 ID
              <input
                value={activeSubPage.displayId ?? ""}
                onChange={(event) => updateActiveSubPage({ displayId: event.target.value })}
                placeholder="카드 번호 · 예: red-01"
                className="auth-input"
              />
            </label>
            <label className="grid gap-2 text-sm text-emerald-100/75">
              한자 이름
              <input
                value={activeSubPage.kanjiName ?? ""}
                onChange={(event) => updateActiveSubPage({ kanjiName: event.target.value })}
                placeholder="예: 芥川"
                data-glitch-field={subPageFieldGlitchPath(activeSubPage.id, "kanjiName")}
                className="auth-input"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            한 줄 소개
            <input
              value={activeSubPage.subtitle}
              onChange={(event) => updateActiveSubPage({ subtitle: event.target.value })}
              data-glitch-field={subPageFieldGlitchPath(activeSubPage.id, "subtitle")}
              className="auth-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            대표 대사
            <textarea
              value={activeSubPage.quote}
              onChange={(event) => updateActiveSubPage({ quote: event.target.value })}
              data-glitch-field={subPageFieldGlitchPath(activeSubPage.id, "quote")}
              className="auth-input min-h-24"
            />
          </label>

          {!isImportedSubPage ? (
            <CaseFileThemeEditor
              theme={activeSubPage.detailTheme}
              onChange={(detailTheme) => updateActiveSubPage({ detailTheme })}
            />
          ) : null}

          <ProfileFieldsEditor
            fields={activeSubPage.profileFields}
            onFieldsChange={(profileFields) => {
              const removedField = activeSubPage.profileFields.find(
                (field) => !profileFields.some((next) => next.id === field.id),
              );
              const nextGlitch = { ...(activeSubPage.textGlitch ?? {}) };
              if (removedField) {
                delete nextGlitch[profileFieldGlitchPath(removedField.id)];
              }
              updateActiveSubPage({ profileFields, textGlitch: nextGlitch });
            }}
            getFieldGlitchPath={(fieldId) =>
              subPageFieldGlitchPath(activeSubPage.id, profileFieldGlitchPath(fieldId))
            }
          />

          <section className="grid gap-3 border border-emerald-100/10 bg-black/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-50">레코드 박스</p>
              <button
                type="button"
                onClick={addSettingSection}
                className="border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
              >
                레코드 박스 추가
              </button>
            </div>
            {activeSettingSections.length > 0 ? (
              activeSettingSections.map((section, index) => (
              <article
                key={section.id}
                className="grid gap-2 border border-emerald-100/10 bg-black/35 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs tracking-[0.22em] text-emerald-100/45 uppercase">
                    레코드 {String(index + 1).padStart(2, "0")}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeSettingSection(section.id)}
                    className="text-xs text-stone-300/70"
                  >
                    삭제
                  </button>
                </div>
                <input
                  value={section.title}
                  onChange={(event) => updateSettingSection(section.id, { title: event.target.value })}
                  placeholder="예: 성격"
                  className="auth-input"
                />
                <textarea
                  value={section.body}
                  onChange={(event) => updateSettingSection(section.id, { body: event.target.value })}
                  data-glitch-field={subPageFieldGlitchPath(
                    activeSubPage.id,
                    settingSectionGlitchPath(section.id),
                  )}
                  className="auth-input min-h-24"
                />
              </article>
              ))
            ) : (
              <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
                「레코드 박스 추가」를 누르면 여기에 박스가 생깁니다.
              </p>
            )}
          </section>

          <RelationshipsEditor
            entries={activeSubPage.relationshipEntries ?? []}
            onEntriesChange={(relationshipEntries) =>
              updateActiveSubPage({ relationshipEntries })
            }
            linkableCharacters={linkableCharacters}
            currentCharacterId={parentCharacterId}
            ownSubPages={listNavigableSubPages(
              { id: parentCharacterId, subPages } as Character,
              allCharacters,
            )}
            getGlitchPath={(entryId) =>
              subPageFieldGlitchPath(activeSubPage.id, relationshipEntryGlitchPath(entryId))
            }
          />

          <SubPageMediaEditor
            parentCharacterId={parentCharacterId}
            subPageId={activeSubPage.id}
            images={activeSubPage.images ?? []}
            works={activeSubPage.works ?? []}
            onImagesChange={(nextImages) => updateActiveSubPage({ images: nextImages })}
            onWorksChange={(nextWorks) => updateActiveSubPage({ works: nextWorks })}
            onNotice={onNotice}
          />
            </>
          )}
        </div>
      ) : (
        <div className="border border-emerald-100/15 bg-black/25 p-4 text-sm text-emerald-100/60">
          편집할 하위 페이지를 선택해주세요.
        </div>
      )}
    </div>
  );
}
