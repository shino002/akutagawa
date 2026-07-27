"use client";

import { useCallback, useEffect, useMemo } from "react";
import { AdminInlineGlitchEditor } from "@/components/admin/AdminInlineGlitchEditor";
import { GlitchSelectionFloatingToolbar } from "@/components/admin/GlitchSelectionFloatingToolbar";
import { TextScrambleTool } from "@/components/admin/TextScrambleTool";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCharacters } from "@/hooks/useCharacters";
import { useGlitchFieldEditing } from "@/hooks/useGlitchFieldEditing";
import { useWorldAdmin } from "@/hooks/useWorldAdmin";
import {
  isGlitchFieldTarget,
  isGlitchFloatToolbarTarget,
  readGlitchFieldSelection,
} from "@/lib/admin-interaction";
import { scheduleReadContentEditableSelection } from "@/lib/contenteditable-glitch";
import { scheduleReadGlitchTextSelection, type GlitchTextSelection } from "@/lib/glitch-selection";
import {
  buildWorldGlitchFieldOptions,
  getWorldDraftFieldValue,
  getWorldGlitchFieldLabel,
  updateWorldDraftFieldValue,
  updateWorldDraftGlitchPath,
} from "@/lib/world-glitch-fields";
import { glitchFieldClass } from "@/utils/glitchFieldClass";

/**
 * 카테고리 패널 · World 사이드바 목록입니다.
 */
