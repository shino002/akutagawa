"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { preserveGlitchToolbarSourceSelection } from "@/lib/admin-interaction";
import { getSelectionStyle, readPlainTextFromEditor } from "@/lib/contenteditable-glitch";
import type { GlitchTextSelection } from "@/lib/glitch-selection";
import {
  mapStoryMarkupSelectionToStripped,
  storyTextHasMarkup,
  stripStoryMarkupPreserveLayout,
} from "@/lib/story-text";
import {
  applyGlitchZone,
  buildQuickMarkdownStyle,
  buildQuickTextColorStyle,
  resolveAnchoredSelection,
} from "@/lib/glitch-zone-apply";
import {
  clampFloatingToolbarPosition,
  getTextareaSelectionRect,
} from "@/lib/textarea-selection-rect";
import type { FieldGlitchConfig, GlitchMarkdown } from "@/lib/types";
import { cn } from "@/utils/cn";

interface GlitchSelectionFloatingToolbarProps {
  anchorElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
  selection: GlitchTextSelection | null;
  fieldValue?: string;
  fieldLabel?: string | null;
  glitchConfig?: FieldGlitchConfig;
  onApply: (config: FieldGlitchConfig, message: string) => void;
  onNotice?: (message: string) => void;
  className?: string;
}

const STYLE_BUTTONS: Array<{ key: keyof GlitchMarkdown; label: string; title: string }> = [
  { key: "bold", label: "B", title: "굵게" },
  { key: "italic", label: "I", title: "기울임" },
  { key: "underline", label: "U", title: "밑줄" },
  { key: "strikethrough", label: "S", title: "취소선" },
];

const TEXT_COLOR_PRESETS = [
  { label: "연녹", value: "#a7f3d0" },
  { label: "장미", value: "#fda4af" },
  { label: "하늘", value: "#7dd3fc" },
  { label: "호박", value: "#fde68a" },
  { label: "보라", value: "#c4b5fd" },
  { label: "백색", value: "#f8fafc" },
] as const;

function ToolbarButton({
  active = false,
  children,
  title,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={preserveGlitchToolbarSourceSelection}
      onMouseDownCapture={preserveGlitchToolbarSourceSelection}
      onClick={onClick}
      className={cn("glitch-float-toolbar-btn", active && "is-active", className)}
    >
      {children}
    </button>
  );
}

function getFallbackToolbarPosition(anchorElement: HTMLElement) {
  const rect = anchorElement.getBoundingClientRect();
  return {
    left: Math.max(12, rect.left),
    top: Math.max(12, rect.top - 56),
  };
}

