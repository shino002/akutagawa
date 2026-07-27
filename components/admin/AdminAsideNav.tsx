"use client";

import type { ReactNode } from "react";
import type { AdminCategory, AdminPanel } from "@/types/admin.types";

const CATEGORIES: Array<{ id: AdminCategory; title: string; subtitle: string }> = [
  { id: "home", title: "상단문구 수정", subtitle: "home main text" },
  { id: "archive", title: "보관소 문구", subtitle: "archive sidebar text" },
  { id: "diary", title: "다이어리", subtitle: "diary category" },
  { id: "guestbook", title: "방명록", subtitle: "guest comments" },
  { id: "extract", title: "Banner", subtitle: "banner links" },
  { id: "bgm", title: "BGM", subtitle: "bgm playlist" },
  { id: "worlds", title: "World 관리", subtitle: "world archive" },
];

interface AdminAsideNavProps {
  adminPanel: AdminPanel;
  onPanelChange: (panel: AdminPanel) => void;
  activeCategory: AdminCategory;
  onCategoryChange: (category: AdminCategory) => void;
  charactersSidebar?: ReactNode;
  categoryExtra?: ReactNode;
  onSignOut: () => void;
}

/**
 * 관리자 좌측 패널: 카테고리/캐릭터 전환 + 목록 + 로그아웃입니다.
 */
export function AdminAsideNav({
  adminPanel,
  onPanelChange,
  activeCategory,
  onCategoryChange,
  charactersSidebar,
  categoryExtra,
  onSignOut,
}: AdminAsideNavProps) {
  return (
    <aside className="glass-card p-5">
      <div className="mb-5 grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => onPanelChange("categories")}
          className={`px-3 py-3 ${adminPanel === "categories" ? "bg-emerald-200 text-emerald-950" : "border border-emerald-100/20 text-emerald-100/70"}`}
        >
          카테고리 관리
        </button>
        <button
          type="button"
          onClick={() => onPanelChange("characters")}
          className={`px-3 py-3 ${adminPanel === "characters" ? "bg-emerald-200 text-emerald-950" : "border border-emerald-100/20 text-emerald-100/70"}`}
        >
          자캐 · 페어 · 어나더
        </button>
      </div>
      {adminPanel === "characters" && charactersSidebar}
      {adminPanel === "categories" && (
        <>
          <h2 className="board-title">카테고리 목록</h2>
          <div className="mt-5 grid gap-3">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryChange(category.id)}
                className={`border p-3 text-left text-sm ${
                  activeCategory === category.id
                    ? "border-stone-400/35 bg-emerald-100/10"
                    : "border-emerald-100/10 bg-black/30"
                }`}
              >
                <span className="block text-lg font-semibold">{category.title}</span>
                <span className="mt-1 block text-xs text-emerald-100/50">{category.subtitle}</span>
              </button>
            ))}
          </div>
          {categoryExtra}
        </>
      )}
      <button
        type="button"
        onClick={onSignOut}
        className="mt-5 w-full border border-emerald-100/20 px-4 py-3 text-sm text-emerald-50"
      >
        로그아웃
      </button>
    </aside>
  );
}
