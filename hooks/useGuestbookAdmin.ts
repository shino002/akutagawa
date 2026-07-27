"use client";

import { type Dispatch, type SetStateAction, useEffect, useSyncExternalStore } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useGuestbook } from "@/hooks/useGuestbook";
import { createAdminDraftStore } from "@/lib/admin-draft-store";
import { getFirebaseDb } from "@/lib/firebase";
import type { GuestbookEntry } from "@/lib/types";

type GuestbookAdminState = {
  replyDrafts: Record<string, string>;
  isSaving: boolean;
  notice: string;
};

const guestbookStore = createAdminDraftStore<GuestbookAdminState>({
  replyDrafts: {},
  isSaving: false,
  notice: "",
});

type UseGuestbookAdminOptions = {
  isAdmin?: boolean;
  onNotice?: (message: string) => void;
  setIsSaving?: (value: boolean) => void;
};

/**
 * 관리자 방명록 답글/삭제 상태입니다.
 * 목록 읽기는 useGuestbook 싱글톤을 재사용하고,
 * replyDrafts/isSaving/notice 는 createAdminDraftStore 로 공유합니다.
 */
export const useGuestbookAdmin = (options: UseGuestbookAdminOptions = {}) => {
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = options.isAdmin ?? authIsAdmin;
  const { data: guestbookEntries, error: guestbookError } = useGuestbook();
  const state = useSyncExternalStore(
    guestbookStore.subscribe,
    guestbookStore.getSnapshot,
    guestbookStore.getSnapshot,
  );

  const emitNotice = (message: string) => {
    guestbookStore.setState((current) => ({ ...current, notice: message }));
    options.onNotice?.(message);
  };

  const setSaving = (value: boolean) => {
    guestbookStore.setState((current) => ({ ...current, isSaving: value }));
    options.setIsSaving?.(value);
  };

  // 목록이 바뀌면 답글 draft 키를 맞춥니다. (입력 중인 값은 유지)
  useEffect(() => {
    const current = guestbookStore.getSnapshot();
    const nextDrafts: Record<string, string> = {};
    guestbookEntries.forEach((entry) => {
      nextDrafts[entry.id] = current.replyDrafts[entry.id] ?? entry.reply;
    });
    guestbookStore.setState({
      ...current,
      replyDrafts: nextDrafts,
    });
  }, [guestbookEntries]);

  const setGuestbookReplyDrafts: Dispatch<SetStateAction<Record<string, string>>> = (updater) => {
    guestbookStore.setState((current) => ({
      ...current,
      replyDrafts: typeof updater === "function" ? updater(current.replyDrafts) : updater,
    }));
  };

  const saveGuestbookReply = async (entry: GuestbookEntry) => {
    if (!isAdmin) {
      emitNotice("관리자만 방명록 답글을 저장할 수 있어요.");
      return;
    }

    const reply = state.replyDrafts[entry.id]?.trim() ?? "";

    try {
      setSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "guestbook", entry.id),
        {
          reply,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      emitNotice("방명록 답글을 저장했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "방명록 답글 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGuestbookEntry = async (entry: GuestbookEntry) => {
    if (!isAdmin) {
      emitNotice("관리자만 방명록을 삭제할 수 있어요.");
      return;
    }

    try {
      setSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "guestbook", entry.id));
      guestbookStore.setState((current) => {
        const nextDrafts = { ...current.replyDrafts };
        delete nextDrafts[entry.id];
        return {
          ...current,
          replyDrafts: nextDrafts,
          notice: "방명록을 삭제했어요.",
        };
      });
      options.onNotice?.("방명록을 삭제했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "방명록 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    guestbookEntries,
    guestbookReplyDrafts: state.replyDrafts,
    setGuestbookReplyDrafts,
    isSaving: state.isSaving,
    notice: guestbookError || state.notice,
    saveGuestbookReply,
    deleteGuestbookEntry,
  };
};
