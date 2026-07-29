"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { clearancePresetOf, type ClearanceGrade } from "@/lib/clearance";
import {
  playConfidentialOpenDrone,
  playConfidentialStampThud,
  preloadConfidentialStampSound,
} from "@/lib/confidential-warning-sound";

/** 도장이 종이에 닿는 시점 — cg-stamp-slam 의 접촉 키프레임(340ms 의 58%)과 맞물립니다 */
const STAMP_CONTACT_MS = 197;
/** 다 찍히고 잉크가 앉기를 기다렸다가 다음 결재로 넘어갑니다 */
const STAMP_SETTLE_MS = 760;

interface ConfidentialAccessModalProps {
  characterName: string;
  /** 문서 등급 — 결재 단수와 문구·잉크가 전부 여기서 갈립니다 */
  grade: ClearanceGrade;
  /** 받아야 할 결재 도장 수 (1 또는 2) */
  steps: 1 | 2;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

/** 결재 단계마다 붙는 이름 — 결재란의 칸 머리에 인쇄돼 있습니다 */
const APPROVAL_ORDER = ["第一次", "第二次"] as const;

interface GateCopy {
  /** 표제 — 등급이 무엇을 요구하는 절차인지 */
  headJp: string;
  /** 표제 아래 작은 줄 */
  eyebrow: string;
  /** 기재란의 분류 칸 */
  classText: string;
  /** 1차 화면의 주의문 두 줄 */
  notice: [string, string];
  /** 마지막 화면의 일본어 표지 문구 */
  finalJp: string;
  /** 마지막 화면의 문장 두 줄 */
  finalText: [string, string];
}

/**
 * 등급별 경고 문구.
 *
 * 같은 창에 이름만 바꿔 끼우면 등급이 올라가도 무게가 안 실립니다.
 * X 는 등급표 밖이라 절차 자체가 다르다는 말투를, S 는 규정 인용을,
 * A 는 한 단계짜리 관내 열람 허가를 씁니다.
 */
const GATE_COPY: Record<ClearanceGrade, GateCopy> = {
  X: {
    headJp: "分類不能文書",
    eyebrow: "等級表外 · 記録照会不可",
    classText: "분류 불능 · 등급표 외",
    notice: [
      "본 문서는 등급 분류 절차를 거치지 않았습니다.",
      "내용에 관한 사전 고지는 제공되지 않습니다.",
    ],
    finalJp: "記録照会不可",
    finalText: [
      "이 열람에 대한 접근 기록은 생성되지 않습니다.",
      "따라서 열람 사실을 사후에 증명할 수 없습니다.",
    ],
  },
  S: {
    headJp: "閲覧許可申請",
    eyebrow: "機密 第壹種 · 閲覧記録保存",
    classText: "최고 기밀 · 열람 제한",
    notice: [
      "인가되지 않은 자의 열람 · 복제 · 촬영을 금합니다.",
      "열람 기록은 자동 보존되며 정기 감사 대상입니다.",
    ],
    finalJp: "関係者以外閲覧禁止",
    finalText: ["열람자 정보가 접근 기록에 등재됩니다.", "등재 후에는 취소 · 삭제할 수 없습니다."],
  },
  A: {
    headJp: "閲覧許可申請",
    eyebrow: "機密 第参種 · 館内閲覧限定",
    classText: "열람 제한 · 반출 불가",
    notice: ["관내 열람만 허용되며 반출 · 복제를 금합니다.", "열람 기록은 자동 보존됩니다."],
    finalJp: "館内閲覧限定",
    finalText: ["관내 열람으로 처리됩니다.", "문서는 열람 후 제자리에 편철됩니다."],
  },
  /* B·C 는 문이 없으므로 이 창까지 오지 않습니다. 등급이 바뀌어도
     화면이 비지 않도록 A 와 같은 말을 두고 있습니다. */
  B: {
    headJp: "閲覧許可申請",
    eyebrow: "一般記録 · 館内閲覧",
    classText: "일반 기록",
    notice: ["관내 열람이 허용된 문서입니다.", "반출 시에는 별도 결재가 필요합니다."],
    finalJp: "館内閲覧",
    finalText: ["관내 열람으로 처리됩니다.", "문서는 열람 후 제자리에 편철됩니다."],
  },
  C: {
    headJp: "閲覧許可申請",
    eyebrow: "公開記録 · 制限無",
    classText: "완전 공개",
    notice: ["열람 · 인용에 제한이 없는 문서입니다.", "반출 시에는 반출대장에 기재하십시오."],
    finalJp: "公開記録",
    finalText: ["공개 기록으로 처리됩니다.", "열람에 별도 제한이 없습니다."],
  },
};

/**
 * 이름 문자열을 6자리 hex 접수번호로 변환.
 * 장식용 난수가 아니라, 같은 캐릭터는 항상 같은 번호를 갖는 결정적 해시.
 */
const toCaseCode = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
};

