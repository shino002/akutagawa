import type { Character, UploadedImage, Work } from "@/lib/types";

/**
 * 공개 페이지(홈)에서 사용하는 이미지 갤러리 모달 상태입니다.
 */
export type GalleryModalItem = {
  image: UploadedImage;
  character: Character;
};

/**
 * 스탠딩 표정 모음 모달 상태입니다.
 */
export type ExpressionModalItem = {
  character: Character;
  images: UploadedImage[];
};

/**
 * 이북 리더 모달 상태입니다.
 */
export type ReaderModalItem = {
  character: Character;
  work: Work;
};

/**
 * 자캐 상세 뷰의 탭 식별자입니다.
 */
export type CharacterDetailTab = "settings" | "images" | "works" | "worlds";

import type { ArchiveSubSectionId } from "@/constants/home";

/** 상세 화면(Archive: OC/페어/어나더)에서 뒤로가기용 이전 위치 */
export type DetailNavSnapshot = {
  section: "archive";
  archiveSub: ArchiveSubSectionId;
  characterId: string;
  subPageId: string;
  tab: CharacterDetailTab;
};
