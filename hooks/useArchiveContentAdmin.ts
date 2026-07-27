"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { defaultArchiveContent } from "@/constants/home";
import { useArchiveContent } from "@/hooks/useSiteContent";
import { getFirebaseDb } from "@/lib/firebase";
import type { HomeContent } from "@/lib/types";

type UseArchiveContentAdminOptions = {
  isAdmin: boolean;
};

/**
 * 관리자 보관소 문구 편집 상태입니다.
 * 읽기는 useArchiveContent 싱글톤 구독을 재사용하고, 편집 중일 때만 로컬 override를 둡니다.
 */
export const useArchiveContentAdmin = ({ isAdmin }: UseArchiveContentAdminOptions) => {
  const { content: remoteContent, error: archiveError } = useArchiveContent(defaultArchiveContent);
  const [draftOverride, setDraftOverride] = useState<HomeContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  const archiveContent = draftOverride ?? remoteContent;

  const setArchiveContent: Dispatch<SetStateAction<HomeContent>> = (updater) => {
    setDraftOverride((current) => {
      const base = current ?? remoteContent;
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const saveArchiveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      setSaveNotice("관리자만 보관소 문구를 저장할 수 있어요.");
      return;
    }

    try {
      setIsSaving(true);
      const next: HomeContent = {
        eyebrow: archiveContent.eyebrow.trim() || defaultArchiveContent.eyebrow,
        title: archiveContent.title.trim() || defaultArchiveContent.title,
        body: archiveContent.body.trim() || defaultArchiveContent.body,
        notice:
          typeof archiveContent.notice === "string"
            ? archiveContent.notice
            : defaultArchiveContent.notice,
      };
      await setDoc(
        doc(getFirebaseDb(), "site", "archive"),
        {
          eyebrow: next.eyebrow,
          title: next.title,
          body: next.body,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setDraftOverride(next);
      setSaveNotice("보관소 문구를 저장했어요.");
    } catch (error) {
      setSaveNotice(error instanceof Error ? error.message : "보관소 문구 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    archiveContent,
    setArchiveContent,
    isSaving,
    notice: archiveError || saveNotice,
    saveArchiveContent,
  };
};