export function WorldCategorySidebar() {
  const { worlds, activeWorldId, startNewWorld, selectWorld } = useWorldAdmin();

  return (
    <div className="mt-5 border-t border-emerald-100/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-emerald-50">세계관 목록</h3>
        <button
          type="button"
          onClick={startNewWorld}
          className="bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-950"
        >
          새 세계관
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {worlds.map((world) => (
          <button
            key={world.id}
            type="button"
            onClick={() => {
              selectWorld(world);
            }}
            className={`border p-3 text-left text-sm ${
              activeWorldId === world.id
                ? "border-stone-400/35 bg-emerald-100/10"
                : "border-emerald-100/10 bg-black/30"
            }`}
          >
            <span className="block text-base font-semibold">{world.title}</span>
            <span className="mt-1 block text-xs text-emerald-100/50">{world.id}</span>
          </button>
        ))}
        {worlds.length === 0 && (
          <p className="border border-emerald-100/10 bg-black/30 p-3 text-xs text-emerald-100/55">
            아직 저장된 세계관이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 카테고리 패널 · World 편집기입니다.
 * 글리치 UI · 플로팅 툴바까지 이 컴포넌트가 소유합니다.
 */
export function WorldsEditor() {
  const { isAdmin } = useAdminAuth();
  const { worldDraft, setWorldDraft, isSaving, notice, setNotice, saveWorld, deleteWorld } =
    useWorldAdmin({ isAdmin });
  const { data: allCharacters } = useCharacters();
  const {
    activePath: activeWorldGlitchFieldPath,
    setActivePath: setActiveWorldGlitchFieldPath,
    selection: worldGlitchFieldSelection,
    setSelection: setWorldGlitchFieldSelection,
    anchorElement: worldGlitchFieldAnchorElement,
    setAnchorElement: setWorldGlitchFieldAnchorElement,
    selectPath: selectWorldGlitchField,
    anchorRef: worldGlitchFieldAnchorRef,
    mountedRef: worldGlitchMountedRef,
  } = useGlitchFieldEditing();

  const worldGlitchFieldOptions = useMemo(
    () => buildWorldGlitchFieldOptions(worldDraft, worldDraft.textGlitch),
    [worldDraft],
  );
  const worldGlitchFieldPickerOptions = useMemo(
    () =>
      worldGlitchFieldOptions.map((option) => ({
        ...option,
        zoneCount: worldDraft.textGlitch[option.path]?.zones?.length ?? 0,
      })),
    [worldDraft, worldGlitchFieldOptions],
  );
  const activeWorldGlitchLabel = activeWorldGlitchFieldPath
    ? getWorldGlitchFieldLabel(activeWorldGlitchFieldPath)
    : null;

  const captureWorldGlitchFieldSelection = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
      const path = element.dataset.glitchField;
      if (!path || element.closest("[data-text-scramble-tool]")) {
        return;
      }

      const applySelection = (selection: GlitchTextSelection | null) => {
        if (!worldGlitchMountedRef.current) {
          return;
        }

        setActiveWorldGlitchFieldPath(path);
        setWorldGlitchFieldSelection(selection);
        setWorldGlitchFieldAnchorElement(selection ? element : null);
      };

      if (element instanceof HTMLElement && element.isContentEditable) {
        scheduleReadContentEditableSelection(element, applySelection);
        return;
      }

      scheduleReadGlitchTextSelection(
        element as HTMLInputElement | HTMLTextAreaElement,
        applySelection,
      );
    },
    [
      setActiveWorldGlitchFieldPath,
      setWorldGlitchFieldAnchorElement,
      setWorldGlitchFieldSelection,
      worldGlitchMountedRef,
    ],
  );

  const bindWorldGlitchField = useCallback(
    (path: string) => ({
      "data-glitch-field": path,
      "data-glitch-scope": "world",
      onFocus: () => setActiveWorldGlitchFieldPath(path),
      onClick: () => setActiveWorldGlitchFieldPath(path),
      onSelect: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onKeyUp: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
      onMouseUp: (event: {
        currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
      }) => {
        captureWorldGlitchFieldSelection(event.currentTarget);
      },
    }),
    [captureWorldGlitchFieldSelection, setActiveWorldGlitchFieldPath],
  );

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        return;
      }

      const path = target.dataset.glitchField;
      if (
        !path ||
        target.dataset.glitchScope !== "world" ||
        !target.closest(".admin-page") ||
        target.closest("[data-text-scramble-tool]")
      ) {
        return;
      }

      setActiveWorldGlitchFieldPath(path);
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [setActiveWorldGlitchFieldPath]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const syncAnchoredSelection = () => {
      if (!worldGlitchMountedRef.current) {
        return;
      }

      if (document.documentElement.dataset.glitchToolbarActive === "true") {
        return;
      }

      const worldAnchor = worldGlitchFieldAnchorRef.current;
      if (worldAnchor) {
        const selection = readGlitchFieldSelection(worldAnchor);
        setWorldGlitchFieldSelection(selection);
        if (!selection) {
          setWorldGlitchFieldAnchorElement(null);
        }
      }
    };

    const handleSelectionChange = () => {
      if (isGlitchFloatToolbarTarget(document.activeElement)) {
        return;
      }

      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) {
        syncAnchoredSelection();
        return;
      }

      if (active.isContentEditable && active.dataset.glitchField) {
        if (active.dataset.glitchScope === "world") {
          captureWorldGlitchFieldSelection(active);
        }
        return;
      }

      if (!(active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement)) {
        syncAnchoredSelection();
        return;
      }

      if (active.dataset.glitchScope === "world") {
        captureWorldGlitchFieldSelection(active);
        return;
      }

      syncAnchoredSelection();
    };

    const clearFloatingSelections = () => {
      if (!worldGlitchMountedRef.current) {
        return;
      }

      setWorldGlitchFieldSelection(null);
      setWorldGlitchFieldAnchorElement(null);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (isGlitchFloatToolbarTarget(event.target)) {
        document.documentElement.dataset.glitchToolbarActive = "true";
        return;
      }

      delete document.documentElement.dataset.glitchToolbarActive;

      if (isGlitchFieldTarget(event.target)) {
        return;
      }

      clearFloatingSelections();
    };

    const handlePointerUp = () => {
      delete document.documentElement.dataset.glitchToolbarActive;
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      delete document.documentElement.dataset.glitchToolbarActive;
    };
  }, [
    captureWorldGlitchFieldSelection,
    isAdmin,
    setWorldGlitchFieldAnchorElement,
    setWorldGlitchFieldSelection,
    worldGlitchFieldAnchorRef,
    worldGlitchMountedRef,
  ]);

  return (
    <>
      <form onSubmit={saveWorld} className="glass-card grid gap-6 p-5 md:p-6">
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="board-title">World 관리</h2>
              {activeWorldGlitchLabel ? (
                <p className="mt-2 border border-amber-300/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
                  오류 대상: <span className="font-semibold">{activeWorldGlitchLabel}</span>
                </p>
              ) : null}
            </div>
            {worldDraft.id && (
              <button
                type="button"
                onClick={() => deleteWorld(worldDraft.id)}
                disabled={isSaving}
                className="border border-stone-400/35 px-4 py-2 text-sm text-stone-200 disabled:opacity-60"
              >
                현재 세계관 삭제
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-emerald-100/75">
              고유 ID
              <input
                value={worldDraft.id}
                onChange={(event) =>
                  setWorldDraft((current) => ({ ...current, id: event.target.value }))
                }
                placeholder="예: coc-1920"
                className="auth-input"
              />
            </label>
            <label className="grid gap-2 text-sm text-emerald-100/75">
              세계관 이름
              <AdminInlineGlitchEditor
                value={worldDraft.title}
                onChange={(value) =>
                  setWorldDraft((current) => updateWorldDraftFieldValue(current, "title", value))
                }
                glitch={worldDraft.textGlitch.title}
                onGlitchChange={(config) =>
                  setWorldDraft((current) => updateWorldDraftGlitchPath(current, "title", config))
                }
                glitchBindings={bindWorldGlitchField("title")}
                placeholder="예: 크툴루 1920"
                className={glitchFieldClass("title", activeWorldGlitchFieldPath, "")}
                minHeightClass="min-h-10"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            한 줄 설명
            <AdminInlineGlitchEditor
              value={worldDraft.subtitle}
              onChange={(value) =>
                setWorldDraft((current) => updateWorldDraftFieldValue(current, "subtitle", value))
              }
              glitch={worldDraft.textGlitch.subtitle}
              onGlitchChange={(config) =>
                setWorldDraft((current) => updateWorldDraftGlitchPath(current, "subtitle", config))
              }
              glitchBindings={bindWorldGlitchField("subtitle")}
              placeholder="세계관을 짧게 설명해주세요."
              className={glitchFieldClass("subtitle", activeWorldGlitchFieldPath, "")}
              minHeightClass="min-h-10"
            />
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            기록 열람 비밀번호
            <input
              value={worldDraft.password}
              onChange={(event) =>
                setWorldDraft((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="비워두면 공개 / 입력하면 기록 잠금"
              className="auth-input"
            />
            <span className="text-xs leading-5 text-emerald-100/45">
              본 페이지에서는 세계관 목록과 소개만 보이고, 참가 자캐 기록은 이 비밀번호를 입력해야
              열립니다.
            </span>
          </label>
          <label className="grid gap-2 text-sm text-emerald-100/75">
            상세 설명
            <AdminInlineGlitchEditor
              value={worldDraft.description}
              onChange={(value) =>
                setWorldDraft((current) =>
                  updateWorldDraftFieldValue(current, "description", value),
                )
              }
              glitch={worldDraft.textGlitch.description}
              onGlitchChange={(config) =>
                setWorldDraft((current) =>
                  updateWorldDraftGlitchPath(current, "description", config),
                )
              }
              glitchBindings={bindWorldGlitchField("description")}
              placeholder="룰, 시대, 분위기, 캠페인 설명 등"
              className={glitchFieldClass("description", activeWorldGlitchFieldPath, "")}
              minHeightClass="min-h-40"
            />
          </label>

          <div id="admin-world-glitch-tool">
            <TextScrambleTool
              fieldPickerGroups={
                worldGlitchFieldPickerOptions.length > 0
                  ? [
                      {
                        id: "world",
                        label: "세계관 필드",
                        options: worldGlitchFieldPickerOptions,
                      },
                    ]
                  : []
              }
              onFieldSelect={selectWorldGlitchField}
              activeFieldPath={activeWorldGlitchFieldPath}
              fieldValue={
                activeWorldGlitchFieldPath
                  ? getWorldDraftFieldValue(worldDraft, activeWorldGlitchFieldPath)
                  : ""
              }
              externalSelection={worldGlitchFieldSelection}
              onExternalSelectionClear={() => setWorldGlitchFieldSelection(null)}
              onFieldValueChange={(value) => {
                if (!activeWorldGlitchFieldPath) {
                  return;
                }

                setWorldDraft((current) =>
                  updateWorldDraftFieldValue(current, activeWorldGlitchFieldPath, value),
                );
              }}
              glitchConfig={
                activeWorldGlitchFieldPath
                  ? worldDraft.textGlitch[activeWorldGlitchFieldPath]
                  : undefined
              }
              onGlitchChange={(config) => {
                if (!activeWorldGlitchFieldPath) {
                  return;
                }

                setWorldDraft((current) =>
                  updateWorldDraftGlitchPath(current, activeWorldGlitchFieldPath, config),
                );
              }}
              onNotice={setNotice}
              allCharacters={allCharacters}
            />
          </div>
        </section>
        <button
          disabled={isSaving}
          className="justify-self-end bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 disabled:opacity-60"
        >
          세계관 저장
        </button>
      </form>
      {notice && <p className="glass-card p-4 text-sm leading-6 text-stone-200">{notice}</p>}

      {isAdmin && (
        <GlitchSelectionFloatingToolbar
          anchorElement={worldGlitchFieldAnchorElement}
          selection={worldGlitchFieldSelection}
          fieldValue={
            activeWorldGlitchFieldPath
              ? getWorldDraftFieldValue(worldDraft, activeWorldGlitchFieldPath)
              : ""
          }
          fieldLabel={
            activeWorldGlitchFieldPath ? getWorldGlitchFieldLabel(activeWorldGlitchFieldPath) : null
          }
          glitchConfig={
            activeWorldGlitchFieldPath
              ? worldDraft.textGlitch[activeWorldGlitchFieldPath]
              : undefined
          }
          onApply={(config, message) => {
            if (!activeWorldGlitchFieldPath) {
              return;
            }

            setWorldDraft((current) =>
              updateWorldDraftGlitchPath(current, activeWorldGlitchFieldPath, config),
            );
            setNotice(message);
          }}
          onNotice={setNotice}
        />
      )}
    </>
  );
}
