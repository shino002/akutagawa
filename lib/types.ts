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

export type Character = {
  id: string;
  name: string;
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
  relationships: string[];
  images?: UploadedImage[];
  works: Work[];
  worldEntries?: CharacterWorldEntry[];
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
