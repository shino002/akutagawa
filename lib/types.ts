export type UploadedImage = {
  id: string;
  category?: "illustration" | "standing";
  name: string;
  url: string;
  size: number;
  thumbX?: number;
  thumbY?: number;
  thumbScale?: number;
};

export type Work = {
  title: string;
  kind: string;
  date: string;
  body: string;
  images?: UploadedImage[];
};

export type World = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  password?: string;
  textGlitch?: Record<string, FieldGlitchConfig>;
};

export type CharacterWorldEntry = {
  worldId: string;
  settings: string[];
  images: UploadedImage[];
  works: Work[];
};

export type SettingSection = {
  id: string;
  title: string;
  body: string;
};

export type GlitchMarkdown = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

export type GlitchZoneStyle = {
  textColor?: string;
  markdown?: GlitchMarkdown;
  /** 밑줄 색 (markdown.underline 켜진 경우) */
  underlineColor?: string;
  /** 밑줄 굵기 px (0.5~12, 0.5 단위, 기본 2) */
  underlineThickness?: number;
  /** 취소선 색 (markdown.strikethrough 켜진 경우) */
  strikethroughColor?: string;
  /** 취소선 굵기 px (0.5~12, 0.5 단위, 기본 2) */
  strikethroughThickness?: number;
};

export type GlitchScrambleMode = "referenceOnly" | "referenceWithBuiltin";

export type GlitchErrorDisplayMode = "alternate" | "randomOnly";

export type GlitchErrorMessageSource = "auto" | "custom" | "none";

export type GlitchZone = {
  id: string;
  start: number;
  end: number;
  original: string;
  style?: GlitchZoneStyle;
  errorMessage?: string;
  errorMessageSource?: GlitchErrorMessageSource;
  /** 클릭 시 이동할 대상 (OC·페어·어나더 항목 또는 그 상세 페이지) */
  linkTarget?: ZoneLinkTarget;
  /** @deprecated linkTarget 사용. 예전 데이터 호환용 */
  linkSubPageId?: string;
};

/** OC / Pair / Another 섹션 간 이동 대상 */
export type ZoneLinkTarget = {
  section: "characters" | "pairs" | "others";
  characterId: string;
  /** 비어 있으면 해당 항목 본 페이지 */
  subPageId?: string;
};

export type CharacterKind = "oc" | "pair" | "other";

export type ProfileField = {
  id: string;
  label: string;
  value: string;
};

export type CharacterSubPage = {
  id: string;
  /** 상세 페이지 카드/히어로에 쓰일 표시 ID */
  displayId?: string;
  title: string;
  /** 한자 이름 */
  kanjiName?: string;
  subtitle: string;
  quote: string;
  palette: string;
  profileFields: ProfileField[];
  settingSections?: SettingSection[];
  relationships?: string[];
  images?: UploadedImage[];
  works?: Work[];
  textGlitch?: Record<string, FieldGlitchConfig>;
  bgmUrl?: string;
};

export type FieldGlitchConfig = {
  wordPool: string;
  scrambleMode?: GlitchScrambleMode;
  builtinScramble?: boolean;
  /** alternate: 원문 ↔ 오류 번갈아 · randomOnly: 오류만 계속 랜덤 */
  errorDisplayMode?: GlitchErrorDisplayMode;
  /** 비어 있으면 전체 기본 기호 풀 사용 */
  builtinTokens?: string[];
  zones: GlitchZone[];
  tickMs?: number;
  defaultStyle?: GlitchZoneStyle;
};

export type Character = {
  id: string;
  kind?: CharacterKind;
  name: string;
  kanjiName?: string;
  statusTags?: string[];
  classification?: string;
  subtitle: string;
  quote: string;
  palette: string;
  profileFields: ProfileField[];
  settings: string[];
  settingSections?: SettingSection[];
  relationships: string[];
  images?: UploadedImage[];
  works: Work[];
  worldEntries?: CharacterWorldEntry[];
  textGlitch?: Record<string, FieldGlitchConfig>;
  subPages?: CharacterSubPage[];
  /** kind가 pair일 때 연결된 OC 캐릭터 ID (최대 2명) */
  pairMemberIds?: string[];
  /** 캐릭터 상세 보기에서 재생할 BGM (`/audio/...`) */
  bgmUrl?: string;
};

export type HomeContent = {
  eyebrow: string;
  title: string;
  body: string;
};

/** 갠홈(extract) 섹션에 표시할 클릭 가능한 배너 */
export type PersonalHomeBanner = {
  id: string;
  label: string;
  linkUrl: string;
  image: UploadedImage;
};

export type ExtractContent = {
  banners: PersonalHomeBanner[];
};

export type BgmTrackScope = "site" | "character-only";

export type BgmTrack = {
  id: string;
  label: string;
  url: string;
  scope: BgmTrackScope;
};

export type BgmContent = {
  tracks: BgmTrack[];
};

export type DiaryEntry = {
  id: string;
  title: string;
  date: string;
  body: string;
};

export type GuestbookEntry = {
  id: string;
  name: string;
  body: string;
  reply: string;
  createdAtMillis: number;
};
