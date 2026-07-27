"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { createAdminDraftStore } from "@/lib/admin-draft-store";
import { createBlankDiaryEntry } from "@/lib/diary-draft";
import { getFirebaseDb } from "@/lib/firebase";
import type { DiaryEntry } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type DiaryAdminState = {
  activeId: string;
  draft: DiaryEntry;
  isSaving: boolean;
  notice: string;
};

const diaryStore = createAdminDraftStore<DiaryAdminState>({
  activeId: "",
  draft: createBlankDiaryEntry(),
  isSaving: false,
  notice: "",
});

type UseDiaryAdminOptions = {
  isAdmin?: boolean;
  onNotice?: (message: string) => void;
  setIsSaving?: (value: boolean) => void;
};

/**
 * 관리자 일기 편집 상태입니다.
 * 목록 읽기는 useDiaryEntries 싱글톤을 재사용하고,
 * activeId/draft/isSaving/notice 는 createAdminDraftStore 로 호출부 간에 공유합니다.
 */
export const useDiaryAdmin = (options: UseDiaryAdminOptions = {}) => {
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = options.isAdmin ?? authIsAdmin;
  const { data: diaryEntries, error: diaryError } = useDiaryEntries();
  const state = useSyncExternalStore(
    diaryStore.subscribe,
    diaryStore.getSnapshot,
    diaryStore.getSnapshot,
  );
  const diaryEntriesRef = useRef(diaryEntries);
  useEffect(() => {
    diaryEntriesRef.current = diaryEntries;
  }, [diaryEntries]);

  const emitNotice = (message: string) => {
    diaryStore.setState((current) => ({ ...current, notice: message }));
    options.onNotice?.(message);
  };

  const setSaving = (value: boolean) => {
    diaryStore.setState((current) => ({ ...current, isSaving: value }));
    options.setIsSaving?.(value);
  };

  // 스냅샷이 갱신됐을 때 선택이 비어 있으면 첫 일기를 고릅니다.
  useEffect(() => {
    const current = diaryStore.getSnapshot();
    if (current.activeId) return;
    const firstEntry = diaryEntries[0];
    if (!firstEntry) return;
    diaryStore.setState({
      ...current,
      activeId: firstEntry.id,
      draft: firstEntry,
    });
  }, [diaryEntries]);

  const setActiveDiaryId: Dispatch<SetStateAction<string>> = (updater) => {
    diaryStore.setState((current) => ({
      ...current,
      activeId: typeof updater === "function" ? updater(current.activeId) : updater,
    }));
  };

  const setDiaryDraft: Dispatch<SetStateAction<DiaryEntry>> = (updater) => {
    diaryStore.setState((current) => ({
      ...current,
      draft: typeof updater === "function" ? updater(current.draft) : updater,
    }));
  };

  const startNewDiaryEntry = () => {
    diaryStore.setState((current) => ({
      ...current,
      activeId: "",
      draft: createBlankDiaryEntry(),
      notice: "새 일기를 작성해주세요.",
    }));
    options.onNotice?.("새 일기를 작성해주세요.");
  };

  const selectDiaryEntry = (entry: DiaryEntry) => {
    diaryStore.setState((current) => ({
      ...current,
      activeId: entry.id,
      draft: entry,
    }));
  };

  const saveDiaryEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      emitNotice("관리자만 일기를 저장할 수 있어요.");
      return;
    }

    const title = state.draft.title.trim();
    const date = state.draft.date.trim();
    const body = state.draft.body.trim();

    if (!title || !body) {
      emitNotice("일기 제목과 내용을 입력해주세요.");
      return;
    }

    const id = slugifyId(state.draft.id || `${date}-${title}`) || crypto.randomUUID();

    try {
      setSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "diaryEntries", id),
        {
          id,
          title,
          date: date || new Date().toISOString().slice(0, 10),
          body,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      const nextDraft: DiaryEntry = {
        id,
        title,
        date: date || new Date().toISOString().slice(0, 10),
        body,
      };
      diaryStore.setState((current) => ({
        ...current,
        activeId: id,
        draft: nextDraft,
        notice: "일기를 저장했어요.",
      }));
      options.onNotice?.("일기를 저장했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "일기 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDiaryEntry = async (entry: DiaryEntry) => {
    if (!isAdmin) {
      emitNotice("관리자만 일기를 삭제할 수 있어요.");
      return;
    }

    if (!entry.id) {
      emitNotice("삭제할 일기를 찾지 못했어요.");
      return;
    }

    try {
      setSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "diaryEntries", entry.id));
      diaryStore.setState((current) => ({
        ...current,
        activeId: "",
        draft: createBlankDiaryEntry(),
        notice: "일기를 삭제했어요.",
      }));
      options.onNotice?.("일기를 삭제했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "일기 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    diaryEntries,
    diaryEntriesRef,
    activeDiaryId: state.activeId,
    setActiveDiaryId,
    diaryDraft: state.draft,
    setDiaryDraft,
    isSaving: state.isSaving,
    notice: diaryError || state.notice,
    startNewDiaryEntry,
    selectDiaryEntry,
    saveDiaryEntry,
    deleteDiaryEntry,
  };
};
