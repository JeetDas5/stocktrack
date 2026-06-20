/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Loader2,
  Copy,
  Search,
} from "lucide-react";

import { Staff } from "@/types/staff";
import Calendar from "@/components/ui/calendar";
import { useAuth } from "@/providers/auth-provider";
import TimePicker from "@/components/ui/time-picker";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getStaffMembers } from "@/lib/repositories/staff.repository";
import {
  getTimesheets,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
} from "@/lib/repositories/timesheet.repository";
import { Timesheet } from "@/types/timesheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROJECT_OPTIONS = [
  "Inventory Check",
  "Customer Service",
  "Bar Operations",
  "Weekend Service",
  "Events Setup",
  "Kitchen Help",
  "General Operations",
  "Other",
];

interface WeekRowState {
  dayName: string;
  dateStr: string;
  displayDate: string;
  startTime: string;
  endTime: string;
  unpaidBreak: string;
  project: string;
  notes: string;
  dbTimesheetId: string | null;
  isFuture: boolean;
  status: string;
}

export default function TimesheetEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const { profile, loading: authLoading } = useAuth();

  const isStaff = profile?.role === "staff";

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [weekRows, setWeekRows] = useState<WeekRowState[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [openTimePicker, setOpenTimePicker] = useState<{
    dayIndex: number;
    type: "start" | "end";
  } | null>(null);

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const isFutureDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr + "T00:00:00");
    return date.getTime() > today.getTime();
  };

  const getWeekDays = (mondayDate: Date) => {
    const days = [];
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dayName = daysOfWeek[i];
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const date = d.getDate().toString().padStart(2, "0");
      const dateStr = `${year}-${month}-${date}`;
      days.push({
        dayName,
        dateStr,
        displayDate: `${date}/${month}/${year}`,
      });
    }
    return days;
  };

  const formatWeekRange = (monday: Date) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const formatDate = (d: Date) => {
      const day = d.getDate();
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };
    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  };

  useEffect(() => {
    if (profile) {
      if (profile.role === "staff") {
        setStaffId(profile.uid);
        setLoadingContext(false);
      }
    }
  }, [profile]);

  useEffect(() => {
    const currentBusinessId = activeBusinessId;
    if (!currentBusinessId || isStaff) {
      setStaffList([]);
      if (isStaff) setLoadingContext(false);
      return;
    }

    async function loadStaffList() {
      try {
        setLoadingContext(true);
        const sList = await getStaffMembers(currentBusinessId!);
        setStaffList(sList);

        if (sList.length > 0) {
          setStaffId(sList[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load staff list.");
      } finally {
        setLoadingContext(false);
      }
    }
    loadStaffList();
  }, [activeBusinessId, isStaff]);

  const loadTimesheets = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const data = await getTimesheets(activeBusinessId);
      setTimesheets(data);
    } catch (err) {
      console.error("Failed to fetch timesheets:", err);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  const staffTimesheets = useMemo(() => {
    return timesheets.filter((ts) => ts.staffId === staffId);
  }, [timesheets, staffId]);

  useEffect(() => {
    if (!currentWeekStart || !staffId) return;

    const days = getWeekDays(currentWeekStart);
    const rows = days.map((day) => {
      const existing = staffTimesheets.find(
        (ts) => ts.workDate === day.dateStr,
      );
      const isFuture = isFutureDate(day.dateStr);

      return {
        dayName: day.dayName,
        dateStr: day.dateStr,
        displayDate: day.displayDate,
        startTime: existing?.startTime || "",
        endTime: existing?.endTime || "",
        unpaidBreak: existing ? existing.unpaidBreak.toString() : "30",
        project: existing?.project || "",
        notes: existing?.notes || "",
        dbTimesheetId: existing?.id || null,
        isFuture,
        status: existing?.status || "",
      };
    });

    setWeekRows(rows);
  }, [currentWeekStart, staffId, timesheets]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setIsCalendarOpen(false);
      }

      if (openTimePicker) {
        const cell = document.getElementById(
          `timecell-${openTimePicker.dayIndex}-${openTimePicker.type}`,
        );
        if (cell && !cell.contains(target)) {
          setOpenTimePicker(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openTimePicker]);

  const selectedStaffName = useMemo(() => {
    if (isStaff && profile) {
      return profile.fullName;
    }
    return staffList.find((s) => s.id === staffId)?.name || "";
  }, [isStaff, profile, staffList, staffId]);

  const filteredStaffList = useMemo(() => {
    if (isStaff) return [];
    return staffList.filter((s) => {
      if (s.businessId !== activeBusinessId) return false;
      if (!activeLocationId) return true;
      return s.locations?.some((loc) => loc.id === activeLocationId);
    });
  }, [staffList, activeBusinessId, activeLocationId, isStaff]);

  const calculateRowHours = (
    start: string,
    end: string,
    breakMinsStr: string,
  ) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let diffMins = endH * 60 + endM - (startH * 60 + startM);
    if (diffMins < 0) {
      diffMins += 24 * 60;
    }
    const breakMins = parseInt(breakMinsStr, 10) || 0;
    const netMins = Math.max(0, diffMins - breakMins);
    return netMins / 60;
  };

  const totalWeeklyHours = useMemo(() => {
    return weekRows.reduce((sum, row) => {
      return (
        sum + calculateRowHours(row.startTime, row.endTime, row.unpaidBreak)
      );
    }, 0);
  }, [weekRows]);

  const filteredWeekRows = useMemo(() => {
    const rowsWithIndex = weekRows.map((row, index) => ({ row, index }));
    if (!searchQuery.trim()) return rowsWithIndex;
    const query = searchQuery.toLowerCase();
    return rowsWithIndex.filter(
      ({ row }) =>
        row.dayName.toLowerCase().includes(query) ||
        row.project.toLowerCase().includes(query) ||
        row.notes.toLowerCase().includes(query),
    );
  }, [weekRows, searchQuery]);

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr} ${ampm}`;
  };

  const isStandardProject = (project: string) => {
    return !project || PROJECT_OPTIONS.includes(project);
  };

  const handleTimeChange = (
    dayIndex: number,
    type: "start" | "end",
    value: string,
  ) => {
    setWeekRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== dayIndex) return row;
        return {
          ...row,
          startTime: type === "start" ? value : row.startTime,
          endTime: type === "end" ? value : row.endTime,
        };
      }),
    );
  };

  const handleBreakChange = (dayIndex: number, value: string) => {
    setWeekRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== dayIndex) return row;
        return { ...row, unpaidBreak: value };
      }),
    );
  };

  const handleProjectSelect = (dayIndex: number, option: string) => {
    setWeekRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== dayIndex) return row;
        return {
          ...row,
          project: option === "Other" ? "Custom Project" : option,
        };
      }),
    );
  };

  const handleNotesChange = (dayIndex: number, value: string) => {
    setWeekRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== dayIndex) return row;
        return { ...row, notes: value };
      }),
    );
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const handleCalendarChange = (dateStr: string) => {
    const selectedDate = new Date(dateStr + "T00:00:00");
    const monday = getMonday(selectedDate);
    setCurrentWeekStart(monday);
    setIsCalendarOpen(false);
  };

  const handleCopyPreviousWeek = () => {
    if (!currentWeekStart) return;

    const prevMonday = new Date(currentWeekStart);
    prevMonday.setDate(currentWeekStart.getDate() - 7);

    const prevDays = getWeekDays(prevMonday);
    let copiedCount = 0;

    const newRows = weekRows.map((row, idx) => {
      if (row.isFuture || row.dbTimesheetId || row.status === "approved") {
        return row;
      }

      const prevDayDateStr = prevDays[idx].dateStr;
      const prevTimesheet = timesheets.find(
        (ts) => ts.staffId === staffId && ts.workDate === prevDayDateStr,
      );

      if (prevTimesheet) {
        copiedCount++;
        return {
          ...row,
          startTime: prevTimesheet.startTime,
          endTime: prevTimesheet.endTime,
          unpaidBreak: prevTimesheet.unpaidBreak.toString(),
          project: prevTimesheet.project || "",
          notes: prevTimesheet.notes || "",
        };
      }
      return row;
    });

    if (copiedCount > 0) {
      setWeekRows(newRows);
      toast.success(
        `Copied ${copiedCount} timesheet entries from the previous week!`,
      );
    } else {
      toast.error("No timesheet entries found in the previous week to copy.");
    }
  };

  const handleClearAll = () => {
    const newRows = weekRows.map((row) => {
      if (row.isFuture || row.status === "approved") {
        return row;
      }
      return {
        ...row,
        startTime: "",
        endTime: "",
        unpaidBreak: "30",
        project: "",
        notes: "",
      };
    });
    setWeekRows(newRows);
    toast.success("Form cleared for all editable days.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBusinessId) {
      toast.error("Active business not found. Please select a business.");
      return;
    }
    if (!activeLocationId) {
      toast.error("Active location not found. Please select a location.");
      return;
    }
    if (!staffId) {
      toast.error("Please select a staff member.");
      return;
    }

    setSubmitting(true);

    try {
      const promises = weekRows.map((row) => {
        if (row.isFuture || row.status === "approved") {
          return Promise.resolve();
        }

        const hasTimeSet = row.startTime && row.endTime;

        if (hasTimeSet) {
          if (row.startTime > row.endTime) {
            throw new Error(
              `On ${row.dayName} (${row.displayDate}), Start Time cannot be after End Time.`,
            );
          }
          if (row.startTime === row.endTime) {
            throw new Error(
              `On ${row.dayName} (${row.displayDate}), Start and End times cannot be identical.`,
            );
          }

          const payload = {
            locationId: activeLocationId,
            staffId,
            workDate: row.dateStr,
            startTime: row.startTime,
            endTime: row.endTime,
            unpaidBreak: parseInt(row.unpaidBreak, 10) || 0,
            project: row.project.trim() || undefined,
            notes: row.notes.trim() || undefined,
            status: "submitted",
          };

          if (row.dbTimesheetId) {
            const original = timesheets.find(
              (ts) => ts.id === row.dbTimesheetId,
            );
            const changed =
              original?.startTime !== row.startTime ||
              original?.endTime !== row.endTime ||
              original?.unpaidBreak !== (parseInt(row.unpaidBreak, 10) || 0) ||
              (original?.project || "") !== row.project.trim() ||
              (original?.notes || "") !== row.notes.trim();

            if (changed) {
              return updateTimesheet(
                activeBusinessId,
                row.dbTimesheetId,
                payload,
              );
            }
          } else {
            return createTimesheet(activeBusinessId, payload);
          }
        } else {
          if (row.dbTimesheetId) {
            return deleteTimesheet(activeBusinessId, row.dbTimesheetId);
          }
        }

        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success("Timesheets submitted successfully!");
      await loadTimesheets();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to submit timesheets.");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-neutral-100 text-neutral-700 border-neutral-200",
      "bg-neutral-50 text-neutral-800 border-neutral-200",
    ];
    return colors[hash % colors.length];
  };

  if (authLoading || loadingContext) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-black">
        <Loader2 className="h-7 w-7 text-black animate-spin mb-3" />
        <span className="text-black/50 text-xs font-bold uppercase tracking-wider">
          Syncing weekly planner...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-120px)] md:h-[85vh] min-h-0 relative select-none">
      <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">
        <div className="bg-white border border-black/10 rounded-2xl py-4 px-5 md:py-5 md:px-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl md:text-2xl font-extrabold text-black tracking-tight">
            Enter Timesheet
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 border border-black/10 bg-white px-3.5 py-2 rounded-full text-black font-extrabold text-xs">
              Total Hours This week: {totalWeeklyHours.toFixed(1)}
            </div>

            <button
              type="button"
              onClick={handleCopyPreviousWeek}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-black hover:bg-white hover:text-black border border-black/10 text-white px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Previous Week
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Timesheet"
              className="w-full bg-white border border-black/10 focus:border-black/20 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-black placeholder-black/50 focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
            {!isStaff && (
              <div className="w-full sm:w-56">
                <Select
                  value={staffId}
                  onValueChange={setStaffId}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full h-10 rounded-2xl border border-black/10 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition cursor-pointer font-bold text-xs text-black hover:bg-black/5">
                    {staffId ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center font-extrabold text-[9px] border border-black/10 bg-white text-black">
                          {getInitials(selectedStaffName)}
                        </div>
                        <span className="truncate">{selectedStaffName}</span>
                      </div>
                    ) : (
                      <span className="text-black/50 font-normal">
                        Select Staff Member
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-black/10 bg-white p-1 max-h-56">
                    {filteredStaffList.map((staff) => (
                      <SelectItem
                        value={staff.id}
                        key={staff.id}
                        className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-black hover:text-white text-black cursor-pointer flex items-center gap-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center font-extrabold text-[9px] border border-black/10 bg-white text-black">
                            {getInitials(staff.name)}
                          </div>
                          <span>{staff.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredStaffList.length === 0 && (
                      <div className="p-3 text-center text-xs text-black/50 font-bold">
                        No staff members found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div
              className="flex items-center gap-1.5 w-full sm:w-auto justify-end"
              ref={calendarRef}
            >
              <button
                type="button"
                onClick={handlePrevWeek}
                disabled={submitting}
                className="p-2 rounded-2xl border border-black/10 hover:bg-black hover:text-white transition cursor-pointer disabled:opacity-50 text-black shrink-0 h-10 w-10 flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                disabled={submitting}
                className="flex items-center gap-2 px-3.5 py-2 border border-black/10 rounded-2xl bg-white hover:bg-black hover:text-white transition font-bold text-xs text-black cursor-pointer justify-center w-full sm:w-52 h-10"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="truncate">
                  {formatWeekRange(currentWeekStart)}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNextWeek}
                disabled={submitting}
                className="p-2 rounded-2xl border border-black/10 hover:bg-black hover:text-white transition cursor-pointer disabled:opacity-50 text-black shrink-0 h-10 w-10 flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {isCalendarOpen && (
                <div className="relative">
                  <Calendar
                    selectedDate={currentWeekStart.toISOString().split("T")[0]}
                    onChange={handleCalendarChange}
                    className="right-0 left-auto top-2.5 shadow-2xl border-black/10"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 flex flex-col space-y-4"
        >
          <div className="bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-black/10 text-[12px] font-extrabold uppercase tracking-wider text-black bg-white sticky top-0 z-10 text-center">
                    <th className="py-4 px-6 font-extrabold">Day</th>
                    <th className="py-4 px-6 font-extrabold">Date</th>
                    <th className="py-4 px-3 font-extrabold">Start Time</th>
                    <th className="py-4 px-3 font-extrabold">End Time</th>
                    <th className="py-4 px-3 font-extrabold">
                      Unpaid Break (Mins)
                    </th>
                    <th className="py-4 px-3 font-extrabold">Total Hours</th>
                    <th className="py-4 px-3 font-extrabold">Project</th>
                    <th className="py-4 px-3 font-extrabold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 text-xs text-black bg-white">
                  {filteredWeekRows.map(({ row, index: idx }) => {
                    const isApproved = row.status === "approved";
                    const isRejected = row.status === "rejected";
                    const hours = calculateRowHours(
                      row.startTime,
                      row.endTime,
                      row.unpaidBreak,
                    );

                    return (
                      <tr
                        key={row.dateStr}
                        className={`hover:bg-black/5 transition-colors text-center ${
                          row.isFuture
                            ? "opacity-45 select-none bg-black/2"
                            : ""
                        }`}
                      >
                        <td className="py-4 px-6 font-bold text-black text-center">
                          {row.dayName}
                        </td>

                        <td className="py-4 px-6 text-black text-center">
                          {row.displayDate}
                        </td>

                        <td
                          className="py-4 px-3 text-center"
                          id={`timecell-${idx}-start`}
                        >
                          <div className="relative">
                            {row.isFuture || isApproved ? (
                              <div className="flex items-center justify-center w-full border border-black/10 rounded-lg bg-black/3 px-2.5 py-1.5 font-bold text-xs text-black/50 h-9">
                                {row.startTime
                                  ? formatTimeToAMPM(row.startTime)
                                  : "—"}
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() =>
                                    setOpenTimePicker({
                                      dayIndex: idx,
                                      type: "start",
                                    })
                                  }
                                  className="flex items-center justify-between gap-2 w-full border border-black/10 rounded-lg bg-white px-2.5 py-1.5 text-left focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition hover:bg-black hover:text-white group cursor-pointer font-bold text-xs text-black h-9 disabled:opacity-50"
                                >
                                  <span>
                                    {row.startTime
                                      ? formatTimeToAMPM(row.startTime)
                                      : "—"}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-black/40 group-hover:text-white shrink-0" />
                                </button>

                                {openTimePicker?.dayIndex === idx &&
                                  openTimePicker?.type === "start" && (
                                    <TimePicker
                                      value={row.startTime}
                                      onChange={(val) => {
                                        handleTimeChange(idx, "start", val);
                                        setOpenTimePicker(null);
                                      }}
                                      className="left-0 right-auto shadow-2xl border-black/10"
                                    />
                                  )}
                              </>
                            )}
                          </div>
                        </td>

                        <td
                          className="py-4 px-3 text-center"
                          id={`timecell-${idx}-end`}
                        >
                          <div className="relative">
                            {row.isFuture || isApproved ? (
                              <div className="flex items-center justify-center w-full border border-black/10 rounded-lg bg-black/3 px-2.5 py-1.5 font-bold text-xs text-black/50 h-9">
                                {row.endTime
                                  ? formatTimeToAMPM(row.endTime)
                                  : "—"}
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() =>
                                    setOpenTimePicker({
                                      dayIndex: idx,
                                      type: "end",
                                    })
                                  }
                                  className="flex items-center justify-between gap-2 w-full border border-black/10 rounded-lg bg-white px-2.5 py-1.5 text-left focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition hover:bg-black hover:text-white group cursor-pointer font-bold text-xs text-black h-9 disabled:opacity-50"
                                >
                                  <span>
                                    {row.endTime
                                      ? formatTimeToAMPM(row.endTime)
                                      : "—"}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-black/40 group-hover:text-white shrink-0" />
                                </button>

                                {openTimePicker?.dayIndex === idx &&
                                  openTimePicker?.type === "end" && (
                                    <TimePicker
                                      value={row.endTime}
                                      onChange={(val) => {
                                        handleTimeChange(idx, "end", val);
                                        setOpenTimePicker(null);
                                      }}
                                      className="left-0 right-auto shadow-2xl border-black/10"
                                    />
                                  )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Unpaid Break */}
                        <td className="py-4 px-3 text-center">
                          {row.isFuture || isApproved ? (
                            <div className="w-full border border-black/10 rounded-lg bg-black/[0.03] px-2 py-1.5 text-center font-bold text-xs text-black/50 h-9 flex items-center justify-center">
                              {row.unpaidBreak}
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="5"
                              disabled={
                                submitting || (!row.startTime && !row.endTime)
                              }
                              value={row.unpaidBreak}
                              onChange={(e) =>
                                handleBreakChange(idx, e.target.value)
                              }
                              className="w-full border border-black/10 rounded-lg bg-white px-2 py-1.5 text-center focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition disabled:opacity-50 disabled:bg-black/[0.02] disabled:cursor-not-allowed font-bold text-xs text-black h-9"
                            />
                          )}
                        </td>

                        {/* Total Hours */}
                        <td className="py-4 px-3 text-center">
                          <span className="text-xs font-extrabold text-black">
                            {hours > 0 ? hours.toFixed(2) : "0.00"}
                          </span>
                        </td>

                        <td
                          className="py-4 px-3 text-center"
                          id={`projectcell-${idx}`}
                        >
                          <div className="relative">
                            {row.isFuture || isApproved ? (
                              <div className="w-full border border-black/10 rounded-lg bg-black/3 px-2.5 py-1.5 font-bold text-xs text-black/50 h-9 flex items-center justify-center truncate">
                                {row.project || "—"}
                              </div>
                            ) : (
                              <>
                                {isStandardProject(row.project) ? (
                                  <Select
                                    value={row.project || ""}
                                    onValueChange={(val) =>
                                      handleProjectSelect(idx, val)
                                    }
                                    disabled={
                                      submitting ||
                                      (!row.startTime && !row.endTime)
                                    }
                                  >
                                    <SelectTrigger className="flex items-center justify-between gap-1.5 w-full border border-black/10 rounded-lg bg-white px-2.5 py-1.5 text-left focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs text-black h-9 cursor-pointer">
                                      <SelectValue placeholder="Select Project" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-black/10 bg-white p-1 max-h-56 z-50">
                                      {PROJECT_OPTIONS.map((opt) => (
                                        <SelectItem
                                          value={opt}
                                          key={opt}
                                          className="rounded-lg px-3 py-2 text-xs font-bold hover:bg-black hover:text-white text-black cursor-pointer"
                                        >
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="relative flex items-center">
                                    <input
                                      type="text"
                                      disabled={submitting}
                                      value={row.project}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setWeekRows((prev) =>
                                          prev.map((r, i) =>
                                            i === idx
                                              ? { ...r, project: val }
                                              : r,
                                          ),
                                        );
                                      }}
                                      placeholder="Project Name..."
                                      className="w-full border border-black/10 rounded-lg bg-white pl-2.5 pr-7 py-1.5 text-xs font-bold text-black focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition h-9"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWeekRows((prev) =>
                                          prev.map((r, i) =>
                                            i === idx
                                              ? { ...r, project: "" }
                                              : r,
                                          ),
                                        );
                                      }}
                                      className="absolute right-2.5 text-black hover:opacity-70 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-4 px-4 text-center">
                          {row.isFuture || isApproved ? (
                            <div className="w-full border border-black/10 rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-left font-bold text-xs text-black/50 h-9 flex items-center truncate">
                              {row.notes || "—"}
                            </div>
                          ) : (
                            <input
                              type="text"
                              disabled={
                                submitting || (!row.startTime && !row.endTime)
                              }
                              value={row.notes}
                              onChange={(e) =>
                                handleNotesChange(idx, e.target.value)
                              }
                              placeholder="Add Notes..."
                              className="w-full border border-black/10 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-black placeholder-black/40 focus:outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10 transition disabled:opacity-50 disabled:cursor-not-allowed h-9"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons at the bottom */}
          <div className="flex items-center justify-between pt-2 pb-4 bg-white">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-white text-black px-5 py-2.5 rounded-full text-xs font-bold border border-black/10 hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <X className="h-4 w-4" />
              Clear All
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wide hover:bg-white hover:text-black border border-black/10 transition-all hover:gap-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Timesheet
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
