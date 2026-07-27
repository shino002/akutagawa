"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { playConfidentialOpenDrone } from "@/lib/confidential-warning-sound";

interface ConfidentialAccessModalProps {
  characterName: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

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
 * 기밀 자캐 진입 전 열람 경고 (secret-document-modal-v5 기반).
 * 1차 → 열람 → 2차 최종 경고 → 확인 시 onConfirm.
 */
export function ConfidentialAccessModal({
  characterName,
  onConfirm,
  onCancel,
  className,
}: ConfidentialAccessModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [ready, setReady] = useState(false);
  const [sealLit, setSealLit] = useState(true);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    playConfidentialOpenDrone();
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setReady(true), reducedMotion ? 0 : 40);
    return () => window.clearTimeout(timer);
  }, [step]);

  // CSS opacity 애니는 브라우저가 멈추는 경우가 있어, 클래스 토글로 깜빡임
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSealLit((prev) => !prev);
    }, 750);
    return () => window.clearInterval(id);
  }, []);

  const displayName = characterName.trim() || "이름 없는 기록";
  const isFinal = step === 2;
  const caseCode = useMemo(() => toCaseCode(displayName), [displayName]);

  const handleProceed = () => {
    if (!ready) return;
    if (step === 1) {
      setReady(false);
      setStep(2);
      return;
    }
    onConfirm();
  };

  return (
    <div
      className={cn("confidential-gate", className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confidential-gate-title"
      aria-describedby="confidential-gate-message"
      onClick={() => onCancel()}
    >
      <article
        className={cn("confidential-gate-panel", ready && "is-ready", isFinal && "is-final")}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="confidential-gate-drip-wrap confidential-gate-drip-wrap-a"
          aria-hidden="true"
        >
          <span className="confidential-gate-drip" />
          <span className="confidential-gate-stain" />
        </div>
        <div
          className="confidential-gate-drip-wrap confidential-gate-drip-wrap-b"
          aria-hidden="true"
        >
          <span className="confidential-gate-drip confidential-gate-drip-delayed" />
          <span className="confidential-gate-stain confidential-gate-stain-delayed" />
        </div>

        <div className="confidential-gate-seal" aria-hidden="true">
          <span className={cn("confidential-gate-seal-mark", sealLit && "is-visible")}>!</span>
        </div>

        <h2 id="confidential-gate-title" className="confidential-gate-eyebrow">
          {isFinal ? "FINAL WARNING" : "CONFIDENTIAL FILE"}
        </h2>

        <p className="confidential-gate-doc-name">{displayName}</p>

        <dl className="confidential-gate-meta">
          <div className="confidential-gate-meta-row">
            <dt>문서번호</dt>
            <dd>
              DOC·{caseCode}–{isFinal ? "02" : "01"}
            </dd>
          </div>
          <div className="confidential-gate-meta-row">
            <dt>분류</dt>
            <dd>기밀</dd>
          </div>
          <div className="confidential-gate-meta-row">
            <dt>상태</dt>
            <dd>열람 제한</dd>
          </div>
        </dl>

        <div className="confidential-gate-message" id="confidential-gate-message">
          {isFinal ? (
            <p>되돌릴 수 없습니다.</p>
          ) : (
            <p>
              열람 이후 발생하는 모든 결과에 대해
              <br />
              어떠한 책임도 지지 않습니다.
            </p>
          )}
        </div>

        <div className="confidential-gate-actions">
          <button type="button" className="confidential-gate-retreat" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="confidential-gate-breach"
            disabled={!ready}
            onClick={handleProceed}
          >
            {isFinal ? "확인" : "열람"}
          </button>
        </div>
      </article>
    </div>
  );
}
