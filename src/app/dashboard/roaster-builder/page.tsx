"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Sparkles,
  Check,
  AlertTriangle,
  Info,
  Users,
  Search,
  CheckCircle,
  Save,
  Filter,
} from "lucide-react";

import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { useStaffStore } from "@/stores/staff-store";
import {
  getRosterSettings,
  RosterSettings,
} from "@/lib/repositories/roster-settings.repository";
import { getAvailabilityOverview } from "@/lib/repositories/availability.repository";
import { AvailabilityOverviewItem } from "@/types/availability";
import {
  getRosterShifts,
  bulkSaveRosterShifts,
  copyPreviousWeekRoster,
  publishRoster,
  autoBuildRoster,
} from "@/lib/repositories/roster.repository";
import { RosterShift, RosterShiftCreateInput } from "@/types/roster";

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

const formatDayName = (date: Date) => {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
};

const generateTempId = () => `temp-${Date.now()}`;
const getNowISOString = () => new Date().toISOString();
const getNowLocalTimeString = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export default function RosterBuilderPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { staffMembers, fetchStaffMembers } = useStaffStore();

  const [currentStartDate, setCurrentStartDate] = useState<Date>(() =>
    getMonday(new Date()),
  );
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [settings, setSettings] = useState<RosterSettings | null>(null);
  const [availabilityOverview, setAvailabilityOverview] = useState<
    AvailabilityOverviewItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [selectedCell, setSelectedCell] = useState<{
    locationId: string;
    dateStr: string;
    shiftName: string;
    timeFrom: string;
    timeTo: string;
  } | null>(null);

  const [showWarningDetails, setShowWarningDetails] = useState(false);

  const endDate = new Date(currentStartDate);
  endDate.setDate(currentStartDate.getDate() + 6);

  const startStr = formatDateYYYYMMDD(currentStartDate);
  const endStr = formatDateYYYYMMDD(endDate);

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;
    async function loadData() {
      try {
        setLoading(true);
        await fetchLocations(businessId);
        await fetchStaffMembers(businessId);

        const rosterShiftsData = await getRosterShifts(
          businessId,
          startStr,
          endStr,
        );
        setShifts(rosterShiftsData);

        try {
          const rosterSettings = await getRosterSettings(businessId);
          setSettings(rosterSettings);
        } catch (err) {
          console.error("Failed to load roster settings:", err);
        }

        const overviewData = await getAvailabilityOverview(
          businessId,
          startStr,
          endStr,
        );
        setAvailabilityOverview(overviewData);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load roster builder details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeBusinessId, startStr, endStr, fetchLocations, fetchStaffMembers]);

  const handlePrevWeek = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(currentStartDate.getDate() - 7);
    setCurrentStartDate(newStart);
    setCopiedFrom(null);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(currentStartDate.getDate() + 7);
    setCurrentStartDate(newStart);
    setCopiedFrom(null);
  };

  const handleToday = () => {
    setCurrentStartDate(getMonday(new Date()));
    setCopiedFrom(null);
  };

  const getDatesOfWeek = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentStartDate);
      d.setDate(currentStartDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const datesOfWeek = getDatesOfWeek();

  const getShiftTimes = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    if (name.includes("morning") || name.includes("opening")) {
      return { timeFrom: "06:00", timeTo: "11:00" };
    }
    if (name.includes("afternoon")) {
      return { timeFrom: "11:00", timeTo: "15:00" };
    }
    if (name.includes("evening") || name.includes("closing")) {
      return { timeFrom: "15:00", timeTo: "21:00" };
    }
    return { timeFrom: "09:00", timeTo: "17:00" };
  };

  const getRequiredCount = useCallback(
    (shiftName: string) => {
      if (!settings) return 2;
      const reqRoles = settings.required_roles?.find(
        (r) => r.shift_type === shiftName,
      );
      if (!reqRoles) return 2;
      return reqRoles.roles.reduce((sum, r) => sum + r.min_count, 0) || 2;
    },
    [settings],
  );

  // Get active shifts definitions (from roster settings or defaults)
  const shiftTypes = (
    settings?.default_shift_types || [
      { name: "Morning Shift", hours: 6.0, color: "#FFB020" },
      { name: "Afternoon Shift", hours: 6.0, color: "#1976D2" },
      { name: "Evening Shift", hours: 6.0, color: "#7B61FF" },
    ]
  ).map((st) => {
    const times = getShiftTimes(st.name);
    return {
      name: st.name,
      hours: st.hours,
      color: st.color,
      timeFrom: times.timeFrom,
      timeTo: times.timeTo,
      requiredCount: getRequiredCount(st.name),
    };
  });

  // Helper to calculate weekly hours for staff inside the currently constructed shifts list
  const getStaffWeeklyHours = useCallback(() => {
    const hoursMap: Record<string, number> = {};
    shifts.forEach((s) => {
      if (s.userId) {
        let hrs = 6.0;
        try {
          const [hFrom, mFrom] = s.timeFrom.split(":").map(Number);
          const [hTo, mTo] = s.timeTo.split(":").map(Number);
          hrs = (hTo * 60 + mTo - (hFrom * 60 + mFrom)) / 60.0;
          if (hrs < 0) hrs += 24.0; // handle wrap around shifts
        } catch {
          hrs = 6.0;
        }
        hoursMap[s.userId] = (hoursMap[s.userId] || 0) + hrs;
      }
    });
    return hoursMap;
  }, [shifts]);

  const weeklyHours = getStaffWeeklyHours();

  // Helper to determine if a staff member worked on the previous day
  const workedPreviousDay = useCallback(
    (userId: string, dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      const prevDateStr = formatDateYYYYMMDD(d);
      return shifts.some((s) => s.userId === userId && s.date === prevDateStr);
    },
    [shifts],
  );

  // Check if staff has overlapping shifts on the same day
  const hasOverlap = useCallback(
    (
      userId: string,
      dateStr: string,
      timeFrom: string,
      timeTo: string,
      excludeShiftId?: string,
    ) => {
      return shifts.some((s) => {
        if (
          s.id === excludeShiftId ||
          s.userId !== userId ||
          s.date !== dateStr
        ) {
          return false;
        }
        return timeFrom < s.timeTo && s.timeFrom < timeTo;
      });
    },
    [shifts],
  );

  // Check if user is available for a shift based on submissions
  const isAvailableForShift = useCallback(
    (userId: string, dateStr: string, timeFrom: string, timeTo: string) => {
      // If no submissions exist, we can fallback to true/false.
      // In our overview, the backend determines availability. We can look up in availabilityOverview
      const matchedOverview = availabilityOverview.find(
        (item) =>
          item.date === dateStr &&
          item.timeFrom === timeFrom &&
          item.timeTo === timeTo,
      );
      if (matchedOverview) {
        return matchedOverview.staffMembers.some((sm) => sm.id === userId);
      }
      return true; // assume available if no details
    },
    [availabilityOverview],
  );

  // Warnings check
  const calculateWarnings = useCallback(() => {
    const warnings: string[] = [];

    // 1. Check unfilled shifts
    locations.forEach((loc) => {
      datesOfWeek.forEach((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        shiftTypes.forEach((st) => {
          const matchingShifts = shifts.filter(
            (s) =>
              s.locationId === loc.id &&
              s.date === dateStr &&
              s.shiftName === st.name,
          );

          const assignedCount = matchingShifts.filter((s) => s.userId).length;
          const required = st.requiredCount;
          if (assignedCount < required) {
            warnings.push(
              `Location "${loc.name}" on ${formatDayName(date)} ${date.getDate()} ${date.toLocaleDateString("en-GB", { month: "short" })}: "${st.name}" has only ${assignedCount}/${required} staff assigned.`,
            );
          }
        });
      });
    });

    // 2. Overlap, weekly hours limit, and availability checks
    shifts.forEach((s) => {
      if (!s.userId || !s.user) return;
      const user = s.user;

      // Check weekly hours limit
      const limit = user.max_working_hours || 40.0;
      const hours = weeklyHours[s.userId] || 0;
      if (hours > limit) {
        const warning = `${user.name || "Unknown"} exceeds maximum weekly limit (${hours.toFixed(1)} / ${limit} hrs).`;
        if (!warnings.includes(warning)) {
          warnings.push(warning);
        }
      }

      // Check overlap
      if (hasOverlap(s.userId, s.date, s.timeFrom, s.timeTo, s.id)) {
        const warning = `${user.name || "Unknown"} has overlapping assignments on ${s.date}.`;
        if (!warnings.includes(warning)) {
          warnings.push(warning);
        }
      }

      // Check availability
      if (!isAvailableForShift(s.userId, s.date, s.timeFrom, s.timeTo)) {
        const warning = `${user.name || "Unknown"} is assigned on ${s.date} (${s.timeFrom}-${s.timeTo}) but marked themselves as unavailable.`;
        if (!warnings.includes(warning)) {
          warnings.push(warning);
        }
      }
    });

    return warnings;
  }, [
    locations,
    datesOfWeek,
    shiftTypes,
    shifts,
    weeklyHours,
    hasOverlap,
    isAvailableForShift,
  ]);

  const warningsList = calculateWarnings();

  // Metrics calculations
  const calculateMetrics = () => {
    // Total required shifts is sum of required counts for all cells
    let totalShifts = 0;
    locations.forEach(() => {
      datesOfWeek.forEach(() => {
        shiftTypes.forEach((st) => {
          totalShifts += st.requiredCount;
        });
      });
    });

    // Filled shifts = count of assignments
    const filled = shifts.filter((s) => s.userId).length;
    const unfilled = Math.max(0, totalShifts - filled);

    // Total labour hours
    let totalLabourHours = 0;
    shifts.forEach((s) => {
      if (s.userId) {
        try {
          const [hFrom, mFrom] = s.timeFrom.split(":").map(Number);
          const [hTo, mTo] = s.timeTo.split(":").map(Number);
          let hrs = (hTo * 60 + mTo - (hFrom * 60 + mFrom)) / 60.0;
          if (hrs < 0) hrs += 24;
          totalLabourHours += hrs;
        } catch {
          totalLabourHours += 6.0;
        }
      }
    });

    return {
      totalShifts,
      filled,
      unfilled,
      totalLabourHours: Math.round(totalLabourHours),
      warningsCount: warningsList.length,
    };
  };

  const metrics = calculateMetrics();

  // Bulk Save Draft
  const handleSaveDraft = async () => {
    if (!activeBusinessId) return;
    try {
      setSaving(true);
      const payload: RosterShiftCreateInput[] = shifts.map((s) => ({
        id: s.id.startsWith("temp-") ? undefined : s.id,
        location_id: s.locationId,
        user_id: s.userId,
        date: s.date,
        shift_name: s.shiftName,
        time_from: s.timeFrom,
        time_to: s.timeTo,
        required_count: s.requiredCount,
        status: s.status,
      }));

      const res = await bulkSaveRosterShifts(
        activeBusinessId,
        payload,
        startStr,
        endStr,
      );
      setShifts(res);
      setLastSaved(getNowLocalTimeString());
      toast.success("Roster draft saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save roster draft.");
    } finally {
      setSaving(false);
    }
  };

  // Copy Previous Week
  const handleCopyPreviousWeek = async () => {
    if (!activeBusinessId) return;
    const prevStart = new Date(currentStartDate);
    prevStart.setDate(currentStartDate.getDate() - 7);
    const prevStartStr = formatDateYYYYMMDD(prevStart);

    try {
      setSaving(true);
      const res = await copyPreviousWeekRoster(
        activeBusinessId,
        prevStartStr,
        startStr,
      );
      toast.success(res.message || "Roster copied from previous week.");
      setCopiedFrom(
        formatDateRange(
          prevStart,
          new Date(prevStart.getTime() + 6 * 86400000),
        ),
      );

      const rosterShiftsData = await getRosterShifts(
        activeBusinessId,
        startStr,
        endStr,
      );
      setShifts(rosterShiftsData);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to copy previous week's roster.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Auto Build Roster
  const handleAutoBuild = async () => {
    if (!activeBusinessId) return;
    try {
      setAutoBuilding(true);
      const res = await autoBuildRoster(activeBusinessId, startStr, endStr);
      setShifts(res);
      toast.success("Auto builder completed successfully!");
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Auto build encountered errors.");
      }
    } finally {
      setAutoBuilding(false);
    }
  };

  // Publish Roster
  const handlePublishRoster = async () => {
    if (!activeBusinessId) return;
    try {
      setPublishing(true);
      const res = await publishRoster(activeBusinessId, startStr, endStr);
      toast.success(res.message || "Roster published successfully!");

      // Reload
      const rosterShiftsData = await getRosterShifts(
        activeBusinessId,
        startStr,
        endStr,
      );
      setShifts(rosterShiftsData);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to publish roster.");
      }
    } finally {
      setPublishing(false);
    }
  };

  // Cell interaction modal/dropdown logic
  const openAssignModal = (
    locationId: string,
    dateStr: string,
    shiftName: string,
    timeFrom: string,
    timeTo: string,
  ) => {
    setSelectedCell({ locationId, dateStr, shiftName, timeFrom, timeTo });
  };

  const handleAddStaffToCell = (staffId: string) => {
    if (!selectedCell) return;
    const staff = staffMembers.find((s) => s.id === staffId);
    if (!staff) return;

    // Check if shift assignment already exists
    const cellShifts = shifts.filter(
      (s) =>
        s.locationId === selectedCell.locationId &&
        s.date === selectedCell.dateStr &&
        s.shiftName === selectedCell.shiftName,
    );

    const alreadyAssigned = cellShifts.some((s) => s.userId === staffId);
    if (alreadyAssigned) {
      toast.warning("Staff already assigned to this shift.");
      return;
    }

    // Determine target required count
    const matchingSt = shiftTypes.find(
      (s) => s.name === selectedCell.shiftName,
    );
    const required = matchingSt?.requiredCount || 2;

    // Look for a blank template shift in this cell to populate, otherwise create a new shift entry
    const blankShiftIndex = shifts.findIndex(
      (s) =>
        s.locationId === selectedCell.locationId &&
        s.date === selectedCell.dateStr &&
        s.shiftName === selectedCell.shiftName &&
        !s.userId,
    );

    const rosterUser = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      priority: staff.priority || 5,
      position: staff.position,
      max_working_hours: staff.maxWorkingHours,
    };

    if (blankShiftIndex !== -1) {
      setShifts((prev) =>
        prev.map((s, idx) =>
          idx === blankShiftIndex
            ? {
                ...s,
                userId: staffId,
                user: rosterUser,
                updatedAt: getNowISOString(),
              }
            : s,
        ),
      );
    } else {
      // Create new shift instance
      const newShift: RosterShift = {
        id: generateTempId(),
        businessId: activeBusinessId || "",
        locationId: selectedCell.locationId,
        userId: staffId,
        date: selectedCell.dateStr,
        shiftName: selectedCell.shiftName,
        timeFrom: selectedCell.timeFrom,
        timeTo: selectedCell.timeTo,
        requiredCount: required,
        status: "draft",
        createdAt: getNowISOString(),
        updatedAt: getNowISOString(),
        user: rosterUser,
      };
      setShifts((prev) => [...prev, newShift]);
    }

    toast.success(`Assigned ${staff.name} to ${selectedCell.shiftName} Shift.`);
  };

  const handleRemoveStaffFromCell = (
    locationId: string,
    dateStr: string,
    shiftName: string,
    staffId: string,
  ) => {
    // Find the shift matching this assignment and unassign it
    const assignedIndex = shifts.findIndex(
      (s) =>
        s.locationId === locationId &&
        s.date === dateStr &&
        s.shiftName === shiftName &&
        s.userId === staffId,
    );

    if (assignedIndex !== -1) {
      setShifts((prev) =>
        prev.map((s, idx) =>
          idx === assignedIndex
            ? {
                ...s,
                userId: null,
                user: null,
                updatedAt: getNowISOString(),
              }
            : s,
        ),
      );
      toast.info("Unassigned staff member.");
    }
  };

  // Available staff list on the side (sorted by priority number 1, 2, 3...)
  const filteredAvailableStaff = staffMembers
    .filter((s) => {
      const q = staffSearchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.position && s.position.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.priority || 5) - (b.priority || 5));

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Users className="h-8 w-8 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing roster information...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[1700px] mx-auto p-4 md:p-6 space-y-6 bg-white min-h-[90vh]">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#16A34A] uppercase tracking-wider">
            <span>Roster Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-950 mt-1 tracking-tight flex items-center gap-2">
            Roster Builder
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
            Create, manage and auto-generate weekly rosters for your staff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto xl:justify-end">
          {/* Week Selector */}
          <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl p-1 shadow-2xs">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-600" />
            </button>
            <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 px-3">
              <Calendar className="h-3.5 w-3.5 text-[#16A34A]" />
              <span>{formatDateRange(currentStartDate, endDate)}</span>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-extrabold text-zinc-700 transition shadow-2xs"
          >
            Today
          </button>

          <button
            onClick={handleCopyPreviousWeek}
            disabled={saving}
            className="px-4 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-extrabold text-zinc-700 hover:text-zinc-900 transition shadow-2xs bg-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Previous Week</span>
          </button>

          <button
            onClick={handleAutoBuild}
            disabled={autoBuilding}
            className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{autoBuilding ? "Auto Building..." : "Auto Build"}</span>
          </button>

          <button
            onClick={handlePublishRoster}
            disabled={publishing}
            className="px-4 py-2 bg-[#16A34A] text-white hover:bg-[#15803D] rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5 stroke-[3px]" />
            <span>{publishing ? "Publishing..." : "Publish Roster"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
            Total Shifts
          </span>
          <span className="text-2xl font-extrabold text-zinc-900 block mt-1">
            {metrics.totalShifts}
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#16A34A] block tracking-wider">
            Filled
          </span>
          <span className="text-2xl font-extrabold text-[#16A34A] block mt-1">
            {metrics.filled}
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-500 block tracking-wider">
            Unfilled
          </span>
          <span className="text-2xl font-extrabold text-rose-500 block mt-1">
            {metrics.unfilled}
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">
            Total Labour Hours
          </span>
          <span className="text-2xl font-extrabold text-zinc-900 block mt-1">
            {metrics.totalLabourHours} hrs
          </span>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-bold text-amber-500 block tracking-wider">
            Warnings
          </span>
          <span className="text-2xl font-extrabold text-amber-500 block mt-1 items-center gap-1.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {metrics.warningsCount}
          </span>
        </div>
      </div>

      {copiedFrom && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs font-medium">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Copied roster configuration successfully from week:{" "}
            <strong>{copiedFrom}</strong>. (Shifts copied as draft)
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-9 space-y-4">
          <div className="border border-zinc-200 rounded-2xl overflow-x-auto shadow-2xs bg-white">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-4 py-3 text-left text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider w-48 border-r border-zinc-200">
                    Location / Shift
                  </th>
                  {datesOfWeek.map((date, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-3 text-center text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider"
                    >
                      <div className="font-extrabold text-zinc-900 text-xs">
                        {formatDayName(date)}
                      </div>
                      <div className="font-medium text-[10px] text-zinc-400 mt-0.5">
                        {date.getDate()}{" "}
                        {date.toLocaleDateString("en-GB", { month: "short" })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {locations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-xs font-semibold text-zinc-400 bg-zinc-50/20"
                    >
                      No locations configured. Go to Location settings to
                      configure.
                    </td>
                  </tr>
                ) : (
                  locations.map((loc) => {
                    return (
                      <tr
                        key={loc.id}
                        className="align-top hover:bg-zinc-50/20 transition-colors"
                      >
                        <td className="px-4 py-4 border-r border-zinc-200 font-extrabold text-zinc-900 text-xs space-y-3">
                          <div className="flex items-center gap-1.5 text-zinc-950 font-extrabold text-sm border-b border-zinc-100 pb-2">
                            <span>{loc.name}</span>
                          </div>
                          <div className="space-y-4 pt-2">
                            {shiftTypes.map((st) => (
                              <div
                                key={st.name}
                                className="space-y-0.5 opacity-90 pl-1"
                              >
                                <div className="text-[11px] font-bold text-zinc-800 flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: st.color }}
                                  />
                                  {st.name}
                                </div>
                                <div className="text-[9px] font-semibold text-zinc-400 pl-3">
                                  {st.timeFrom} - {st.timeTo}
                                </div>
                                <div className="text-[9px] font-semibold text-[#1976D2] pl-3">
                                  Required: {st.requiredCount}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {datesOfWeek.map((date) => {
                          const dateStr = formatDateYYYYMMDD(date);

                          return (
                            <td
                              key={dateStr}
                              className="p-3 border-r border-zinc-200 last:border-r-0"
                            >
                              <div className="space-y-4">
                                {shiftTypes.map((st) => {
                                  // Find current assignments for this location + date + shift definition
                                  const matchingShifts = shifts.filter(
                                    (s) =>
                                      s.locationId === loc.id &&
                                      s.date === dateStr &&
                                      s.shiftName === st.name,
                                  );

                                  const assignedStaff = matchingShifts.filter(
                                    (s) => s.userId && s.user,
                                  );
                                  const required = st.requiredCount;
                                  const count = assignedStaff.length;

                                  const isFilled = count === required;
                                  const isOverfilled = count > required;

                                  return (
                                    <div
                                      key={st.name}
                                      className={`p-2.5 rounded-xl border transition-all hover:shadow-sm ${
                                        isFilled
                                          ? "bg-emerald-50/40 border-emerald-200/60"
                                          : isOverfilled
                                            ? "bg-purple-50/40 border-purple-200/60"
                                            : count > 0
                                              ? "bg-amber-50/30 border-amber-200/60"
                                              : "bg-zinc-50/20 border-dashed border-zinc-200"
                                      }`}
                                    >
                                      {/* Assigned staff list */}
                                      <div className="space-y-1.5">
                                        {assignedStaff.map((s) => {
                                          const isUnavailable =
                                            !isAvailableForShift(
                                              s.userId!,
                                              dateStr,
                                              st.timeFrom,
                                              st.timeTo,
                                            );
                                          const prevWorked = workedPreviousDay(
                                            s.userId!,
                                            dateStr,
                                          );
                                          const overlapping = hasOverlap(
                                            s.userId!,
                                            dateStr,
                                            st.timeFrom,
                                            st.timeTo,
                                            s.id,
                                          );

                                          return (
                                            <div
                                              key={s.id}
                                              className="flex items-center justify-between gap-1 bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-bold shadow-3xs"
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <div
                                                  className={`w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold shrink-0 ${
                                                    isUnavailable || overlapping
                                                      ? "bg-rose-500"
                                                      : prevWorked
                                                        ? "bg-amber-500"
                                                        : "bg-zinc-800"
                                                  }`}
                                                >
                                                  {s.user?.name
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .substring(0, 2) || "SM"}
                                                </div>
                                                <span
                                                  className={`truncate ${
                                                    isUnavailable || overlapping
                                                      ? "text-rose-600"
                                                      : "text-zinc-800"
                                                  }`}
                                                  title={`${s.user?.name || "Staff"} (${weeklyHours[s.userId!]?.toFixed(0) || 0} hrs)`}
                                                >
                                                  {s.user?.name?.split(" ")[0]}{" "}
                                                  (
                                                  {weeklyHours[
                                                    s.userId!
                                                  ]?.toFixed(0) || 0}
                                                  )
                                                </span>
                                              </div>

                                              <button
                                                onClick={() =>
                                                  handleRemoveStaffFromCell(
                                                    loc.id,
                                                    dateStr,
                                                    st.name,
                                                    s.userId!,
                                                  )
                                                }
                                                className="text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                                                title="Unassign"
                                              >
                                                &times;
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Assigned Badge and Add button */}
                                      <div className="mt-2 flex items-center justify-between gap-1 text-[9px] font-bold">
                                        <span
                                          className={`${
                                            isFilled
                                              ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md"
                                              : isOverfilled
                                                ? "text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md"
                                                : count > 0
                                                  ? "text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md"
                                                  : "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md"
                                          }`}
                                        >
                                          {count}/{required} assigned
                                        </span>

                                        <button
                                          onClick={() =>
                                            openAssignModal(
                                              loc.id,
                                              dateStr,
                                              st.name,
                                              st.timeFrom,
                                              st.timeTo,
                                            )
                                          }
                                          className="text-[#16A34A] hover:text-[#15803D] hover:underline flex items-center gap-0.5 cursor-pointer font-extrabold"
                                        >
                                          <Plus className="h-2.5 w-2.5" />
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <span>Assigned</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Worked Previous Day</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Not Available / Conflict</span>
            </span>
          </div>

          {/* Warnings Section */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <button
              onClick={() => setShowWarningDetails(!showWarningDetails)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-extrabold text-zinc-900">
                  Warnings ({warningsList.length})
                </h3>
                <span className="text-zinc-500 text-xs font-semibold">
                  {warningsList.length === 0
                    ? "No shift conflicts or unassigned slots."
                    : `${warningsList.length} conflict(s) or unfilled shift(s) detected.`}
                </span>
              </div>
              <span className="text-xs text-[#16A34A] hover:underline font-extrabold">
                {showWarningDetails ? "Hide Details" : "View Details"}
              </span>
            </button>

            {showWarningDetails && (
              <div className="pt-2 border-t border-zinc-100 max-h-56 overflow-y-auto space-y-2">
                {warningsList.length === 0 ? (
                  <p className="text-zinc-500 text-xs italic">
                    All shifts are fully scheduled and conflict-free!
                  </p>
                ) : (
                  warningsList.map((warn, wIdx) => (
                    <div
                      key={wIdx}
                      className="flex items-start gap-2 text-xs font-semibold text-zinc-700 bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/60"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Available Staff Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-wider">
                Available Staff
              </h3>
              <button className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <Filter className="h-4 w-4" />
              </button>
            </div>

            {/* Staff Search bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 pl-9 pr-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition shadow-3xs"
              />
            </div>

            {/* Staff list */}
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredAvailableStaff.length === 0 ? (
                <p className="text-zinc-400 text-xs italic text-center py-4">
                  No staff members found.
                </p>
              ) : (
                filteredAvailableStaff.map((staff, sIdx) => {
                  const maxHours = staff.maxWorkingHours || 40.0;
                  const currentHours = weeklyHours[staff.id] || 0.0;
                  const ratio = Math.min(100, (currentHours / maxHours) * 100);

                  return (
                    <div
                      key={staff.id}
                      className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 hover:bg-zinc-50 transition shadow-3xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {staff.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .substring(0, 2) || "SM"}
                          </div>
                          <span className="text-xs font-extrabold text-zinc-900 truncate">
                            {staff.name} ({currentHours.toFixed(0)})
                          </span>
                        </div>

                        <div className="text-[10px] text-zinc-500 font-bold flex items-center gap-2">
                          <span>Priority #{sIdx + 1}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-extrabold">
                            Available
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                            <span>
                              {currentHours.toFixed(0)} / {maxHours.toFixed(0)}{" "}
                              hrs
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ratio > 100
                                  ? "bg-rose-500"
                                  : ratio >= 90
                                    ? "bg-amber-500"
                                    : "bg-[#16A34A]"
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dropdown action button to assign */}
                      {selectedCell && (
                        <button
                          onClick={() => handleAddStaffToCell(staff.id)}
                          className="bg-[#16A34A] hover:bg-[#15803D] text-white p-1 rounded-lg text-[10px] font-extrabold px-2 transition shadow-3xs shrink-0 cursor-pointer"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[10px] text-zinc-400 font-semibold text-center italic mt-2">
              {selectedCell
                ? "Click 'Assign' to add staff to the active cell selection."
                : "Select a shift cell to quick-assign staff."}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Cell Floating Panel / Status Indicator */}
      {selectedCell && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-white px-5 py-3.5 rounded-2xl shadow-xl z-30 flex items-center gap-6 animate-fade-in">
          <div className="text-xs">
            <span className="text-zinc-400 font-bold block text-[10px] uppercase tracking-wider">
              Active Selection
            </span>
            <span className="font-extrabold text-sm block mt-0.5 text-emerald-400">
              {datesOfWeek
                .find((d) => formatDateYYYYMMDD(d) === selectedCell.dateStr)
                ?.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                })}{" "}
              &bull; {selectedCell.shiftName} Shift
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <button
            onClick={() => setSelectedCell(null)}
            className="text-zinc-400 hover:text-white transition font-bold text-xs cursor-pointer bg-zinc-800/80 px-3 py-1.5 rounded-xl"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Roster Bottom Save Bar */}
      <footer className="sticky bottom-0 bg-white border-t border-zinc-200 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-semibold">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>
            {lastSaved
              ? `Roster draft last saved: Today at ${lastSaved}`
              : "Draft changes not saved yet."}
          </span>
          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-extrabold text-[10px] uppercase">
            Draft
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={handlePublishRoster}
            disabled={publishing}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] text-white hover:bg-[#15803D] rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5 stroke-[3px]" />
            <span>{publishing ? "Publishing..." : "Publish Roster"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
