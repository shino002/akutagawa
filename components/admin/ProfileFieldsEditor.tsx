"use client";

import type { ProfileField } from "@/lib/types";
import { createProfileFieldId, profileFieldGlitchPath } from "@/lib/profile-fields";

type GlitchFieldBindings = {
  "data-glitch-field"?: string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: React.SyntheticEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLInputElement>) => void;
};

interface ProfileFieldsEditorProps {
  fields: ProfileField[];
  onFieldsChange: (fields: ProfileField[]) => void;
  getFieldGlitchPath: (fieldId: string) => string;
  bindGlitchField?: (path: string) => GlitchFieldBindings;
  activeGlitchFieldPath?: string | null;
  glitchFieldClass?: (path: string, activePath: string | null, baseClass?: string) => string;
  onValueChange?: (fieldId: string, value: string) => void;
}

export function ProfileFieldsEditor({
  fields,
  onFieldsChange,
  getFieldGlitchPath,
  bindGlitchField,
  activeGlitchFieldPath = null,
  glitchFieldClass,
  onValueChange,
}: ProfileFieldsEditorProps) {
  const updateField = (fieldId: string, patch: Partial<Pick<ProfileField, "label" | "value">>) => {
    onFieldsChange(
      fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    );
  };

  const removeField = (fieldId: string) => {
    onFieldsChange(fields.filter((field) => field.id !== fieldId));
  };

  const addField = () => {
    onFieldsChange([
      ...fields,
      {
        id: createProfileFieldId(),
        label: "",
        value: "",
      },
    ]);
  };

  return (
    <section className="grid gap-3 border border-emerald-200/20 bg-emerald-950/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-50">프로필 박스</p>
          <p className="mt-1 text-xs text-emerald-100/55">
            상세 카드에 나오는 역할·신장 같은 정보 박스입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="shrink-0 border border-stone-400/35 px-3 py-2 text-xs text-stone-200"
        >
          프로필 박스 추가
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field, index) => {
          const glitchPath = getFieldGlitchPath(field.id);
          const inputClassName = glitchFieldClass
            ? glitchFieldClass(glitchPath, activeGlitchFieldPath)
            : "auth-input";

          return (
            <article key={field.id} className="grid gap-2 border border-emerald-100/10 bg-black/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs tracking-[0.22em] text-emerald-100/45 uppercase">
                  박스 {String(index + 1).padStart(2, "0")}
                </p>
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="text-xs text-stone-300/70"
                >
                  삭제
                </button>
              </div>
              <input
                value={field.label}
                onChange={(event) => updateField(field.id, { label: event.target.value })}
                placeholder="예: 역할"
                className="auth-input"
              />
              <input
                value={field.value}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (onValueChange) {
                    onValueChange(field.id, nextValue);
                    return;
                  }
                  updateField(field.id, { value: nextValue });
                }}
                placeholder="값"
                {...(bindGlitchField ? bindGlitchField(glitchPath) : { "data-glitch-field": glitchPath })}
                className={inputClassName}
              />
            </article>
          );
        })}
      </div>

      {fields.length === 0 && (
        <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
          「프로필 박스 추가」를 누르면 여기에 박스가 생깁니다.
        </p>
      )}
    </section>
  );
}

export { profileFieldGlitchPath };