export function GlitchSelectionFloatingToolbar({
  anchorElement,
  selection,
  fieldValue = "",
  fieldLabel,
  glitchConfig,
  onApply,
  onNotice,
  className,
}: GlitchSelectionFloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const selectionSnapshotRef = useRef<GlitchTextSelection | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [justApplied, setJustApplied] = useState(false);

  const resolvedSelection = useMemo(() => {
    if (!selection || !anchorElement) {
      return null;
    }

    const liveFieldText =
      anchorElement instanceof HTMLElement && anchorElement.isContentEditable
        ? readPlainTextFromEditor(anchorElement) || fieldValue
        : anchorElement instanceof HTMLTextAreaElement || anchorElement instanceof HTMLInputElement
          ? anchorElement.value
          : fieldValue;

    const anchored = resolveAnchoredSelection(selection, liveFieldText);
    if (!anchored) {
      return null;
    }

    if (storyTextHasMarkup(liveFieldText)) {
      return mapStoryMarkupSelectionToStripped(liveFieldText, anchored);
    }

    return anchored;
  }, [anchorElement, fieldValue, selection]);

  useLayoutEffect(() => {
    selectionSnapshotRef.current = resolvedSelection;
  }, [resolvedSelection]);

  const selectionStyle = useMemo(() => {
    if (!resolvedSelection) {
      return undefined;
    }

    return getSelectionStyle(glitchConfig, resolvedSelection);
  }, [glitchConfig, resolvedSelection]);

  const activeTextColor = selectionStyle?.textColor ?? "";

  const fallbackPosition = useMemo(
    () => (anchorElement ? getFallbackToolbarPosition(anchorElement) : null),
    [anchorElement],
  );

  useLayoutEffect(() => {
    if (!anchorElement || !resolvedSelection) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchorRect =
        getTextareaSelectionRect(anchorElement, resolvedSelection.end) ??
        anchorElement.getBoundingClientRect();

      const toolbarWidth = toolbarRef.current?.offsetWidth ?? 320;
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? 52;
      setPosition(clampFloatingToolbarPosition(anchorRect, toolbarWidth, toolbarHeight));
    };

    updatePosition();

    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    anchorElement.addEventListener("scroll", updatePosition);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      anchorElement.removeEventListener("scroll", updatePosition);
    };
  }, [anchorElement, resolvedSelection]);

  if (typeof document === "undefined" || !resolvedSelection || !anchorElement) {
    return null;
  }

  const displayPosition = position ?? fallbackPosition;
  if (!displayPosition) {
    return null;
  }

  const notify = (message: string) => {
    onNotice?.(message);
  };

  const resolveFieldText = () => {
    if (!anchorElement) {
      return fieldValue;
    }

    if (anchorElement instanceof HTMLElement && anchorElement.isContentEditable) {
      const liveText = readPlainTextFromEditor(anchorElement);
      return liveText || fieldValue;
    }

    if (anchorElement instanceof HTMLTextAreaElement || anchorElement instanceof HTMLInputElement) {
      return anchorElement.value;
    }

    return fieldValue;
  };

  const resolveZoneFieldText = (liveFieldText: string) => {
    if (storyTextHasMarkup(liveFieldText)) {
      return stripStoryMarkupPreserveLayout(liveFieldText);
    }

    return liveFieldText;
  };

  const commit = (options: Parameters<typeof applyGlitchZone>[2]) => {
    const anchoredSelection = selectionSnapshotRef.current ?? resolvedSelection;
    if (!anchoredSelection?.text) {
      notify("선택 구간을 다시 지정해주세요.");
      return;
    }

    const liveFieldText = resolveFieldText();
    const zoneFieldText = resolveZoneFieldText(liveFieldText);

    const result = applyGlitchZone(glitchConfig, anchoredSelection, {
      style: selectionStyle,
      errorMessageSource: "none",
      fieldText: zoneFieldText,
      ...options,
    });

    if (!result.ok) {
      notify(result.message);
      return;
    }

    onApply(result.config, result.message);
    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 480);
  };

  const applyMarkdown = (key: keyof GlitchMarkdown) => {
    const isActive = Boolean(selectionStyle?.markdown?.[key]);
    const nextStyle = buildQuickMarkdownStyle(selectionStyle, key, !isActive);
    commit({ style: nextStyle });
  };

  const applyTextColor = (color: string | null) => {
    const normalized = color?.trim().toLowerCase() ?? "";
    const current = activeTextColor.trim().toLowerCase();
    const nextColor = normalized && normalized === current ? null : color;
    const nextStyle = buildQuickTextColorStyle(selectionStyle, nextColor);
    commit({ style: nextStyle });
  };

  const handleToolbarMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "color") {
      selectionSnapshotRef.current = resolvedSelection;
      return;
    }

    preserveGlitchToolbarSourceSelection(event);
  };

  const handleToolbarMouseDownCapture = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "color") {
      selectionSnapshotRef.current = resolvedSelection;
      return;
    }

    preserveGlitchToolbarSourceSelection(event);
  };

  return createPortal(
    <div
      ref={toolbarRef}
      className={cn("glitch-float-toolbar", justApplied && "is-just-applied", className)}
      style={{ left: displayPosition.left, top: displayPosition.top }}
      data-glitch-float-toolbar
      data-text-corruptor-ignore
      data-admin-interactive
      onMouseDown={handleToolbarMouseDown}
      onMouseDownCapture={handleToolbarMouseDownCapture}
    >
      <div className="glitch-float-toolbar-main">
        {STYLE_BUTTONS.map((button) => (
          <ToolbarButton
            key={button.key}
            title={button.title}
            active={Boolean(selectionStyle?.markdown?.[button.key])}
            onClick={() => applyMarkdown(button.key)}
            className={
              button.key === "bold" ? "font-bold" : button.key === "italic" ? "italic" : undefined
            }
          >
            {button.label}
          </ToolbarButton>
        ))}

        <span className="glitch-float-toolbar-divider" aria-hidden="true" />

        <div className="glitch-float-toolbar-colors">
          {TEXT_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={`글자색 ${preset.label}`}
              aria-label={`글자색 ${preset.label}`}
              aria-pressed={activeTextColor.toLowerCase() === preset.value.toLowerCase()}
              onMouseDown={preserveGlitchToolbarSourceSelection}
              onMouseDownCapture={preserveGlitchToolbarSourceSelection}
              onClick={() => applyTextColor(preset.value)}
              className={cn(
                "glitch-float-toolbar-color-swatch",
                activeTextColor.toLowerCase() === preset.value.toLowerCase() && "is-active",
              )}
              style={{ "--swatch-color": preset.value } as CSSProperties}
            />
          ))}

          <label
            className={cn(
              "glitch-float-toolbar-color-picker",
              activeTextColor &&
                !TEXT_COLOR_PRESETS.some(
                  (preset) => preset.value.toLowerCase() === activeTextColor.toLowerCase(),
                ) &&
                "is-active",
            )}
            title="직접 색 선택"
          >
            <span
              className="glitch-float-toolbar-color-picker-preview"
              style={{ backgroundColor: activeTextColor || "transparent" }}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={activeTextColor || "#a7f3d0"}
              onMouseDownCapture={() => {
                selectionSnapshotRef.current = resolvedSelection;
              }}
              onChange={(event) => applyTextColor(event.target.value)}
              className="glitch-float-toolbar-color-input"
              aria-label="글자색 직접 선택"
            />
          </label>

          {activeTextColor ? (
            <ToolbarButton title="글자색 해제" onClick={() => applyTextColor(null)} className="px-1.5 text-[10px]">
              ×
            </ToolbarButton>
          ) : null}
        </div>
      </div>

      <p className="glitch-float-toolbar-meta">
        {fieldLabel ? `${fieldLabel} · ` : ""}
        {resolvedSelection.start + 1}~{resolvedSelection.end}번째 · {resolvedSelection.text.length}자
        {justApplied ? " · 적용됨" : ""}
      </p>
    </div>,
    document.body,
  );
}
