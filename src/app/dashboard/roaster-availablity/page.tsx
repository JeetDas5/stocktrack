"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Send,
  Info,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { useAvailabilityStore } from "@/store/availability-store";
import { getAvailability } from "@/lib/repositories/availability.repository";
import { AvailabilityDay, AvailabilitySlot } from "@/types/availability";

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDateYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateRange = (start: Date, end: Date) => {
  const opt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-GB", opt)} - ${end.toLocaleDateString("en-GB", opt)}`;
};

const getDeadline = (start: Date) => {
  const deadline = new Date(start);
  deadline.setDate(start.getDate() - 1);
  const opt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return `Sunday, ${deadline.toLocaleDateString("en-GB", opt)} at 10:00 PM`;
};

const generateTimeOptions = () => {
  const times: string[] = [];
  const periods = ["AM", "PM"];
  for (let p = 0; p < 2; p++) {
    for (let h = 0; h < 12; h++) {
      const hour = h === 0 ? 12 : h;
      const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
      times.push(`${hourStr}:00 ${periods[p]}`);
      times.push(`${hourStr}:30 ${periods[p]}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

const calculateDuration = (from: string, to: string) => {
  const parseTime = (t: string) => {
    const [time, period] = t.split(" ");
    const parts = time.split(":").map(Number);
    let hours = parts[0];
    const minutes = parts[1];
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  try {
    const startMins = parseTime(from);
    const endMins = parseTime(to);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return { hrs, mins, totalMins: diff };
  } catch {
    return { hrs: 0, mins: 0, totalMins: 0 };
  }
};

const formatDuration = (hrs: number, mins: number) => {
  return `${hrs}h ${mins < 10 ? `0${mins}` : mins}m`;
};

const formatDayName = (date: Date) => {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
};

const formatDateShort = (date: Date) => {
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month}`;
};

export default function AvailabilityEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { submission, loading, fetchAvailability, saveAvailability } =
    useAvailabilityStore();

  const [periodType, setPeriodType] = useState<"weekly" | "fortnightly">(
    "weekly",
  );
  const [currentStartDate, setCurrentStartDate] = useState<Date>(
    getMonday(new Date()),
  );
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [generalNote, setGeneralNote] = useState<string>("");

  const endDate = new Date(currentStartDate);
  endDate.setDate(
    currentStartDate.getDate() + (periodType === "weekly" ? 6 : 13),
  );

  useEffect(() => {
    if (activeBusinessId) {
      fetchLocations(activeBusinessId);
    }
  }, [activeBusinessId, fetchLocations]);

  useEffect(() => {
    if (activeBusinessId && currentStartDate) {
      const startStr = formatDateYYYYMMDD(currentStartDate);
      fetchAvailability(activeBusinessId, startStr);
    }
  }, [activeBusinessId, currentStartDate, periodType, fetchAvailability]);

  const getDatesInPeriod = (start: Date, type: "weekly" | "fortnightly") => {
    const dates: Date[] = [];
    const daysCount = type === "weekly" ? 7 : 14;
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  useEffect(() => {
    const dates = getDatesInPeriod(currentStartDate, periodType);
    const startStr = formatDateYYYYMMDD(currentStartDate);

    if (
      submission &&
      submission.startDate === startStr &&
      submission.periodType === periodType
    ) {
      const newDays = dates.map((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        const existingDay = submission.days.find((d) => d.date === dateStr);
        if (existingDay) {
          return {
            date: dateStr,
            isAvailable: existingDay.isAvailable,
            slots: existingDay.slots.map((s) => ({
              id: s.id,
              timeFrom: s.timeFrom,
              timeTo: s.timeTo,
              locationId: s.locationId,
              note: s.note,
            })),
          };
        }
        return {
          date: dateStr,
          isAvailable: true,
          slots: [{ timeFrom: "09:00 AM", timeTo: "05:00 PM" }],
        };
      });
      Promise.resolve().then(() => {
        setDays(newDays);
        setGeneralNote(submission.generalNote || "");
      });
    } else {
      const defaultDays = dates.map((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return {
          date: dateStr,
          isAvailable: !isWeekend,
          slots: isWeekend
            ? []
            : [{ timeFrom: "09:00 AM", timeTo: "05:00 PM" }],
        };
      });
      Promise.resolve().then(() => {
        setDays(defaultDays);
        setGeneralNote("");
      });
    }
  }, [submission, currentStartDate, periodType]);

  const handlePeriodChange = (type: "weekly" | "fortnightly") => {
    setPeriodType(type);
  };

  const handlePrevPeriod = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(
      currentStartDate.getDate() - (periodType === "weekly" ? 7 : 14),
    );
    setCurrentStartDate(newStart);
  };

  const handleNextPeriod = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(
      currentStartDate.getDate() + (periodType === "weekly" ? 7 : 14),
    );
    setCurrentStartDate(newStart);
  };

  const handleToday = () => {
    setCurrentStartDate(getMonday(new Date()));
  };

  const handleToggleDay = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((d, idx) => {
        if (idx === dayIndex) {
          const toggled = !d.isAvailable;
          return {
            ...d,
            isAvailable: toggled,
            slots: toggled
              ? [{ timeFrom: "09:00 AM", timeTo: "05:00 PM" }]
              : [],
          };
        }
        return d;
      }),
    );
  };

  const handleAddSlot = (dayIndex: number) => {
    setDays((prev) =>
      prev.map((d, idx) => {
        if (idx === dayIndex) {
          const lastSlot = d.slots[d.slots.length - 1];
          const defaultSlot = lastSlot
            ? { ...lastSlot, id: undefined }
            : { timeFrom: "09:00 AM", timeTo: "05:00 PM" };
          return {
            ...d,
            isAvailable: true,
            slots: [...d.slots, defaultSlot],
          };
        }
        return d;
      }),
    );
  };

  const handleUpdateSlot = (
    dayIndex: number,
    slotIndex: number,
    fields: Partial<AvailabilitySlot>,
  ) => {
    setDays((prev) =>
      prev.map((d, dIdx) => {
        if (dIdx === dayIndex) {
          return {
            ...d,
            slots: d.slots.map((s, sIdx) =>
              sIdx === slotIndex ? { ...s, ...fields } : s,
            ),
          };
        }
        return d;
      }),
    );
  };

  const handleDeleteSlot = (dayIndex: number, slotIndex: number) => {
    setDays((prev) =>
      prev.map((d, dIdx) => {
        if (dIdx === dayIndex) {
          const updatedSlots = d.slots.filter((_, sIdx) => sIdx !== slotIndex);
          return {
            ...d,
            isAvailable: updatedSlots.length > 0,
            slots: updatedSlots,
          };
        }
        return d;
      }),
    );
  };

  const handleClearAll = () => {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        isAvailable: false,
        slots: [],
      })),
    );
    setGeneralNote("");
  };

  const handleCopyPreviousWeek = async () => {
    if (!activeBusinessId) return;
    const prevStart = new Date(currentStartDate);
    prevStart.setDate(
      currentStartDate.getDate() - (periodType === "weekly" ? 7 : 14),
    );
    const prevStartStr = formatDateYYYYMMDD(prevStart);

    try {
      const prevSubmission = await getAvailability(
        activeBusinessId,
        prevStartStr,
      );
      if (!prevSubmission) {
        toast.error("No availability found for the previous period.");
        return;
      }

      const currentDates = getDatesInPeriod(currentStartDate, periodType);
      const newDays = currentDates.map((date, idx) => {
        const dateStr = formatDateYYYYMMDD(date);
        const prevDay = prevSubmission.days[idx];
        if (prevDay) {
          return {
            date: dateStr,
            isAvailable: prevDay.isAvailable,
            slots: prevDay.slots.map((s) => ({
              timeFrom: s.timeFrom,
              timeTo: s.timeTo,
              locationId: s.locationId,
              note: s.note,
            })),
          };
        }
        return {
          date: dateStr,
          isAvailable: true,
          slots: [{ timeFrom: "09:00 AM", timeTo: "05:00 PM" }],
        };
      });

      setDays(newDays);
      if (prevSubmission.generalNote) {
        setGeneralNote(prevSubmission.generalNote);
      }
      toast.success("Availability copied from the previous period.");
    } catch {
      toast.error("Failed to copy previous week's availability.");
    }
  };

  const handleSubmit = async () => {
    if (!activeBusinessId) {
      toast.error("No active business selected.");
      return;
    }

    const startStr = formatDateYYYYMMDD(currentStartDate);
    const endStr = formatDateYYYYMMDD(endDate);

    const submissionData = {
      startDate: startStr,
      endDate: endStr,
      periodType,
      generalNote,
      days,
    };

    try {
      await saveAvailability(activeBusinessId, submissionData);
      toast.success("Availability submitted successfully!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to submit availability.");
    }
  };

  const totalMinutes = days.reduce((acc, d) => {
    if (!d.isAvailable) return acc;
    return (
      acc +
      d.slots.reduce((sAcc, s) => {
        const duration = calculateDuration(s.timeFrom, s.timeTo);
        return sAcc + duration.totalMins;
      }, 0)
    );
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMinsLeft = totalMinutes % 60;
  const availableDaysCount = days.filter(
    (d) => d.isAvailable && d.slots.length > 0,
  ).length;

  return (
    <div className="max-w-(screen-2xl) mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#16A34A] uppercase tracking-wider">
            <span>Roster</span>
            <span>/</span>
            <span>Availability Entry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 mt-1">
            Availability Entry
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
            Submit your availability for the selected period.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyPreviousWeek}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-extrabold text-zinc-700 hover:text-zinc-900 transition duration-200 cursor-pointer shadow-xs bg-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Copy Previous Week</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-zinc-100/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("weekly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      periodType === "weekly"
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodChange("fortnightly")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      periodType === "fortnightly"
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Fortnightly
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPeriod}
                    className="p-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 text-zinc-600" />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-950">
                    <Calendar className="h-4 w-4 text-[#16A34A]" />
                    <span>{formatDateRange(currentStartDate, endDate)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextPeriod}
                    className="p-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-xs font-extrabold text-zinc-700 transition duration-200 cursor-pointer shadow-2xs"
              >
                Today
              </button>
            </div>

            <div className="flex items-start gap-3 bg-[#EFF6FF] border border-[#BFDBFE] p-4 rounded-xl text-blue-900">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-extrabold block">
                  Availability deadline:
                </span>
                <span className="mt-0.5 block font-medium">
                  {getDeadline(currentStartDate)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <div className="min-w-[768px]">
                <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-200 text-xs font-extrabold text-[#64748B] uppercase tracking-wider bg-zinc-50/50">
                  <div className="w-14">Day</div>
                  <div className="w-20">Date</div>
                  <div className="w-24">Availability</div>
                  <div className="w-32">Time From</div>
                  <div className="w-32">Time To</div>
                  <div className="w-44">Preferred Location</div>
                  <div className="flex-1">Note (Optional)</div>
                  <div className="w-12 text-center">Actions</div>
                </div>

                <div className="divide-y divide-zinc-200">
                  {days.map((dayData, dIdx) => {
                    const dateObj = new Date(dayData.date);
                    const dayName = formatDayName(dateObj);
                    const formattedDateStr = formatDateShort(dateObj);

                    return (
                      <div
                        key={dayData.date}
                        className={`flex flex-col md:flex-row md:items-start gap-4 px-4 py-4 ${
                          dayData.isAvailable ? "bg-white" : "bg-zinc-50/40"
                        }`}
                      >
                        <div className="flex items-center gap-4 shrink-0 md:pt-2">
                          <div className="w-14 font-extrabold text-zinc-900">
                            {dayName}
                          </div>
                          <div className="w-20 text-zinc-500 font-medium text-xs">
                            {formattedDateStr}
                          </div>
                          <div className="w-24">
                            <button
                              type="button"
                              onClick={() => handleToggleDay(dIdx)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                dayData.isAvailable
                                  ? "bg-[#16A34A]"
                                  : "bg-zinc-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  dayData.isAvailable
                                    ? "translate-x-5"
                                    : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          {dayData.isAvailable && dayData.slots.length > 0 ? (
                            <div className="space-y-2">
                              {dayData.slots.map((slot, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center gap-4 w-full"
                                >
                                  <div className="w-32">
                                    <select
                                      value={slot.timeFrom}
                                      onChange={(e) =>
                                        handleUpdateSlot(dIdx, sIdx, {
                                          timeFrom: e.target.value,
                                        })
                                      }
                                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
                                    >
                                      {timeOptions.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="w-32">
                                    <select
                                      value={slot.timeTo}
                                      onChange={(e) =>
                                        handleUpdateSlot(dIdx, sIdx, {
                                          timeTo: e.target.value,
                                        })
                                      }
                                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
                                    >
                                      {timeOptions.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="w-44">
                                    <select
                                      value={slot.locationId || ""}
                                      onChange={(e) =>
                                        handleUpdateSlot(dIdx, sIdx, {
                                          locationId:
                                            e.target.value || undefined,
                                        })
                                      }
                                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
                                    >
                                      <option value="">Any Location</option>
                                      {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                          {loc.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={slot.note || ""}
                                      onChange={(e) =>
                                        handleUpdateSlot(dIdx, sIdx, {
                                          note: e.target.value,
                                        })
                                      }
                                      placeholder="Add note..."
                                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:border-[#16A34A] focus:outline-hidden"
                                    />
                                  </div>

                                  <div className="w-12 flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteSlot(dIdx, sIdx)
                                      }
                                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddSlot(dIdx)}
                                className="flex items-center gap-1.5 text-[#16A34A] hover:text-[#15803d] text-xs font-extrabold hover:underline cursor-pointer transition-all mt-1 pl-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Time Slot</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 w-full opacity-60">
                              <div className="w-32">
                                <div className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400 text-center">
                                  -
                                </div>
                              </div>
                              <div className="w-32">
                                <div className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400 text-center">
                                  -
                                </div>
                              </div>
                              <div className="w-44">
                                <div className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400">
                                  Any Location
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-400">
                                  Not available
                                </div>
                              </div>
                              <div className="w-12 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleAddSlot(dIdx)}
                                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                                >
                                  <Plus className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label
                htmlFor="general-note"
                className="block text-xs font-extrabold text-zinc-700"
              >
                General Note (Optional)
              </label>
              <textarea
                id="general-note"
                rows={3}
                maxLength={250}
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="Add any general notes about your availability, preferences or restrictions..."
                className="w-full border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:border-[#16A34A] focus:outline-hidden"
              />
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                <span>Maximum 250 characters.</span>
                <span>{generalNote.length} / 250 characters</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-extrabold text-zinc-700 transition duration-200 cursor-pointer shadow-2xs bg-white"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803d] disabled:bg-[#16A34A]/55 text-white rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer shadow-md"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? "Submitting..." : "Submit Availability"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6 shrink-0">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-6 shadow-xs space-y-6">
            <h2 className="text-sm font-extrabold text-zinc-950 border-b border-zinc-100 pb-3">
              Availability Summary
            </h2>

            <div className="bg-[#F0FDF4] border border-[#DCFCE7] p-4 rounded-xl flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#DCFCE7] border border-[#16A34A]/25 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-5 w-5 text-[#16A34A]" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-zinc-950 block">
                  {availableDaysCount} of {days.length} Days
                </span>
                <span className="text-zinc-500 font-semibold mt-0.5 block">
                  You are available
                </span>
                <span className="text-zinc-700 font-extrabold mt-1 block">
                  Total availability:{" "}
                  {formatDuration(totalHours, totalMinsLeft)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {days
                .filter((d) => d.isAvailable && d.slots.length > 0)
                .map((dayData) => {
                  const dateObj = new Date(dayData.date);
                  const dayName = formatDayName(dateObj);
                  const formattedDateStr = formatDateShort(dateObj);

                  const dayTotalMins = dayData.slots.reduce((acc, s) => {
                    const dur = calculateDuration(s.timeFrom, s.timeTo);
                    return acc + dur.totalMins;
                  }, 0);
                  const dayTotalHours = Math.floor(dayTotalMins / 60);
                  const dayTotalMinsLeft = dayTotalMins % 60;

                  return (
                    <div key={dayData.date} className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-extrabold text-zinc-950">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                        <span>
                          {dayName}, {formattedDateStr}
                        </span>
                      </div>

                      <div className="space-y-1 pl-3.5 border-l border-zinc-100">
                        {dayData.slots.map((slot, sIdx) => {
                          const duration = calculateDuration(
                            slot.timeFrom,
                            slot.timeTo,
                          );
                          return (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between text-[11px] font-semibold text-zinc-500"
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-zinc-400" />
                                <span>
                                  {slot.timeFrom} - {slot.timeTo}
                                </span>
                              </div>
                              <span className="font-bold text-zinc-700">
                                {formatDuration(duration.hrs, duration.mins)}
                              </span>
                            </div>
                          );
                        })}

                        {dayData.slots.length > 1 && (
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#16A34A] pt-1 border-t border-zinc-50 mt-1">
                            <span>Total</span>
                            <span>
                              {formatDuration(dayTotalHours, dayTotalMinsLeft)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-4 rounded-xl flex items-start gap-2.5 text-blue-900">
              <AlertCircle className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] font-semibold">
                <span className="font-extrabold block">Tip</span>
                <span className="mt-0.5 block leading-normal">
                  Use the &quot;Copy Previous Week&quot; button to save time if
                  your availability is similar to last week.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
