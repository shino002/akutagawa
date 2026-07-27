"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useExtractContent } from "@/hooks/useExtractContent";
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

type UseExtractBannerAdminOptions = {
  isAdmin: boolean;
  onNotice: (message: string) => void;
  setIsSaving: (value: boolean) => void;
  /**
   * useAdminUploads.uploadSingleImage 를 넘깁니다.
   */
  uploadSingleImage: (file: File, characterId: string) => Promise<UploadedImage>;
};

/**
 * 관리자 갠홈 배너 편집 상태입니다.
 * 목록 읽기는 useExtractContent 싱글톤을 재사용합니다.
 */
export const useExtractBannerAdmin = ({
  isAdmin,
  onNotice,
  setIsSaving,
  uploadSingleImage,
}: UseExtractBannerAdminOptions) => {
  const { content, error: extractError } = useExtractContent();
  const extractBanners = content.banners;
  const [activeExtractBannerId, setActiveExtractBannerId] = useState("");
  const [extractBannerDraft, setExtractBannerDraft] = useState<ExtractBannerDraft>(() =>
    createBlankExtractBannerDraft(),
  );
  const [extractBannerImageFile, setExtractBannerImageFile] = useState<File | null>(null);
  const extractBannersRef = useRef(extractBanners);
  extractBannersRef.current = extractBanners;

  useEffect(() => {
    if (extractError) {
      onNotice(extractError);
    }
  }, [extractError, onNotice]);

  useEffect(() => {
    setActiveExtractBannerId((current) => {
      if (current) return current;
      const firstBanner = extractBanners[0];
      if (firstBanner) {
        setExtractBannerDraft(extractBannerDraftFromBanner(firstBanner));
        return firstBanner.id;
      }
      return "";
    });
  }, [extractBanners]);

  const startNewExtractBanner = () => {
    setActiveExtractBannerId("");
    setExtractBannerDraft(createBlankExtractBannerDraft());
    setExtractBannerImageFile(null);
    onNotice("새 갠홈 배너를 추가해주세요.");
  };

  const selectExtractBanner = (banner: PersonalHomeBanner) => {
    setActiveExtractBannerId(banner.id);
    setExtractBannerDraft(extractBannerDraftFromBanner(banner));
    setExtractBannerImageFile(null);
  };

  const handleExtractBannerImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onNotice("이미지 파일만 업로드할 수 있어요.");
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
      onNotice("관리자만 갠홈 배너를 저장할 수 있어요.");
      return;
    }

    const label = extractBannerDraft.label.trim();
    const linkUrl = extractBannerDraft.linkUrl.trim();

    if (!isAllowedBannerLinkUrl(linkUrl)) {
      onNotice(
        "http:// 또는 https:// 로 시작하는 링크, 또는 / 로 시작하는 내부 경로를 입력해주세요.",
      );
      return;
    }

    try {
      setIsSaving(true);
      let image = extractBannerDraft.image;
      if (extractBannerImageFile) {
        image = await uploadSingleImage(extractBannerImageFile, "site-extract");
      }

      if (!image) {
        onNotice("배너 이미지를 업로드해주세요.");
        return;
      }

      const id = slugifyId(extractBannerDraft.id || label || image.id) || crypto.randomUUID();
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
      setActiveExtractBannerId(id);
      setExtractBannerDraft(extractBannerDraftFromBanner(nextBanner));
      setExtractBannerImageFile(null);
      onNotice("갠홈 배너를 저장했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "갠홈 배너 저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExtractBanner = async (banner: PersonalHomeBanner) => {
    if (!isAdmin) {
      onNotice("관리자만 갠홈 배너를 삭제할 수 있어요.");
      return;
    }

    if (!banner.id) {
      onNotice("삭제할 배너를 찾지 못했어요.");
      return;
    }

    try {
      setIsSaving(true);
      await deleteR2Images([banner.image]);
      const nextBanners = extractBanners.filter((entry) => entry.id !== banner.id);
      await persistExtractBanners(nextBanners);
      setActiveExtractBannerId("");
      setExtractBannerDraft(createBlankExtractBannerDraft());
      setExtractBannerImageFile(null);
      onNotice("갠홈 배너를 삭제했어요.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "갠홈 배너 삭제에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    extractBanners,
    extractBannersRef,
    activeExtractBannerId,
    setActiveExtractBannerId,
    extractBannerDraft,
    setExtractBannerDraft,
    extractBannerImageFile,
    setExtractBannerImageFile,
    startNewExtractBanner,
    selectExtractBanner,
    handleExtractBannerImageChange,
    saveExtractBanner,
    deleteExtractBanner,
  };
};
