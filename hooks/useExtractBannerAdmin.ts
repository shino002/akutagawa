"use client";

import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useExtractContent } from "@/hooks/useExtractContent";
import { createAdminDraftStore } from "@/lib/admin-draft-store";
import { getFirebaseDb } from "@/lib/firebase";
import {
  createBlankExtractBannerDraft,
  extractBannerDraftFromBanner,
  isAllowedBannerLinkUrl,
  type ExtractBannerDraft,
} from "@/lib/personal-home-banners";
import { deleteR2Images } from "@/lib/r2-upload-client";
import type { PersonalHomeBanner, UploadedImage } from "@/lib/types";
import { slugifyId } from "@/utils/slugifyId";

type ExtractBannerAdminState = {
  activeId: string;
  draft: ExtractBannerDraft;
  imageFile: File | null;
  isSaving: boolean;
  notice: string;
};

const extractBannerStore = createAdminDraftStore<ExtractBannerAdminState>({
  activeId: "",
  draft: createBlankExtractBannerDraft(),
  imageFile: null,
  isSaving: false,
  notice: "",
});

/**
 * 업로드 훅 등 외부에서 배너 admin notice 스토어에 메시지를 넣습니다.
 */
export const setExtractBannerAdminNotice = (message: string) => {
  extractBannerStore.setState((current) => ({ ...current, notice: message }));
};

type UseExtractBannerAdminOptions = {
  isAdmin?: boolean;
  onNotice?: (message: string) => void;
  setIsSaving?: (value: boolean) => void;
  /**
   * useAdminUploads.uploadSingleImage 를 넘깁니다. 저장 시에만 필요합니다.
   */
  uploadSingleImage?: (file: File, characterId: string) => Promise<UploadedImage>;
};

/**
 * 관리자 갠홈 배너 편집 상태입니다.
 * 목록 읽기는 useExtractContent 싱글톤을 재사용하고,
 * activeId/draft/imageFile/isSaving/notice 는 createAdminDraftStore 로 공유합니다.
 */