/**
 * 기밀 자캐 진입 전 열람 결재.
 *
 * 등급이 요구하는 만큼 결재 도장을 받습니다 — A 는 一次만, S·X 는 二次까지.
 * 단계를 누를 때마다 결재란의 해당 칸에 承認 이 내려찍히고, 마지막 칸이
 * 찍힌 뒤에야 문서가 열립니다.
 */
export function ConfidentialAccessModal({
  characterName,
  grade,
  steps,
  onConfirm,
  onCancel,
  className,
}: ConfidentialAccessModalProps) {
  /** 지금까지 받은 결재 도장 수 */
  const [approved, setApproved] = useState(0);
  /** 도장이 찍히는 동안 다음 화면으로 넘어가지 않도록 잡아 둡니다 */
  const [stamping, setStamping] = useState(false);
  const [ready, setReady] = useState(false);
  const [sealLit, setSealLit] = useState(true);
  const onCancelRef = useRef(onCancel);
  const stampTimersRef = useRef<number[]>([]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  /* 도장이 찍히는 도중에 창이 닫히면 남은 타이머가 onConfirm 을 부릅니다 */
  useEffect(
    () => () => {
      stampTimersRef.current.forEach((id) => window.clearTimeout(id));
      stampTimersRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    playConfidentialOpenDrone();
    /* 누르는 순간에 받아오면 첫 결재만 소리가 빠집니다 */
    preloadConfidentialStampSound();
  }, []);

  /** 결재를 한 번 받을 때마다 화면이 갈리므로 진입 연출을 다시 돌립니다 */
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setReady(true), reducedMotion ? 0 : 40);
    return () => window.clearTimeout(timer);
  }, [approved]);

  // CSS opacity 애니는 브라우저가 멈추는 경우가 있어, 클래스 토글로 깜빡임
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSealLit((prev) => !prev);
    }, 750);
    return () => window.clearInterval(id);
  }, []);

  const displayName = characterName.trim() || "이름 없는 기록";
  const caseCode = useMemo(() => toCaseCode(displayName), [displayName]);
  const copy = GATE_COPY[grade];
  const preset = clearancePresetOf(grade);

  /** 지금 받으려는 결재가 마지막 칸인가 */
  const isFinal = approved === steps - 1;
  const docSuffix = String(approved + 1).padStart(2, "0");

  const handleProceed = () => {
    if (!ready || stamping) return;

    const nextApproved = approved + 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 결재란의 이번 칸에 承認 이 내려찍힙니다.
       「쾅」 소리는 버튼을 누른 순간이 아니라 도장이 종이에 닿는 순간에 나야 합니다. */
    setStamping(true);
    setReady(false);
    setApproved(nextApproved);

    stampTimersRef.current.push(
      window.setTimeout(playConfidentialStampThud, reducedMotion ? 0 : STAMP_CONTACT_MS),
      window.setTimeout(
        () => {
          if (nextApproved >= steps) {
            onConfirm();
            return;
          }
          /* 아직 칸이 남았으면 다음 결재 화면으로 넘깁니다 */
          setStamping(false);
        },
        reducedMotion ? 0 : STAMP_SETTLE_MS,
      ),
    );
  };

  return (
    /* theme-raw — overrides.css 의 performance mode 가 `main *` 전체의
       animation-duration 을 0.001ms 로 못박아 둡니다. 그 규칙들의 탈출구가
       이 클래스라, 안 붙이면 도장이 찍히는 연출이 첫 프레임에 끝나 버립니다. */
    <div
      className={cn("confidential-gate theme-raw", className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confidential-gate-title"
      aria-describedby="confidential-gate-message"
      onClick={() => onCancel()}
    >
      <article
        className={cn(
          "confidential-gate-panel",
          `confidential-gate-panel--${preset.tone}`,
          ready && "is-ready",
          isFinal && "is-final",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {/* 위험 띠 — 왼쪽에서 오른쪽으로 훑고 지나갑니다 */}
        <span className="confidential-gate-tape paper-ink" aria-hidden="true" />

        {/* 결재란 — 등급이 요구하는 만큼 칸이 서고, 누를 때마다 한 칸씩 채워집니다 */}
        <span className="confidential-gate-approvals" aria-hidden="true">
          {Array.from({ length: steps }, (_, index) => {
            const isApproved = index < approved;
            /* 방금 찍힌 칸에만 내려찍는 연출을 겁니다 — 앞 칸은 이미 말라 있습니다 */
            const isFresh = isApproved && index === approved - 1 && stamping;

            return (
              <span
                key={APPROVAL_ORDER[index]}
                className={cn(
                  "confidential-gate-approval",
                  isApproved && "is-approved",
                  index === approved && "is-current",
                )}
              >
                <span className="confidential-gate-approval-key">{APPROVAL_ORDER[index]}</span>

                {isApproved ? (
                  <span
                    className={cn(
                      "confidential-gate-stamp confidential-gate-stamp--approved",
                      isFresh && "is-fresh",
                    )}
                  >
                    <span className="confidential-gate-stamp-main">承認</span>
                    <span className="confidential-gate-stamp-rule paper-ink" />
                    <span className="confidential-gate-stamp-sub">{preset.stampMain}</span>
                    {/* 닿는 순간 밖으로 퍼지는 충격 테 */}
                    {isFresh ? <span className="confidential-gate-stamp-hit" /> : null}
                  </span>
                ) : (
                  <span className="confidential-gate-stamp confidential-gate-stamp--pending">
                    <span className="confidential-gate-stamp-main">未決</span>
                    <span className="confidential-gate-stamp-rule paper-ink" />
                    <span className="confidential-gate-stamp-sub">未処理</span>
                  </span>
                )}
              </span>
            );
          })}
        </span>

        <header className="confidential-gate-head">
          <h2 id="confidential-gate-title" className="confidential-gate-head-jp">
            {isFinal && steps === 2 ? "最終確認" : copy.headJp}
          </h2>
          <p className="confidential-gate-eyebrow">
            {isFinal && steps === 2 ? "取消不能 · 記録抹消不可" : copy.eyebrow}
          </p>
        </header>

        <div className="confidential-gate-subject">
          <span className="confidential-gate-subject-key" aria-hidden="true">
            件名
          </span>
          <p className="confidential-gate-doc-name">{displayName}</p>
        </div>

        {isFinal && steps === 2 ? (
          <>
            {/* 一次 결재가 끝난 신청서 — 서식은 한 줄로 접고, 남은 자리를 마지막 문장에 내줍니다 */}
            <p className="confidential-gate-strip">
              <span className="confidential-gate-strip-key" aria-hidden="true">
                受付
              </span>
              <span className="confidential-gate-strip-value">
                第{caseCode}号 – {docSuffix}
              </span>
              <span className="confidential-gate-strip-state">
                {approved >= steps ? "열람 승인" : "二次 결재 대기"}
              </span>
            </p>

            {/* 마지막 문장 — 상자를 두르지 않습니다. 괘선 사이에 문장만 남는 쪽이
                같은 말이라도 훨씬 무겁게 읽힙니다. */}
            <div className="confidential-gate-final" id="confidential-gate-message">
              <p className="confidential-gate-final-jp" aria-hidden="true">
                {copy.finalJp}
              </p>
              <p className="confidential-gate-final-text">
                {copy.finalText[0]}
                <br />
                {copy.finalText[1]}
              </p>
            </div>
          </>
        ) : (
          <>
            <dl className="confidential-gate-meta">
              <div className="confidential-gate-meta-row">
                <dt>
                  <span className="confidential-gate-meta-jp" aria-hidden="true">
                    文書番号
                  </span>
                  문서번호
                </dt>
                <dd>
                  第{caseCode}号 – {docSuffix}
                </dd>
              </div>
              <div className="confidential-gate-meta-row">
                <dt>
                  <span className="confidential-gate-meta-jp" aria-hidden="true">
                    分類
                  </span>
                  분류
                </dt>
                <dd>{copy.classText}</dd>
              </div>
              <div className="confidential-gate-meta-row">
                <dt>
                  <span className="confidential-gate-meta-jp" aria-hidden="true">
                    決裁
                  </span>
                  결재
                </dt>
                <dd>{steps === 2 ? "二次 결재 필요" : "一次 결재 필요"} · 第壹書庫</dd>
              </div>
            </dl>

            <div className="confidential-gate-message" id="confidential-gate-message">
              <span className="confidential-gate-message-mark" aria-hidden="true">
                注意
              </span>
              <p>
                {copy.notice[0]}
                <br />
                {copy.notice[1]}
              </p>
            </div>
          </>
        )}

        {/* 지금 이 순간이 기록되고 있다는 표시 */}
        <p className="confidential-gate-log" aria-hidden="true">
          <span className={cn("confidential-gate-log-led", sealLit && "is-lit")} />
          <span className="confidential-gate-log-jp">記録中</span>
          열람 기록 보존
        </p>

        <div className="confidential-gate-actions">
          <button
            type="button"
            className="confidential-gate-retreat"
            disabled={stamping}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="confidential-gate-breach"
            disabled={!ready || stamping}
            onClick={handleProceed}
          >
            {stamping ? "承認" : steps === 2 && approved === 0 ? "一次 결재" : "결재"}
          </button>
        </div>
      </article>
    </div>
  );
}
