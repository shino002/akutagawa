"use client";

import { MetaFieldsEditor } from "@/components/admin/MetaFieldsEditor";
import { AdminInlineGlitchEditor, type GlitchFieldBindings } from "@/components/admin/AdminInlineGlitchEditor";
import { SettingSectionOrderButtons } from "@/components/admin/SettingSectionOrderButtons";
import { BgmQuickPicker } from "@/components/admin/BgmQuickPicker";
import { ProfileFieldsEditor } from "@/components/admin/ProfileFieldsEditor";
import { RelationshipsEditor } from "@/components/admin/RelationshipsEditor";
import { SubPageMediaEditor } from "@/components/admin/SubPageMediaEditor";
import { CaseFileThemeEditor } from "@/components/admin/CaseFileThemeEditor";
import { PaletteEditor } from "@/components/admin/PaletteEditor";
import type { BgmOption } from "@/lib/bgm-catalog";
import type { Character, CharacterSubPage, FieldGlitchConfig, SettingSection } from "@/lib/types";
import {
  settingSectionExcerptGlitchPath,
  settingSectionGlitchPath,
  settingSectionTitleGlitchPath,
  subPageFieldGlitchPath,
} from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import {
  relationshipEntryGlitchPath,
  relationshipEntryLabelGlitchPath,
  relationshipEntryNameGlitchPath,
} from "@/lib/relationship-entries";
import {
  formatSubPageEntryTitle,
  getSubPageEntryCopy,
  normalizeSubPageEntryLabel,
} from "@/lib/sub-page-kind";
import { metaFieldGlitchPath, resolveMetaFields } from "@/lib/meta-fields";
import { moveSettingSection as reorderSettingSection } from "@/lib/setting-sections";
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
  bgmOptions?: BgmOption[];
  onBgmQuickUpload?: (file: File) => Promise<string>;
  bindGlitchField?: (path: string) => GlitchFieldBindings;
  activeGlitchFieldPath?: string | null;
  glitchFieldClass?: (path: string, activePath: string | null, baseClass?: string) => string;
  onGlitchFieldValueChange?: (path: string, value: string) => void;
  getFieldGlitch?: (path: string) => FieldGlitchConfig | undefined;
  onFieldGlitchChange?: (path: string, config: FieldGlitchConfig | undefined) => void;
  isSaving?: boolean;
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
  bgmOptions = [],
  onBgmQuickUpload,
  bindGlitchField,
  activeGlitchFieldPath = null,
  glitchFieldClass,
  onGlitchFieldValueChange,
  getFieldGlitch,
  onFieldGlitchChange,
  isSaving = false,
}: SubPageEditorProps) {
  const activeSubPage =
    subPages.find((subPage) => subPage.id === activeSubPageId) ?? subPages[0] ?? null;
  const activeSettingSections = activeSubPage?.settingSections ?? [];
  const isImportedSubPage = activeSubPage ? isSubPageReference(activeSubPage) : false;
  const entryCopy = getSubPageEntryCopy();
  const sharedCatalog = collectSharedSubPageCatalog(allCharacters, {
    excludeCharacterId: parentCharacterId,
  });

  const bindSubPageField = (fieldPath: string): GlitchFieldBindings => {
    if (!activeSubPage) {
      return { "data-glitch-field": fieldPath };
    }

    const path = subPageFieldGlitchPath(activeSubPage.id, fieldPath);
    return bindGlitchField?.(path) ?? { "data-glitch-field": path };
  };

  const subPageFieldClass = (fieldPath: string, baseClass = "auth-input") => {
    if (!activeSubPage || !glitchFieldClass) {
      return baseClass;
    }

    return glitchFieldClass(
      subPageFieldGlitchPath(activeSubPage.id, fieldPath),
      activeGlitchFieldPath,
      baseClass,
    );
  };

  const updateSubPageField = (fieldPath: string, value: string) => {
    if (!activeSubPage) {
      return;
    }

    const path = subPageFieldGlitchPath(activeSubPage.id, fieldPath);
    if (onGlitchFieldValueChange) {
      onGlitchFieldValueChange(path, value);
      return;
    }

    if (fieldPath === "name") {
      updateActiveSubPage({ title: value });
      return;
    }
    if (fieldPath === "kanjiName") {
      updateActiveSubPage({ kanjiName: value });
      return;
    }
    if (fieldPath === "subtitle") {
      updateActiveSubPage({ subtitle: value });
      return;
    }
    if (fieldPath === "quote") {
      updateActiveSubPage({ quote: value });
    }
  };

  const getSubPageTabLabel = (subPage: CharacterSubPage) => {
    if (isSubPageReference(subPage)) {
      const resolved = resolveSubPage(
        { id: parentCharacterId, subPages } as Character,
        subPage.id,
        allCharacters,
      );
      return resolved?.title?.trim() || "공용 페이지";
    }

    return formatSubPageEntryTitle(subPage.title, normalizeSubPageEntryLabel(subPage.entryKind));
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

  const moveSettingSection = (sectionId: string, direction: "up" | "down") => {
    if (!activeSubPage) {
      return;
    }

    updateActiveSubPage({
      settingSections: reorderSettingSection(activeSettingSections, sectionId, direction),
    });
  };

  if (subPages.length === 0) {
    return (
      <div className="grid gap-3 border border-emerald-100/15 bg-black/25 p-4 text-sm leading-7 text-emerald-100/60">
        <p>
          아직 상세 페이지가 없어요. 서브 캐릭터, 물건, 능력, 장소 등을 각각 별도 상세 페이지로
          추가할 수 있어요.
        </p>
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
              다른 캐릭터의 하위 전체가 아니라, 원본에서 「공용」으로 켠 상세 페이지 하나만 가져와 쓸
              수 있어요.
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
                제목·설정·그림·글은 원본 캐릭터의 그 상세 페이지에서만 수정됩니다. 이 항목에서는 연결만
                유지해요.
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
                  켜 두면 다른 캐릭터가 이 페이지만 불러와서 쓸 수 있어요.
                </span>
              </label>

              <label className="grid gap-2 text-sm text-emerald-100/75">
                종류
                <input
                  value={activeSubPage.entryKind ?? ""}
                  onChange={(event) => updateActiveSubPage({ entryKind: event.target.value })}
                  placeholder="예: 서브캐릭터, 물건, 능력, 장소, 조직, 사건"
                  className="auth-input"
                />
                <span className="text-xs text-emerald-100/50">
                  비워 두면 종류 표시 없이 제목만 보여요. 입력하면 탭·공개 페이지에 함께 표시됩니다.
                </span>
              </label>

              <label className="grid gap-2 text-sm text-emerald-100/75">
                {entryCopy.titleLabel}
                <AdminInlineGlitchEditor
                  value={activeSubPage.title}
                  onChange={(value) => updateSubPageField("name", value)}
                  glitch={getFieldGlitch?.(subPageFieldGlitchPath(activeSubPage.id, "name"))}
                  onGlitchChange={(config) =>
                    onFieldGlitchChange?.(subPageFieldGlitchPath(activeSubPage.id, "name"), config)
                  }
                  glitchBindings={bindSubPageField("name")}
                  placeholder={entryCopy.titlePlaceholder}
                  className={subPageFieldClass("name", "")}
                  minHeightClass="min-h-10"
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
                  {entryCopy.kanjiLabel}
                  <AdminInlineGlitchEditor
                    value={activeSubPage.kanjiName ?? ""}
                    onChange={(value) => updateSubPageField("kanjiName", value)}
                    glitch={getFieldGlitch?.(subPageFieldGlitchPath(activeSubPage.id, "kanjiName"))}
                    onGlitchChange={(config) =>
                      onFieldGlitchChange?.(
                        subPageFieldGlitchPath(activeSubPage.id, "kanjiName"),
                        config,
                      )
                    }
                    glitchBindings={bindSubPageField("kanjiName")}
                    placeholder={entryCopy.kanjiPlaceholder}
                    className={subPageFieldClass("kanjiName", "")}
                    minHeightClass="min-h-10"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="grid gap-2 text-sm text-emerald-100/75">
                  {entryCopy.subtitleLabel}
                  <AdminInlineGlitchEditor
                    value={activeSubPage.subtitle}
                    onChange={(value) => updateSubPageField("subtitle", value)}
                    glitch={getFieldGlitch?.(subPageFieldGlitchPath(activeSubPage.id, "subtitle"))}
                    onGlitchChange={(config) =>
                      onFieldGlitchChange?.(
                        subPageFieldGlitchPath(activeSubPage.id, "subtitle"),
                        config,
                      )
                    }
                    glitchBindings={bindSubPageField("subtitle")}
                    placeholder={entryCopy.subtitlePlaceholder}
                    className={subPageFieldClass("subtitle", "")}
                    minHeightClass="min-h-10"
                  />
                </label>
                <div className="grid gap-2">
                  <label className="text-sm text-emerald-100/75">색 분위기</label>
                  <PaletteEditor
                    palette={activeSubPage.palette}
                    onChange={(palette) => updateActiveSubPage({ palette })}
                  />
                </div>
              </div>

              <MetaFieldsEditor
                fields={resolveMetaFields(activeSubPage)}
                onFieldsChange={(metaFields) => {
                  const resolvedFields = resolveMetaFields({ ...activeSubPage, metaFields });
                  const removedField = resolveMetaFields(activeSubPage).find(
                    (field) => !resolvedFields.some((next) => next.id === field.id),
                  );
                  const nextGlitch = { ...(activeSubPage.textGlitch ?? {}) };
                  if (removedField) {
                    delete nextGlitch[metaFieldGlitchPath(removedField.id)];
                  }
                  updateActiveSubPage({ metaFields: resolvedFields, textGlitch: nextGlitch });
                }}
                bindGlitchField={bindGlitchField}
                activeGlitchFieldPath={activeGlitchFieldPath}
                glitchFieldClass={glitchFieldClass}
                getGlitchPath={(fieldId) =>
                  subPageFieldGlitchPath(activeSubPage.id, metaFieldGlitchPath(fieldId))
                }
                onBodyChange={(fieldId, value) =>
                  onGlitchFieldValueChange?.(
                    subPageFieldGlitchPath(activeSubPage.id, metaFieldGlitchPath(fieldId)),
                    value,
                  )
                }
                getFieldGlitch={(fieldId) =>
                  getFieldGlitch?.(
                    subPageFieldGlitchPath(activeSubPage.id, metaFieldGlitchPath(fieldId)),
                  )
                }
                onFieldGlitchChange={(fieldId, config) =>
                  onFieldGlitchChange?.(
                    subPageFieldGlitchPath(activeSubPage.id, metaFieldGlitchPath(fieldId)),
                    config,
                  )
                }
              />

              <label className="grid gap-2 text-sm text-emerald-100/75">
                {entryCopy.quoteLabel}
                <AdminInlineGlitchEditor
                  value={activeSubPage.quote}
                  onChange={(value) => updateSubPageField("quote", value)}
                  glitch={getFieldGlitch?.(subPageFieldGlitchPath(activeSubPage.id, "quote"))}
                  onGlitchChange={(config) =>
                    onFieldGlitchChange?.(subPageFieldGlitchPath(activeSubPage.id, "quote"), config)
                  }
                  glitchBindings={bindSubPageField("quote")}
                  placeholder={entryCopy.quotePlaceholder}
                  className={subPageFieldClass("quote", "")}
                  minHeightClass="min-h-20"
                />
              </label>

              <CaseFileThemeEditor
                theme={activeSubPage.detailTheme}
                onChange={(detailTheme) => updateActiveSubPage({ detailTheme })}
              />

              <label className="grid gap-2 text-sm text-emerald-100/75">
                상세 보기 BGM
                <BgmQuickPicker
                  value={activeSubPage.bgmUrl ?? ""}
                  options={bgmOptions}
                  disabled={isSaving}
                  onChange={(bgmUrl) => updateActiveSubPage({ bgmUrl })}
                  onQuickUpload={onBgmQuickUpload ?? (async () => "")}
                />
              </label>

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
                bindGlitchField={bindGlitchField}
                activeGlitchFieldPath={activeGlitchFieldPath}
                glitchFieldClass={glitchFieldClass}
                onValueChange={(fieldId, value) =>
                  onGlitchFieldValueChange?.(
                    subPageFieldGlitchPath(activeSubPage.id, profileFieldGlitchPath(fieldId)),
                    value,
                  )
                }
                getFieldGlitch={(fieldId) =>
                  getFieldGlitch?.(
                    subPageFieldGlitchPath(activeSubPage.id, profileFieldGlitchPath(fieldId)),
                  )
                }
                onFieldGlitchChange={(fieldId, config) =>
                  onFieldGlitchChange?.(
                    subPageFieldGlitchPath(activeSubPage.id, profileFieldGlitchPath(fieldId)),
                    config,
                  )
                }
              />

              <section
                id="admin-subpage-record-boxes"
                className="grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-50">레코드 박스</p>
                    <p className="mt-1 text-xs text-emerald-100/55">{entryCopy.recordBoxHint} ↑↓로 표시 순서를 바꿀 수 있어요.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addSettingSection}
                    className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
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
                          레코드 박스 {String(index + 1).padStart(2, "0")}
                        </p>
                        <div className="flex items-center gap-2">
                          <SettingSectionOrderButtons
                            index={index}
                            total={activeSettingSections.length}
                            onMoveUp={() => moveSettingSection(section.id, "up")}
                            onMoveDown={() => moveSettingSection(section.id, "down")}
                          />
                          <button
                            type="button"
                            onClick={() => removeSettingSection(section.id)}
                            className="text-xs text-stone-300/70"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <AdminInlineGlitchEditor
                        value={section.title}
                        onChange={(value) => {
                          const titlePath = settingSectionTitleGlitchPath(section.id);
                          if (onGlitchFieldValueChange) {
                            onGlitchFieldValueChange(
                              subPageFieldGlitchPath(activeSubPage.id, titlePath),
                              value,
                            );
                            return;
                          }
                          updateSettingSection(section.id, { title: value });
                        }}
                        glitch={getFieldGlitch?.(
                          subPageFieldGlitchPath(
                            activeSubPage.id,
                            settingSectionTitleGlitchPath(section.id),
                          ),
                        )}
                        onGlitchChange={(config) =>
                          onFieldGlitchChange?.(
                            subPageFieldGlitchPath(
                              activeSubPage.id,
                              settingSectionTitleGlitchPath(section.id),
                            ),
                            config,
                          )
                        }
                        glitchBindings={bindSubPageField(settingSectionTitleGlitchPath(section.id))}
                        placeholder="예: 성격"
                        className={subPageFieldClass(settingSectionTitleGlitchPath(section.id), "")}
                        minHeightClass="min-h-10"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateSettingSection(section.id, { kind: "record", excerpt: "" })}
                          className={`border px-3 py-1.5 text-xs ${
                            (section.kind ?? "record") === "record"
                              ? "border-emerald-200/45 text-emerald-50"
                              : "border-stone-400/25 text-stone-300/70"
                          }`}
                        >
                          일반 레코드
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSettingSection(section.id, { kind: "story" })}
                          className={`border px-3 py-1.5 text-xs ${
                            section.kind === "story"
                              ? "border-emerald-200/45 text-emerald-50"
                              : "border-stone-400/25 text-stone-300/70"
                          }`}
                        >
                          스토리 창
                        </button>
                      </div>
                      {section.kind === "story" && (
                        <AdminInlineGlitchEditor
                          value={section.excerpt ?? ""}
                          onChange={(value) => {
                            const excerptPath = settingSectionExcerptGlitchPath(section.id);
                            if (onGlitchFieldValueChange) {
                              onGlitchFieldValueChange(
                                subPageFieldGlitchPath(activeSubPage.id, excerptPath),
                                value,
                              );
                              return;
                            }
                            updateSettingSection(section.id, { excerpt: value });
                          }}
                          glitch={getFieldGlitch?.(
                            subPageFieldGlitchPath(
                              activeSubPage.id,
                              settingSectionExcerptGlitchPath(section.id),
                            ),
                          )}
                          onGlitchChange={(config) =>
                            onFieldGlitchChange?.(
                              subPageFieldGlitchPath(
                                activeSubPage.id,
                                settingSectionExcerptGlitchPath(section.id),
                              ),
                              config,
                            )
                          }
                          glitchBindings={bindSubPageField(settingSectionExcerptGlitchPath(section.id))}
                          placeholder="Record Box에 보일 짧은 소개 (비우면 본문 앞부분이 자동으로 사용됩니다)"
                          className={subPageFieldClass(settingSectionExcerptGlitchPath(section.id), "")}
                          minHeightClass="min-h-16"
                        />
                      )}
                      <AdminInlineGlitchEditor
                        value={section.body}
                        onChange={(value) => {
                          const fieldPath = settingSectionGlitchPath(section.id);
                          if (onGlitchFieldValueChange) {
                            onGlitchFieldValueChange(
                              subPageFieldGlitchPath(activeSubPage.id, fieldPath),
                              value,
                            );
                            return;
                          }
                          updateSettingSection(section.id, { body: value });
                        }}
                        glitch={getFieldGlitch?.(
                          subPageFieldGlitchPath(activeSubPage.id, settingSectionGlitchPath(section.id)),
                        )}
                        onGlitchChange={(config) =>
                          onFieldGlitchChange?.(
                            subPageFieldGlitchPath(activeSubPage.id, settingSectionGlitchPath(section.id)),
                            config,
                          )
                        }
                        glitchBindings={bindSubPageField(settingSectionGlitchPath(section.id))}
                        placeholder={
                          section.kind === "story"
                            ? "스토리 본문. * ** $ 문법 또는 드래그 후 툴바"
                            : "이 박스 안에 들어갈 내용을 입력"
                        }
                        className={subPageFieldClass(settingSectionGlitchPath(section.id), "")}
                        minHeightClass={section.kind === "story" ? "min-h-40" : "min-h-24"}
                        storyMarkup={section.kind === "story"}
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
                onEntriesChange={(relationshipEntries) => {
                  const removedEntry = (activeSubPage.relationshipEntries ?? []).find(
                    (entry) => !relationshipEntries.some((next) => next.id === entry.id),
                  );
                  const nextGlitch = { ...(activeSubPage.textGlitch ?? {}) };
                  if (removedEntry) {
                    delete nextGlitch[relationshipEntryGlitchPath(removedEntry.id)];
                    delete nextGlitch[relationshipEntryNameGlitchPath(removedEntry.id)];
                    delete nextGlitch[relationshipEntryLabelGlitchPath(removedEntry.id)];
                  }
                  updateActiveSubPage({ relationshipEntries, textGlitch: nextGlitch });
                }}
                linkableCharacters={linkableCharacters}
                currentCharacterId={parentCharacterId}
                ownSubPages={listNavigableSubPages(
                  { id: parentCharacterId, subPages } as Character,
                  allCharacters,
                )}
                prefixGlitchPath={(path) => subPageFieldGlitchPath(activeSubPage.id, path)}
                bindGlitchField={bindGlitchField}
                activeGlitchFieldPath={activeGlitchFieldPath}
                glitchFieldClass={glitchFieldClass}
                onEntryFieldValueChange={(path, value) => onGlitchFieldValueChange?.(path, value)}
                getGlitchByPath={(path) => getFieldGlitch?.(path)}
                onGlitchPathChange={(path, config) => onFieldGlitchChange?.(path, config)}
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
          편집할 상세 페이지를 선택해주세요.
        </div>
      )}
    </div>
  );
}
