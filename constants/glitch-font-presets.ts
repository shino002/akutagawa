/**
 * Glitch 구간 폰트 프리셋.
 * [id, label, font-family, load?] — load는 @noonnu CSS / font-kopub / woff:URL
 */
const N = (pkg: string) => `https://cdn.jsdelivr.net/npm/@noonnu/${pkg}/index.css`;
const K = (pkg: string) => `https://cdn.jsdelivr.net/npm/@kfonts/${pkg}/index.css`;
const W = (url: string) => `woff:${url}`;

type FontRow = readonly [id: string, label: string, family: string, load?: string];

const FONT_ROWS: FontRow[] = [
  ["ui", "본문", 'var(--font-ui-stack), var(--font-emoji-stack)'],
  ["noto-sans", "본고딕", '"Noto Sans KR", sans-serif'],
  ["kanji", "시하리 한자", 'var(--font-shippori-mincho), "Shippori Mincho", serif'],
  ["logo", "사이트 로고", 'var(--font-yuji-mai), "Yuji Mai", serif'],
  ["mono", "고정폭", 'var(--font-geist-mono), ui-monospace, monospace'],
  ["serif", "옛명조", '"Zen Old Mincho", serif'],
  ["myungjo", "한마음명조", '"KBIZHanmaumMyungjo", serif', N("kbiz-hanmaum-myungjo")],
  ["kopub-batang", "KoPub 바탕", '"KoPub Batang", serif', N("kopub-batang")],
  [
    "kopub-dotum",
    "KoPub 돋움",
    '"KoPub Dotum", sans-serif',
    "https://cdn.jsdelivr.net/npm/font-kopub@1.0/kopubdotum.min.css",
  ],
  [
    "kcc-anchangho",
    "KCC안창호",
    '"KccAnchangho", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2402_1@1.0/KCC-Ahnchangho.woff2"),
  ],
  ["chosun-100", "조선100년", '"ChosunCentennial", serif', N("chosun-centennial")],
  ["chosun-gungsuh", "조선궁서", '"ChosunGs", serif', N("chosun-gs")],
  ["maru-buri", "마루 부리", '"MaruBuri-Regular", serif', N("maru-buri-regular")],
  [
    "hakgyoansim-dungunmiso",
    "학교안심 둥근미소",
    '"SchoolSafetyRoundedSmile", sans-serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimDunggeunmisoTTF-R.woff2"),
  ],
  ["neodgm", "둥근모", '"Neo둥근모", monospace', K("neodgm")],
  ["neodgm-code", "둥근모 Code", '"Neo둥근모 Code", monospace', K("neodgm-code")],
  ["galmuri11", "갈맷글", "Galmuri11, monospace", N("galmuri11")],
  ["ibm-plex", "IBM Plex", '"MonoplexKR-Regular", sans-serif', N("monoplex-kr-regular")],
  ["nanum-myeongjo", "나눔 명조", '"Nanum Myeongjo", serif', N("nanum-myeongjo")],
  [
    "gabia-gosran",
    "가비아 고스란",
    '"GabiaGosranche", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/2409-2@1.0/GabiaGosran-Regular.woff2"),
  ],
  [
    "taenada",
    "태나다",
    '"Taenada", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2210-2@1.0/Tenada.woff2"),
  ],
  ["gowun-dodum", "고운돋움", '"GowunDodum-Regular", sans-serif', N("gowun-dodum-regular")],
  ["sun-batang", "순바탕", '"SunBatang-Light", serif', N("sun-batang-light")],
  [
    "diphylleia",
    "산하엽",
    '"Diphylleia", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2207@1.0/Diphylleia-Regular.woff2"),
  ],
  [
    "mbc-1961",
    "MBC 1961",
    '"Mbc1961", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-01@1.0/MBC1961M.woff2"),
  ],
  [
    "chungju-kimsaeng",
    "충주김생",
    '"ChungjuKimsaeng", cursive',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2312-1@1.1/ChungjuKimSaengTTF.woff2"),
  ],
  [
    "kyobo-kimhyenam",
    "교보 김혜남",
    '"KyoboHandwriting2022KimHyeNa", cursive',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2312-1@1.1/KyoboHandwriting2022KimHyeNa.woff2"),
  ],
  [
    "hangul-jaemin",
    "한글재민",
    '"Hanguljaemin", sans-serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2108@1.1/Hanguljaemin6.0.woff2"),
  ],
  [
    "gabia-maumgyeol",
    "가비아 마음결",
    '"GabiaMaumgyeol", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2312-1@1.1/GabiaMaumgyeol.woff2"),
  ],
  [
    "hakgyoansim-bareunbatang",
    "학교안심 바른바탕",
    '"SchoolSafetyBareunbatang", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2307-2@1.0/HakgyoansimBareunbatangR.woff2"),
  ],
  [
    "kcc-sonkijung",
    "KCC손기정",
    '"KccSonkijung", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/KCCSonkijung.woff2"),
  ],
  ["pyeongchang", "평창", '"PyeongChangPeace-Bold", serif', N("pyeong-chang-peace-bold")],
  ["kcc-imkwontaek", "KCC임권택", '"KCCImkwontaek", serif', N("kcc-imkwontaek")],
  [
    "macho",
    "마초",
    '"Macho", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2206-01@1.0/EF_MACHO.woff2"),
  ],
  ["noto-emoji", "Noto Emoji", "var(--font-emoji-stack)"],
  ["nanum-barun-gothic", "나눔바른고딕", '"NanumBarunGothic", sans-serif', N("nanum-barun-gothic")],
  ["hs-bombaram", "HS봄바람 3.0", '"HSBombaram", sans-serif', N("hs-bombaram")],
  [
    "hakgyoansim-byulbithaneul",
    "학교안심 별빛하늘",
    '"SchoolSafetyStarlightSky", sans-serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2307-2@1.0/HakgyoansimByeolbithaneulR.woff2"),
  ],
  [
    "ggubulim",
    "꾸불림",
    '"KkuBulLim", cursive',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/2410-1@1.0/BMkkubulimTTF-Regular.woff2"),
  ],
  ["jeongseon-arirang", "정선아리랑", '"JSArirangHON-Regular", serif', N("js-arirang-hon-regular")],
  [
    "kimjungchul",
    "김정철 손글씨",
    '"KimjungchulScript", cursive',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2202@1.0/KimjungchulScript.woff2"),
  ],
  [
    "incheon-education",
    "인천교육시민",
    '"IncheonEducationCitizen", sans-serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/IncheonEducationCitizen.woff2"),
  ],
  ["jeju-gothic", "제주고딕", '"Jeju Gothic", sans-serif', N("jeju-gothic")],
  ["mapo-backpacking", "Mapo배낭여행", '"MapoBackpacking", sans-serif', N("mapo-backpacking")],
  [
    "presentation",
    "프리젠테이션",
    '"Presentation", sans-serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-4Regular.woff2"),
  ],
  [
    "jeonju-wanpan",
    "전주완판본",
    '"JeonjuWanpanbonSoon", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2202@1.0/JeonjuSunR.woff"),
  ],
  ["deokon-gongju", "덕온공주옛", '"DeogonPrincessClassic", serif', N("deogon-princess-classic")],
  ["ddangsbudae-jjigae", "땅스부대찌개", '"TTTtangsbudaejjigaeB", sans-serif', N("tt-ttangsbudaejjigae-b")],
  [
    "museum-classic",
    "국립박물관클래식",
    '"MuseumClassic", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-2@1.0/MuseumClassicL.woff2"),
  ],
  [
    "solmoe-kimdaegun",
    "솔뫼 김대건",
    '"SolmoeKimDaegeon", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts-20-12@1.0/kdg_Medium.woff"),
  ],
  [
    "mannyeonsul",
    "만년설",
    '"Mannyeonsul", serif',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2206-01@1.0/Mannyeonsul.woff2"),
  ],
  [
    "gana-chocolate",
    "가나초콜릿",
    '"GanaChocolate", cursive',
    W("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2205@1.0/GanaChocolate.woff2"),
  ],
];

export type GlitchFontPreset = {
  id: string;
  label: string;
  family: string;
  load?: string;
};

export const GLITCH_FONT_PRESETS: GlitchFontPreset[] = FONT_ROWS.map(([id, label, family, load]) => ({
  id,
  label,
  family,
  ...(load ? { load } : {}),
}));

const PRESET_BY_ID = new Map(GLITCH_FONT_PRESETS.map((preset) => [preset.id, preset]));

export function normalizeGlitchFontPreset(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const id = value.trim();
  return PRESET_BY_ID.has(id) ? id : undefined;
}

export function resolveGlitchFontFamily(presetId?: string): string | undefined {
  const id = normalizeGlitchFontPreset(presetId);
  if (!id) {
    return undefined;
  }

  return PRESET_BY_ID.get(id)?.family;
}
