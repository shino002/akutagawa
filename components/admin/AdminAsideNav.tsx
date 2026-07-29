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
 *
 * 두 단 배치에서는 화면에 붙어 따라옵니다 — 편집기가 길어도 목록으로 돌아오려고
 * 맨 위까지 스크롤을 되감지 않도록.
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
    <aside className="admin-aside glass-card">
      {/* 무엇을 편집할지 — 가장 위에서 한 번 고릅니다 */}
      <div className="admin-aside-switch" role="tablist" aria-label="편집 대상">
        <button
          type="button"
          role="tab"
          aria-selected={adminPanel === "categories"}
          onClick={() => onPanelChange("categories")}
          className={adminPanel === "categories" ? "is-active" : undefined}
        >
          카테고리
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={adminPanel === "characters"}
          onClick={() => onPanelChange("characters")}
          className={adminPanel === "characters" ? "is-active" : undefined}
        >
          자캐 · 페어 · 어나더
        </button>
      </div>

      <div className="admin-aside-body">
        {adminPanel === "characters" && charactersSidebar}

        {adminPanel === "categories" && (
          <>
            <p className="adm-label">카테고리 목록</p>
            <nav className="admin-aside-list" aria-label="카테고리">
              {CATEGORIES.map((category) => {
                const isActive = activeCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => onCategoryChange(category.id)}
                    className={isActive ? "admin-aside-item is-active" : "admin-aside-item"}
                  >
                    <span className="admin-aside-item-title">{category.title}</span>
                    <span className="admin-aside-item-sub">{category.subtitle}</span>
                  </button>
                );
              })}
            </nav>
            {categoryExtra}
          </>
        )}
      </div>

      <button type="button" onClick={onSignOut} className="admin-ghost-btn admin-aside-signout">
        로그아웃
      </button>
    </aside>
  );
}
