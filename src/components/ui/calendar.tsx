"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface CalendarProps {
  selectedDate: string;
  onChange: (dateStr: string) => void;
  className?: string;
  maxDate?: string;
  minDate?: string;
  weekStartsOn?: string;
}

const getDayIndex = (dayName?: string) => {
  switch (dayName?.toLowerCase()) {
    case "sunday": return 0;
    case "monday": return 1;
    case "tuesday": return 2;
    case "wednesday": return 3;
    case "thursday": return 4;
    case "friday": return 5;
    case "saturday": return 6;
    default: return 0;
  }
};

export default function Calendar({
  selectedDate,
  onChange,
  className = "",
  maxDate,
  minDate,
  weekStartsOn,
}: CalendarProps) {
  const W = getDayIndex(weekStartsOn);
  const [currentDate, setCurrentDate] = useState(() => {
    return selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() - W + 7) % 7;
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] =
    [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTodayClick = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (maxDate && todayStr > maxDate) return;
    if (minDate && todayStr < minDate) return;
    setCurrentDate(today);
    onChange(todayStr);
  };

  return (
    <div
      className={`absolute right-0 mt-2 bg-white border border-black/10 rounded-3xl shadow-xl p-5 z-50 w-72 animate-scale-in ${className}`}
    >
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-full hover:bg-black hover:text-white text-black transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={month}
              onChange={(e) =>
                setCurrentDate(new Date(year, parseInt(e.target.value), 1))
              }
              className="appearance-none text-xs font-bold text-zinc-850 bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 rounded-xl pl-3 pr-6 py-1 focus:outline-none cursor-pointer transition-all min-w-[88px] h-7.5"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(2000, i, 1);
                const mName = d.toLocaleString("default", { month: "short" });
                return (
                  <option key={i} value={i} className="font-semibold text-zinc-800">
                    {mName}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-450 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={(e) =>
                setCurrentDate(new Date(parseInt(e.target.value), month, 1))
              }
              className="appearance-none text-xs font-bold text-zinc-850 bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 rounded-xl pl-3 pr-6 py-1 focus:outline-none cursor-pointer transition-all min-w-[78px] h-7.5"
            >
              {Array.from({ length: 110 }, (_, i) => {
                const yVal = new Date().getFullYear() - 85 + i;
                return (
                  <option key={yVal} value={yVal} className="font-semibold text-zinc-800">
                    {yVal}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-450 pointer-events-none" />
          </div>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-full hover:bg-black hover:text-white text-black transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {(() => {
          const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
          const headers = [...DAYS_OF_WEEK.slice(W), ...DAYS_OF_WEEK.slice(0, W)];
          return headers.map((day) => (
            <span
              key={day}
              className="text-[10px] font-bold text-black/40 uppercase"
            >
              {day}
            </span>
          ));
        })()}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((cell, idx) => {
          const isSelected = cell.dateStr === selectedDate;
          const isDisabled =
            !!((maxDate && cell.dateStr > maxDate) ||
            (minDate && cell.dateStr < minDate));
          return (
            <button
              key={`${cell.dateStr}-${idx}`}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(cell.dateStr)}
              className={`py-1.5 text-xs rounded-full transition-all font-bold ${
                isDisabled
                  ? "text-black/10 opacity-30 cursor-not-allowed pointer-events-none"
                  : isSelected
                    ? "bg-black text-white font-extrabold cursor-pointer"
                    : cell.isCurrentMonth
                      ? "text-black hover:bg-black hover:text-white cursor-pointer"
                      : "text-black/20 hover:bg-black/5 hover:text-black cursor-pointer"
              }`}
            >
              {cell.dayNum}
            </button>
          );
        })}
      </div>

      <div className="border-t border-black/10 mt-3.5 pt-3">
        <button
          type="button"
          disabled={
            !!((maxDate && new Date().toISOString().split("T")[0] > maxDate) ||
            (minDate && new Date().toISOString().split("T")[0] < minDate))
          }
          onClick={handleTodayClick}
          className={`w-full text-center text-xs font-bold bg-white rounded-2xl py-2 transition-colors border border-black/10 ${
            (maxDate && new Date().toISOString().split("T")[0] > maxDate) ||
            (minDate && new Date().toISOString().split("T")[0] < minDate)
              ? "text-black/20 cursor-not-allowed opacity-50"
              : "text-black hover:bg-black hover:text-white cursor-pointer"
          }`}
        >
          Today
        </button>
      </div>
    </div>
  );
}
