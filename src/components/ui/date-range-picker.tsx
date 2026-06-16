"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  className?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return startDate ? new Date(startDate + "T00:00:00") : new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
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

  const handleDateClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: dateStr, endDate: "" });
    } else {
      if (dateStr < startDate) {
        onChange({ startDate: dateStr, endDate: "" });
      } else {
        onChange({ startDate, endDate: dateStr });
      }
    }
  };

  const isDateInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const rangeText = () => {
    if (startDate && endDate) {
      return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    } else if (startDate) {
      return `${formatDateDisplay(startDate)} - Select end date`;
    }
    return "Select date range";
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: "", endDate: "" });
  };

  return (
    <div
      className={`relative inline-block w-full ${className}`}
      ref={containerRef}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between border border-zinc-200 rounded-xl bg-white px-3.5 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all cursor-pointer text-xs font-bold text-zinc-805 h-[42px]"
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
          <span className="truncate">{rangeText()}</span>
        </div>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white border border-zinc-200 rounded-3xl shadow-xl p-5 z-50 w-72 animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span
                key={day}
                className="text-[10px] font-bold text-zinc-400 uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((cell, idx) => {
              const isStart = cell.dateStr === startDate;
              const isEnd = cell.dateStr === endDate;
              const inRange = isDateInRange(cell.dateStr);
              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleDateClick(cell.dateStr)}
                  className={`py-1.5 text-xs rounded-full transition-all cursor-pointer font-bold ${
                    isStart || isEnd
                      ? "bg-zinc-950 text-white font-extrabold"
                      : inRange
                        ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                        : cell.isCurrentMonth
                          ? "text-zinc-900 hover:bg-zinc-100"
                          : "text-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
