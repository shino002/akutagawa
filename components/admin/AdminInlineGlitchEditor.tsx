"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import {
  buildFormattedEditorHtml,
  editorGlitchSignature,
  readPlainTextFromEditor,
  scheduleReadContentEditableSelection,
} from "@/lib/contenteditable-glitch";
import { reconstructStoryMarkupSource, syncStoryMarkupToGlitch } from "@/lib/story-markup-sync";
import { storyTextHasMarkup } from "@/lib/story-text";
import type { FieldGlitchConfig } from "@/lib/types";
import { cn } from "@/utils/cn";

export type GlitchFieldBindings = {
  "data-glitch-field": string;
  onFocus?: () => void;
  onClick?: () => void;
  onSelect?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
  onKeyUp?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
  onMouseUp?: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement | HTMLElement }) => void;
};

interface AdminInlineGlitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  glitch?: FieldGlitchConfig;
  onGlitchChange?: (config: FieldGlitchConfig | undefined) => void;
  glitchBindings: GlitchFieldBindings;
  placeholder?: string;
  className?: string;
  minHeightClass?: string;
  storyMarkup?: boolean;
}

export function AdminInlineGlitchEditor({
  value,
  onChange,
  glitch,
  onGlitchChange,
  glitchBindings,
  placeholder,
  className,
  minHeightClass = "min-h-24",
  storyMarkup = false,
}: AdminInlineGlitchEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isFocusedRef = useRef(false);
  const glitchRef = useRef(glitch);
  const [flashApply, setFlashApply] = useState(false);

  const glitchSignature = editorGlitchSignature(value, glitch);

  const showFormattedView = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (!value.trim()) {
      editor.innerHTML = "";
      editor.dataset.empty = "true";
      return;
    }

    editor.dataset.empty = "false";
    editor.innerHTML = buildFormattedEditorHtml(value, glitch, { storyMarkup });
  }, [glitch, storyMarkup, value]);

  const resolveEditableSource = useCallback(() => {
    if (!storyMarkup) {
      return value;
    }

    return reconstructStoryMarkupSource(value, glitch);
  }, [glitch, storyMarkup, value]);

  const isShowingFormattedView = useCallback((editor: HTMLElement) => {
    return (
      editor.querySelector(
        "strong, em, .admin-inline-zone, .story-inline-quote, .admin-inline-story-mark",
      ) !== null
    );
  }, []);

  const showPlainEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.dataset.empty = value.trim() ? "false" : "true";
    editor.textContent = resolveEditableSource();
  }, [resolveEditableSource, value]);

  useLayoutEffect(() => {
    if (isFocusedRef.current) {
      return;
    }

    showFormattedView();
  }, [glitchSignature, showFormattedView]);

  useLayoutEffect(() => {
    if (glitchRef.current === glitch) {
      return;
    }

    const editor = editorRef.current;
    const shouldBlur = isFocusedRef.current && document.activeElement === editor;

    glitchRef.current = glitch;

    if (shouldBlur) {
      editor?.blur();
      return;
    }

    if (!isFocusedRef.current) {
      showFormattedView();
    }
  }, [glitch, showFormattedView]);

  const flashApplied = () => {
    setFlashApply(true);
    window.setTimeout(() => setFlashApply(false), 520);
  };

  const syncMarkupIfNeeded = useCallback(
    (sourceText: string, sourceGlitch?: FieldGlitchConfig) => {
      if (!storyMarkup || !storyTextHasMarkup(sourceText)) {
        return { text: sourceText, glitch: sourceGlitch, changed: false as const };
      }

      const synced = syncStoryMarkupToGlitch(sourceText, sourceGlitch);
      if (!synced.changed) {
        return synced;
      }

      onChange(synced.text);
      onGlitchChange?.(synced.glitch);
      flashApplied();
      return synced;
    },
    [onChange, onGlitchChange, storyMarkup],
  );

  const renderFormatted = useCallback(
    (displayText: string, displayGlitch?: FieldGlitchConfig) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      if (!displayText.trim()) {
        editor.innerHTML = "";
        editor.dataset.empty = "true";
        return;
      }

      editor.dataset.empty = "false";
      editor.innerHTML = buildFormattedEditorHtml(displayText, displayGlitch, { storyMarkup });
    },
    [storyMarkup],
  );

  const reportSelection = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    scheduleReadContentEditableSelection(editor, () => {
      glitchBindings.onMouseUp?.({ currentTarget: editor });
    });
  };

  const handleMouseDown = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (!isFocusedRef.current || (storyMarkup && isShowingFormattedView(editor))) {
      showPlainEditor();
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    showPlainEditor();
    glitchBindings.onFocus?.();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const sourceText = editorRef.current ? readPlainTextFromEditor(editorRef.current) : value;

    if (sourceText !== value) {
      onChange(sourceText);
    }

    const synced = syncMarkupIfNeeded(sourceText, glitch);
    renderFormatted(synced.text, synced.glitch);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text/plain");
    if (!pasted) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(pasted));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    const nextValue = readPlainTextFromEditor(editor);
    editor.dataset.empty = nextValue.trim() ? "false" : "true";
    onChange(nextValue);

    if (storyMarkup && storyTextHasMarkup(nextValue)) {
      const synced = syncMarkupIfNeeded(nextValue, glitch);
      if (synced.changed && isFocusedRef.current) {
        showPlainEditor();
        if (editorRef.current) {
          editorRef.current.textContent = synced.text;
        }
      }
    }
  };

  return (
    <div className="admin-inline-glitch-editor">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        data-glitch-inline-editor
        data-glitch-field={glitchBindings["data-glitch-field"]}
        data-empty={value.trim() ? "false" : "true"}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
        onMouseDownCapture={handleMouseDown}
        onPaste={handlePaste}
        onClick={() => {
          glitchBindings.onClick?.();
          reportSelection();
        }}
        onKeyUp={(event) => {
          glitchBindings.onKeyUp?.(event);
          reportSelection();
        }}
        onMouseUp={() => {
          reportSelection();
        }}
        onInput={() => {
          const editor = editorRef.current;
          if (!editor) {
            return;
          }

          editor.dataset.empty = "false";
          const plain = readPlainTextFromEditor(editor);
          if (plain !== value) {
            onChange(plain);
          }
        }}
        className={cn(
          "admin-inline-glitch-editor-body auth-input",
          minHeightClass,
          flashApply && "is-applied-flash",
          className,
        )}
        data-text-corruptor-ignore
        data-admin-interactive
      />
      {placeholder && !value.trim() ? (
        <p className="admin-inline-glitch-editor-placeholder" aria-hidden="true">
          {placeholder}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-emerald-100/45">
        *기울임* · **굵게** · ***굵은 기울임*** · $강조$ · **$굵은 강조$** · 드래그 후 툴바도 사용 가능
      </p>
    </div>
  );
}
