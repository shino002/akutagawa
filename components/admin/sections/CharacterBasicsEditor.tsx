"use client";

import { AdminInlineGlitchEditor } from "@/components/admin/AdminInlineGlitchEditor";
import { BgmQuickPicker } from "@/components/admin/BgmQuickPicker";
import { CaseFileThemeEditor } from "@/components/admin/CaseFileThemeEditor";
import { MetaFieldsEditor } from "@/components/admin/MetaFieldsEditor";
import { PaletteEditor } from "@/components/admin/PaletteEditor";
import {
  ProfileFieldsEditor,
  profileFieldGlitchPath,
} from "@/components/admin/ProfileFieldsEditor";
import { RelationshipsEditor } from "@/components/admin/RelationshipsEditor";
import { SettingSectionOrderButtons } from "@/components/admin/SettingSectionOrderButtons";
import { useCharactersAdmin } from "@/contexts/CharactersAdminContext";
import { extractCharacterPaletteFromImage } from "@/lib/character-palette";
import { CHARACTER_KINDS, CHARACTER_KIND_ADMIN_LABELS } from "@/lib/character-kind";
import {
  getDraftGlitchConfig,
  settingSectionExcerptGlitchPath,
  settingSectionGlitchPath,
  settingSectionTitleGlitchPath,
  updateDraftFieldValue,
  updateDraftGlitchPath,
} from "@/lib/glitch-fields";
import { metaFieldGlitchPath } from "@/lib/meta-fields";
import {
  relationshipEntryGlitchPath,
  relationshipEntryLabelGlitchPath,
  relationshipEntryNameGlitchPath,
} from "@/lib/relationship-entries";
import type { Character, CharacterKind } from "@/lib/types";
import { listNavigableSubPages } from "@/lib/sub-pages";
import { glitchFieldClass } from "@/utils/glitchFieldClass";

/**
 * 캐릭터 기본 정보 · 레코드 박스 · 관계 섹션입니다.
 */