export const useExtractBannerAdmin = (options: UseExtractBannerAdminOptions = {}) => {
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = options.isAdmin ?? authIsAdmin;
  const { content, error: extractError } = useExtractContent();
  const extractBanners = content.banners;
  const state = useSyncExternalStore(
    extractBannerStore.subscribe,
    extractBannerStore.getSnapshot,
    extractBannerStore.getSnapshot,
  );
  const extractBannersRef = useRef(extractBanners);
  useEffect(() => {
    extractBannersRef.current = extractBanners;
  }, [extractBanners]);

  const emitNotice = (message: string) => {
    extractBannerStore.setState((current) => ({ ...current, notice: message }));
    options.onNotice?.(message);
  };

  const setSaving = (value: boolean) => {
    extractBannerStore.setState((current) => ({ ...current, isSaving: value }));
    options.setIsSaving?.(value);
  };

  useEffect(() => {
    const current = extractBannerStore.getSnapshot();
    if (current.activeId) return;
    const firstBanner = extractBanners[0];
    if (!firstBanner) return;
    extractBannerStore.setState({
      ...current,
      activeId: firstBanner.id,
      draft: extractBannerDraftFromBanner(firstBanner),
    });
  }, [extractBanners]);

  const setActiveExtractBannerId: Dispatch<SetStateAction<string>> = (updater) => {
    extractBannerStore.setState((current) => ({
      ...current,
      activeId: typeof updater === "function" ? updater(current.activeId) : updater,
    }));
  };

  const setExtractBannerDraft: Dispatch<SetStateAction<ExtractBannerDraft>> = (updater) => {
    extractBannerStore.setState((current) => ({
      ...current,
      draft: typeof updater === "function" ? updater(current.draft) : updater,
    }));
  };

  const setExtractBannerImageFile: Dispatch<SetStateAction<File | null>> = (updater) => {
    extractBannerStore.setState((current) => ({
      ...current,
      imageFile: typeof updater === "function" ? updater(current.imageFile) : updater,
    }));
  };

  const startNewExtractBanner = () => {
    extractBannerStore.setState((current) => ({
      ...current,
      activeId: "",
      draft: createBlankExtractBannerDraft(),
      imageFile: null,
      notice: "새 갠홈 배너를 추가해주세요.",
    }));
    options.onNotice?.("새 갠홈 배너를 추가해주세요.");
  };

  const selectExtractBanner = (banner: PersonalHomeBanner) => {
    extractBannerStore.setState((current) => ({
      ...current,
      activeId: banner.id,
      draft: extractBannerDraftFromBanner(banner),
      imageFile: null,
    }));
  };

  const handleExtractBannerImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      emitNotice("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    setExtractBannerImageFile(file);
  };

  const persistExtractBanners = async (nextBanners: PersonalHomeBanner[]) => {
    await setDoc(
      doc(getFirebaseDb(), "site", "extract"),
      {
        banners: nextBanners,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const saveExtractBanner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      emitNotice("관리자만 갠홈 배너를 저장할 수 있어요.");
      return;
    }

    const label = state.draft.label.trim();
    const linkUrl = state.draft.linkUrl.trim();

    if (!isAllowedBannerLinkUrl(linkUrl)) {
      emitNotice(
        "http:// 또는 https:// 로 시작하는 링크, 또는 / 로 시작하는 내부 경로를 입력해주세요.",
      );
      return;
    }

    try {
      setSaving(true);
      let image = state.draft.image;
      if (state.imageFile) {
        if (!options.uploadSingleImage) {
          emitNotice("이미지 업로드 준비가 되지 않았어요.");
          return;
        }
        image = await options.uploadSingleImage(state.imageFile, "site-extract");
      }

      if (!image) {
        emitNotice("배너 이미지를 업로드해주세요.");
        return;
      }

      const id = slugifyId(state.draft.id || label || image.id) || crypto.randomUUID();
      const nextBanner: PersonalHomeBanner = {
        id,
        label,
        linkUrl,
        image,
      };
      const nextBanners = extractBanners.some((banner) => banner.id === id)
        ? extractBanners.map((banner) => (banner.id === id ? nextBanner : banner))
        : [...extractBanners, nextBanner];

      await persistExtractBanners(nextBanners);
      extractBannerStore.setState((current) => ({
        ...current,
        activeId: id,
        draft: extractBannerDraftFromBanner(nextBanner),
        imageFile: null,
        notice: "갠홈 배너를 저장했어요.",
      }));
      options.onNotice?.("갠홈 배너를 저장했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "갠홈 배너 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteExtractBanner = async (banner: PersonalHomeBanner) => {
    if (!isAdmin) {
      emitNotice("관리자만 갠홈 배너를 삭제할 수 있어요.");
      return;
    }

    if (!banner.id) {
      emitNotice("삭제할 배너를 찾지 못했어요.");
      return;
    }

    try {
      setSaving(true);
      await deleteR2Images([banner.image]);
      const nextBanners = extractBanners.filter((entry) => entry.id !== banner.id);
      await persistExtractBanners(nextBanners);
      extractBannerStore.setState((current) => ({
        ...current,
        activeId: "",
        draft: createBlankExtractBannerDraft(),
        imageFile: null,
        notice: "갠홈 배너를 삭제했어요.",
      }));
      options.onNotice?.("갠홈 배너를 삭제했어요.");
    } catch (error) {
      emitNotice(error instanceof Error ? error.message : "갠홈 배너 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return {
    extractBanners,
    extractBannersRef,
    activeExtractBannerId: state.activeId,
    setActiveExtractBannerId,
    extractBannerDraft: state.draft,
    setExtractBannerDraft,
    extractBannerImageFile: state.imageFile,
    setExtractBannerImageFile,
    isSaving: state.isSaving,
    notice: extractError || state.notice,
    setNotice: emitNotice,
    startNewExtractBanner,
    selectExtractBanner,
    handleExtractBannerImageChange,
    saveExtractBanner,
    deleteExtractBanner,
  };
};
