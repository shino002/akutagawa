"use client";

import { type FormEvent } from "react";
import type { User } from "firebase/auth";
import { cn } from "@/utils/cn";
import type { GuestbookEntry } from "@/lib/types";

type GuestDraft = {
  name: string;
  body: string;
};

interface GuestSectionProps {
  guestbook: GuestbookEntry[];
  guestDraft: GuestDraft;
  onDraftChange: (next: GuestDraft) => void;
  authUser: User | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  className?: string;
}

export function GuestSection({
  guestbook,
  guestDraft,
  onDraftChange,
  authUser,
  onSubmit,
  className,
}: GuestSectionProps) {
  return (
    <section className={cn("glass-card p-6 md:p-8", className)}>
      <h3 className="board-title">방명록</h3>
      <form
        onSubmit={onSubmit}
        className="mt-5 grid gap-3 rounded-3xl border border-emerald-100/10 bg-black/20 p-4"
      >
        <input
          value={guestDraft.name}
          onChange={(event) => onDraftChange({ ...guestDraft, name: event.target.value })}
          placeholder="이름 (비우면 익명)"
          disabled={!authUser}
          className="rounded-2xl border border-emerald-100/10 bg-emerald-950/50 px-4 py-3 text-sm outline-none placeholder:text-emerald-100/35"
        />
        <textarea
          value={guestDraft.body}
          onChange={(event) => onDraftChange({ ...guestDraft, body: event.target.value })}
          placeholder={
            authUser ? "남기고 싶은 말을 적어주세요." : "로그인 후 방명록을 남길 수 있어요."
          }
          disabled={!authUser}
          className="min-h-24 rounded-2xl border border-emerald-100/10 bg-emerald-950/50 px-4 py-3 text-sm leading-7 outline-none placeholder:text-emerald-100/35"
        />
        {!authUser && (
          <p className="text-xs text-red-100/70">방명록 작성은 로그인 후 가능합니다.</p>
        )}
        <button
          disabled={!authUser}
          className="justify-self-end rounded-full bg-emerald-200 px-5 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50"
        >
          남기기
        </button>
      </form>
      <div className="mt-6 space-y-4">
        {guestbook.map((guest, index) => (
          <article
            key={guest.id}
            className="rounded-3xl border border-emerald-100/10 bg-emerald-950/30 p-5"
          >
            <p className="font-semibold">
              No.{guestbook.length - index} {guest.name}
            </p>
            <p className="mt-3 text-sm leading-7 text-emerald-50/75">{guest.body}</p>
            {guest.reply && (
              <div className="mt-4 rounded-2xl bg-emerald-100/10 p-4 text-sm text-emerald-50/70">
                답글: {guest.reply}
              </div>
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
  );
}
