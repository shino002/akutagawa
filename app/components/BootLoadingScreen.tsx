"use client";

import { useEffect, useState } from "react";

const ERROR_LINES = [
  "@@@@////??????////@@@@",
  "/?/???/ MEMORY_BLEED_DETECTED /?/??",
  "@@ CHARACTER_INDEX::NULL::NULL::NULL",
  "//// STANDING_SET_BROKEN ???",
  "??? ILLUSTRATION_CACHE @@@ RED RED RED",
  "@@@@ WORLD_ENTRY /?/ LOST /?/ FOUND",
  "///// DO_NOT_OPEN_DOOR /////",
  "@@/? TEXT_MUTATION_OVERFLOW ?/@@",
  "????? BLACK SIGNAL IN DISPLAY ?????",
  "@@@@@ ROUTE_FORCED_OPEN @@@@@",
  "/?/?/?/?/?/?/?/?/?/?/?/?/?/?",
  "BLOOD_RED_SCREEN_WRITE = TRUE",
  "@@ AKUTAGAWA_ARCHIVE_IS_ENTERING @@",
  "OWNER_ID = Akutagawa // 芥川",
  "//// 芥川 芥川 芥川 ////",
];

export default function BootLoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<"boot" | "error">("boot");
  const [errorLineCount, setErrorLineCount] = useState(0);
  const [progress, setProgress] = useState(7);

  const errorRows = Array.from({ length: Math.max(errorLineCount, 1) }, (_, index) => ERROR_LINES[index % ERROR_LINES.length]);

  useEffect(() => {
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + Math.floor(Math.random() * 10) + 4, 99));
    }, 170);
    let errorLineTimer: number | undefined;

    const errorTimer = window.setTimeout(() => {
      setPhase("error");
      setProgress(100);
      setErrorLineCount(1);
      errorLineTimer = window.setInterval(() => {
        setErrorLineCount((current) => Math.min(current + 4, 84));
      }, 80);
    }, 1850);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 5600);

    return () => {
      window.clearInterval(progressTimer);
      if (errorLineTimer) window.clearInterval(errorLineTimer);
      window.clearTimeout(errorTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`boot-loading-screen ${phase === "error" ? "is-error" : ""}`} role="status" aria-label="사이트 로딩 중">
      <div className="boot-loading-panel">
        <div className="boot-cmd-body">
          <h1 className="boot-site-title">【AKUTAGAWA ARCHIVE】</h1>
          <p className="boot-site-path">OWNER: Akutagawa / 芥川</p>
          <p className="boot-site-path">K:AKUTAGAWA\OC_HOME\____CHARACTER_ARCHIVE\BOOT.exe</p>
          <p className="mt-4">[CRT:ON] ◄ BACK × CLOSE</p>

          <div className="boot-loading-box">
            <p>╔══════════════════════════════════════════════╗</p>
            <p>║ OS Booting Progress ...{String(progress).padStart(3, "0")}% // BLOOD-RED SYSTEMS v3.0 ║</p>
            <p>╚══════════════════════════════════════════════╝</p>
          </div>

          {phase === "boot" ? (
            <>
              <section className="boot-section">
                <h2>▓ ABOUT THIS WEB</h2>
                <p>현재 자캐 아카이브 시스템 완성도 ■■■■■■■□□</p>
                <p>사진, 설정, 세계관/TRPG 기록과 글을 보관하는 Akutagawa의 개인 홈페이지입니다.</p>
                <p>캐시 오류나 화면 이상 발생 시 Ctrl+Shift+R로 새로고침 부탁드립니다.</p>
              </section>

              <section className="boot-section">
                <h2>▓ ABOUT ARCHIVE</h2>
                <p>[system] 검은 화면 너머에서 芥川 기록을 불러오는 중...</p>
                <p>Character data :// settings · illustrations · standing expressions · works</p>
                <p>TRPG world data :// world settings · logs · images</p>
              </section>

              <section className="boot-section">
                <h2>▓ NAVIGATION</h2>
                <p>▶ CHARACTER — 자캐 카드와 상세 기록 [OK]</p>
                <p>▶ TRPG — 세계관별 참가 기록 [OK]</p>
                <p>▶ DIARY — 개인 기록 [OK]</p>
                <p>□ GUEST — 방문자 기록 [WAIT]</p>
              </section>

              <section className="boot-section">
                <h2>▓ KEYBOARD SHORTCUTS</h2>
                <p>← → 메뉴 전환 │ ↑ ↓ 항목 이동 │ Enter 열기 │ Esc 뒤로</p>
              </section>
            </>
          ) : (
            <div className="boot-loading-errors">
              {errorRows.map((line, index) => (
                <p key={`${line}-${index}`}>
                  <span>{index % 3 === 0 ? "@@@" : index % 3 === 1 ? "/?" : "????"}</span> {line}
                </p>
              ))}
            </div>
          )}

          <p className="boot-loading-footer">
            {phase === "error" ? "> forced route opened. entering archive..." : "↑↓항목 이동 ←→탭 전환 Enter열기 Esc뒤로"}
          </p>
        </div>
      </div>
    </div>
  );
}
