"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createBlankDiaryEntry } from "@/lib/diary-draft";
import { getFirebaseDb } from "@/lib/firebase";
import type { DiaryEntry } from "@/lib/types";
import { useDiaryEntries } from "@/hooks/useDiaryEntries";
import { slugifyId } from "@/utils/slugifyId";

type UseDiaryAdminOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
};

/**
 * 관리자 일기 편집 상태입니다.
 * 목록 읽기는 useDiaryEntries 싱글톤 구독을 재사용하고, draft만 로컬로 둡니다.
 */
export const useDiaryAdmin = ({ isAdmin, onNotice, setIsSaving }: UseDiaryAdminOptions) => {
  const { data: diaryEntries, error: diaryError } = useDiaryEntries();
  const [activeDiaryId, setActiveDiaryId] = useState("");
  const [diaryDraft, setDiaryDraft] = useState<DiaryEntry>(() => createBlankDiaryEntry());
  const diaryEntriesRef = useRef(diaryEntries);
  diaryEntriesRef.current = diaryEntries;

  useEffect(() => {
    if (diaryError) {
      onNotice(diaryError);
    }
  }, [diaryError, onNotice]);

  // 스냅샷이 갱신됐을 때 선택이 비어 있으면 첫 일기를 고릅니다.
  useEffect(() => {
    setActiveDiaryId((current) => {
      if (current) return current;
      const firstEntry = diaryEntries[0];
      if (firstEntry) {
        setDiaryDraft(firstEntry);
        return firstEntry.id;
      }
      return "";
    });
  }, [diaryEntries]);

  const startNewDiaryEntry = () => {
    setActiveDiaryId("");
    setDiaryDraft(createBlankDiaryEntry());
    onNotice("새 일기를 작성해주세요.");
  };

  const selectDiaryEntry = (entry: DiaryEntry) => {
    setActiveDiaryId(entry.id);
    setDiaryDraft(entry);
  };

  const saveDiaryEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      onNotice("관리자만 일기를 저장할 수 있어요.");
      return;
    }

    const title = diaryDraft.title.trim();
    const date = diaryDraft.date.trim();
    const body = diaryDraft.body.trim();

    if (!title || !body) {
      onNotice("일기 제목과 내용을 입력해주세요.");
      return;
    }

    const id = slugifyId(diaryDraft.id || `${date}-${title}`) || crypto.randomUUID();

    try {
      setIsSaving(true);
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
      setActiveDiaryId(id);
      setDiaryDraft({ id, title, date: date || new Date().toISOString().slice(0, 10), body });
      onNotice("일기를 저장했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "일기 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDiaryEntry = async (entry: DiaryEntry) => {
    if (!isAdmin) {
      onNotice("관리자만 일기를 삭제할 수 있어요.");
      return;
    }

    if (!entry.id) {
      onNotice("삭제할 일기를 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "diaryEntries", entry.id));
      setActiveDiaryId("");
      setDiaryDraft(createBlankDiaryEntry());
      onNotice("일기를 삭제했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "일기 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    diaryEntries,
    diaryEntriesRef,
    activeDiaryId,
    setActiveDiaryId,
    diaryDraft,
    setDiaryDraft,
    startNewDiaryEntry,
    selectDiaryEntry,
    saveDiaryEntry,
    deleteDiaryEntry,
  };
};
