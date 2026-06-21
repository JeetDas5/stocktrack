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
  triggerClassName?: string;
  focusClassName?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = "",
  triggerClassName = "",
  focusClassName = "focus:ring-[#16A34A]/20 focus:border-[#16A34A]",
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
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const thisWeekStart = new Date(today.getFullYear(), today.getMonth(), diff);
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekEnd = new Date(thisWeekStart);
      thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
      thisWeekEnd.setHours(23, 59, 59, 999);

      const pad = (n: number) => String(n).padStart(2, "0");
      const thisWeekStartStr = `${thisWeekStart.getFullYear()}-${pad(thisWeekStart.getMonth() + 1)}-${pad(thisWeekStart.getDate())}`;
      const thisWeekEndStr = `${thisWeekEnd.getFullYear()}-${pad(thisWeekEnd.getMonth() + 1)}-${pad(thisWeekEnd.getDate())}`;

      if (startDate === thisWeekStartStr && endDate === thisWeekEndStr) {
        return "This week";
      }

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      const lastWeekStartStr = `${lastWeekStart.getFullYear()}-${pad(lastWeekStart.getMonth() + 1)}-${pad(lastWeekStart.getDate())}`;
      const lastWeekEndStr = `${lastWeekEnd.getFullYear()}-${pad(lastWeekEnd.getMonth() + 1)}-${pad(lastWeekEnd.getDate())}`;

      if (startDate === lastWeekStartStr && endDate === lastWeekEndStr) {
        return "Last week";
      }

      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      const nextWeekStartStr = `${nextWeekStart.getFullYear()}-${pad(nextWeekStart.getMonth() + 1)}-${pad(nextWeekStart.getDate())}`;
      const nextWeekEndStr = `${nextWeekEnd.getFullYear()}-${pad(nextWeekEnd.getMonth() + 1)}-${pad(nextWeekEnd.getDate())}`;

      if (startDate === nextWeekStartStr && endDate === nextWeekEndStr) {
        return "Next week";
      }

      const formatDateStr = (dStr: string) => {
        const parts = dStr.split("-");
        if (parts.length !== 3) return dStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };
      return `${formatDateStr(startDate)} - ${formatDateStr(endDate)}`;
    } else if (startDate) {
      return `${formatDateDisplay(startDate)} - Select end date`;
    }
    return "Select date range";
  };

  const handlePrevWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!startDate || !endDate) return;
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    onChange({
      startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    });
  };

  const handleNextWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!startDate || !endDate) return;
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    onChange({
      startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    });
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
        className={`flex items-center justify-between border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none transition-all cursor-pointer text-xs font-semibold text-neutral-950 h-10 ${triggerClassName || "rounded-xl"} ${focusClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden truncate mr-1">
          <CalendarIcon className="h-4 w-4 text-neutral-400 shrink-0" />
          <span className="truncate">{rangeText()}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {startDate && endDate && (
            <div className="flex items-center gap-0.5 border-l border-neutral-200 pl-1.5 mr-0.5">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 rounded-md hover:bg-neutral-50 text-neutral-450 hover:text-neutral-900 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1 rounded-md hover:bg-neutral-50 text-neutral-450 hover:text-neutral-900 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-neutral-50 text-neutral-455 hover:text-neutral-900 transition-colors shrink-0"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl p-5 z-50 w-72 animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-neutral-55 text-neutral-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-neutral-55 text-neutral-600 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span
                key={day}
                className="text-[10px] font-bold text-neutral-400 uppercase"
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
                      ? "bg-neutral-900 text-white font-extrabold"
                      : inRange
                        ? "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                        : cell.isCurrentMonth
                          ? "text-neutral-900 hover:bg-neutral-105"
                          : "text-neutral-300 hover:bg-neutral-50"
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
