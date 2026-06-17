"use client";

export type CharacterEditSection = "basics" | "glitch" | "subpages" | "members" | "world" | "images";

interface CharacterEditSectionNavProps {
  active: CharacterEditSection;
  onChange: (section: CharacterEditSection) => void;
  characterName: string;
  newItemLabel?: string;
  glitchFieldCount: number;
  subPageCount: number;
  isPair?: boolean;
  activeGlitchLabel?: string | null;
}

const BASE_SECTIONS: Array<{
  id: CharacterEditSection;
  label: string;
  hint: string;
}> = [
  { id: "basics", label: "카드 · 레코드", hint: "카드 정보 + 레코드 박스" },
  { id: "glitch", label: "오류", hint: "텍스트 오류·서식" },
  { id: "subpages", label: "상세 페이지", hint: "이 항목 안의 추가 상세" },
  { id: "members", label: "연결 캐릭터", hint: "OC · Another 선택" },
  { id: "world", label: "세계관", hint: "World별 기록" },
  { id: "images", label: "그림", hint: "업로드·연성" },
];

export function CharacterEditSectionNav({
  active,
  onChange,
  characterName,
  newItemLabel = "새 항목",
  glitchFieldCount,
  subPageCount,
  isPair = false,
  activeGlitchLabel,
}: CharacterEditSectionNavProps) {
  const visibleSections = (isPair
    ? BASE_SECTIONS
    : BASE_SECTIONS.filter((section) => section.id !== "members")
  ).map((section) =>
    isPair && section.id === "basics"
      ? { ...section, label: "페어 카드", hint: "목록 카드·공통 정보" }
      : section,
  );

  return (
    <div className="admin-section-nav glass-card grid gap-3 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-100/45">편집 중</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-50">{characterName || newItemLabel}</h2>
        </div>
        {activeGlitchLabel ? (
          <p className="border border-amber-300/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
            오류 대상: <span className="font-semibold">{activeGlitchLabel}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleSections.map((section) => {
          const badge =
            section.id === "glitch" && glitchFieldCount > 0
              ? String(glitchFieldCount)
              : section.id === "subpages" && subPageCount > 0
                ? String(subPageCount)
                : null;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={active === section.id ? "admin-tab-btn admin-tab-btn-active" : "admin-tab-btn"}
              title={section.hint}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {section.label}
                {badge ? (
                  <span className="border border-emerald-100/20 bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-100/80">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[10px] opacity-70">{section.hint}</span>
            </button>
          );
        })}
      </div>

      {(active === "basics" || active === "glitch" || active === "subpages" || active === "members") && (
        <p className="text-[11px] leading-5 text-emerald-100/50">
          {isPair ? (
            <>
              페어 카드·오류·상세 페이지·연결 캐릭터 탭은 아래{" "}
              <span className="text-emerald-100/80">「본 페이지에 저장」</span>으로 함께 저장됩니다.
            </>
          ) : (
            <>
              기본·레코드·오류·상세 페이지 탭은 아래{" "}
              <span className="text-emerald-100/80">「본 페이지에 저장」</span>으로 함께 저장됩니다. 레코드 박스는{" "}
              <span className="text-emerald-100/80">카드 · 레코드</span> 탭 맨 아래에 있습니다.
            </>
          )}
        </p>
      )}
    </div>
  );
}
