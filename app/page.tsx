"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import BgmPlayer from "./components/BgmPlayer";
import { ADMIN_AUTH_EMAIL, ADMIN_LOGIN_ID, displayLoginId, friendlyAuthError, resolveLoginEmail, validateLoginId } from "@/lib/auth-helpers";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { clamp, thumbnailStyle } from "@/lib/image-helpers";
import type { Character, CharacterWorldEntry, DiaryEntry, GuestbookEntry, HomeContent, UploadedImage, Work, World } from "@/lib/types";

dayjs.locale("ko");

// 공개 페이지에서만 사용하는 모달 상태 타입입니다.
type GalleryModalItem = {
  image: UploadedImage;
  character: Character;
};

type ExpressionModalItem = {
  character: Character;
  images: UploadedImage[];
};

type ReaderModalItem = {
  character: Character;
  work: Work;
};

// Firestore 문서가 없을 때 표시할 기본 문구와 왼쪽 메뉴 구성을 정의합니다.
const defaultHomeContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

const defaultArchiveContent: HomeContent = {
  eyebrow: "",
  title: "",
  body: "",
};

const sections = [
  { id: "home", label: "Home" },
  { id: "characters", label: "Character" },
  { id: "worlds", label: "World" },
  { id: "diary", label: "Diary" },
  { id: "guest", label: "Guest" },
  { id: "extract", label: "@/1_R#0?/@..." },
] as const;

type SectionId = (typeof sections)[number]["id"];

// 자캐 데이터가 아직 없을 때 화면을 비우지 않기 위한 기본 표시값입니다.
const emptyCharacter: Character = {
  id: "",
  name: "자캐 없음",
  subtitle: "관리자 로그인 후 Character에서 자캐를 추가해주세요.",
  quote: "아직 등록된 자캐가 없어요.",
  palette: "from-red-600 via-zinc-900 to-black",
  profile: {
    age: "",
    height: "",
    role: "",
    keyword: "",
  },
  settings: [],
  relationships: [],
  images: [],
  works: [],
  worldEntries: [],
};

function normalizeWorldEntries(entries: CharacterWorldEntry[] | undefined): CharacterWorldEntry[] {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        worldId: entry.worldId,
        settings: Array.isArray(entry.settings) ? entry.settings : [],
        images: Array.isArray(entry.images) ? entry.images : [],
        works: normalizeWorks(entry.works),
      }))
    : [];
}

function normalizeWorks(works: Work[] | undefined): Work[] {
  return Array.isArray(works)
    ? works.map((work) => ({
        ...work,
        images: Array.isArray(work.images) ? work.images : [],
      }))
    : [];
}

