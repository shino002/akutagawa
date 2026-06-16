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
};

export type GlitchZoneStyle = {
  textColor?: string;
  markdown?: GlitchMarkdown;
};

export type GlitchScrambleMode = "referenceOnly" | "referenceWithBuiltin";

export type GlitchErrorMessageSource = "auto" | "custom" | "none";

export type GlitchZone = {
  id: string;
  start: number;
  end: number;
  original: string;
  style?: GlitchZoneStyle;
  errorMessage?: string;
  errorMessageSource?: GlitchErrorMessageSource;
};

export type FieldGlitchConfig = {
  wordPool: string;
  scrambleMode?: GlitchScrambleMode;
  builtinScramble?: boolean;
  zones: GlitchZone[];
  tickMs?: number;
  defaultStyle?: GlitchZoneStyle;
};

export type Character = {
  id: string;
  name: string;
  kanjiName?: string;
  statusTags?: string[];
  classification?: string;
  subtitle: string;
  quote: string;
  palette: string;
  profile: {
    age: string;
    height: string;
    role: string;
    keyword: string;
  };
  settings: string[];
  settingSections?: SettingSection[];
  relationships: string[];
  images?: UploadedImage[];
  works: Work[];
  worldEntries?: CharacterWorldEntry[];
  textGlitch?: Record<string, FieldGlitchConfig>;
  /** 캐릭터 상세 보기에서 재생할 BGM (`/audio/...`) */
  bgmUrl?: string;
};

export type HomeContent = {
  eyebrow: string;
  title: string;
  body: string;
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
