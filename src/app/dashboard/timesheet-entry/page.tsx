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
  Plus,
  Trash2,
} from "lucide-react";

import { Staff } from "@/types/staff";
import Calendar from "@/components/ui/calendar";
import { useAuth } from "@/providers/auth-provider";
import TimePicker from "@/components/ui/time-picker";
import { useBusinessStore } from "@/stores/business-store";
import { Location } from "@/types/inventory";
import { getLocations } from "@/lib/repositories/location.repository";
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
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { Business } from "@/types/business";
import {
  getTimesheetSettings,
  TimesheetSettings,
} from "@/lib/repositories/timesheet-settings.repository";
import { cn } from "@/lib/utils";

interface ShiftRow {
  shiftId: string;
  businessId: string;
  locationId: string;
  locationName?: string;
  startTime: string;
  endTime: string;
  unpaidBreak: string;
  project: string;
  notes: string;
  dbTimesheetId: string | null;
  status: string;
}

interface DayGroup {
  dayName: string;
  dateStr: string;
  displayDate: string;
  isFuture: boolean;
  isDayOff: boolean;
  shifts: ShiftRow[];
}

let shiftCounter = 0;
function makeShiftId() {
  return `shift_${Date.now()}_${shiftCounter++}`;
}

export default function TimesheetEntryPage() {
  const { activeBusinessId } = useBusinessStore();
  const { profile, loading: authLoading } = useAuth();

  const isStaff = profile?.role === "staff";

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [weekDays, setWeekDays] = useState<DayGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [locationsMap, setLocationsMap] = useState<Record<string, Location[]>>(
    {},
  );
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [expandedDayIdx, setExpandedDayIdx] = useState<number | null>(0);

  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmDays, setConfirmDays] = useState<DayGroup[]>([]);

  const [settings, setSettings] = useState<TimesheetSettings | null>(null);

  const projectOptions = useMemo(() => {
    return settings?.projects || [];
  }, [settings]);

  const showProjectColumn = useMemo(() => {
    return settings?.enable_projects !== false && projectOptions.length > 0;
  }, [settings, projectOptions]);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const desktopCalendarRef = useRef<HTMLDivElement>(null);
  const mobileCalendarRef = useRef<HTMLDivElement>(null);

  const [openTimePicker, setOpenTimePicker] = useState<{
    dayIndex: number;
    shiftIndex: number;
    type: "start" | "end";
  } | null>(null);

  const defaultBusinessId = useMemo(() => {
    if (businesses.length === 1) {
      return businesses[0].id;
    }
    return "";
  }, [businesses]);

  const weekStartDateStr = useMemo(() => {
    if (!currentWeekStart) return "";
    const year = currentWeekStart.getFullYear();
    const month = (currentWeekStart.getMonth() + 1).toString().padStart(2, "0");
    const date = currentWeekStart.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${date}`;
  }, [currentWeekStart]);

  const draftKey = useMemo(() => {
    if (!staffId || !weekStartDateStr) return "";
    return `timesheet_draft_v2_${staffId}_${weekStartDateStr}`;
  }, [staffId, weekStartDateStr]);

  const getWeekStart = useCallback((d: Date, startDay: string = "Monday") => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    const DAYS_ORDER = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const targetIndex = DAYS_ORDER.indexOf(startDay);
    const currentDay = date.getDay();
    let diff = currentDay - targetIndex;
    if (diff < 0) {
      diff += 7;
    }
    date.setDate(date.getDate() - diff);
    return date;
  }, []);

  const getMonday = useCallback(
    (d: Date) => {
      return getWeekStart(d, settings?.week_starts_on || "Monday");
    },
    [settings, getWeekStart],
  );

  const isCurrentWeek = useCallback(
    (monday: Date) => {
      const today = new Date();
      const currentMonday = getWeekStart(
        today,
        settings?.week_starts_on || "Monday",
      );
      return monday.getTime() === currentMonday.getTime();
    },
    [settings, getWeekStart],
  );

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

  const getWeekDays = useCallback(
    (weekStartDate: Date) => {
      const days = [];
      const DAYS_ORDER = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const startDay = settings?.week_starts_on || "Monday";
      const targetIndex = DAYS_ORDER.indexOf(startDay);

      const daysOfWeekShort = [];
      for (let i = 0; i < 7; i++) {
        const idx = (targetIndex + i) % 7;
        daysOfWeekShort.push(DAYS_ORDER[idx].substring(0, 3));
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(weekStartDate.getDate() + i);
        const dayName = daysOfWeekShort[i];
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
    },
    [settings],
  );

  useEffect(() => {
    async function loadSettings() {
      const targetBizId =
        defaultBusinessId ||
        activeBusinessId ||
        (businesses.length > 0 ? businesses[0].id : "");
      if (!targetBizId) return;
      try {
        const data = await getTimesheetSettings(targetBizId);
        setSettings(data);
      } catch (err) {
        console.error("Failed to load timesheet settings:", err);
      }
    }
    loadSettings();
  }, [defaultBusinessId, activeBusinessId, businesses]);

  useEffect(() => {
    if (settings) {
      setCurrentWeekStart((prev) =>
        getWeekStart(prev, settings.week_starts_on),
      );
    }
  }, [settings, getWeekStart]);

  useEffect(() => {
    async function loadBusinessesAndLocations() {
      try {
        const list = await getUserBusinesses();
        setBusinesses(list);
        const locResults = await Promise.all(
          list.map((b) => getLocations(b.id).catch(() => [])),
        );
        const map: Record<string, Location[]> = {};
        list.forEach((b, idx) => {
          map[b.id] = locResults[idx] || [];
        });
        setLocationsMap(map);
      } catch (err) {
        console.error("Failed to load businesses & locations:", err);
      }
    }
    loadBusinessesAndLocations();
  }, []);

  useEffect(() => {
    if (isStaff) {
      if (profile) setStaffId(profile.uid);
      setLoadingContext(false);
      return;
    }

    async function loadStaffList() {
      if (businesses.length === 0) return;
      try {
        setLoadingContext(true);
        const staffResults = await Promise.all(
          businesses.map((b) => getStaffMembers(b.id).catch(() => [])),
        );
        const combined = staffResults.flat();
        const uniqueStaffMap = new Map<string, Staff>();
        combined.forEach((s) => {
          if (!uniqueStaffMap.has(s.id)) {
            uniqueStaffMap.set(s.id, s);
          }
        });
        const allStaff = Array.from(uniqueStaffMap.values());
        setStaffList(allStaff);
        if (allStaff.length > 0 && !staffId) {
          setStaffId(allStaff[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load staff list.");
      } finally {
        setLoadingContext(false);
      }
    }
    loadStaffList();
  }, [businesses, isStaff, profile, staffId]);

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

  const saveDraft = useCallback(
    (days: DayGroup[]) => {
      if (!draftKey) return;
      const now = new Date().toISOString();
      const draftData = {
        savedAt: now,
        days: days.map((d) => ({
          dateStr: d.dateStr,
          isDayOff: d.isDayOff,
          shifts: d.shifts.map((s) => ({
            shiftId: s.shiftId,
            businessId: s.businessId,
            locationId: s.locationId,
            startTime: s.startTime,
            endTime: s.endTime,
            unpaidBreak: s.unpaidBreak,
            project: s.project,
            notes: s.notes,
          })),
        })),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setLastSavedTime(formatLastSavedTime(now));
      } catch (e) {
        console.error("Failed to save draft to localStorage:", e);
      }
    },
    [draftKey, formatLastSavedTime],
  );

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.error("Failed to clear draft from localStorage:", e);
    }
    setLastSavedTime(null);
  }, [draftKey]);

  const updateAndSaveWeekDays = useCallback(
    (updater: DayGroup[] | ((prev: DayGroup[]) => DayGroup[])) => {
      setWeekDays((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveDraft(next);
        return next;
      });
    },
    [saveDraft],
  );

  const loadTimesheets = useCallback(async () => {
    try {
      const data = await getTimesheets("all");
      setTimesheets(data);
    } catch (err) {
      console.error("Failed to fetch timesheets:", err);
    }
  }, []);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  const staffTimesheets = useMemo(() => {
    return timesheets.filter((ts) => ts.staffId === staffId);
  }, [timesheets, staffId]);

  const checkIsDateEditable = useCallback(
    (dateStr: string, status: string) => {
      if (isFutureDate(dateStr)) return false;
      if (status === "approved") return false;

      if (
        settings?.lock_timesheets_before_date &&
        settings?.lock_payroll_period_date
      ) {
        if (dateStr <= settings.lock_payroll_period_date) {
          return false;
        }
      }

      if (isStaff) {
        if (status === "submitted" || status === "edited") {
          if (!settings?.allow_staff_edit_pending) {
            return false;
          }
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
        if (dateStr < todayStr) {
          if (settings?.allow_past_entry === false) {
            return false;
          }
          if (
            settings?.allow_past_entry === true &&
            settings?.max_past_days !== undefined
          ) {
            const rowDate = new Date(dateStr + "T00:00:00");
            const todayDate = new Date(todayStr + "T00:00:00");
            const diffTime = todayDate.getTime() - rowDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > settings.max_past_days) {
              return false;
            }
          }
        }
      }

      return true;
    },
    [isStaff, settings],
  );

  // Build a default blank shift
  const makeBlankShift = useCallback(
    (defaultBiz: string, defaultLoc: string): ShiftRow => {
      const defaultBreak =
        settings?.default_break_minutes !== undefined
          ? settings.default_break_minutes.toString()
          : "30";
      return {
        shiftId: makeShiftId(),
        businessId: defaultBiz,
        locationId: defaultLoc,
        locationName: "",
        startTime: "",
        endTime: "",
        unpaidBreak: defaultBreak,
        project: "",
        notes: "",
        dbTimesheetId: null,
        status: "",
      };
    },
    [settings],
  );

  useEffect(() => {
    if (!currentWeekStart || !staffId) return;

    type DraftShift = {
      shiftId: string;
      businessId: string;
      locationId: string;
      startTime: string;
      endTime: string;
      unpaidBreak: string;
      project: string;
      notes: string;
    };

    let savedDraft: {
      savedAt: string;
      days: Array<{
        dateStr: string;
        isDayOff: boolean;
        shifts: DraftShift[];
      }>;
    } | null = null;

    if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          savedDraft = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Error reading draft from localStorage", e);
      }
    }

    const defaultBiz = businesses.length === 1 ? businesses[0].id : "";
    const defaultBreak =
      settings?.default_break_minutes !== undefined
        ? settings.default_break_minutes.toString()
        : "30";

    const days = getWeekDays(currentWeekStart);

    const newWeekDays: DayGroup[] = days.map((day) => {
      const isFuture = isFutureDate(day.dateStr);
      const dayTimesheets = staffTimesheets.filter(
        (ts) => ts.workDate === day.dateStr,
      );
      const draftDay = savedDraft?.days?.find((d) => d.dateStr === day.dateStr);

      // Build shifts from DB records
      let shifts: ShiftRow[] = [];

      if (dayTimesheets.length > 0) {
        shifts = dayTimesheets.map((ts) => {
          const isDayOff = ts.startTime === "00:00" && ts.endTime === "00:00";
          const bId = ts.businessId || defaultBiz;
          const bizLocs = locationsMap[bId] || [];
          const lId =
            ts.locationId || (bizLocs.length === 1 ? bizLocs[0].id : "");
          return {
            shiftId: makeShiftId(),
            businessId: bId,
            locationId: lId,
            locationName: ts.locationName || "",
            startTime: isDayOff ? "" : ts.startTime,
            endTime: isDayOff ? "" : ts.endTime,
            unpaidBreak: ts.unpaidBreak.toString(),
            project: ts.project || "",
            notes: ts.notes || "",
            dbTimesheetId: ts.id || null,
            status: ts.status || "",
          };
        });
      } else if (draftDay && draftDay.shifts.length > 0) {
        shifts = draftDay.shifts.map((ds) => ({
          shiftId: ds.shiftId || makeShiftId(),
          businessId: ds.businessId,
          locationId: ds.locationId,
          locationName: "",
          startTime: ds.startTime,
          endTime: ds.endTime,
          unpaidBreak: ds.unpaidBreak || defaultBreak,
          project: ds.project,
          notes: ds.notes,
          dbTimesheetId: null,
          status: "",
        }));
      }
      // else: no shifts — empty state

      const isDayOff =
        dayTimesheets.length === 1 &&
        dayTimesheets[0].startTime === "00:00" &&
        dayTimesheets[0].endTime === "00:00";

      return {
        dayName: day.dayName,
        dateStr: day.dateStr,
        displayDate: day.displayDate,
        isFuture,
        isDayOff,
        shifts,
      };
    });

    setWeekDays(newWeekDays);

    if (savedDraft?.savedAt) {
      setLastSavedTime(formatLastSavedTime(savedDraft.savedAt));
    } else {
      setLastSavedTime(null);
    }
  }, [
    currentWeekStart,
    staffId,
    staffTimesheets,
    settings,
    getWeekDays,
    businesses,
    locationsMap,
    draftKey,
    formatLastSavedTime,
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const isInsideDesktopCal = desktopCalendarRef.current?.contains(target);
      const isInsideMobileCal = mobileCalendarRef.current?.contains(target);
      if (!isInsideDesktopCal && !isInsideMobileCal) {
        setIsCalendarOpen(false);
      }

      if (openTimePicker) {
        const { dayIndex, shiftIndex, type } = openTimePicker;
        const desktopCell = document.getElementById(
          `timecell-${dayIndex}-${shiftIndex}-${type}`,
        );
        const mobileCell = document.getElementById(
          `timecell-mobile-${dayIndex}-${shiftIndex}-${type}`,
        );
        if (!desktopCell?.contains(target) && !mobileCell?.contains(target)) {
          setOpenTimePicker(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openTimePicker]);

  // ─── Computed values ──────────────────────────────────────────────────────

  const selectedStaffName = useMemo(() => {
    if (isStaff && profile) {
      return profile.fullName;
    }
    return staffList.find((s) => s.id === staffId)?.name || "";
  }, [isStaff, profile, staffList, staffId]);

  const filteredStaffList = useMemo(() => {
    if (isStaff) return [];
    return staffList;
  }, [staffList, isStaff]);

  const calculateShiftHours = (
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
    return weekDays.reduce((daySum, day) => {
      const dayHours = day.shifts.reduce((shiftSum, shift) => {
        return (
          shiftSum +
          calculateShiftHours(shift.startTime, shift.endTime, shift.unpaidBreak)
        );
      }, 0);
      return daySum + dayHours;
    }, 0);
  }, [weekDays]);

  const filteredWeekDays = useMemo(() => {
    const daysWithIndex = weekDays.map((day, index) => ({ day, index }));
    if (!searchQuery.trim()) return daysWithIndex;
    const query = searchQuery.toLowerCase();
    return daysWithIndex.filter(
      ({ day }) =>
        day.dayName.toLowerCase().includes(query) ||
        day.shifts.some(
          (s) =>
            s.project.toLowerCase().includes(query) ||
            s.notes.toLowerCase().includes(query),
        ),
    );
  }, [weekDays, searchQuery]);

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr} ${ampm}`;
  };

  // ─── Shift Handlers ────────────────────────────────────────────────────────

  const handleAddShift = useCallback(
    (dayIndex: number) => {
      const defaultBiz = businesses.length === 1 ? businesses[0].id : "";
      const bizLocs = locationsMap[defaultBiz] || [];
      const defaultLoc = bizLocs.length === 1 ? bizLocs[0].id : "";
      const newShift = makeBlankShift(defaultBiz, defaultLoc);
      updateAndSaveWeekDays((prev) =>
        prev.map((day, idx) => {
          if (idx !== dayIndex) return day;
          return { ...day, shifts: [...day.shifts, newShift] };
        }),
      );
    },
    [businesses, locationsMap, makeBlankShift, updateAndSaveWeekDays],
  );

  const handleDeleteShift = useCallback(
    (dayIndex: number, shiftIndex: number) => {
      updateAndSaveWeekDays((prev) =>
        prev.map((day, idx) => {
          if (idx !== dayIndex) return day;
          const newShifts = day.shifts.filter((_, sIdx) => sIdx !== shiftIndex);
          return { ...day, shifts: newShifts };
        }),
      );
    },
    [updateAndSaveWeekDays],
  );

  const handleBusinessChange = (
    dayIndex: number,
    shiftIndex: number,
    newBusinessId: string,
  ) => {
    const bizLocs = locationsMap[newBusinessId] || [];
    const defaultLocId = bizLocs.length === 1 ? bizLocs[0].id : "";
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return {
              ...s,
              businessId: newBusinessId,
              locationId: defaultLocId,
            };
          }),
        };
      }),
    );
  };

  const handleLocationChange = (
    dayIndex: number,
    shiftIndex: number,
    newLocationId: string,
  ) => {
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return { ...s, locationId: newLocationId };
          }),
        };
      }),
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    shiftIndex: number,
    type: "start" | "end",
    value: string,
  ) => {
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return {
              ...s,
              startTime: type === "start" ? value : s.startTime,
              endTime: type === "end" ? value : s.endTime,
            };
          }),
        };
      }),
    );
  };

  const handleBreakChange = (
    dayIndex: number,
    shiftIndex: number,
    value: string,
  ) => {
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return { ...s, unpaidBreak: value };
          }),
        };
      }),
    );
  };

  const handleProjectSelect = (
    dayIndex: number,
    shiftIndex: number,
    option: string,
  ) => {
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return { ...s, project: option };
          }),
        };
      }),
    );
  };

  const handleNotesChange = (
    dayIndex: number,
    shiftIndex: number,
    value: string,
  ) => {
    updateAndSaveWeekDays((prev) =>
      prev.map((day, dIdx) => {
        if (dIdx !== dayIndex) return day;
        return {
          ...day,
          shifts: day.shifts.map((s, sIdx) => {
            if (sIdx !== shiftIndex) return s;
            return { ...s, notes: value };
          }),
        };
      }),
    );
  };

  // ─── Week Navigation ──────────────────────────────────────────────────────

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

  // ─── Copy Previous Week ───────────────────────────────────────────────────

  const handleCopyPreviousWeek = () => {
    if (!currentWeekStart) return;

    const prevMonday = new Date(currentWeekStart);
    prevMonday.setDate(currentWeekStart.getDate() - 7);

    const prevDays = getWeekDays(prevMonday);
    let copiedCount = 0;

    const newDays = weekDays.map((day, idx) => {
      const isEditable = checkIsDateEditable(
        day.dateStr,
        day.shifts[0]?.status || "",
      );
      if (!isEditable || day.isFuture) return day;

      const prevDayDateStr = prevDays[idx].dateStr;
      const prevTimesheets = timesheets.filter(
        (ts) => ts.staffId === staffId && ts.workDate === prevDayDateStr,
      );

      if (prevTimesheets.length > 0) {
        copiedCount++;
        const defaultBiz = businesses.length === 1 ? businesses[0].id : "";
        const newShifts: ShiftRow[] = prevTimesheets.map((ts) => {
          const bId = ts.businessId || defaultBiz;
          const bizLocs = locationsMap[bId] || [];
          const lId =
            ts.locationId || (bizLocs.length === 1 ? bizLocs[0].id : "");
          return {
            shiftId: makeShiftId(),
            businessId: bId,
            locationId: lId,
            locationName: ts.locationName || "",
            startTime: ts.startTime,
            endTime: ts.endTime,
            unpaidBreak: ts.unpaidBreak.toString(),
            project: ts.project || "",
            notes: ts.notes || "",
            dbTimesheetId: null,
            status: "",
          };
        });
        return { ...day, shifts: newShifts };
      }
      return day;
    });

    if (copiedCount > 0) {
      updateAndSaveWeekDays(newDays);
      toast.success(
        `Copied ${copiedCount} timesheet entries from the previous week!`,
      );
    } else {
      toast.error("No timesheet entries found in the previous week to copy.");
    }
  };

  const handleClearAll = () => {
    const defaultBiz = businesses.length === 1 ? businesses[0].id : "";

    const newDays = weekDays.map((day) => {
      const isEditable = checkIsDateEditable(
        day.dateStr,
        day.shifts[0]?.status || "",
      );
      if (!isEditable || day.isFuture) return day;

      const dayTimesheets = staffTimesheets.filter(
        (ts) => ts.workDate === day.dateStr,
      );

      let shifts: ShiftRow[] = [];

      if (dayTimesheets.length > 0) {
        shifts = dayTimesheets.map((ts) => {
          const isDayOff = ts.startTime === "00:00" && ts.endTime === "00:00";
          const bId = ts.businessId || defaultBiz;
          const bizLocs = locationsMap[bId] || [];
          const lId =
            ts.locationId || (bizLocs.length === 1 ? bizLocs[0].id : "");
          return {
            shiftId: makeShiftId(),
            businessId: bId,
            locationId: lId,
            locationName: ts.locationName || "",
            startTime: isDayOff ? "" : ts.startTime,
            endTime: isDayOff ? "" : ts.endTime,
            unpaidBreak: ts.unpaidBreak.toString(),
            project: ts.project || "",
            notes: ts.notes || "",
            dbTimesheetId: ts.id || null,
            status: ts.status || "",
          };
        });
      }

      const isDayOff =
        dayTimesheets.length === 1 &&
        dayTimesheets[0].startTime === "00:00" &&
        dayTimesheets[0].endTime === "00:00";

      return {
        ...day,
        isDayOff,
        shifts,
      };
    });

    clearDraft();
    setWeekDays(newDays);
    toast.success("Unsaved changes cleared.");
  };

  const executeSubmit = async (daysToSubmit: DayGroup[]) => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const promises: Promise<unknown>[] = [];

      for (const day of daysToSubmit) {
        const anyShiftStatus = day.shifts[0]?.status || "";
        const isEditable = checkIsDateEditable(day.dateStr, anyShiftStatus);
        if (!isEditable) continue;

        if (day.shifts.length === 0) {
          // Delete any existing DB records for this day
          const existingForDay = staffTimesheets.filter(
            (ts) => ts.workDate === day.dateStr,
          );
          for (const ts of existingForDay) {
            if (ts.id && ts.businessId) {
              promises.push(deleteTimesheet(ts.businessId, ts.id));
            }
          }
          continue;
        }

        for (const shift of day.shifts) {
          const hasTimeSet = shift.startTime && shift.endTime;
          if (!hasTimeSet) continue;

          const payload = {
            locationId: shift.locationId,
            staffId,
            workDate: day.dateStr,
            startTime: shift.startTime,
            endTime: shift.endTime,
            unpaidBreak: parseInt(shift.unpaidBreak, 10) || 0,
            project: shift.project.trim() || undefined,
            notes: shift.notes.trim() || undefined,
            status:
              settings?.require_approval === false ? "approved" : "submitted",
          };

          if (shift.dbTimesheetId) {
            const original = timesheets.find(
              (ts) => ts.id === shift.dbTimesheetId,
            );
            const changed =
              original?.businessId !== shift.businessId ||
              original?.locationId !== shift.locationId ||
              original?.startTime !== shift.startTime ||
              original?.endTime !== shift.endTime ||
              original?.unpaidBreak !==
                (parseInt(shift.unpaidBreak, 10) || 0) ||
              (original?.project || "") !== shift.project.trim() ||
              (original?.notes || "") !== shift.notes.trim();

            if (changed) {
              promises.push(
                updateTimesheet(shift.businessId, shift.dbTimesheetId, payload),
              );
            }
          } else {
            promises.push(createTimesheet(shift.businessId, payload));
          }
        }

        // Delete DB records that no longer have a corresponding shift
        const dbIds = day.shifts
          .filter((s) => s.dbTimesheetId)
          .map((s) => s.dbTimesheetId);
        const existingForDay = staffTimesheets.filter(
          (ts) => ts.workDate === day.dateStr,
        );
        for (const ts of existingForDay) {
          if (ts.id && !dbIds.includes(ts.id) && ts.businessId) {
            promises.push(deleteTimesheet(ts.businessId, ts.id));
          }
        }
      }

      await Promise.all(promises);
      toast.success("Timesheets submitted successfully!");
      clearDraft();
      await loadTimesheets();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to submit timesheets.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId) {
      toast.error("Please select a staff member.");
      return;
    }

    try {
      for (const day of weekDays) {
        const anyShiftStatus = day.shifts[0]?.status || "";
        const isEditable = checkIsDateEditable(day.dateStr, anyShiftStatus);
        if (!isEditable) continue;

        for (const shift of day.shifts) {
          const hasTimeSet = shift.startTime && shift.endTime;
          if (!hasTimeSet) continue;

          if (!shift.businessId) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), please select a business.`,
            );
          }
          if (!shift.locationId) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), please select a location.`,
            );
          }
          if (shift.startTime > shift.endTime) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), Start Time cannot be after End Time.`,
            );
          }
          if (shift.startTime === shift.endTime) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), Start and End times cannot be identical.`,
            );
          }

          const breakMins = parseInt(shift.unpaidBreak, 10) || 0;
          if (
            settings?.require_break_entry &&
            (isNaN(breakMins) || breakMins < 0)
          ) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), a valid unpaid break is required.`,
            );
          }

          const [startH, startM] = shift.startTime.split(":").map(Number);
          const [endH, endM] = shift.endTime.split(":").map(Number);
          let diffMins = endH * 60 + endM - (startH * 60 + startM);
          if (diffMins < 0) diffMins += 24 * 60;

          if (breakMins >= diffMins) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), unpaid break must be less than the total shift duration.`,
            );
          }
          if (breakMins >= 360) {
            throw new Error(
              `On ${day.dayName} (${day.displayDate}), unpaid break must be less than 6 hours.`,
            );
          }

          if (
            settings?.require_break_entry &&
            settings?.require_reason_no_break &&
            breakMins === 0
          ) {
            const shiftDuration = calculateShiftHours(
              shift.startTime,
              shift.endTime,
              "0",
            );
            if (shiftDuration > 5 && !shift.notes.trim()) {
              throw new Error(
                `On ${day.dayName} (${day.displayDate}), please provide a reason in the notes for not taking a break on this longer shift.`,
              );
            }
          }
        }
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Validation failed.");
      return;
    }

    setConfirmDays(weekDays);
    setShowConfirmModal(true);
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

  const readonlyCell =
    "w-full font-semibold text-xs text-neutral-600 border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 h-10 flex items-center truncate";

  return (
    <div className="bg-white min-h-0 flex flex-col w-full">
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
                ref={desktopCalendarRef}
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
                      selectedDate={
                        currentWeekStart.toISOString().split("T")[0]
                      }
                      onChange={handleCalendarChange}
                      weekStartsOn={settings?.week_starts_on}
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
            <div className="bg-white border border-neutral-200 rounded-3xl shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 bg-white sticky top-0 z-10">
                      <th className="py-4 px-6 text-left font-semibold min-w-[110px]">
                        Day / Date
                      </th>
                      <th className="py-4 px-1 text-left font-semibold min-w-[50px]">
                        Shift
                      </th>
                      <th className="py-4 px-3 text-left font-semibold min-w-[160px]">
                        Business
                      </th>
                      <th className="py-4 px-3 text-left font-semibold min-w-[160px]">
                        Location
                      </th>
                      <th className="py-4 px-3 text-center font-semibold min-w-[125px]">
                        Start Time
                      </th>
                      <th className="py-4 px-3 text-center font-semibold min-w-[125px]">
                        End Time
                      </th>
                      <th className="py-4 px-3 text-center font-semibold min-w-[100px]">
                        Break (Mins)
                      </th>
                      <th className="py-4 px-3 text-center font-semibold min-w-[60px]">
                        Hours
                      </th>
                      {showProjectColumn && (
                        <th className="py-4 px-3 text-left font-semibold min-w-[160px]">
                          Project
                        </th>
                      )}
                      <th className="py-4 px-3 text-left font-semibold w-[125px]">
                        Notes
                      </th>
                      <th className="py-4 px-3 text-center font-semibold min-w-[80px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-neutral-800 bg-white">
                    {filteredWeekDays.map(({ day, index: dayIdx }) => {
                      const dayEditable =
                        !day.isFuture &&
                        checkIsDateEditable(
                          day.dateStr,
                          day.shifts[0]?.status || "",
                        );

                      if (day.shifts.length === 0) {
                        return (
                          <tr
                            key={day.dateStr}
                            className={cn(
                              "border-b border-neutral-100 hover:bg-neutral-50/40 transition-colors",
                              (!dayEditable || day.isFuture) &&
                                "opacity-50 select-none",
                            )}
                          >
                            <td className="py-4 px-6 align-middle">
                              <div className="flex flex-col">
                                <span className="font-bold text-neutral-900 text-sm leading-tight">
                                  {day.dayName}
                                </span>
                                <span className="text-neutral-500 text-[11px] mt-0.5 font-medium leading-tight">
                                  {day.displayDate}
                                </span>
                              </div>
                            </td>
                            <td
                              colSpan={showProjectColumn ? 9 : 8}
                              className="py-4 px-3 align-middle"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-neutral-400 text-xs font-medium italic">
                                  No shifts have been added
                                </span>
                                {dayEditable && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleAddShift(dayIdx)}
                                    className="inline-flex items-center gap-1.5 text-[#0A2924] border border-[#0A2924]/30 hover:bg-[#0A2924]/5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Shift
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-3" />
                          </tr>
                        );
                      }

                      return day.shifts.map((shift, shiftIdx) => {
                        const isFirstShift = shiftIdx === 0;
                        const isLastShift = shiftIdx === day.shifts.length - 1;
                        const shiftEditable =
                          dayEditable &&
                          checkIsDateEditable(day.dateStr, shift.status);
                        const hours = calculateShiftHours(
                          shift.startTime,
                          shift.endTime,
                          shift.unpaidBreak,
                        );
                        const availableLocations =
                          locationsMap[shift.businessId] || [];

                        return (
                          <tr
                            key={shift.shiftId}
                            className={cn(
                              "transition-colors hover:bg-neutral-50/50",
                              isLastShift
                                ? "border-b border-neutral-200"
                                : "border-b border-neutral-100/70",
                              (!shiftEditable || day.isFuture) &&
                                "opacity-45 select-none bg-neutral-50/20",
                            )}
                          >
                            <td
                              className={cn(
                                "py-3 px-6 align-middle",
                                !isFirstShift &&
                                  "border-l-2 border-l-neutral-100",
                              )}
                            >
                              {isFirstShift ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-neutral-900 text-sm leading-tight">
                                    {day.dayName}
                                  </span>
                                  <span className="text-neutral-500 text-[11px] mt-0.5 font-medium leading-tight">
                                    {day.displayDate}
                                  </span>
                                </div>
                              ) : (
                                <div className="w-full" />
                              )}
                            </td>

                            <td className="py-3 px-1 align-middle">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-neutral-100 text-neutral-600 font-bold text-[10px] leading-none whitespace-nowrap">
                                {shiftIdx + 1}
                              </span>
                            </td>

                            <td className="py-3 px-3 align-middle">
                              {!shiftEditable ? (
                                <div className={readonlyCell}>
                                  {businesses.find(
                                    (b) => b.id === shift.businessId,
                                  )?.name || "—"}
                                </div>
                              ) : (
                                <Select
                                  value={shift.businessId || ""}
                                  onValueChange={(val) =>
                                    handleBusinessChange(dayIdx, shiftIdx, val)
                                  }
                                  disabled={!shiftEditable || submitting}
                                >
                                  <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50 flex items-center justify-between">
                                    <SelectValue placeholder="Select Business" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                    {businesses.map((b) => (
                                      <SelectItem
                                        key={b.id}
                                        value={b.id}
                                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                      >
                                        {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>

                            <td className="py-3 px-3 align-middle">
                              {!shiftEditable ? (
                                <div className={readonlyCell}>
                                  {availableLocations.find(
                                    (l) => l.id === shift.locationId,
                                  )?.name ||
                                    shift.locationName ||
                                    "—"}
                                </div>
                              ) : (
                                <Select
                                  value={shift.locationId || ""}
                                  onValueChange={(val) =>
                                    handleLocationChange(dayIdx, shiftIdx, val)
                                  }
                                  disabled={
                                    !shiftEditable ||
                                    submitting ||
                                    availableLocations.length === 0
                                  }
                                >
                                  <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50 flex items-center justify-between">
                                    <SelectValue placeholder="Select Location" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                    {availableLocations.map((l) => (
                                      <SelectItem
                                        key={l.id}
                                        value={l.id}
                                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                      >
                                        {l.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>

                            <td
                              className="py-3 px-3 text-center align-middle"
                              id={`timecell-${dayIdx}-${shiftIdx}-start`}
                            >
                              <div className="relative">
                                {!shiftEditable ? (
                                  <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
                                    {shift.startTime
                                      ? formatTimeToAMPM(shift.startTime)
                                      : "—"}
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() =>
                                        setOpenTimePicker({
                                          dayIndex: dayIdx,
                                          shiftIndex: shiftIdx,
                                          type: "start",
                                        })
                                      }
                                      className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-1 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                    >
                                      <span>
                                        {shift.startTime
                                          ? formatTimeToAMPM(shift.startTime)
                                          : "—"}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 transition-colors" />
                                    </button>
                                    {openTimePicker?.dayIndex === dayIdx &&
                                      openTimePicker?.shiftIndex === shiftIdx &&
                                      openTimePicker?.type === "start" && (
                                        <TimePicker
                                          value={shift.startTime}
                                          onChange={(val, source) => {
                                            handleTimeChange(
                                              dayIdx,
                                              shiftIdx,
                                              "start",
                                              val,
                                            );
                                            if (source === "period") {
                                              setOpenTimePicker(null);
                                            }
                                          }}
                                          className={`left-0 right-auto shadow-2xl border border-neutral-200 rounded-2xl ${dayIdx >= 4 ? "bottom-full mb-2" : "top-full mt-2"}`}
                                        />
                                      )}
                                  </>
                                )}
                              </div>
                            </td>

                            <td
                              className="py-3 px-3 text-center align-middle"
                              id={`timecell-${dayIdx}-${shiftIdx}-end`}
                            >
                              <div className="relative">
                                {!shiftEditable ? (
                                  <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-100 px-1 py-2 font-medium text-[13px] text-neutral-400 h-10">
                                    {shift.endTime
                                      ? formatTimeToAMPM(shift.endTime)
                                      : "—"}
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() =>
                                        setOpenTimePicker({
                                          dayIndex: dayIdx,
                                          shiftIndex: shiftIdx,
                                          type: "end",
                                        })
                                      }
                                      className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-1 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                    >
                                      <span>
                                        {shift.endTime
                                          ? formatTimeToAMPM(shift.endTime)
                                          : "—"}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0 transition-colors" />
                                    </button>
                                    {openTimePicker?.dayIndex === dayIdx &&
                                      openTimePicker?.shiftIndex === shiftIdx &&
                                      openTimePicker?.type === "end" && (
                                        <TimePicker
                                          value={shift.endTime}
                                          onChange={(val, source) => {
                                            handleTimeChange(
                                              dayIdx,
                                              shiftIdx,
                                              "end",
                                              val,
                                            );
                                            if (source === "period") {
                                              setOpenTimePicker(null);
                                            }
                                          }}
                                          className={`right-0! left-auto! shadow-2xl border border-neutral-200 rounded-2xl ${dayIdx >= 4 ? "bottom-full mb-2" : "top-full mt-2"}`}
                                        />
                                      )}
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              {!shiftEditable ? (
                                <div className="w-24 mx-auto border border-neutral-200/60 rounded-xl bg-neutral-100 px-2 py-2 text-center font-medium text-[13px] text-neutral-400 h-10 flex items-center justify-center">
                                  {shift.unpaidBreak}
                                </div>
                              ) : (
                                <div className="relative w-24 mx-auto">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={
                                      !shiftEditable ||
                                      submitting ||
                                      (!shift.startTime && !shift.endTime) ||
                                      settings?.require_break_entry === false
                                    }
                                    value={shift.unpaidBreak}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^\d*$/.test(val)) {
                                        handleBreakChange(
                                          dayIdx,
                                          shiftIdx,
                                          val,
                                        );
                                      }
                                    }}
                                    className="w-full border border-neutral-200 rounded-xl bg-white pl-3 pr-8 py-2 text-center focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed font-medium text-[13px] text-neutral-900 h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pr-1.5">
                                    <button
                                      type="button"
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        (!shift.startTime && !shift.endTime) ||
                                        settings?.require_break_entry === false
                                      }
                                      onClick={() => {
                                        const cur =
                                          parseInt(shift.unpaidBreak, 10) || 0;
                                        handleBreakChange(
                                          dayIdx,
                                          shiftIdx,
                                          (cur + 5).toString(),
                                        );
                                      }}
                                      className="text-neutral-400 hover:text-neutral-800 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        (!shift.startTime && !shift.endTime) ||
                                        settings?.require_break_entry === false
                                      }
                                      onClick={() => {
                                        const cur =
                                          parseInt(shift.unpaidBreak, 10) || 0;
                                        handleBreakChange(
                                          dayIdx,
                                          shiftIdx,
                                          Math.max(0, cur - 5).toString(),
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

                            <td className="py-3 px-3 text-center align-middle">
                              <span className="text-[14px] font-semibold text-neutral-900">
                                {hours > 0 ? hours.toFixed(1) : "0.0"}
                              </span>
                            </td>

                            {showProjectColumn && (
                              <td
                                className="py-3 px-3 text-left align-middle"
                                id={`projectcell-${dayIdx}-${shiftIdx}`}
                              >
                                <div className="relative">
                                  {!shiftEditable ? (
                                    <div className="w-full font-semibold text-[13px] text-emerald-700/60 border border-neutral-200/60 rounded-xl bg-neutral-100 px-3 h-10 flex items-center truncate">
                                      {projectOptions.length === 0
                                        ? "N/A"
                                        : shift.project || "—"}
                                    </div>
                                  ) : projectOptions.length === 0 ? (
                                    <div className="w-full font-semibold text-[13px] text-neutral-400 border border-neutral-200/80 rounded-xl bg-neutral-100/70 px-3 h-10 flex items-center justify-between cursor-not-allowed select-none opacity-60">
                                      <span>N/A</span>
                                      <ChevronDown className="w-4 h-4 text-neutral-300" />
                                    </div>
                                  ) : (
                                    <Select
                                      value={shift.project || ""}
                                      onValueChange={(val) =>
                                        handleProjectSelect(
                                          dayIdx,
                                          shiftIdx,
                                          val,
                                        )
                                      }
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        (!shift.startTime && !shift.endTime)
                                      }
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          "flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[13px] h-10 cursor-pointer",
                                          shift.project
                                            ? "text-emerald-700"
                                            : "text-neutral-400 font-medium",
                                        )}
                                      >
                                        <SelectValue placeholder="Select Project" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                        {projectOptions.map((opt) => (
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
                                  )}
                                </div>
                              </td>
                            )}

                            <td className="py-3 px-2 text-left align-middle">
                              {!shiftEditable ? (
                                <div className="w-full font-medium text-[13px] text-neutral-400 border border-neutral-200/60 rounded-xl bg-neutral-100 px-2 h-10 flex items-center truncate">
                                  {shift.notes || "—"}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  disabled={
                                    !shiftEditable ||
                                    submitting ||
                                    (!shift.startTime && !shift.endTime)
                                  }
                                  value={shift.notes}
                                  onChange={(e) =>
                                    handleNotesChange(
                                      dayIdx,
                                      shiftIdx,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Add notes..."
                                  className="w-full border border-neutral-200 rounded-xl bg-white px-2 py-2 text-[13px] font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed h-10"
                                />
                              )}
                            </td>

                            <td className="py-3 px-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-1">
                                {/* Add shift: only on last shift of the day */}
                                {isLastShift && dayEditable && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleAddShift(dayIdx)}
                                    title="Add another shift"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#0A2924] hover:bg-[#0A2924]/10 border border-[#0A2924]/25 transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {/* Spacer when not last shift so trash stays aligned */}
                                {!isLastShift && <div className="w-7 h-7" />}

                                {/* Delete shift */}
                                {shiftEditable && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() =>
                                      handleDeleteShift(dayIdx, shiftIdx)
                                    }
                                    title="Delete shift"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 border border-red-200/60 transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}

                    {filteredWeekDays.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-12 text-center text-neutral-400 font-medium text-xs"
                        >
                          No matching timesheet entries found for this week.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="border-t border-neutral-200 px-6 py-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {lastSavedTime && (
                    <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium select-none">
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
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={submitting}
                    className="inline-flex items-center bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 px-5 py-2 rounded-full text-[14px] font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 shadow-2xs"
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
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ═══ MOBILE VIEW ════════════════════════════════════════════════════ */}
      <div className="block md:hidden bg-white p-1">
        {/* Mobile header card */}
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
              className="flex-1 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-2.5 py-2.5 rounded-full text-xs font-semibold transition duration-200 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Previous Week
            </button>
          </div>
        </div>

        {/* Staff select */}
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

        {/* Search + week nav */}
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
            ref={mobileCalendarRef}
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
                  weekStartsOn={settings?.week_starts_on}
                  className="shadow-xl border border-neutral-200 rounded-2xl bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Day cards */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 mt-4">
          <div className="flex flex-col space-y-3">
            {filteredWeekDays.map(({ day, index: dayIdx }) => {
              const isExpanded = expandedDayIdx === dayIdx;
              const dayEditable =
                !day.isFuture &&
                checkIsDateEditable(day.dateStr, day.shifts[0]?.status || "");
              const dayTotalHours = day.shifts.reduce(
                (sum, s) =>
                  sum +
                  calculateShiftHours(s.startTime, s.endTime, s.unpaidBreak),
                0,
              );

              return (
                <div
                  key={day.dateStr}
                  className={cn(
                    "bg-white border border-neutral-200 rounded-[24px] shadow-sm transition-all overflow-hidden",
                    (!dayEditable || day.isFuture) &&
                      "opacity-60 bg-neutral-50/20",
                  )}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer select-none"
                    onClick={() =>
                      setExpandedDayIdx(isExpanded ? null : dayIdx)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 shrink-0 text-center bg-neutral-100 text-neutral-600 font-bold px-1.5 py-1 rounded-lg text-xs leading-none">
                        {day.dayName}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-neutral-950 font-bold text-sm leading-tight">
                          {day.displayDate}
                        </span>
                        <span className="text-neutral-500 text-[11px] leading-tight mt-0.5 font-medium">
                          {day.shifts.length === 0
                            ? "No shifts added"
                            : `${day.shifts.length} shift${day.shifts.length > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold text-sm">
                        {dayTotalHours > 0
                          ? `${dayTotalHours.toFixed(1)}h`
                          : "0.0h"}
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
                      "border-t border-neutral-100 bg-white",
                      isExpanded ? "block" : "hidden",
                    )}
                  >
                    {/* Empty state */}
                    {day.shifts.length === 0 ? (
                      <div className="px-4 py-6 flex flex-col items-center gap-3">
                        <p className="text-neutral-400 text-xs font-medium">
                          No shifts have been added for this day.
                        </p>
                        {dayEditable && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleAddShift(dayIdx)}
                            className="inline-flex items-center gap-2 bg-[#0A2924] text-white px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Shift
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {day.shifts.map((shift, shiftIdx) => {
                          const shiftEditable =
                            dayEditable &&
                            checkIsDateEditable(day.dateStr, shift.status);
                          const availableLocations =
                            locationsMap[shift.businessId] || [];
                          const hours = calculateShiftHours(
                            shift.startTime,
                            shift.endTime,
                            shift.unpaidBreak,
                          );

                          return (
                            <div
                              key={shift.shiftId}
                              className={cn(
                                "px-4 py-4",
                                shiftIdx < day.shifts.length - 1 &&
                                  "border-b border-neutral-100",
                              )}
                            >
                              {/* Shift header */}
                              <div className="flex items-center justify-between mb-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 font-bold text-[10px]">
                                  Shift {shiftIdx + 1}
                                </span>
                                {shiftEditable && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() =>
                                      handleDeleteShift(dayIdx, shiftIdx)
                                    }
                                    className="flex items-center gap-1 text-red-400 hover:text-red-600 text-[11px] font-semibold transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Business */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                    Business
                                  </label>
                                  {!shiftEditable ? (
                                    <div className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 h-10 flex items-center truncate">
                                      {businesses.find(
                                        (b) => b.id === shift.businessId,
                                      )?.name || "—"}
                                    </div>
                                  ) : (
                                    <Select
                                      value={shift.businessId || ""}
                                      onValueChange={(val) =>
                                        handleBusinessChange(
                                          dayIdx,
                                          shiftIdx,
                                          val,
                                        )
                                      }
                                      disabled={!shiftEditable || submitting}
                                    >
                                      <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left font-semibold text-xs text-neutral-900 flex items-center justify-between">
                                        <SelectValue placeholder="Select Business" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                        {businesses.map((b) => (
                                          <SelectItem
                                            key={b.id}
                                            value={b.id}
                                            className="rounded-lg px-3 py-2 text-xs font-semibold"
                                          >
                                            {b.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>

                                {/* Location */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                    Location
                                  </label>
                                  {!shiftEditable ? (
                                    <div className="w-full bg-neutral-50/50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 h-10 flex items-center truncate">
                                      {availableLocations.find(
                                        (l) => l.id === shift.locationId,
                                      )?.name ||
                                        shift.locationName ||
                                        "—"}
                                    </div>
                                  ) : (
                                    <Select
                                      value={shift.locationId || ""}
                                      onValueChange={(val) =>
                                        handleLocationChange(
                                          dayIdx,
                                          shiftIdx,
                                          val,
                                        )
                                      }
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        availableLocations.length === 0
                                      }
                                    >
                                      <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left font-semibold text-xs text-neutral-900 flex items-center justify-between">
                                        <SelectValue placeholder="Select Location" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                        {availableLocations.map((l) => (
                                          <SelectItem
                                            key={l.id}
                                            value={l.id}
                                            className="rounded-lg px-3 py-2 text-xs font-semibold"
                                          >
                                            {l.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>

                                {/* Start Time */}
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                    Start Time
                                  </label>
                                  <div
                                    className="relative"
                                    id={`timecell-mobile-${dayIdx}-${shiftIdx}-start`}
                                  >
                                    {!shiftEditable ? (
                                      <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
                                        {shift.startTime
                                          ? formatTimeToAMPM(shift.startTime)
                                          : "—"}
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          disabled={submitting}
                                          onClick={() =>
                                            setOpenTimePicker({
                                              dayIndex: dayIdx,
                                              shiftIndex: shiftIdx,
                                              type: "start",
                                            })
                                          }
                                          className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                        >
                                          <span>
                                            {shift.startTime
                                              ? formatTimeToAMPM(
                                                  shift.startTime,
                                                )
                                              : "—"}
                                          </span>
                                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                                        </button>
                                        {openTimePicker?.dayIndex === dayIdx &&
                                          openTimePicker?.shiftIndex ===
                                            shiftIdx &&
                                          openTimePicker?.type === "start" && (
                                            <TimePicker
                                              value={shift.startTime}
                                              onChange={(val, source) => {
                                                handleTimeChange(
                                                  dayIdx,
                                                  shiftIdx,
                                                  "start",
                                                  val,
                                                );
                                                if (source === "period") {
                                                  setOpenTimePicker(null);
                                                }
                                              }}
                                              className="left-0 right-auto mt-2 shadow-2xl border border-neutral-200 rounded-2xl z-50"
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
                                    id={`timecell-mobile-${dayIdx}-${shiftIdx}-end`}
                                  >
                                    {!shiftEditable ? (
                                      <div className="flex items-center justify-center w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10">
                                        {shift.endTime
                                          ? formatTimeToAMPM(shift.endTime)
                                          : "—"}
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          disabled={submitting}
                                          onClick={() =>
                                            setOpenTimePicker({
                                              dayIndex: dayIdx,
                                              shiftIndex: shiftIdx,
                                              type: "end",
                                            })
                                          }
                                          className="flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50 px-3 py-2 text-left focus:outline-none focus:border-neutral-900 transition group cursor-pointer font-medium text-[13px] text-neutral-900 h-10 disabled:opacity-50"
                                        >
                                          <span>
                                            {shift.endTime
                                              ? formatTimeToAMPM(shift.endTime)
                                              : "—"}
                                          </span>
                                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                                        </button>
                                        {openTimePicker?.dayIndex === dayIdx &&
                                          openTimePicker?.shiftIndex ===
                                            shiftIdx &&
                                          openTimePicker?.type === "end" && (
                                            <TimePicker
                                              value={shift.endTime}
                                              onChange={(val, source) => {
                                                handleTimeChange(
                                                  dayIdx,
                                                  shiftIdx,
                                                  "end",
                                                  val,
                                                );
                                                if (source === "period") {
                                                  setOpenTimePicker(null);
                                                }
                                              }}
                                              className="right-0! left-auto! mt-2 shadow-2xl border border-neutral-200 rounded-2xl z-50"
                                            />
                                          )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Unpaid Break */}
                              <div className="flex flex-col gap-1.5 mt-3">
                                <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                  Unpaid Break (Minutes)
                                </label>
                                {!shiftEditable ? (
                                  <div className="w-full border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 font-medium text-[13px] text-neutral-400 h-10 flex items-center">
                                    {shift.unpaidBreak} mins
                                  </div>
                                ) : (
                                  <div className="relative w-full">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        (!shift.startTime && !shift.endTime) ||
                                        settings?.require_break_entry === false
                                      }
                                      value={shift.unpaidBreak}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || /^\d*$/.test(val)) {
                                          handleBreakChange(
                                            dayIdx,
                                            shiftIdx,
                                            val,
                                          );
                                        }
                                      }}
                                      className="w-full border border-neutral-200 rounded-xl bg-white pl-3 pr-10 py-2 focus:outline-none focus:border-neutral-900 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed font-medium text-[13px] text-neutral-900 h-10"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pr-1">
                                      <button
                                        type="button"
                                        disabled={
                                          !shiftEditable ||
                                          submitting ||
                                          (!shift.startTime &&
                                            !shift.endTime) ||
                                          settings?.require_break_entry ===
                                            false
                                        }
                                        onClick={() => {
                                          const cur =
                                            parseInt(shift.unpaidBreak, 10) ||
                                            0;
                                          handleBreakChange(
                                            dayIdx,
                                            shiftIdx,
                                            (cur + 5).toString(),
                                          );
                                        }}
                                        className="text-neutral-400 hover:text-neutral-800 disabled:opacity-40"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={
                                          !shiftEditable ||
                                          submitting ||
                                          (!shift.startTime &&
                                            !shift.endTime) ||
                                          settings?.require_break_entry ===
                                            false
                                        }
                                        onClick={() => {
                                          const cur =
                                            parseInt(shift.unpaidBreak, 10) ||
                                            0;
                                          handleBreakChange(
                                            dayIdx,
                                            shiftIdx,
                                            Math.max(0, cur - 5).toString(),
                                          );
                                        }}
                                        className="text-neutral-400 hover:text-neutral-800 disabled:opacity-40"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Project */}
                              {showProjectColumn && (
                                <div className="flex flex-col gap-1.5 mt-3">
                                  <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                    Project
                                  </label>
                                  {!shiftEditable ? (
                                    <div className="w-full font-semibold text-[13px] text-emerald-700/60 border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 h-10 flex items-center truncate">
                                      {projectOptions.length === 0
                                        ? "N/A"
                                        : shift.project || "—"}
                                    </div>
                                  ) : projectOptions.length === 0 ? (
                                    <div className="w-full font-semibold text-[13px] text-neutral-400 border border-neutral-200/80 rounded-xl bg-neutral-100/70 px-3 h-10 flex items-center justify-between cursor-not-allowed select-none opacity-60">
                                      <span>N/A</span>
                                      <ChevronDown className="w-4 h-4 text-neutral-300" />
                                    </div>
                                  ) : (
                                    <Select
                                      value={shift.project || ""}
                                      onValueChange={(val) =>
                                        handleProjectSelect(
                                          dayIdx,
                                          shiftIdx,
                                          val,
                                        )
                                      }
                                      disabled={
                                        !shiftEditable ||
                                        submitting ||
                                        (!shift.startTime && !shift.endTime)
                                      }
                                    >
                                      <SelectTrigger
                                        className={cn(
                                          "flex items-center justify-between w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-left focus:outline-none focus:border-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-[13px] h-10 cursor-pointer",
                                          shift.project
                                            ? "text-emerald-700"
                                            : "text-neutral-400 font-medium",
                                        )}
                                      >
                                        <SelectValue placeholder="Select Project" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                                        {projectOptions.map((opt) => (
                                          <SelectItem
                                            value={opt}
                                            key={opt}
                                            className="rounded-lg px-3 py-2 text-[13px] font-semibold text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 cursor-pointer"
                                          >
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              )}

                              {/* Notes */}
                              <div className="flex flex-col gap-1.5 mt-3">
                                <label className="text-neutral-400 font-bold text-[9px] uppercase tracking-wider pl-0.5">
                                  Notes
                                </label>
                                {!shiftEditable ? (
                                  <div className="w-full font-medium text-xs text-neutral-400 border border-neutral-200/60 rounded-xl bg-neutral-50 px-3 py-2 min-h-[60px] flex items-start">
                                    {shift.notes || "—"}
                                  </div>
                                ) : (
                                  <textarea
                                    disabled={
                                      !shiftEditable ||
                                      submitting ||
                                      (!shift.startTime && !shift.endTime)
                                    }
                                    value={shift.notes}
                                    onChange={(e) =>
                                      handleNotesChange(
                                        dayIdx,
                                        shiftIdx,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Add Notes..."
                                    rows={3}
                                    className="w-full border border-neutral-200 rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed resize-none"
                                  />
                                )}
                              </div>

                              {/* Shift total hours */}
                              <div className="flex items-center justify-between border-t border-neutral-100 mt-4 pt-3">
                                <span className="text-neutral-500 text-xs font-semibold">
                                  Shift Hours
                                </span>
                                <span className="text-emerald-700 font-bold text-sm">
                                  {hours > 0 ? `${hours.toFixed(1)}h` : "0.0h"}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add another shift button */}
                        {dayEditable && (
                          <div className="px-4 py-3 border-t border-neutral-100">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleAddShift(dayIdx)}
                              className="w-full inline-flex items-center justify-center gap-2 border border-dashed border-neutral-300 hover:border-[#0A2924]/40 hover:bg-[#0A2924]/3 text-neutral-500 hover:text-[#0A2924] px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Another Shift
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile submit footer */}
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

      {/* ═══ CONFIRM MODAL ══════════════════════════════════════════════════ */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#0A2924]/30 backdrop-blur-sm flex items-center justify-center z-100 p-4 select-none animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-neutral-900 leading-tight">
                  Confirm Submission
                </h3>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                  Review your weekly hours summary before submitting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-gutter-stable">
              <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4 flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">
                    Staff Member
                  </span>
                  <span className="font-bold text-neutral-900">
                    {selectedStaffName}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-neutral-500 font-semibold">
                    Selected Week
                  </span>
                  <span className="font-bold text-emerald-800">
                    {formatWeekRangeShort(currentWeekStart)}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-neutral-100 pr-1">
                {confirmDays.map((day) => {
                  const dayHours = day.shifts.reduce(
                    (sum, s) =>
                      sum +
                      calculateShiftHours(
                        s.startTime,
                        s.endTime,
                        s.unpaidBreak,
                      ),
                    0,
                  );
                  const hasShifts = day.shifts.length > 0;

                  return (
                    <div key={day.dateStr} className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-900">
                            {day.dayName}
                          </span>
                          <span className="text-[10px] font-medium text-neutral-500">
                            {day.displayDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasShifts ? (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                              No shifts
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-800">
                              {dayHours.toFixed(1)} hrs
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Shifts breakdown */}
                      {day.shifts.map((shift, sIdx) => {
                        const hours = calculateShiftHours(
                          shift.startTime,
                          shift.endTime,
                          shift.unpaidBreak,
                        );
                        const bizName =
                          businesses.find((b) => b.id === shift.businessId)
                            ?.name || "";
                        const locName =
                          (locationsMap[shift.businessId] || []).find(
                            (l) => l.id === shift.locationId,
                          )?.name || "";

                        return (
                          <div
                            key={shift.shiftId}
                            className="flex items-center justify-between mt-1.5 pl-3 border-l-2 border-neutral-100"
                          >
                            <span className="text-[10px] text-neutral-500 font-medium">
                              Shift {sIdx + 1}
                              {bizName && ` · ${bizName}`}
                              {locName && ` (${locName})`}
                            </span>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-emerald-800">
                                {hours.toFixed(1)} hrs
                              </span>
                              <span className="text-[9px] font-semibold text-neutral-400 leading-tight">
                                {formatTimeToAMPM(shift.startTime)} –{" "}
                                {formatTimeToAMPM(shift.endTime)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-neutral-100 bg-neutral-50/50 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-700">
                  Total Weekly Hours
                </span>
                <span className="text-base font-black text-emerald-800 bg-[#BAEBCE]/40 px-3 py-1.5 rounded-xl border border-[#BAEBCE]/20 leading-none">
                  {confirmDays
                    .reduce(
                      (sum, day) =>
                        sum +
                        day.shifts.reduce(
                          (s, shift) =>
                            s +
                            calculateShiftHours(
                              shift.startTime,
                              shift.endTime,
                              shift.unpaidBreak,
                            ),
                          0,
                        ),
                      0,
                    )
                    .toFixed(1)}{" "}
                  hrs
                </span>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-white border border-neutral-200 hover:border-neutral-500 text-neutral-750 py-3 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeSubmit(confirmDays)}
                  className="flex-1 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white py-3 rounded-full text-xs font-bold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
