"use client";

import { AdminInlineGlitchEditor } from "@/components/admin/AdminInlineGlitchEditor";
import type { CaseMetaField, FieldGlitchConfig } from "@/lib/types";
import { createBlankMetaField, metaFieldGlitchPath } from "@/lib/meta-fields";
import type {
  KeyboardEvent,
  MouseEvent,
  SyntheticEvent,
} from "react";
import { AdminCollapsiblePanel } from "@/components/admin/AdminCollapsiblePanel";

type GlitchFieldBindings = {
  "data-glitch-field"?: string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
  onKeyUp?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
  onMouseUp?: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement | HTMLElement>) => void;
};

interface MetaFieldsEditorProps {
  fields: CaseMetaField[];
  onFieldsChange: (fields: CaseMetaField[]) => void;
  bindGlitchField?: (path: string) => GlitchFieldBindings;
  activeGlitchFieldPath?: string | null;
  glitchFieldClass?: (path: string, activePath: string | null, baseClass?: string) => string;
  onBodyChange?: (fieldId: string, value: string) => void;
  getGlitchPath?: (fieldId: string) => string;
  getFieldGlitch?: (fieldId: string) => FieldGlitchConfig | undefined;
  onFieldGlitchChange?: (fieldId: string, config: FieldGlitchConfig | undefined) => void;
}

export function MetaFieldsEditor({
  fields,
  onFieldsChange,
  bindGlitchField,
  activeGlitchFieldPath = null,
  glitchFieldClass,
  onBodyChange,
  getGlitchPath = metaFieldGlitchPath,
  getFieldGlitch,
  onFieldGlitchChange,
}: MetaFieldsEditorProps) {
  const updateField = (fieldId: string, patch: Partial<CaseMetaField>) => {
    onFieldsChange(
      fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    );
  };

  const removeField = (fieldId: string) => {
    onFieldsChange(fields.filter((field) => field.id !== fieldId));
  };

  const addField = () => {
    onFieldsChange([...fields, createBlankMetaField()]);
  };

  const resolveFieldClass = (fieldId: string, baseClass = "auth-input") =>
    glitchFieldClass?.(getGlitchPath(fieldId), activeGlitchFieldPath, baseClass) ?? baseClass;

  return (
    <section className="grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-50">카드 메타 기록</p>
          <p className="mt-1 text-xs text-emerald-100/55">
            상세 카드 상단에 표시할 항목입니다. 이름을 자유롭게 정하고 여러 개 추가할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
        >
          항목 추가
        </button>
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-3">
          {fields.map((field, index) => {
            const glitchPath = getGlitchPath(field.id);

            return (
              <AdminCollapsiblePanel
                key={field.id}
                title={field.label.trim() || `메타 항목 ${String(index + 1).padStart(2, "0")}`}
                description="카드에 보이는 라벨과 내용입니다."
              >
                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm text-emerald-100/75">
                    항목 이름
                    <input
                      value={field.label}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                      placeholder="예: 상태, 분류, 등급, 위험도"
                      className="auth-input"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-emerald-100/75">
                    내용
                    <AdminInlineGlitchEditor
                      value={field.body}
                      onChange={(value) => {
                        if (onBodyChange) {
                          onBodyChange(field.id, value);
                          return;
                        }
                        updateField(field.id, { body: value });
                      }}
                      glitch={getFieldGlitch?.(field.id)}
                      onGlitchChange={(config) => onFieldGlitchChange?.(field.id, config)}
                      glitchBindings={
                        bindGlitchField?.(glitchPath) ?? { "data-glitch-field": glitchPath }
                      }
                      placeholder={"예: 관찰중\n기록 불완전\n또는 한 줄 분류"}
                      className={resolveFieldClass(field.id, "")}
                      minHeightClass="min-h-24"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="justify-self-start text-xs text-stone-300/70"
                  >
                    이 항목 삭제
                  </button>
                </div>
              </AdminCollapsiblePanel>
            );
          })}
        </div>
      ) : (
        <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
          「항목 추가」를 누르면 상태·분류·등급 같은 카드 메타 정보를 만들 수 있어요.
        </p>
      )}
    </section>
  );
}