export default function Home() {
  // 현재 보고 있는 섹션, 선택된 자료, 모달, 로그인 폼 상태를 관리합니다.
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [activeWorldId, setActiveWorldId] = useState("");
  const [galleryModalItem, setGalleryModalItem] = useState<GalleryModalItem | null>(null);
  const [expressionModalItem, setExpressionModalItem] = useState<ExpressionModalItem | null>(null);
  const [galleryZoom, setGalleryZoom] = useState(1);
  const [readerModalItem, setReaderModalItem] = useState<ReaderModalItem | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "images" | "works" | "worlds">("settings");
  const [activeCharacterWorldId, setActiveCharacterWorldId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs().startOf("month"));
  const [menuOpen, setMenuOpen] = useState(true);
  const [firestoreCharacters, setFirestoreCharacters] = useState<Character[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authDraft, setAuthDraft] = useState({ loginId: "", password: "" });
  const [showPassword, setShowPassword] = useState(true);
  const [authNotice, setAuthNotice] = useState("");
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [guestDraft, setGuestDraft] = useState({ name: "", body: "" });
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [archiveContent, setArchiveContent] = useState<HomeContent>(defaultArchiveContent);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [worldPasswordDrafts, setWorldPasswordDrafts] = useState<Record<string, string>>({});
  const [unlockedWorldIds, setUnlockedWorldIds] = useState<Record<string, boolean>>({});

  // Firestore 원본 데이터를 화면에서 바로 쓰기 좋은 대표 자캐/그림/세계관 목록으로 계산합니다.
  const characters = useMemo(() => {
    return firestoreCharacters;
  }, [firestoreCharacters]);

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === activeCharacterId) ?? characters[0] ?? emptyCharacter,
    [activeCharacterId, characters],
  );
  const activeCharacterImages = useMemo(
    () => activeCharacter.images ?? [],
    [activeCharacter],
  );
  const activeIllustrationImages = useMemo(
    () => activeCharacterImages.filter((image) => image.category !== "standing"),
    [activeCharacterImages],
  );
  const activeStandingImages = useMemo(
    () => activeCharacterImages.filter((image) => image.category === "standing"),
    [activeCharacterImages],
  );
  const activeMainIllustration = activeIllustrationImages[0] ?? activeCharacterImages[0];

  const activeWorks = useMemo(
    () => activeCharacter.works,
    [activeCharacter],
  );
  const activeCharacterWorldEntries = useMemo(
    () => normalizeWorldEntries(activeCharacter.worldEntries).filter((entry) => worlds.some((world) => world.id === entry.worldId)),
    [activeCharacter, worlds],
  );
  const activeCharacterWorldEntry = useMemo(
    () => activeCharacterWorldEntries.find((entry) => entry.worldId === activeCharacterWorldId) ?? activeCharacterWorldEntries[0],
    [activeCharacterWorldEntries, activeCharacterWorldId],
  );
  const activeWorldIllustrationImages = useMemo(
    () => (activeCharacterWorldEntry?.images ?? []).filter((image) => image.category !== "standing"),
    [activeCharacterWorldEntry],
  );
  const activeWorldStandingImages = useMemo(
    () => (activeCharacterWorldEntry?.images ?? []).filter((image) => image.category === "standing"),
    [activeCharacterWorldEntry],
  );
  const activeWorldMainIllustration = activeWorldIllustrationImages[0] ?? activeCharacterWorldEntry?.images[0];
  const activeCharacterWorld = useMemo(
    () => (activeCharacterWorldEntry ? worlds.find((world) => world.id === activeCharacterWorldEntry.worldId) : undefined),
    [activeCharacterWorldEntry, worlds],
  );
  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? worlds[0],
    [activeWorldId, worlds],
  );
  const activeWorldParticipants = useMemo(
    () =>
      activeWorld
        ? characters
            .map((character) => ({
              character,
              entry: normalizeWorldEntries(character.worldEntries).find((worldEntry) => worldEntry.worldId === activeWorld.id),
            }))
            .filter((item): item is { character: Character; entry: CharacterWorldEntry } => Boolean(item.entry))
        : [],
    [activeWorld, characters],
  );
  const calendarDays = useMemo(() => {
    const start = calendarMonth.startOf("month").startOf("week");
    const today = dayjs();

    return Array.from({ length: 42 }, (_, index) => {
      const date = start.add(index, "day");
      return {
        date,
        dayLabel: date.format("D"),
        isCurrentMonth: date.month() === calendarMonth.month(),
        isToday: date.isSame(today, "day"),
      };
    });
  }, [calendarMonth]);

  const allWorks = useMemo(
    () =>
      characters.flatMap((character) =>
        character.works.map((work) => ({
          character,
          work,
        })),
      ),
    [characters],
  );

  const recentItems = useMemo(
    () => [
      ...allWorks.map(({ character, work }) => ({
        characterId: character.id,
        title: `${character.name} - ${work.title}`,
          meta: work.kind,
          date: work.date,
      })),
      ...guestbook.slice(0, 2).map((guest) => ({
        characterId: "",
        title: `방명록 - ${guest.name}`,
        meta: "comment",
        date: "new",
      })),
    ],
    [allWorks, guestbook],
  );

  const isAdmin = authUser?.email === ADMIN_AUTH_EMAIL;
  const visibleSections = sections;
  const activeWorldPassword = activeWorld?.password?.trim() ?? "";
  const isActiveWorldUnlocked = Boolean(activeWorld && (!activeWorldPassword || unlockedWorldIds[activeWorld.id]));
  const activeCharacterWorldPassword = activeCharacterWorld?.password?.trim() ?? "";
  const isActiveCharacterWorldUnlocked = Boolean(
    activeCharacterWorldEntry && (!activeCharacterWorldPassword || unlockedWorldIds[activeCharacterWorldEntry.worldId]),
  );

  // 이미지 모달 열기와 휠 확대/축소 동작을 담당합니다.
  function openGalleryModal(item: GalleryModalItem) {
    setGalleryZoom(1);
    setGalleryModalItem(item);
  }

  function updateGalleryZoom(nextZoom: number) {
    setGalleryZoom(clamp(nextZoom, 0.5, 3));
  }

  // Firebase Auth 로그인 상태를 구독합니다.
  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
  }, []);

  // 이미지 모달이 열려 있는 동안 배경 페이지 스크롤을 잠급니다.
  useEffect(() => {
    if (!galleryModalItem) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryModalItem]);

  // 공개 페이지에 필요한 Firestore 컬렉션과 사이트 문구를 실시간으로 구독합니다.
  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        setFirestoreCharacters(
          snapshot.docs
            .map((characterDoc) => {
              const data = characterDoc.data() as Character;
              return {
                ...data,
                id: data.id || characterDoc.id,
                works: normalizeWorks(data.works),
                settings: Array.isArray(data.settings) ? data.settings : [],
                relationships: Array.isArray(data.relationships) ? data.relationships : [],
                images: Array.isArray(data.images) ? data.images : [],
                worldEntries: normalizeWorldEntries(data.worldEntries),
              };
            }),
        );
      },
      (error) => {
        setAuthNotice(`Firestore 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "worlds"),
      (snapshot) => {
        const nextWorlds = snapshot.docs
          .map((worldDoc) => {
            const data = worldDoc.data() as Partial<World>;
            return {
              id: data.id || worldDoc.id,
              title: data.title || "",
              subtitle: data.subtitle || "",
              description: data.description || "",
              password: data.password || "",
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        setWorlds(nextWorlds);
        setActiveWorldId((current) => current || nextWorlds[0]?.id || "");
        setActiveCharacterWorldId((current) => current || nextWorlds[0]?.id || "");
      },
      (error) => {
        setAuthNotice(`세계관 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "home"),
      (snapshot) => {
        const data = snapshot.data() as Partial<HomeContent> | undefined;
        setHomeContent({
          eyebrow: data?.eyebrow || defaultHomeContent.eyebrow,
          title: data?.title || defaultHomeContent.title,
          body: data?.body || defaultHomeContent.body,
        });
      },
      (error) => {
        setAuthNotice(`홈 문구 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      doc(db, "site", "archive"),
      (snapshot) => {
        const data = snapshot.data() as Partial<HomeContent> | undefined;
        setArchiveContent({
          eyebrow: data?.eyebrow || defaultArchiveContent.eyebrow,
          title: data?.title || defaultArchiveContent.title,
          body: data?.body || defaultArchiveContent.body,
        });
      },
      (error) => {
        setAuthNotice(`보관소 문구 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "diaryEntries"),
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((diaryDoc) => {
            const data = diaryDoc.data() as Partial<DiaryEntry>;
            return {
              id: data.id || diaryDoc.id,
              title: data.title || "",
              date: data.date || "",
              body: data.body || "",
            };
          })
          .filter((entry) => entry.title || entry.body)
          .sort((a, b) => b.date.localeCompare(a.date));
        setDiaryEntries(nextEntries);
      },
      (error) => {
        setAuthNotice(`다이어리 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    return onSnapshot(
      collection(db, "guestbook"),
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((guestDoc) => {
            const data = guestDoc.data() as Partial<GuestbookEntry>;
            return {
              id: data.id || guestDoc.id,
              name: data.name || "익명",
              body: data.body || "",
              reply: data.reply || "",
              createdAtMillis: typeof data.createdAtMillis === "number" ? data.createdAtMillis : 0,
            };
          })
          .filter((entry) => entry.body)
          .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
        setGuestbook(nextEntries);
      },
      (error) => {
        setAuthNotice(`방명록 불러오기 실패: ${error.message}`);
      },
    );
  }, []);

  // 메뉴 이동, 로그인/회원가입, 방명록 작성처럼 사용자가 직접 누르는 동작을 처리합니다.
  function moveSection(section: SectionId) {
    setActiveSection(section);
  }

  function unlockWorldById(event: FormEvent<HTMLFormElement>, worldId: string) {
    event.preventDefault();
    const targetWorld = worlds.find((world) => world.id === worldId);
    const targetPassword = targetWorld?.password?.trim() ?? "";

    if (!targetWorld) return;

    if (!targetPassword || worldPasswordDrafts[worldId]?.trim() === targetPassword) {
      setUnlockedWorldIds((current) => ({ ...current, [worldId]: true }));
      setWorldPasswordDrafts((current) => ({ ...current, [worldId]: "" }));
      return;
    }

    setAuthNotice("세계관 비밀번호가 맞지 않아요.");
  }

  function unlockWorld(event: FormEvent<HTMLFormElement>) {
    if (!activeWorld) return;

    unlockWorldById(event, activeWorld.id);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice("");

    const loginIdError = validateLoginId(authDraft.loginId);

    if (loginIdError) {
      setAuthNotice(loginIdError);
      return;
    }

    if (!authDraft.password) {
      setAuthNotice("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsAuthLoading(true);
      const auth = getFirebaseAuth();
      const loginEmail = resolveLoginEmail(authDraft.loginId);

      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, loginEmail, authDraft.password);
        setAuthNotice("회원가입 완료. 로그인 상태입니다.");
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, authDraft.password);
        setAuthNotice("로그인 완료.");
      }

      setAuthDraft({ loginId: "", password: "" });
    } catch (error) {
      setAuthNotice(friendlyAuthError(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function logout() {
    await signOut(getFirebaseAuth());
    setAuthNotice("로그아웃했습니다.");
  }

  async function submitGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = guestDraft.name.trim() || "익명";
    const body = guestDraft.body.trim();

    if (!authUser) {
      setAuthNotice("방명록은 로그인한 사람만 남길 수 있어요.");
      setAuthPanelOpen(true);
      return;
    }

    if (!body) return;

    try {
      await addDoc(collection(getFirebaseDb(), "guestbook"), {
        name,
        body,
        reply: "",
        createdAtMillis: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setGuestDraft({ name: "", body: "" });
      setAuthNotice("방명록을 남겼어요.");
    } catch (error) {
      setAuthNotice(error instanceof Error ? error.message : "방명록 저장에 실패했어요.");
    }
  }

  // 실제 공개 페이지 레이아웃입니다: 왼쪽 메뉴, 본문 섹션, 오른쪽 캘린더/BGM을 배치합니다.
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-emerald-50">
      <style jsx global>{`
        @font-face {
          font-family: "KbizHanmaumMyungjo";
          src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/KBIZHanmaumMyungjo.woff") format("woff");
          font-weight: normal;
          font-display: swap;
        }

        body,
        body *:not(i):not([class*="icon"]):not(.material-icons):not(.fa):not(.fas):not(.far):not(.fab):not(.auth-input) {
          font-family: "KbizHanmaumMyungjo", "Zen Old Mincho", serif !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-[linear-gradient(180deg,#000000_0%,#000000_78%,#080000_100%)]" />
      <div className="noise-layer" aria-hidden="true" />

      <aside
        className={`side-menu fixed left-5 top-5 z-30 backdrop-blur-xl ${
          menuOpen ? "is-open" : "is-collapsed"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="side-menu-trigger"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          ☰
        </button>

        <div className="side-menu-content" aria-hidden={!menuOpen}>
        <div className="mb-3 border border-emerald-100/10 p-3">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/70">{archiveContent.eyebrow}</p>
          <h1 className="mt-2 font-serif text-2xl font-bold">{archiveContent.title}</h1>
          <p className="mt-2 text-xs leading-5 text-emerald-100/60">{archiveContent.body}</p>
        </div>

        <nav className="space-y-2">
          {visibleSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => moveSection(section.id)}
              className={`group flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                activeSection === section.id
                  ? "bg-emerald-200 text-emerald-950"
                  : "text-emerald-50/75 hover:bg-emerald-100/10 hover:text-white"
              }`}
            >
              <span>{section.label}</span>
              <span className="text-xs opacity-60">›</span>
            </button>
          ))}
        </nav>

        <section
          className={`auth-panel mt-3 border border-emerald-100/10 bg-black/20 ${authPanelOpen ? "is-open" : "is-collapsed"}`}
        >
          <button
            type="button"
            onClick={() => setAuthPanelOpen((value) => !value)}
            className="auth-panel-trigger"
            aria-expanded={authPanelOpen}
            aria-label={authPanelOpen ? "로그인 창 닫기" : "로그인 창 열기"}
          >
            <span className="auth-panel-dot" />
            <span>{authUser ? "USER" : "LOGIN"}</span>
            <span className="auth-panel-trigger-mark">{authPanelOpen ? "×" : "+"}</span>
          </button>
          {authPanelOpen && (
            <div className="auth-panel-content">
              <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-red-100/65">
                {authUser ? "Account" : authMode === "signup" ? "Sign Up" : "Login"}
              </p>

              {authUser ? (
                <div className="space-y-2 text-xs">
                  <p className="text-emerald-100/60">{isAdmin ? "관리자 로그인됨" : "로그인됨"}</p>
                  <p className="break-all text-emerald-50">{isAdmin ? ADMIN_LOGIN_ID : displayLoginId(authUser.email)}</p>
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="block border border-red-600/40 bg-red-950/30 p-2 text-center text-red-100"
                    >
                      수정 페이지로 이동
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full border border-emerald-100/15 bg-emerald-100/10 py-2 text-emerald-50"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <form onSubmit={submitAuth} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className={`py-1.5 ${
                        authMode === "signup" ? "bg-red-700/80 text-red-50" : "border border-emerald-100/15 text-emerald-100/65"
                      }`}
                    >
                      회원가입
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className={`py-1.5 ${
                        authMode === "login" ? "bg-red-700/80 text-red-50" : "border border-emerald-100/15 text-emerald-100/65"
                      }`}
                    >
                      로그인
                    </button>
                  </div>
                  <input
                    value={authDraft.loginId}
                    onChange={(event) => setAuthDraft((current) => ({ ...current, loginId: event.target.value }))}
                    placeholder="아이디"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="auth-input auth-input-compact"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-1.5">
                    <input
                      value={authDraft.password}
                      onChange={(event) => setAuthDraft((current) => ({ ...current, password: event.target.value }))}
                      placeholder="비밀번호"
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="auth-input auth-input-compact"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="border border-emerald-100/15 px-2 text-[11px] text-emerald-100/70"
                    >
                      {showPassword ? "숨김" : "보기"}
                    </button>
                  </div>
                  <button
                    disabled={isAuthLoading}
                    className="w-full bg-red-700/80 py-2 text-[11px] font-semibold text-red-50 disabled:opacity-60"
                  >
                    {isAuthLoading ? "확인 중..." : authMode === "signup" ? "가입하기" : "로그인하기"}
                  </button>
                </form>
              )}

              {authNotice && <p className="mt-2 border border-red-600/30 bg-red-950/20 p-2 text-xs leading-5 text-red-100/80">{authNotice}</p>}
            </div>
          )}
        </section>
        </div>
      </aside>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-5 pb-12 pt-5 md:px-8 md:pl-64 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {activeSection === "home" && (
            <section className="glass-card p-6 md:p-8">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-100/60">{homeContent.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl font-bold md:text-6xl">{homeContent.title}</h2>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-7 text-emerald-50/85 md:text-base">
                {homeContent.body}
              </p>
            </section>
          )}

          {activeSection === "home" && (
            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="glass-card p-6">
                <h3 className="board-title">최근 갱신된 글</h3>
                <div className="mt-5 space-y-3">
                  {recentItems.slice(0, 6).map((item) => (
                    <button
                      key={`${item.title}-${item.date}`}
                      type="button"
                      onClick={() => {
                        if (item.meta === "comment") {
                          setActiveSection("guest");
                          return;
                        }

                        setActiveCharacterId(item.characterId);
                        setActiveTab("works");
                        setActiveSection("characters");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-emerald-100/10 bg-emerald-950/30 px-4 py-3 text-left transition hover:bg-emerald-100/10"
                    >
                      <span>
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className="text-xs text-emerald-100/50">{item.meta}</span>
                      </span>
                      <span className="text-xs text-emerald-100/60">{item.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="board-title">자캐 바로가기</h3>
                <div className="mt-5 grid gap-3">
                  {characters.map((character) => {
                    const shortcutImage = (character.images ?? [])[0];

                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => {
                          setActiveCharacterId(character.id);
                          setActiveSection("characters");
                        }}
                        className="overflow-hidden rounded-2xl border border-emerald-100/10 bg-emerald-950/30 text-left transition hover:-translate-y-1 hover:border-emerald-100/30"
                      >
                        <div className={`aspect-[3/2] overflow-hidden bg-gradient-to-r ${character.palette}`}>
                          {shortcutImage && (
                            /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                            <img
                              src={shortcutImage.url}
                              alt={`${character.name} 대표 그림`}
                              className="h-full w-full object-cover opacity-90"
                              style={thumbnailStyle(shortcutImage)}
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-serif text-xl font-bold">{character.name}</p>
                          <p className="mt-1 text-xs text-emerald-100/60">{character.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeSection === "characters" && (
            <section className="space-y-6">
              <section className="glass-card p-6 md:p-8">
                <div className="text-center">
                  <p className="text-center text-xs uppercase tracking-[0.45em] text-emerald-100/55">Character Cards</p>
                </div>

                {characters.length === 0 ? (
                  <div className="mt-6 border border-emerald-100/10 bg-black/20 p-5 text-sm leading-7 text-emerald-100/65">
                    아직 등록된 자캐가 없어요. 관리자 로그인 후 `새 자캐 만들기`로 첫 카드를 추가해주세요.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {characters.map((character) => {
                      const cardImage = (character.images ?? []).find((image) => image.category !== "standing") ?? (character.images ?? [])[0];

                      return (
                        <button
                          key={character.id}
                          type="button"
                          onClick={() => {
                            setActiveCharacterId(character.id);
                            setActiveTab("settings");
                          }}
                          className={`character-card text-left ${activeCharacter.id === character.id ? "is-active" : ""}`}
                        >
                          <div className={`aspect-[3/2] overflow-hidden bg-gradient-to-br ${character.palette}`}>
                            {cardImage && (
                              /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                              <img
                                src={cardImage.url}
                                alt={`${character.name} 대표 그림`}
                                className="h-full w-full object-cover opacity-95 transition duration-300 hover:scale-105 hover:opacity-100"
                                style={thumbnailStyle(cardImage)}
                              />
                            )}
                          </div>
                          <div className="p-4">
                            <p className="text-xs uppercase tracking-[0.28em] text-red-200/70">{character.id}</p>
                            <h4 className="mt-2 text-2xl font-bold text-emerald-50">{character.name}</h4>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-emerald-100/65">{character.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="glass-card overflow-hidden">
                <div className={`h-56 overflow-hidden bg-gradient-to-r ${activeCharacter.palette}`}>
                  {activeMainIllustration && (
                    /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                    <img
                      src={activeMainIllustration.url}
                      alt={`${activeCharacter.name} 대표 그림`}
                      className="h-full w-full object-cover opacity-90"
                      style={thumbnailStyle(activeMainIllustration)}
                    />
                  )}
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/50">Character Detail</p>
                      <h3 className="mt-2 font-serif text-5xl font-bold">{activeCharacter.name}</h3>
                      <p className="mt-2 text-emerald-100/70">{activeCharacter.subtitle}</p>
                    </div>
                  </div>

                  <blockquote className="mt-6 border border-emerald-100/10 bg-black/20 p-5 text-sm leading-7 text-emerald-50/80">
                    “{activeCharacter.quote}”
                  </blockquote>

                  <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Object.entries(activeCharacter.profile).map(([key, value]) => (
                      <div key={key} className="border border-emerald-100/10 bg-emerald-950/30 p-4">
                        <dt className="text-xs uppercase text-emerald-100/45">{key}</dt>
                        <dd className="mt-2 text-sm">{value || "-"}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {(["settings", "images", "works", "worlds"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm ${
                          activeTab === tab ? "bg-emerald-200 text-emerald-950" : "bg-emerald-100/10 text-emerald-50/70"
                        }`}
                      >
                        {tab === "settings" ? "설정" : tab === "images" ? "그림" : tab === "works" ? "글" : "세계관"}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6">
                    {activeTab === "settings" && (
                      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                        <div className="space-y-3">
                          {activeCharacter.settings.length > 0 ? (
                            activeCharacter.settings.map((setting) => (
                              <p key={setting} className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-sm leading-7">
                                {setting}
                              </p>
                            ))
                          ) : (
                            <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">등록된 상세 설정이 없어요.</p>
                          )}
                        </div>
                        <div className="grid content-start gap-4">
                          <button
                            type="button"
                            onClick={() => activeMainIllustration && openGalleryModal({ image: activeMainIllustration, character: activeCharacter })}
                            className="gallery-tile group block w-full text-left"
                            disabled={!activeMainIllustration}
                          >
                            <div className="h-96 overflow-hidden md:h-[520px]">
                              {activeMainIllustration ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                                <img
                                  src={activeMainIllustration.url}
                                  alt={`${activeCharacter.name} 일러스트`}
                                  className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                                  style={thumbnailStyle(activeMainIllustration)}
                                />
                              ) : (
                                <div className={`h-full w-full bg-gradient-to-r ${activeCharacter.palette}`} />
                              )}
                            </div>
                            <p className="p-3 text-xs text-emerald-50">일러스트 대표 썸네일</p>
                          </button>

                          {activeStandingImages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpressionModalItem({ character: activeCharacter, images: activeStandingImages })}
                              className="border border-red-600/40 bg-black/35 p-4 text-left transition hover:border-red-500"
                            >
                              <p className="text-xs uppercase tracking-[0.25em] text-red-100/55">Standing Expressions</p>
                              <div className="mt-3 grid grid-cols-4 gap-2">
                                {activeStandingImages.slice(0, 4).map((image) => (
                                  <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                    <img src={image.url} alt="스탠딩 이미지" className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                                  </div>
                                ))}
                              </div>
                              <p className="mt-3 text-sm text-emerald-50/75">스탠딩 표정 {activeStandingImages.length}장 보기</p>
                            </button>
                          )}

                          <div className="border border-emerald-100/10 bg-emerald-950/30 p-4">
                            <p className="text-xs uppercase text-emerald-100/45">Relationship</p>
                            <ul className="mt-3 space-y-2 text-sm text-emerald-50/80">
                              {activeCharacter.relationships.length > 0 ? (
                                activeCharacter.relationships.map((relationship) => <li key={relationship}>{relationship}</li>)
                              ) : (
                                <li className="text-emerald-100/50">등록된 관계가 없어요.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "images" && (
                      <div className="space-y-4">
                        {activeStandingImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpressionModalItem({ character: activeCharacter, images: activeStandingImages })}
                            className="block w-full border border-red-600/45 bg-red-950/10 p-5 text-left transition hover:border-red-500"
                          >
                            <p className="text-xs uppercase tracking-[0.28em] text-red-100/55">Standing Expression Set</p>
                            <h4 className="mt-2 text-xl font-semibold text-emerald-50">스탠딩 표정 모음</h4>
                            <p className="mt-2 text-sm text-emerald-100/65">{activeStandingImages.length}장의 표정 이미지를 한 번에 봅니다.</p>
                          </button>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {activeIllustrationImages.map((image, index) => (
                            <article key={image.id} className="gallery-tile group">
                              <button
                                type="button"
                                onClick={() => openGalleryModal({ image, character: activeCharacter })}
                                className="block w-full text-left"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                <img
                                  src={image.url}
                                  alt={`${activeCharacter.name} 그림 ${index + 1}`}
                                  className="h-64 w-full object-cover opacity-90 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                                  style={thumbnailStyle(image)}
                                />
                              </button>
                            </article>
                          ))}
                        </div>
                        {activeCharacterImages.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">등록된 그림이 없어요.</p>
                        )}
                      </div>
                    )}

                    {activeTab === "works" && (
                      <div className="space-y-4">
                        {activeWorks.length > 0 && (
                          <p className="border border-red-600/30 bg-red-950/10 p-3 text-sm text-emerald-100/70">
                            글 카드를 누르면 이북 리더 화면으로 열립니다.
                          </p>
                        )}
                        {activeWorks.map((work, index) => (
                          <button
                            key={`${work.title}-${work.date}-${index}`}
                            type="button"
                            onClick={() => {
                              setReaderModalItem({ character: activeCharacter, work });
                            }}
                            className="block w-full border border-emerald-100/10 bg-emerald-950/30 p-5 text-left transition hover:border-red-500/70 hover:bg-red-950/10"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-emerald-100/45">{work.kind} / {work.date}</p>
                                <h4 className="mt-2 text-xl font-semibold">{work.title}</h4>
                              </div>
                              <span className="bg-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-950">이북 리더로 보기</span>
                            </div>
                            {(work.images?.length ?? 0) > 0 && (
                              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {work.images?.slice(0, 5).map((image) => (
                                  <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                    <img src={image.url} alt="첨부 이미지" className="h-full w-full object-cover opacity-90" style={thumbnailStyle(image)} />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="mt-3 line-clamp-3 text-sm leading-7 text-emerald-50/75">{work.body}</p>
                          </button>
                        ))}
                        {activeWorks.length === 0 && (
                          <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">등록된 글이 없어요.</p>
                        )}
                      </div>
                    )}

                    {activeTab === "worlds" && (
                      <div className="grid gap-5">
                        {activeCharacterWorldEntries.length > 0 ? (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {activeCharacterWorldEntries.map((entry) => {
                                const world = worlds.find((item) => item.id === entry.worldId);
                                return (
                                  <button
                                    key={entry.worldId}
                                    type="button"
                                    onClick={() => setActiveCharacterWorldId(entry.worldId)}
                                    className={`px-4 py-2 text-sm ${
                                      activeCharacterWorldEntry?.worldId === entry.worldId ? "bg-emerald-200 text-emerald-950" : "bg-emerald-100/10 text-emerald-50/70"
                                    }`}
                                  >
                                    {world?.title ?? entry.worldId}
                                  </button>
                                );
                              })}
                            </div>
                            {activeCharacterWorldEntry && (!isActiveCharacterWorldUnlocked ? (
                              <article className="grid gap-4 border border-red-600/30 bg-black/30 p-5">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.25em] text-red-100/55">World Data Locked</p>
                                  <h4 className="mt-2 text-2xl font-semibold">
                                    {activeCharacterWorld?.title ?? activeCharacterWorldEntry.worldId}
                                  </h4>
                                </div>
                                <form onSubmit={(event) => unlockWorldById(event, activeCharacterWorldEntry.worldId)} className="grid gap-3 border border-red-600/25 bg-red-950/10 p-4">
                                  <p className="text-sm leading-7 text-emerald-100/70">
                                    이 세계관의 설정, 그림, 연성/로그를 보려면 비밀번호를 입력해주세요.
                                  </p>
                                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                                    <input
                                      type="password"
                                      value={worldPasswordDrafts[activeCharacterWorldEntry.worldId] ?? ""}
                                      onChange={(event) => setWorldPasswordDrafts((current) => ({ ...current, [activeCharacterWorldEntry.worldId]: event.target.value }))}
                                      placeholder="World password"
                                      className="auth-input auth-input-compact"
                                    />
                                    <button className="border border-red-600/50 bg-red-950/40 px-5 py-2 text-sm text-red-50">
                                      기록 열기
                                    </button>
                                  </div>
                                </form>
                              </article>
                            ) : (
                              <article className="grid gap-5 border border-emerald-100/10 bg-black/20 p-5">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/45">World Data</p>
                                  <h4 className="mt-2 text-2xl font-semibold">
                                    {worlds.find((world) => world.id === activeCharacterWorldEntry.worldId)?.title ?? activeCharacterWorldEntry.worldId}
                                  </h4>
                                </div>
                                <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                                  <div className="grid content-start gap-3">
                                    {activeCharacterWorldEntry.settings.length > 0 ? (
                                      activeCharacterWorldEntry.settings.map((setting) => (
                                        <p key={setting} className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-sm leading-7">{setting}</p>
                                      ))
                                    ) : (
                                      <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">이 세계관 설정이 없어요.</p>
                                    )}
                                  </div>
                                  <div className="grid content-start gap-4">
                                    <button
                                      type="button"
                                      onClick={() => activeWorldMainIllustration && openGalleryModal({ image: activeWorldMainIllustration, character: activeCharacter })}
                                      className="gallery-tile group block w-full text-left"
                                      disabled={!activeWorldMainIllustration}
                                    >
                                      <div className="h-96 overflow-hidden md:h-[520px]">
                                        {activeWorldMainIllustration ? (
                                          /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                                          <img
                                            src={activeWorldMainIllustration.url}
                                            alt={`${activeCharacter.name} 세계관 일러스트`}
                                            className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                                            style={thumbnailStyle(activeWorldMainIllustration)}
                                          />
                                        ) : (
                                          <div className={`h-full w-full bg-gradient-to-r ${activeCharacter.palette}`} />
                                        )}
                                      </div>
                                      <p className="truncate p-3 text-xs text-emerald-50">세계관 일러스트</p>
                                    </button>

                                    {activeWorldStandingImages.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpressionModalItem({ character: activeCharacter, images: activeWorldStandingImages })}
                                        className="border border-red-600/40 bg-black/35 p-4 text-left transition hover:border-red-500"
                                      >
                                        <p className="text-xs uppercase tracking-[0.25em] text-red-100/55">World Standing Expressions</p>
                                        <div className="mt-3 grid grid-cols-4 gap-2">
                                          {activeWorldStandingImages.slice(0, 4).map((image) => (
                                            <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                              {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                              <img src={image.url} alt="스탠딩 이미지" className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                                            </div>
                                          ))}
                                        </div>
                                        <p className="mt-3 text-sm text-emerald-50/75">세계관 스탠딩 표정 {activeWorldStandingImages.length}장 보기</p>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="grid gap-3">
                                  {activeCharacterWorldEntry.works.map((work, index) => (
                                    <button
                                      key={`${work.title}-${work.date}-${index}`}
                                      type="button"
                                      onClick={() => setReaderModalItem({ character: activeCharacter, work })}
                                      className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-left hover:border-red-500/70"
                                    >
                                      <p className="text-xs text-emerald-100/45">{work.kind} / {work.date}</p>
                                      <h4 className="mt-2 text-lg font-semibold">{work.title}</h4>
                                      {(work.images?.length ?? 0) > 0 && (
                                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                          {work.images?.slice(0, 5).map((image) => (
                                            <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                              {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                              <img src={image.url} alt="첨부 이미지" className="h-full w-full object-cover opacity-90" style={thumbnailStyle(image)} />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-emerald-50/70">{work.body}</p>
                                    </button>
                                  ))}
                                </div>
                              </article>
                            ))}
                          </>
                        ) : (
                          <p className="border border-emerald-100/10 bg-black/20 p-4 text-sm text-emerald-100/60">참가한 세계관 자료가 없어요.</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </section>
            </section>
          )}

          {activeSection === "worlds" && (
            <section className="space-y-6">
              <section className="glass-card p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/50">World Archive</p>
                <h3 className="mt-2 font-serif text-4xl font-bold">World</h3>
                <p className="mt-3 text-sm text-emerald-100/65">어떤 세계가 있는지는 볼 수 있지만, 세계관 기록은 비밀번호를 입력해야 열립니다.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {worlds.map((world) => (
                    <button
                      key={world.id}
                      type="button"
                      onClick={() => setActiveWorldId(world.id)}
                      className={`border p-5 text-left transition ${
                        activeWorld?.id === world.id ? "border-red-500 bg-red-950/20" : "border-emerald-100/10 bg-black/30 hover:border-red-500/50"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/40">{world.id}</p>
                      <h4 className="mt-2 text-2xl font-semibold">{world.title}</h4>
                      <p className="mt-2 text-sm text-emerald-100/60">{world.subtitle}</p>
                      {world.password?.trim() && (
                        <p className="mt-3 inline-block border border-red-600/35 bg-black/35 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-red-100/70">
                          Locked
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {worlds.length === 0 && (
                  <p className="mt-6 border border-emerald-100/10 bg-black/30 p-5 text-sm text-emerald-100/60">아직 등록된 세계관이 없어요.</p>
                )}
              </section>

              {activeWorld && (
                <section className="glass-card p-6 md:p-8">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/45">Selected World</p>
                      <h3 className="mt-2 font-serif text-4xl font-bold">{activeWorld.title}</h3>
                      <p className="mt-2 text-emerald-100/65">{activeWorld.subtitle}</p>
                      {activeWorld.description && <p className="mt-4 whitespace-pre-line text-sm leading-8 text-emerald-50/75">{activeWorld.description}</p>}
                    </div>
                    <p className="border border-red-600/30 bg-red-950/10 p-4 text-center text-sm text-emerald-100/75">
                      {isActiveWorldUnlocked ? `참가 자캐 ${activeWorldParticipants.length}명` : "기록 잠김"}
                    </p>
                  </div>

                  {!isActiveWorldUnlocked ? (
                    <form onSubmit={unlockWorld} className="mt-6 grid gap-3 border border-red-600/25 bg-black/35 p-5">
                      <p className="text-sm leading-7 text-emerald-100/70">
                        이 세계관의 참가 자캐 기록, 그림, 로그를 보려면 관리자 페이지에서 설정한 비밀번호를 입력해주세요.
                      </p>
                      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="password"
                          value={worldPasswordDrafts[activeWorld.id] ?? ""}
                          onChange={(event) => setWorldPasswordDrafts((current) => ({ ...current, [activeWorld.id]: event.target.value }))}
                          placeholder="World password"
                          className="auth-input auth-input-compact"
                        />
                        <button className="border border-red-600/50 bg-red-950/40 px-5 py-2 text-sm text-red-50">
                          기록 열기
                        </button>
                      </div>
                    </form>
                  ) : (
                  <div className="mt-6 grid gap-5">
                    {activeWorldParticipants.map(({ character, entry }) => {
                      const worldIllustrations = entry.images.filter((image) => image.category !== "standing");
                      const worldStandings = entry.images.filter((image) => image.category === "standing");
                      const worldMainIllustration = worldIllustrations[0] ?? entry.images[0];

                      return (
                      <article key={`${activeWorld.id}-${character.id}`} className="border border-emerald-100/10 bg-black/25 p-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/40">{character.id}</p>
                              <h4 className="mt-2 text-2xl font-semibold">{character.name}</h4>
                              <p className="mt-1 text-sm text-emerald-100/60">{character.subtitle}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCharacterId(character.id);
                                setActiveCharacterWorldId(entry.worldId);
                                setActiveTab("worlds");
                                setActiveSection("characters");
                              }}
                              className="border border-emerald-100/20 px-4 py-2 text-sm text-emerald-50"
                            >
                              자캐 상세로 보기
                            </button>
                          </div>

                        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[0.9fr_1fr]">
                          <div className="grid gap-3">
                            {entry.settings.length > 0 ? (
                              entry.settings.map((setting) => (
                                <p key={setting} className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-sm leading-7">{setting}</p>
                              ))
                            ) : (
                              <p className="border border-emerald-100/10 bg-black/30 p-4 text-sm text-emerald-100/60">등록된 세계관 설정이 없어요.</p>
                            )}
                          </div>
                          <div className="grid content-start gap-4">
                            <button
                              type="button"
                              onClick={() => worldMainIllustration && openGalleryModal({ image: worldMainIllustration, character })}
                              className="gallery-tile group block w-full text-left"
                              disabled={!worldMainIllustration}
                            >
                              <div className="h-96 overflow-hidden md:h-[520px]">
                                {worldMainIllustration ? (
                                  /* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */
                                  <img
                                    src={worldMainIllustration.url}
                                    alt={`${character.name} ${activeWorld.title} 일러스트`}
                                    className="h-full w-full object-cover opacity-95 transition group-hover:scale-105"
                                    style={thumbnailStyle(worldMainIllustration)}
                                  />
                                ) : (
                                  <div className={`h-full w-full bg-gradient-to-r ${character.palette}`} />
                                )}
                              </div>
                              <p className="truncate p-3 text-xs text-emerald-50">세계관 일러스트</p>
                            </button>

                            {worldStandings.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpressionModalItem({ character, images: worldStandings })}
                                className="border border-red-600/40 bg-black/35 p-4 text-left transition hover:border-red-500"
                              >
                                <p className="text-xs uppercase tracking-[0.25em] text-red-100/55">World Standing Expressions</p>
                                <div className="mt-3 grid grid-cols-4 gap-2">
                                  {worldStandings.slice(0, 4).map((image) => (
                                    <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                      {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                      <img src={image.url} alt="스탠딩 이미지" className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-3 text-sm text-emerald-50/75">세계관 스탠딩 표정 {worldStandings.length}장 보기</p>
                              </button>
                            )}
                            <div className="grid gap-3">
                              {entry.works.map((work, index) => (
                                <button
                                  key={`${work.title}-${work.date}-${index}`}
                                  type="button"
                                  onClick={() => setReaderModalItem({ character, work })}
                                  className="border border-emerald-100/10 bg-emerald-950/30 p-4 text-left hover:border-red-500/70"
                                >
                                  <p className="text-xs text-emerald-100/45">{work.kind} / {work.date}</p>
                                  <h5 className="mt-2 text-lg font-semibold">{work.title}</h5>
                                  {(work.images?.length ?? 0) > 0 && (
                                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                      {work.images?.slice(0, 5).map((image) => (
                                        <div key={image.id} className="aspect-square overflow-hidden border border-red-600/25 bg-black">
                                          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                                          <img src={image.url} alt="첨부 이미지" className="h-full w-full object-cover opacity-90" style={thumbnailStyle(image)} />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-emerald-50/70">{work.body}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                    {activeWorldParticipants.length === 0 && (
                      <p className="border border-emerald-100/10 bg-black/30 p-5 text-sm text-emerald-100/60">이 세계관에 연결된 자캐 자료가 아직 없어요.</p>
                    )}
                  </div>
                  )}
                </section>
              )}
            </section>
          )}

          {activeSection === "diary" && (
            <section className="glass-card p-6 md:p-8">
              <h3 className="board-title">다이어리</h3>
              <div className="mt-5 grid gap-4">
                {diaryEntries.length > 0 ? (
                  diaryEntries.map((entry) => (
                    <article key={entry.id} className="rounded-3xl border border-emerald-100/10 bg-emerald-950/30 p-5">
                      <p className="text-xs text-emerald-100/50">{entry.date}</p>
                      <h4 className="mt-2 text-xl font-semibold text-emerald-50">{entry.title}</h4>
                      <p className="mt-4 whitespace-pre-line text-sm leading-8 text-emerald-50/78">{entry.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-3xl border border-emerald-100/10 bg-black/30 p-5 text-sm text-emerald-100/60">
                    아직 저장된 일기가 없어요.
                  </p>
                )}
              </div>
            </section>
          )}

          {activeSection === "guest" && (
            <section className="glass-card p-6 md:p-8">
              <h3 className="board-title">방명록</h3>
              <form onSubmit={submitGuest} className="mt-5 grid gap-3 rounded-3xl border border-emerald-100/10 bg-black/20 p-4">
                <input
                  value={guestDraft.name}
                  onChange={(event) => setGuestDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="이름 (비우면 익명)"
                  disabled={!authUser}
                  className="rounded-2xl border border-emerald-100/10 bg-emerald-950/50 px-4 py-3 text-sm outline-none placeholder:text-emerald-100/35"
                />
                <textarea
                  value={guestDraft.body}
                  onChange={(event) => setGuestDraft((current) => ({ ...current, body: event.target.value }))}
                  placeholder={authUser ? "남기고 싶은 말을 적어주세요." : "로그인 후 방명록을 남길 수 있어요."}
                  disabled={!authUser}
                  className="min-h-24 rounded-2xl border border-emerald-100/10 bg-emerald-950/50 px-4 py-3 text-sm leading-7 outline-none placeholder:text-emerald-100/35"
                />
                {!authUser && (
                  <p className="text-xs text-red-100/70">방명록 작성은 로그인 후 가능합니다.</p>
                )}
                <button disabled={!authUser} className="justify-self-end rounded-full bg-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50">남기기</button>
              </form>
              <div className="mt-6 space-y-4">
                {guestbook.map((guest, index) => (
                  <article key={guest.id} className="rounded-3xl border border-emerald-100/10 bg-emerald-950/30 p-5">
                    <p className="font-semibold">No.{guestbook.length - index} {guest.name}</p>
                    <p className="mt-3 text-sm leading-7 text-emerald-50/75">{guest.body}</p>
                    {guest.reply && (
                      <div className="mt-4 rounded-2xl bg-emerald-100/10 p-4 text-sm text-emerald-50/70">답글: {guest.reply}</div>
                    )}
                  </article>
                ))}
                {guestbook.length === 0 && (
                  <p className="rounded-3xl border border-emerald-100/10 bg-black/25 p-5 text-sm text-emerald-50/55">
                    아직 남겨진 방명록이 없어요.
                  </p>
                )}
              </div>
            </section>
          )}

          {activeSection === "extract" && (
            <section className="glass-card p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-red-100/60">@/1_R#0?/@...</p>
              <h3 className="board-title mt-3">아직 공사중</h3>
              <p className="mt-5 border border-emerald-100/10 bg-black/25 p-5 text-sm leading-7 text-emerald-50/70">
                아직 무슨 기능을 넣을지 정하지 않았어요.
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="glass-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-red-100/55">Calendar</p>
                <h3 className="board-title mt-1">{calendarMonth.format("YYYY.MM")}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => current.subtract(1, "month"))}
                  className="game-menu-button grid size-8 place-items-center text-sm"
                  aria-label="이전 달"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(dayjs().startOf("month"))}
                  className="game-menu-button h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  aria-label="이번 달"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => current.add(1, "month"))}
                  className="game-menu-button grid size-8 place-items-center text-sm"
                  aria-label="다음 달"
                >
                  ▶
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-7 border border-red-600/25 bg-black/25 text-center text-[11px]">
              {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => (
                <div key={weekday} className="border-b border-red-600/20 py-2 text-red-100/60">
                  {weekday}
                </div>
              ))}
              {calendarDays.map((day) => (
                <div
                  key={day.date.format("YYYY-MM-DD")}
                  className={`min-h-10 border-b border-r border-red-600/10 p-1.5 ${
                    day.isCurrentMonth ? "text-emerald-50/78" : "text-emerald-100/22"
                  } ${day.isToday ? "bg-red-700/35 text-red-50" : ""}`}
                >
                  <span className="inline-grid size-6 place-items-center">{day.dayLabel}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-emerald-100/50">오늘 날짜는 붉게 표시됩니다.</p>
          </section>

          <BgmPlayer />
        </aside>
      </section>

      {/* 글/이미지/스탠딩 표정 모달은 페이지 하단에 모아서 조건부로 띄웁니다. */}
      {readerModalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${readerModalItem.work.title} 이북 보기`}
          onClick={() => setReaderModalItem(null)}
        >
          <div
            className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden border border-red-600/45 bg-[#070000] shadow-2xl shadow-black"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-red-600/25 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-red-200/60">Ebook Reader / {readerModalItem.character.name}</p>
                <h3 className="mt-1 text-xl font-bold text-emerald-50">{readerModalItem.work.title}</h3>
                <p className="mt-1 text-xs text-emerald-100/45">{readerModalItem.work.kind} / {readerModalItem.work.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setReaderModalItem(null)}
                className="border border-emerald-100/20 px-3 py-2 text-sm text-emerald-50"
              >
                닫기
              </button>
            </div>

            <article className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,24,0.06),transparent_34%),#030000]">
              <div className="px-7 py-8 md:px-12 md:py-10">
                {(readerModalItem.work.images?.length ?? 0) > 0 && (
                  <div className="mb-8 grid gap-3 sm:grid-cols-2">
                    {readerModalItem.work.images?.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => openGalleryModal({ image, character: readerModalItem.character })}
                        className="gallery-tile group block text-left"
                      >
                        <div className="aspect-[4/3] overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                          <img src={image.url} alt="첨부 이미지" className="h-full w-full object-cover opacity-95 transition group-hover:scale-105" style={thumbnailStyle(image)} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-line text-[0.95rem] leading-9 text-emerald-50/86">
                  {readerModalItem.work.body || "내용이 없어요."}
                </p>
              </div>
            </article>
          </div>
        </div>
      )}

      {galleryModalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/82 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${galleryModalItem.character.name} 이미지 확대 보기`}
          onClick={() => setGalleryModalItem(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-emerald-100/20 bg-[#100707] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-emerald-100/10 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-200/70">{galleryModalItem.character.name}</p>
                <h3 className="mt-1 text-lg font-semibold text-emerald-50">이미지 확대 보기</h3>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModalItem(null)}
                className="border border-emerald-100/20 px-3 py-2 text-sm text-emerald-50"
              >
                닫기
              </button>
            </div>
            <div
              className="max-h-[72vh] overflow-auto overscroll-contain bg-black/40 p-4"
              onWheel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const currentTarget = event.currentTarget;
                const scrollLeft = currentTarget.scrollLeft;
                const scrollTop = currentTarget.scrollTop;
                updateGalleryZoom(galleryZoom + (event.deltaY < 0 ? 0.12 : -0.12));
                requestAnimationFrame(() => {
                  currentTarget.scrollLeft = scrollLeft;
                  currentTarget.scrollTop = scrollTop;
                });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads and are displayed at original size in the modal. */}
              <img
                src={galleryModalItem.image.url}
                alt={`${galleryModalItem.character.name} 이미지`}
                className="mx-auto h-auto max-w-none select-none object-contain"
                style={{
                  width: `${galleryZoom * 100}%`,
                }}
                draggable={false}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-emerald-100/10 p-4 text-xs text-emerald-100/60">
              <span className="mr-auto text-emerald-100/50">휠로 확대/축소 가능</span>
              <button type="button" onClick={() => updateGalleryZoom(galleryZoom - 0.2)} className="border border-emerald-100/20 px-3 py-2 text-emerald-50">
                축소
              </button>
              <button type="button" onClick={() => updateGalleryZoom(1)} className="border border-emerald-100/20 px-3 py-2 text-emerald-50">
                {Math.round(galleryZoom * 100)}%
              </button>
              <button type="button" onClick={() => updateGalleryZoom(galleryZoom + 0.2)} className="border border-emerald-100/20 px-3 py-2 text-emerald-50">
                확대
              </button>
            </div>
          </div>
        </div>
      )}

      {expressionModalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${expressionModalItem.character.name} 스탠딩 표정 보기`}
          onClick={() => setExpressionModalItem(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-red-600/45 bg-[#070000] shadow-2xl shadow-black"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-red-600/20 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-200/70">{expressionModalItem.character.name}</p>
                <h3 className="mt-1 text-lg font-semibold text-emerald-50">스탠딩 표정 모음</h3>
              </div>
              <button type="button" onClick={() => setExpressionModalItem(null)} className="border border-emerald-100/20 px-3 py-2 text-sm text-emerald-50">
                닫기
              </button>
            </div>
            <div className="max-h-[76vh] overflow-y-auto p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {expressionModalItem.images.map((image) => (
                  <article key={image.id} className="gallery-tile">
                    <button
                      type="button"
                      onClick={() => {
                        setExpressionModalItem(null);
                        openGalleryModal({ image, character: expressionModalItem.character });
                      }}
                      className="block w-full text-left"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element -- R2 public URLs are user uploads shown directly. */}
                        <img src={image.url} alt="스탠딩 이미지" className="h-full w-full object-cover" style={thumbnailStyle(image)} />
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
