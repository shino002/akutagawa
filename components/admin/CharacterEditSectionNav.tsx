"use client";

export type CharacterEditSection = "basics" | "glitch" | "world" | "images";

interface CharacterEditSectionNavProps {
  active: CharacterEditSection;
  onChange: (section: CharacterEditSection) => void;
  characterName: string;
  glitchFieldCount: number;
  activeGlitchLabel?: string | null;
}

const SECTIONS: Array<{
  id: CharacterEditSection;
  label: string;
  hint: string;
}> = [
  { id: "basics", label: "기본 · 레코드", hint: "카드 정보 + 레코드 박스" },
  { id: "glitch", label: "오류", hint: "텍스트 오류·서식" },
  { id: "world", label: "세계관", hint: "World별 기록" },
  { id: "images", label: "그림", hint: "업로드·연성" },
];

export function CharacterEditSectionNav({
  active,
  onChange,
  characterName,
  glitchFieldCount,
  activeGlitchLabel,
}: CharacterEditSectionNavProps) {
  return (
    <div className="glass-card sticky top-4 z-20 grid gap-3 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-100/45">편집 중</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-50">{characterName || "새 자캐"}</h2>
        </div>
        {activeGlitchLabel ? (
          <p className="border border-amber-300/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
            오류 대상: <span className="font-semibold">{activeGlitchLabel}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const badge =
            section.id === "glitch" && glitchFieldCount > 0 ? String(glitchFieldCount) : null;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={
                active === section.id
                  ? "bg-emerald-200 px-3 py-2 text-left text-emerald-950"
                  : "border border-emerald-100/20 px-3 py-2 text-left text-emerald-100/75"
              }
              title={section.hint}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {section.label}
                {badge ? (
                  <span className="rounded-full bg-emerald-950/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[10px] opacity-70">{section.hint}</span>
            </button>
          );
        })}
      </div>

      {(active === "basics" || active === "glitch") && (
        <p className="text-[11px] leading-5 text-emerald-100/50">
          기본·레코드·오류 탭은 아래 <span className="text-emerald-100/80">「본 페이지에 저장」</span>으로
          함께 저장됩니다. 레코드 박스는 <span className="text-emerald-100/80">기본 · 레코드</span> 탭 맨 아래에
          있습니다.
        </p>
      )}
    </div>
  );
}
