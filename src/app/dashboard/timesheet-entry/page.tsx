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
import { cn } from "@/lib/utils";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Business } from "@/types/business";

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
  isDayOff: boolean;
}
export default function TimesheetEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, activeLocationId } = useLocationStore();
  const { profile, loading: authLoading } = useAuth();

  const isStaff = profile?.role === "staff";

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [weekRows, setWeekRows] = useState<WeekRowState[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [expandedDayIdx, setExpandedDayIdx] = useState<number | null>(0);

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

  const isCurrentWeek = (monday: Date) => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(today.setDate(diff));
    currentMonday.setHours(0, 0, 0, 0);
    return monday.getTime() === currentMonday.getTime();
  };

  const formatWeekRangeShort = (monday: Date) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const formatD = (d: Date) => {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`;
    };
    return `${formatD(monday)} - ${formatD(sunday)}`;
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

  const formatLastSavedTime = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year} ${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  }, []);

  const loadTimesheets = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      const data = await getTimesheets(activeBusinessId);
      setTimesheets(data);
      if (data && data.length > 0) {
        let latestDate = 0;
        data.forEach((ts) => {
          const t = ts.updatedAt ? new Date(ts.updatedAt).getTime() : (ts.createdAt ? new Date(ts.createdAt).getTime() : 0);
          if (t > latestDate) latestDate = t;
        });
        if (latestDate > 0) {
          setLastSavedTime(formatLastSavedTime(new Date(latestDate).toISOString()));
        }
      }
    } catch (err) {
      console.error("Failed to fetch timesheets:", err);
    }
  }, [activeBusinessId, formatLastSavedTime]);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const list = await getUserBusinesses();
        setBusinesses(list);
      } catch (err) {
        console.error("Failed to load businesses:", err);
      }
    }
    loadBusinesses();
  }, []);

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
      const isDayOff = existing ? (existing.startTime === "00:00" && existing.endTime === "00:00") : false;

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
        isDayOff,
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

  const handleDayOffChange = (dayIndex: number, checked: boolean) => {
    setWeekRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== dayIndex) return row;
        if (checked) {
          return {
            ...row,
            isDayOff: true,
            startTime: "00:00",
            endTime: "00:00",
            unpaidBreak: "0",
            project: "",
            notes: "",
          };
        } else {
          return {
            ...row,
            isDayOff: false,
            startTime: "",
            endTime: "",
            unpaidBreak: "30",
            project: "",
            notes: "",
          };
        }
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
        const isDayOff = prevTimesheet.startTime === "00:00" && prevTimesheet.endTime === "00:00";
        return {
          ...row,
          startTime: prevTimesheet.startTime,
          endTime: prevTimesheet.endTime,
          unpaidBreak: prevTimesheet.unpaidBreak.toString(),
          project: prevTimesheet.project || "",
          notes: prevTimesheet.notes || "",
          isDayOff,
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
        isDayOff: false,
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
          if (!row.isDayOff) {
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
      setLastSavedTime(formatLastSavedTime(new Date().toISOString()));
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

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);
  const activeBusinessName = activeBusiness ? activeBusiness.name : "Pizza Hut";

  const activeLocation = locations.find((l) => l.id === activeLocationId);
  const activeLocationName = activeLocation ? activeLocation.name : "Airport";

  return (
    <div className="select-none bg-white min-h-0 flex flex-col w-full">
      {/* Desktop View */}
      <div className="hidden md:flex flex-col bg-white h-[calc(100vh-120px)] md:h-[85vh] min-h-0 relative pb-4">
        <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">
          <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
              Enter Timesheet
            </h1>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center bg-[#BAEBCE] text-[#0A2924] font-semibold px-4.5 py-2.5 rounded-full text-xs">
                Total Hours This week: {totalWeeklyHours.toFixed(1)}
              </div>

              <button
                type="button"
                onClick={handleCopyPreviousWeek}
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Previous Week
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search Timesheet"
                className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none transition shadow-2xs h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto relative">
              {!isStaff && (
                <div className="w-full sm:w-56">
                  <Select
                    value={staffId}
                    onValueChange={setStaffId}
                    disabled={submitting}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50 flex items-center justify-between">
                      {staffId ? (
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[9px] border border-neutral-200 bg-neutral-50 text-neutral-700">
                            {getInitials(selectedStaffName)}
                          </div>
                          <span className="truncate">{selectedStaffName}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 font-normal">
                          Select Staff Member
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56">
                      {filteredStaffList.map((staff) => (
                        <SelectItem
                          value={staff.id}
                          key={staff.id}
                          className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer flex items-center gap-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[9px] border border-neutral-200 bg-neutral-50 text-neutral-700">
                              {getInitials(staff.name)}
                            </div>
                            <span>{staff.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredStaffList.length === 0 && (
                        <div className="p-3 text-center text-xs text-neutral-400 font-semibold">
                          No staff members found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div
                className="relative w-full sm:w-auto flex justify-end"
                ref={calendarRef}
              >
                <div className="flex items-center border border-neutral-200 rounded-xl bg-white h-10 px-3 select-none hover:bg-neutral-50/50 cursor-pointer transition-colors shadow-2xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    disabled={submitting}
                    className="flex items-center gap-2 text-neutral-700 hover:text-neutral-900 transition-colors font-semibold text-xs mr-3 cursor-pointer"
                  >
                    <CalendarIcon className="h-4 w-4 text-neutral-400" />
                    <span className="truncate">
                      {isCurrentWeek(currentWeekStart)
                        ? "This week"
                        : formatWeekRangeShort(currentWeekStart)}
                    </span>
                  </button>
                  <div className="w-px h-4 bg-neutral-200 mr-2" />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevWeek}
                      disabled={submitting}
                      className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextWeek}
                      disabled={submitting}
                      className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isCalendarOpen && (
                  <div className="absolute right-0 top-11 z-50 animate-scale-in">
                    <Calendar
                      selectedDate={currentWeekStart.toISOString().split("T")[0]}
                      onChange={handleCalendarChange}
                      className="shadow-xl border border-neutral-200 rounded-2xl bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 flex flex-col space-y-6"
          >
            {/* Table Container Card */}
            <div className="bg-white border border-neutral-200 rounded-3xl shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 bg-white sticky top-0 z-10 text-center">
                      <th className="py-4 px-6 text-left font-semibold">Day</th>
                      <th className="py-4 px-6 text-left font-semibold">Date</th>
                      <th className="py-4 px-3 text-center font-semibold text-xs min-w-[75px]">
                        Day Off
                      </th>
                      <th className="py-4 px-3 text-center font-semibold">
                        Start Time
                      </th>
                      <th className="py-4 px-3 text-center font-semibold">
                        End Time
                      </th>
                      <th className="py-4 px-3 text-center font-semibold">
                        Unpaid Break (Mins)
                      </th>
                      <th className="py-4 px-3 text-center font-semibold">
                        Total Hours
                      </th>
                      <th className="py-4 px-3 text-left font-semibold">
                        Project
                      </th>
                      <th className="py-4 px-3 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800 bg-white">
                    {filteredWeekRows.map(({ row, index: idx }) => {
                      const isApproved = row.status === "approved";
                      const hours = calculateRowHours(
                        row.startTime,
                        row.endTime,
                        row.unpaidBreak,
                      );

                      return (
                        <tr
                          key={row.dateStr}
                          className={cn(
                            "hover:bg-neutral-50/50 transition-colors text-center",
                            row.isFuture &&
                              "opacity-45 select-none bg-neutral-50/20",
                          )}
                        >
                          <td className="py-4 px-6 font-semibold text-neutral-900 text-left">
                            {row.dayName}
                          </td>

                          <td className="py-4 px-6 text-neutral-600 text-left">
                            {row.displayDate}
                          </td>

                          <td className="py-4 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={row.isFuture || isApproved || submitting}
                              checked={row.isDayOff || false}
                              onChange={(e) => handleDayOffChange(idx, e.target.checked)}
                              className="h-4 w-4 rounded border-neutral-300 text-[#0A2924] focus:ring-[#0A2924] cursor-pointer disabled:opacity-50"
                            />
                          </td>

                          <td
                            className="py-4 px-3 text-center"
                            id={`timecell-${idx}-start`}
                          >
                            <div className="relative">
                              {row.isFuture || isApproved || row.isDayOff ? (
                                <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
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
                                    className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                  >
                                    <span>
                                      {row.startTime
                                        ? formatTimeToAMPM(row.startTime)
                                        : "—"}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 transition-colors" />
                                  </button>

                                  {openTimePicker?.dayIndex === idx &&
                                    openTimePicker?.type === "start" && (
                                      <TimePicker
                                        value={row.startTime}
                                        onChange={(val, source) => {
                                          handleTimeChange(idx, "start", val);
                                          if (source === "period") {
                                            setOpenTimePicker(null);
                                          }
                                        }}
                                        className="left-0 right-auto shadow-2xl border border-neutral-200 rounded-2xl"
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
                              {row.isFuture || isApproved || row.isDayOff ? (
                                <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
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
                                    className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                  >
                                    <span>
                                      {row.endTime
                                        ? formatTimeToAMPM(row.endTime)
                                        : "—"}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 transition-colors" />
                                  </button>

                                  {openTimePicker?.dayIndex === idx &&
                                    openTimePicker?.type === "end" && (
                                      <TimePicker
                                        value={row.endTime}
                                        onChange={(val, source) => {
                                          handleTimeChange(idx, "end", val);
                                          if (source === "period") {
                                            setOpenTimePicker(null);
                                          }
                                        }}
                                        className="left-0 right-auto shadow-2xl border border-neutral-200 rounded-2xl"
                                      />
                                    )}
                                </>
                              )}
                            </div>
                          </td>

                          {/* Unpaid Break with spinner */}
                          <td className="py-4 px-3 text-center">
                            {row.isFuture || isApproved || row.isDayOff ? (
                              <div className="w-20 mx-auto border border-neutral-200/60 rounded-xl bg-neutral-100 px-2 py-2 text-center font-medium text-[13px] text-neutral-400 h-10 flex items-center justify-center">
                                {row.unpaidBreak}
                              </div>
                            ) : (
                              <div className="relative w-24 mx-auto">
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
                                  className="w-full border border-neutral-200 rounded-xl bg-white pl-3 pr-8 py-2 text-center focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed font-medium text-[13px] text-neutral-900 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pr-1.5">
                                  <button
                                    type="button"
                                    disabled={
                                      submitting ||
                                      (!row.startTime && !row.endTime)
                                    }
                                    onClick={() => {
                                      const currentVal =
                                        parseInt(row.unpaidBreak, 10) || 0;
                                      handleBreakChange(
                                        idx,
                                        (currentVal + 5).toString(),
                                      );
                                    }}
                                    className="text-neutral-400 hover:text-neutral-800 disabled:opacity-40 cursor-pointer"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      submitting ||
                                      (!row.startTime && !row.endTime)
                                    }
                                    onClick={() => {
                                      const currentVal =
                                        parseInt(row.unpaidBreak, 10) || 0;
                                      handleBreakChange(
                                        idx,
                                        Math.max(0, currentVal - 5).toString(),
                                      );
                                    }}
                                    className="text-neutral-400 hover:text-neutral-800 disabled:opacity-40 cursor-pointer"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Total Hours */}
                          <td className="py-4 px-3 text-center">
                            <span className="text-[14px] font-semibold text-neutral-900">
                              {hours > 0 ? hours.toFixed(1) : "0.0"}
                            </span>
                          </td>

                          <td
                            className="py-4 px-3 text-left"
                            id={`projectcell-${idx}`}
                          >
                            <div className="relative">
                              {row.isFuture || isApproved || row.isDayOff ? (
                                <div className="w-full font-semibold text-[13px] text-emerald-700/60 py-2 truncate">
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
                                      <SelectTrigger
                                        className={cn(
                                          "flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[13px] h-10 cursor-pointer",
                                          row.project
                                            ? "text-emerald-700"
                                            : "text-neutral-400 font-medium",
                                        )}
                                      >
                                        <SelectValue placeholder="Select Project" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                        {PROJECT_OPTIONS.map((opt) => (
                                          <SelectItem
                                            value={opt}
                                            key={opt}
                                            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
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
                                        className="w-full border border-neutral-200 rounded-xl bg-white pl-3 pr-8 py-2 text-[13px] font-semibold text-emerald-700 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition h-10 placeholder-neutral-400"
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
                                        className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer animate-fade-in"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-4 px-3 text-left">
                            {row.isFuture || isApproved || row.isDayOff ? (
                              <div className="w-full border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 py-2 text-left font-medium text-[13px] text-neutral-400 h-10 flex items-center truncate">
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
                                className="w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed h-10"
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

            <div className="flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={submitting}
                className="inline-flex items-center bg-white text-neutral-700 px-5 py-2 rounded-full text-[14px] font-semibold border border-neutral-200 hover:border-neutral-300 transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-xs animate-fade-in"
              >
                Clear All
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2 rounded-full text-[14px] font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-sm animate-fade-in"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <span>Submit Timesheet</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden bg-white p-1">
        <div className="bg-white border border-neutral-200 rounded-[28px] p-5 shadow-xs flex flex-col gap-4 mb-4">
          <h1 className="text-[24px] font-bold text-neutral-900 leading-tight">
            Enter Timesheet
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#BAEBCE] text-[#0A2924] font-semibold px-4 py-2.5 rounded-full text-xs text-center flex items-center justify-center">
              Total Hours: {totalWeeklyHours.toFixed(1).replace(".0", "")}
            </div>

            <button
              type="button"
              onClick={handleCopyPreviousWeek}
              disabled={submitting}
              className="flex-1 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-4 py-2.5 rounded-full text-xs font-semibold transition duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Previous Week
            </button>
          </div>
        </div>

        {/* Admin Staff Selector */}
        {!isStaff && (
          <div className="w-full mb-3">
            <Select
              value={staffId}
              onValueChange={setStaffId}
              disabled={submitting}
            >
              <SelectTrigger className="w-full h-11 rounded-full border border-neutral-200 bg-white px-4 py-2 text-left focus:outline-none focus:border-neutral-900 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50 flex items-center justify-between">
                {staffId ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[9px] border border-neutral-200 bg-neutral-50 text-neutral-700">
                      {getInitials(selectedStaffName)}
                    </div>
                    <span className="truncate">{selectedStaffName}</span>
                  </div>
                ) : (
                  <span className="text-neutral-400 font-normal">
                    Select Staff Member
                  </span>
                )}
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56">
                {filteredStaffList.map((staff) => (
                  <SelectItem
                    value={staff.id}
                    key={staff.id}
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[9px] border border-neutral-200 bg-neutral-50 text-neutral-700">
                        {getInitials(staff.name)}
                      </div>
                      <span>{staff.name}</span>
                    </div>
                  </SelectItem>
                ))}
                {filteredStaffList.length === 0 && (
                  <div className="p-3 text-center text-xs text-neutral-400 font-semibold">
                    No staff members found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-3 items-center justify-between relative">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Timesheet"
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-full py-2.5 pl-10 pr-4 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none transition shadow-2xs h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="relative flex-1 flex justify-end"
            ref={calendarRef}
          >
            <div className="flex items-center justify-between border border-neutral-200 rounded-full bg-white h-11 px-3 select-none hover:bg-neutral-50/50 cursor-pointer transition-colors shadow-2xs w-full">
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                disabled={submitting}
                className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 transition-colors font-semibold text-[11px] mr-1.5 cursor-pointer truncate flex-1"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">
                  {isCurrentWeek(currentWeekStart)
                    ? "This week"
                    : formatWeekRangeShort(currentWeekStart)}
                </span>
              </button>
              <div className="w-px h-4 bg-neutral-200 mr-1.5" />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  disabled={submitting}
                  className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  disabled={submitting}
                  className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isCalendarOpen && (
              <div className="absolute right-0 top-12 z-50 animate-scale-in">
                <Calendar
                  selectedDate={currentWeekStart.toISOString().split("T")[0]}
                  onChange={handleCalendarChange}
                  className="shadow-xl border border-neutral-200 rounded-2xl bg-white"
                />
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 mt-4">
          <div className="flex flex-col space-y-3">
            {filteredWeekRows.map(({ row, index: idx }) => {
              const isApproved = row.status === "approved";
              const hours = calculateRowHours(
                row.startTime,
                row.endTime,
                row.unpaidBreak,
              );
              const isExpanded = expandedDayIdx === idx;

              return (
                <div
                  key={row.dateStr}
                  className={cn(
                    "bg-white border border-neutral-200 rounded-[24px] shadow-sm transition-all overflow-hidden",
                    row.isFuture && "opacity-60 bg-neutral-50/20",
                  )}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer select-none"
                    onClick={() => setExpandedDayIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-neutral-100 text-neutral-600 font-bold px-2.5 py-1 rounded-lg text-xs leading-none">
                        {row.dayName}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-neutral-950 font-bold text-sm leading-tight">
                          {row.displayDate}
                        </span>
                        <span className="text-neutral-500 text-[11px] leading-tight mt-0.5 font-medium">
                          {row.project || `${activeBusinessName} | ${activeLocationName}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold text-sm">
                        {hours > 0 ? `${hours.toFixed(1)}h` : "0.0h"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-neutral-400 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div
                    className={cn(
                      "px-4 pb-5 border-t border-neutral-100 pt-4 bg-white",
                      isExpanded ? "block" : "hidden",
                    )}
                  >
                    {/* Mark as Day Off Toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-neutral-700 font-semibold text-xs">
                        Mark as Day Off
                      </span>
                      <button
                        type="button"
                        disabled={row.isFuture || isApproved || submitting}
                        onClick={() => handleDayOffChange(idx, !row.isDayOff)}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none",
                          row.isDayOff ? "bg-[#0A2924]" : "bg-neutral-200",
                          (row.isFuture || isApproved || submitting) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs",
                            row.isDayOff ? "translate-x-[22px]" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Business */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          Business
                        </label>
                        <div className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 h-10 flex items-center">
                          {activeBusinessName}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          Location
                        </label>
                        <div className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 h-10 flex items-center">
                          {activeLocationName}
                        </div>
                      </div>

                      {/* Start Time */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          Start Time
                        </label>
                        <div
                          className="relative"
                          id={`timecell-mobile-${idx}-start`}
                        >
                          {row.isFuture || isApproved || row.isDayOff ? (
                            <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
                              {row.startTime ? formatTimeToAMPM(row.startTime) : "—"}
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
                                className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                              >
                                <span>
                                  {row.startTime ? formatTimeToAMPM(row.startTime) : "—"}
                                </span>
                                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                              </button>

                              {openTimePicker?.dayIndex === idx &&
                                openTimePicker?.type === "start" && (
                                  <TimePicker
                                    value={row.startTime}
                                    onChange={(val, source) => {
                                      handleTimeChange(idx, "start", val);
                                      if (source === "period") {
                                        setOpenTimePicker(null);
                                      }
                                    }}
                                    className="left-0 right-auto shadow-2xl border border-neutral-200 rounded-2xl z-50"
                                  />
                                )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          End Time
                        </label>
                        <div
                          className="relative"
                          id={`timecell-mobile-${idx}-end`}
                        >
                          {row.isFuture || isApproved || row.isDayOff ? (
                            <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
                              {row.endTime ? formatTimeToAMPM(row.endTime) : "—"}
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
                                className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                              >
                                <span>
                                  {row.endTime ? formatTimeToAMPM(row.endTime) : "—"}
                                </span>
                                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                              </button>

                              {openTimePicker?.dayIndex === idx &&
                                openTimePicker?.type === "end" && (
                                  <TimePicker
                                    value={row.endTime}
                                    onChange={(val, source) => {
                                      handleTimeChange(idx, "end", val);
                                      if (source === "period") {
                                        setOpenTimePicker(null);
                                      }
                                    }}
                                    className="left-0 right-auto shadow-2xl border border-neutral-200 rounded-2xl z-50"
                                  />
                                )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unpaid Break */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          Unpaid Break (Mins)
                        </label>
                        {row.isFuture || isApproved || row.isDayOff ? (
                          <div className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-400 h-10 flex items-center justify-center">
                            {row.unpaidBreak}
                          </div>
                        ) : (
                          <Select
                            value={row.unpaidBreak}
                            onValueChange={(val) => handleBreakChange(idx, val)}
                            disabled={submitting || (!row.startTime && !row.endTime)}
                          >
                            <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-neutral-900 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50 flex items-center justify-between">
                              <SelectValue placeholder="Select Break" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                              {["0", "15", "30", "45", "60", "90", "120"].map((opt) => (
                                <SelectItem
                                  value={opt}
                                  key={opt}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-950 cursor-pointer flex items-center"
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Project */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                          Project
                        </label>
                        <div className="relative">
                          {row.isFuture || isApproved || row.isDayOff ? (
                            <div className="w-full font-semibold text-xs text-emerald-700/60 py-2 truncate bg-neutral-50 px-3 border border-neutral-100 rounded-xl h-10 flex items-center">
                              {row.project || "—"}
                            </div>
                          ) : (
                            <>
                              {isStandardProject(row.project) ? (
                                <Select
                                  value={row.project || ""}
                                  onValueChange={(val) => handleProjectSelect(idx, val)}
                                  disabled={submitting || (!row.startTime && !row.endTime)}
                                >
                                  <SelectTrigger className={cn(
                                    "flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-left focus:outline-none transition hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs h-10 cursor-pointer",
                                    row.project ? "text-emerald-700" : "text-neutral-400 font-medium"
                                  )}>
                                    <SelectValue placeholder="Select Project" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                    {PROJECT_OPTIONS.map((opt) => (
                                      <SelectItem
                                        value={opt}
                                        key={opt}
                                        className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
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
                                          i === idx ? { ...r, project: val } : r
                                        )
                                      );
                                    }}
                                    placeholder="Project Name..."
                                    className="w-full border border-neutral-200 rounded-xl bg-white pl-3 pr-8 py-2 text-xs font-semibold text-emerald-700 focus:outline-none focus:border-neutral-900 transition h-10 placeholder-neutral-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWeekRows((prev) =>
                                        prev.map((r, i) =>
                                          i === idx ? { ...r, project: "" } : r
                                        )
                                      );
                                    }}
                                    className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer animate-fade-in"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 flex flex-col gap-1.5">
                      <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                        Notes
                      </label>
                      {row.isFuture || isApproved || row.isDayOff ? (
                        <div className="w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 text-left font-medium text-xs text-neutral-400 min-h-[80px]">
                          {row.notes || "—"}
                        </div>
                      ) : (
                        <textarea
                          disabled={submitting || (!row.startTime && !row.endTime)}
                          value={row.notes}
                          onChange={(e) => handleNotesChange(idx, e.target.value)}
                          placeholder="Add Notes..."
                          rows={3}
                          className="w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed resize-none"
                        />
                      )}
                    </div>

                    {/* Total Hours footer indicator */}
                    <div className="flex items-center justify-between border-t border-neutral-100 mt-4 pt-3">
                      <span className="text-neutral-500 text-xs font-semibold">
                        Total Hours
                      </span>
                      <span className="text-emerald-700 font-bold text-sm">
                        {hours > 0 ? `${hours.toFixed(1)}h` : "0.0h"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 mt-6 bg-white pt-2 border-t border-neutral-100">
            {lastSavedTime && (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs pl-1 font-medium select-none">
                <svg
                  className="w-4 h-4 text-emerald-600 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Saved on {lastSavedTime}</span>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={submitting}
                className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-3 rounded-full text-xs font-bold transition hover:bg-neutral-50 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Clear All
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white py-3 rounded-full text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Timesheet</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
