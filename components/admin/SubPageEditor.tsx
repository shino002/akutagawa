"use client";

import { ProfileFieldsEditor } from "@/components/admin/ProfileFieldsEditor";
import type { CharacterSubPage, SettingSection } from "@/lib/types";
import { settingSectionGlitchPath, subPageFieldGlitchPath } from "@/lib/glitch-fields";
import { profileFieldGlitchPath } from "@/lib/profile-fields";
import { createBlankSubPage } from "@/lib/sub-pages";

interface SubPageEditorProps {  subPages: CharacterSubPage[];
  activeSubPageId: string;
  onActiveSubPageChange: (subPageId: string) => void;
  onSubPagesChange: (subPages: CharacterSubPage[]) => void;
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
}: SubPageEditorProps) {
  const activeSubPage =
    subPages.find((subPage) => subPage.id === activeSubPageId) ?? subPages[0] ?? null;
  const activeSettingSections = activeSubPage?.settingSections ?? [];

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
            {subPage.title || "제목 없음"}
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

      {activeSubPage ? (
        <div className="grid gap-3 border border-emerald-100/15 bg-black/25 p-4">
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

          <label className="grid gap-2 text-sm text-emerald-100/75">
            관계
            <textarea
              value={(activeSubPage.relationships ?? []).join("\n")}
              onChange={(event) =>
                updateActiveSubPage({
                  relationships: event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              placeholder="한 줄에 하나씩 입력"
              data-glitch-field={subPageFieldGlitchPath(activeSubPage.id, "relationships")}
              className="auth-input min-h-24"
            />
          </label>
        </div>
      ) : (
        <div className="border border-emerald-100/15 bg-black/25 p-4 text-sm text-emerald-100/60">
          편집할 하위 페이지를 선택해주세요.
        </div>
      )}
    </div>
  );
}