export function CharacterBasicsEditor() {
  const {
    draft,
    setDraft,
    kindLabel,
    isPairDraft,
    isSaving,
    activeCharacter,
    canRecoverLegacyPairMember,
    recoverLegacyPairMemberData,
    reloadCharacterFromServer,
    deleteCharacter,
    bindGlitchField,
    activeGlitchFieldPath,
    characters,
    bgmCharacterOptions,
    quickAddCharacterBgm,
    addSettingSection,
    updateSettingSection,
    removeSettingSection,
    moveSettingSection,
  } = useCharactersAdmin();

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="board-title">{kindLabel} 카드 · 레코드</h2>
        <div className="flex flex-wrap gap-2">
          {canRecoverLegacyPairMember && (
            <button
              type="button"
              onClick={recoverLegacyPairMemberData}
              disabled={isSaving}
              className="border border-amber-300/35 bg-amber-950/25 px-4 py-2 text-sm text-amber-100 disabled:opacity-60"
            >
              페어 멤버 데이터 복구
            </button>
          )}
          {activeCharacter && (
            <button
              type="button"
              onClick={reloadCharacterFromServer}
              disabled={isSaving}
              className="border border-emerald-200/25 px-4 py-2 text-sm text-emerald-100/85 disabled:opacity-60"
            >
              서버에서 다시 불러오기
            </button>
          )}
          {activeCharacter && (
            <button
              type="button"
              onClick={() => deleteCharacter(activeCharacter)}
              disabled={isSaving}
              className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
            >
              현재 {kindLabel} 삭제
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-emerald-100/75">
          고유 ID
          <input
            value={draft.id}
            onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))}
            placeholder="id 예: shin"
            className="auth-input"
          />
        </label>
        <label className="grid gap-2 text-sm text-emerald-100/75">
          분류 (Archive)
          <select
            value={draft.kind}
            onChange={(event) => {
              const kind = event.target.value as CharacterKind;
              setDraft((current) => ({
                ...current,
                kind,
                pairMemberIds: kind === "pair" ? current.pairMemberIds : ["", ""],
              }));
            }}
            className="auth-input"
          >
            {CHARACTER_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CHARACTER_KIND_ADMIN_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-3 rounded border border-stone-400/20 bg-black/25 px-3 py-3 text-sm text-emerald-100/75 md:col-span-2">
          <input
            type="checkbox"
            checked={draft.confidential}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                confidential: event.target.checked,
              }))
            }
            className="mt-1"
          />
          <span className="grid gap-1">
            <span className="font-medium text-emerald-50">기밀 문서 경고</span>
            <span className="text-xs leading-5 text-emerald-100/55">
              켜면 공개 홈에서 이 자캐를 열 때 기밀 문서 경고와 경고음이 납니다.
            </span>
          </span>
        </label>
        <label className="grid gap-2 text-sm text-emerald-100/75 md:col-span-2">
          {isPairDraft ? "페어 이름" : "이름"}
          <AdminInlineGlitchEditor
            value={draft.name}
            onChange={(value) =>
              setDraft((current) => updateDraftFieldValue(current, "name", value))
            }
            glitch={getDraftGlitchConfig(draft, "name")}
            onGlitchChange={(config) =>
              setDraft((current) => updateDraftGlitchPath(current, "name", config))
            }
            glitchBindings={bindGlitchField("name")}
            placeholder={isPairDraft ? "비우면 멤버 이름으로 자동 표시" : `${kindLabel} 이름`}
            className={glitchFieldClass("name", activeGlitchFieldPath, "")}
            minHeightClass="min-h-10"
          />
        </label>
        <label className="grid gap-2 text-sm text-emerald-100/75">
          한자 이름
          <AdminInlineGlitchEditor
            value={draft.kanjiName}
            onChange={(value) =>
              setDraft((current) => updateDraftFieldValue(current, "kanjiName", value))
            }
            glitch={getDraftGlitchConfig(draft, "kanjiName")}
            onGlitchChange={(config) =>
              setDraft((current) => updateDraftGlitchPath(current, "kanjiName", config))
            }
            glitchBindings={bindGlitchField("kanjiName")}
            placeholder="예: 芥川"
            className={glitchFieldClass("kanjiName", activeGlitchFieldPath, "")}
            minHeightClass="min-h-10"
          />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <label className="grid gap-2 text-sm text-emerald-100/75">
          한 줄 소개
          <AdminInlineGlitchEditor
            value={draft.subtitle}
            onChange={(value) =>
              setDraft((current) => updateDraftFieldValue(current, "subtitle", value))
            }
            glitch={getDraftGlitchConfig(draft, "subtitle")}
            onGlitchChange={(config) =>
              setDraft((current) => updateDraftGlitchPath(current, "subtitle", config))
            }
            glitchBindings={bindGlitchField("subtitle")}
            placeholder="카드에 보일 짧은 소개"
            className={glitchFieldClass("subtitle", activeGlitchFieldPath, "")}
            minHeightClass="min-h-10"
          />
        </label>
        <div className="grid gap-2">
          <label className="text-sm text-emerald-100/75">색 분위기</label>
          <PaletteEditor
            palette={draft.palette}
            onChange={(palette) => setDraft((current) => ({ ...current, palette }))}
            onExtractFromImage={extractCharacterPaletteFromImage}
          />
        </div>
      </div>
      <MetaFieldsEditor
        fields={draft.metaFields}
        onFieldsChange={(metaFields) => {
          setDraft((current) => {
            const removedField = current.metaFields.find(
              (field) => !metaFields.some((next) => next.id === field.id),
            );
            const nextGlitch = { ...current.textGlitch };
            if (removedField) {
              delete nextGlitch[metaFieldGlitchPath(removedField.id)];
            }
            return { ...current, metaFields, textGlitch: nextGlitch };
          });
        }}
        bindGlitchField={bindGlitchField}
        activeGlitchFieldPath={activeGlitchFieldPath}
        glitchFieldClass={glitchFieldClass}
        onBodyChange={(fieldId, value) =>
          setDraft((current) => updateDraftFieldValue(current, metaFieldGlitchPath(fieldId), value))
        }
        getFieldGlitch={(fieldId) => getDraftGlitchConfig(draft, metaFieldGlitchPath(fieldId))}
        onFieldGlitchChange={(fieldId, config) =>
          setDraft((current) =>
            updateDraftGlitchPath(current, metaFieldGlitchPath(fieldId), config),
          )
        }
      />
      <label className="grid gap-2 text-sm text-emerald-100/75">
        {isPairDraft ? "페어 대표 대사" : "대표 대사"}
        <AdminInlineGlitchEditor
          value={draft.quote}
          onChange={(value) =>
            setDraft((current) => updateDraftFieldValue(current, "quote", value))
          }
          glitch={getDraftGlitchConfig(draft, "quote")}
          onGlitchChange={(config) =>
            setDraft((current) => updateDraftGlitchPath(current, "quote", config))
          }
          glitchBindings={bindGlitchField("quote")}
          placeholder={
            isPairDraft ? "페어 관계를 보여 줄 대표 문장" : "캐릭터 상세에 보일 대표 문장"
          }
          className={glitchFieldClass("quote", activeGlitchFieldPath, "")}
          minHeightClass="min-h-20"
        />
      </label>
      <CaseFileThemeEditor
        theme={draft.detailTheme}
        onChange={(detailTheme) =>
          setDraft((current) => ({
            ...current,
            detailTheme,
          }))
        }
      />
      {!isPairDraft && (
        <label className="grid gap-2 text-sm text-emerald-100/75">
          상세 보기 BGM
          <BgmQuickPicker
            value={draft.bgmUrl}
            options={bgmCharacterOptions}
            disabled={isSaving}
            onChange={(bgmUrl) =>
              setDraft((current) => ({
                ...current,
                bgmUrl,
              }))
            }
            onQuickUpload={quickAddCharacterBgm}
          />
        </label>
      )}
      <ProfileFieldsEditor
        fields={draft.profileFields}
        onFieldsChange={(profileFields) =>
          setDraft((current) => {
            const removedField = current.profileFields.find(
              (field) => !profileFields.some((next) => next.id === field.id),
            );
            const nextGlitch = { ...current.textGlitch };
            if (removedField) {
              delete nextGlitch[profileFieldGlitchPath(removedField.id)];
            }
            return { ...current, profileFields, textGlitch: nextGlitch };
          })
        }
        getFieldGlitchPath={profileFieldGlitchPath}
        bindGlitchField={bindGlitchField}
        activeGlitchFieldPath={activeGlitchFieldPath}
        glitchFieldClass={glitchFieldClass}
        onValueChange={(fieldId, value) =>
          setDraft((current) =>
            updateDraftFieldValue(current, profileFieldGlitchPath(fieldId), value),
          )
        }
        getFieldGlitch={(fieldId) => getDraftGlitchConfig(draft, profileFieldGlitchPath(fieldId))}
        onFieldGlitchChange={(fieldId, config) =>
          setDraft((current) =>
            updateDraftGlitchPath(current, profileFieldGlitchPath(fieldId), config),
          )
        }
      />

      <section
        id="admin-record-boxes"
        className="mt-2 grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-50">레코드 박스</p>
            <p className="mt-1 text-xs text-emerald-100/55">
              {isPairDraft
                ? "페어 Record 탭에 나올 관계·특징 박스입니다."
                : "본 페이지 Record 탭에 나오는 상세 설정 박스입니다. ↑↓로 표시 순서를 바꿀 수 있어요."}
            </p>
          </div>
          <button
            type="button"
            onClick={addSettingSection}
            className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
          >
            레코드 박스 추가
          </button>
        </div>
        <div className="grid gap-3">
          {draft.settingSections.map((section, index) => (
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
                    total={draft.settingSections.length}
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
                onChange={(value) =>
                  setDraft((current) =>
                    updateDraftFieldValue(
                      current,
                      settingSectionTitleGlitchPath(section.id),
                      value,
                    ),
                  )
                }
                glitch={getDraftGlitchConfig(draft, settingSectionTitleGlitchPath(section.id))}
                onGlitchChange={(config) =>
                  setDraft((current) =>
                    updateDraftGlitchPath(
                      current,
                      settingSectionTitleGlitchPath(section.id),
                      config,
                    ),
                  )
                }
                glitchBindings={bindGlitchField(settingSectionTitleGlitchPath(section.id))}
                placeholder="예: 성격"
                className={glitchFieldClass(
                  settingSectionTitleGlitchPath(section.id),
                  activeGlitchFieldPath,
                  "",
                )}
                minHeightClass="min-h-10"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSettingSection(section.id, {
                      kind: "record",
                      excerpt: "",
                    })
                  }
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
                  onChange={(value) =>
                    setDraft((current) =>
                      updateDraftFieldValue(
                        current,
                        settingSectionExcerptGlitchPath(section.id),
                        value,
                      ),
                    )
                  }
                  glitch={getDraftGlitchConfig(draft, settingSectionExcerptGlitchPath(section.id))}
                  onGlitchChange={(config) =>
                    setDraft((current) =>
                      updateDraftGlitchPath(
                        current,
                        settingSectionExcerptGlitchPath(section.id),
                        config,
                      ),
                    )
                  }
                  glitchBindings={bindGlitchField(settingSectionExcerptGlitchPath(section.id))}
                  placeholder="Record Box에 보일 짧은 소개 (비우면 본문 앞부분이 자동으로 사용됩니다)"
                  className={glitchFieldClass(
                    settingSectionExcerptGlitchPath(section.id),
                    activeGlitchFieldPath,
                    "",
                  )}
                  minHeightClass="min-h-16"
                />
              )}
              <AdminInlineGlitchEditor
                value={section.body}
                onChange={(value) =>
                  setDraft((current) =>
                    updateDraftFieldValue(current, settingSectionGlitchPath(section.id), value),
                  )
                }
                glitch={getDraftGlitchConfig(draft, settingSectionGlitchPath(section.id))}
                onGlitchChange={(config) =>
                  setDraft((current) =>
                    updateDraftGlitchPath(current, settingSectionGlitchPath(section.id), config),
                  )
                }
                glitchBindings={bindGlitchField(settingSectionGlitchPath(section.id))}
                placeholder={section.kind === "story" ? "스토리 본문" : "내용 입력"}
                className={glitchFieldClass(
                  settingSectionGlitchPath(section.id),
                  activeGlitchFieldPath,
                  "",
                )}
                minHeightClass={section.kind === "story" ? "min-h-40" : "min-h-24"}
              />
            </article>
          ))}
          {draft.settingSections.length === 0 && (
            <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
              「레코드 박스 추가」를 누르면 여기에 박스가 생깁니다.
            </p>
          )}
        </div>
      </section>

      <RelationshipsEditor
        entries={draft.relationshipEntries}
        onEntriesChange={(relationshipEntries) =>
          setDraft((current) => {
            const removedEntry = current.relationshipEntries.find(
              (entry) => !relationshipEntries.some((next) => next.id === entry.id),
            );
            const nextGlitch = { ...current.textGlitch };
            if (removedEntry) {
              delete nextGlitch[relationshipEntryGlitchPath(removedEntry.id)];
              delete nextGlitch[relationshipEntryNameGlitchPath(removedEntry.id)];
              delete nextGlitch[relationshipEntryLabelGlitchPath(removedEntry.id)];
            }
            return { ...current, relationshipEntries };
          })
        }
        linkableCharacters={characters}
        currentCharacterId={draft.id}
        ownSubPages={listNavigableSubPages(
          { id: draft.id, subPages: draft.subPages } as Character,
          characters,
        )}
        bindGlitchField={bindGlitchField}
        activeGlitchFieldPath={activeGlitchFieldPath}
        glitchFieldClass={glitchFieldClass}
        onEntryFieldValueChange={(path, value) =>
          setDraft((current) => updateDraftFieldValue(current, path, value))
        }
        getGlitchByPath={(path) => getDraftGlitchConfig(draft, path)}
        onGlitchPathChange={(path, config) =>
          setDraft((current) => updateDraftGlitchPath(current, path, config))
        }
      />
    </>
  );
}
