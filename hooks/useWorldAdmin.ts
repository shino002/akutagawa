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
import { useWorlds } from "@/hooks/useWorlds";
import { createAdminDraftStore } from "@/lib/admin-draft-store";
import { omitUndefined } from "@/lib/firestore-helpers";
import { getFirebaseDb } from "@/lib/firebase";
import { buildTextGlitchFirestorePatch } from "@/lib/text-glitch-persistence";
import {
  compactWorldDraftTextGlitch,
  createBlankWorldDraft,
  pruneWorldDraftTextGlitch,
  worldToDraft,
  type WorldDraft,
} from "@/lib/world-glitch-fields";
import type { World } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type WorldAdminState = {
  activeId: string;
  draft: WorldDraft;
  isSaving: boolean;
  notice: string;
};

const worldStore = createAdminDraftStore<WorldAdminState>({
  activeId: "",
  draft: createBlankWorldDraft(),
  isSaving: false,
  notice: "",
});

type UseWorldAdminOptions = {
  isAdmin?: boolean;
  onNotice?: (message: string) => void;
  setIsSaving?: (value: boolean) => void;
};

/**
 * 관리자 World 카테고리 편집 상태입니다.
 * 목록 읽기는 useWorlds 싱글톤을 재사용하고,
 * activeId/draft/isSaving/notice 는 createAdminDraftStore 로 공유합니다.
 *
 * activeCharacterWorldId / worldSettingsText / worldWorkDraft 는
 * 캐릭터 편집 화면의 "참가 세계관" 상태라 이 훅에 넣지 않습니다.
 */
export const useWorldAdmin = (options: UseWorldAdminOptions = {}) => {
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = options.isAdmin ?? authIsAdmin;
  const { data: worlds, error: worldsError } = useWorlds();
  const state = useSyncExternalStore(
    worldStore.subscribe,
    worldStore.getSnapshot,
    worldStore.getSnapshot,
  );
  const worldsRef = useRef(worlds);
  useEffect(() => {
    worldsRef.current = worlds;
  }, [worlds]);

  const emitNotice = (message: string) => {
    worldStore.setState((current) => ({ ...current, notice: message }));
    options.onNotice?.(message);
  };

  const setSaving = (value: boolean) => {
    worldStore.setState((current) => ({ ...current, isSaving: value }));
    options.setIsSaving?.(value);
  };

  useEffect(() => {
    const current = worldStore.getSnapshot();
    const firstWorld = worlds[0];
    if (!firstWorld) return;

    const nextActiveId = current.activeId || firstWorld.id;
    const nextDraft = current.draft.id ? current.draft : worldToDraft(firstWorld);
    if (nextActiveId === current.activeId && nextDraft === current.draft) return;

    worldStore.setState({
      ...current,
      activeId: nextActiveId,
      draft: nextDraft,
    });
  }, [worlds]);

  const setActiveWorldId: Dispatch<SetStateAction<string>> = (updater) => {
    worldStore.setState((current) => ({
      ...current,
      activeId: typeof updater === "function" ? updater(current.activeId) : updater,
    }));
  };

  const setWorldDraft: Dispatch<SetStateAction<WorldDraft>> = (updater) => {
    worldStore.setState((current) => ({
      ...current,
      draft: typeof updater === "function" ? updater(current.draft) : updater,
    }));
  };

  const startNewWorld = () => {
    worldStore.setState((current) => ({
      ...current,
      activeId: "",
      draft: createBlankWorldDraft(),
      notice: "새 World 정보를 입력해주세요.",
    }));
    options.onNotice?.("새 World 정보를 입력해주세요.");
  };

  const selectWorld = (world: World) => {
    worldStore.setState((current) => ({
      ...current,
      activeId: world.id,
      draft: worldToDraft(world),
    }));
  };

  const saveWorld = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      emitNotice("관리자만 세계관을 저장할 수 있어요.");
      return;
    }

    const title = state.draft.title.trim();
    const id = slugifyId(state.draft.id || title);

    if (!id || !title) {
      emitNotice("세계관 이름은 꼭 입력해주세요.");
      return;
    }

    const existingWorld = worlds.find((world) => world.id === id);
    const prunedDraft: WorldDraft = {
      ...state.draft,
      textGlitch: pruneWorldDraftTextGlitch(state.draft.textGlitch, state.draft),
    };
    const textGlitch = compactWorldDraftTextGlitch(prunedDraft);
    const textGlitchPatch = buildTextGlitchFirestorePatch(textGlitch, existingWorld?.textGlitch);
    const successNotice = textGlitch
      ? "세계관을 저장했어요. 오류 구간도 함께 저장됐습니다."
      : "세계관을 저장했어요.";

    try {
      setSaving(true);
      await setDoc(
        doc(getFirebaseDb(), "worlds", id),
        omitUndefined({
          id,
          title,
          subtitle: prunedDraft.subtitle.trim(),
          description: prunedDraft.description.trim(),
          password: prunedDraft.password.trim(),
          ...textGlitchPatch,
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      worldStore.setState((current) => ({
        ...current,
        activeId: id,
        draft: {
          ...prunedDraft,
          id,
          title,
          password: prunedDraft.password.trim(),
          textGlitch: textGlitch ?? prunedDraft.textGlitch,
        },
        notice: successNotice,
      }));
      options.onNotice?.(successNotice);
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "세계관 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorld = async (worldId: string) => {
    if (!isAdmin || !worldId) return;

    try {
      setSaving(true);
      await deleteDoc(doc(getFirebaseDb(), "worlds", worldId));
      worldStore.setState((current) => ({
        ...current,
        activeId: "",
        draft: createBlankWorldDraft(),
        notice: "세계관 목록에서 삭제했어요. 자캐 안의 참가 기록은 보존됩니다.",
      }));
      options.onNotice?.("세계관 목록에서 삭제했어요. 자캐 안의 참가 기록은 보존됩니다.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "세계관 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    worlds,
    worldsRef,
    activeWorldId: state.activeId,
    setActiveWorldId,
    worldDraft: state.draft,
    setWorldDraft,
    isSaving: state.isSaving,
    notice: worldsError || state.notice,
    setNotice: emitNotice,
    startNewWorld,
    selectWorld,
    saveWorld,
    deleteWorld,
  };
};
