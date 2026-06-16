"use client";

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { cn } from "@/utils/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarDay = {
  date: Dayjs;
  dayLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

/**
 * 캘린더 위젯이 보여줄 월(月) 상태와 해당 월의 6주(42칸) 그리드를 관리합니다.
 * 위젯에서만 쓰이는 단일 책임 훅이라 같은 파일에 둡니다.
 */
const useCalendar = () => {
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>(() => dayjs().startOf("month"));

  const calendarDays = useMemo<CalendarDay[]>(() => {
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

  return { calendarMonth, setCalendarMonth, calendarDays };
};

interface CalendarWidgetProps {
  className?: string;
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  const { calendarMonth, setCalendarMonth, calendarDays } = useCalendar();

  return (
    <section className={cn("glass-card p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-red-100/55 uppercase">Calendar</p>
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
            className="game-menu-button h-8 px-3 text-[10px] font-semibold tracking-[0.12em] uppercase"
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
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="border-b border-red-600/20 py-2 text-red-100/60">
            {weekday}
          </div>
        ))}
        {calendarDays.map((day) => (
          <div
            key={day.date.format("YYYY-MM-DD")}
            className={`min-h-10 border-r border-b border-red-600/10 p-1.5 ${
              day.isCurrentMonth ? "text-emerald-50/78" : "text-emerald-100/22"
            } ${day.isToday ? "bg-red-700/35 text-red-50" : ""}`}
          >
            <span className="inline-grid size-6 place-items-center">{day.dayLabel}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-emerald-100/50">오늘 날짜는 붉게 표시됩니다.</p>
    </section>
  );
}
