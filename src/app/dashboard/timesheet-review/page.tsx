/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";

import {
  Calendar,
  Clock,
  X,
  Check,
  Edit2,
  Download,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";

import { Location } from "@/types/inventory";
import { Staff } from "@/types/staff";
import { Business } from "@/types/business";
import { Timesheet } from "@/types/timesheet";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getLocations } from "@/lib/repositories/location.repository";
import { getStaffMembers } from "@/lib/repositories/staff.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getTimesheets,
  updateTimesheet,
  updateTimesheetStatus,
} from "@/lib/repositories/timesheet.repository";
import {
  getTimesheetSettings,
  TimesheetSettings,
} from "@/lib/repositories/timesheet-settings.repository";
import DateRangePicker from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

export default function TimesheetReviewPage() {
  const router = useRouter();

  const { activeBusinessId } = useBusinessStore();
  const { profile, loading: authLoading } = useAuth();
  const { locations, fetchLocations, activeLocationId } = useLocationStore();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [displayLimit, setDisplayLimit] = useState(30);

  const [filterBusiness, setFilterBusiness] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [allLocations, setAllLocations] = useState<Location[]>([]);

  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(
    null,
  );
  const [editWorkDate, setEditWorkDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editUnpaidBreak, setEditUnpaidBreak] = useState("30");
  const [editNotes, setEditNotes] = useState("");
  const [editStaffId, setEditStaffId] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const staffSpecificLocations = useMemo(() => {
    const selectedStaff = staffList.find((s) => s.id === editStaffId);
    return selectedStaff?.locations && selectedStaff.locations.length > 0
      ? selectedStaff.locations
      : allLocations;
  }, [staffList, editStaffId, allLocations]);

  useEffect(() => {
    if (!editStaffId) return;
    const selectedStaff = staffList.find((s) => s.id === editStaffId);
    const staffLocs = selectedStaff?.locations || [];
    if (staffLocs.length > 0) {
      if (!staffLocs.some((l) => l.id === editLocationId)) {
        setEditLocationId(staffLocs[0].id);
      }
    }
  }, [editStaffId, staffList, editLocationId]);

  const isStaff = profile?.role === "staff";

  useEffect(() => {
    if (!authLoading && profile && isStaff) {
      router.push("/dashboard/profile");
    }
  }, [profile, authLoading, isStaff, router]);

  const [settings, setSettings] = useState<TimesheetSettings | null>(null);

  const loadData = useCallback(async () => {
    if (isStaff) return;
    try {
      setLoading(true);
      const bizList = await getUserBusinesses();
      setBusinesses(bizList);

      const [tsList, staffResults, locationResults] = await Promise.all([
        getTimesheets("all"),
        Promise.all(bizList.map((b) => getStaffMembers(b.id).catch(() => []))),
        Promise.all(bizList.map((b) => getLocations(b.id).catch(() => []))),
      ]);

      setTimesheets(tsList);

      const uniqueStaffMap = new Map();
      staffResults.flat().forEach((s) => {
        if (!uniqueStaffMap.has(s.id)) {
          uniqueStaffMap.set(s.id, s);
        }
      });
      setStaffList(Array.from(uniqueStaffMap.values()));
      setAllLocations(locationResults.flat());

      if (activeBusinessId) {
        const settingsData = await getTimesheetSettings(activeBusinessId).catch(() => null);
        setSettings(settingsData);
      }
    } catch {
      toast.error("Failed to load timesheet review data.");
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, isStaff]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBusinessFilterChange = (val: string) => {
    setFilterBusiness(val);
    if (val !== "all" && filterLocation !== "all") {
      const loc = allLocations.find((l) => l.id === filterLocation);
      if (!loc || loc.businessId !== val) {
        setFilterLocation("all");
      }
    }
  };

  const visibleLocations = useMemo(() => {
    if (filterBusiness === "all") {
      return allLocations;
    }
    return allLocations.filter((l) => l.businessId === filterBusiness);
  }, [allLocations, filterBusiness]);

  const handleApprove = async (id: string) => {
    const ts = timesheets.find((t) => t.id === id);
    const targetBusinessId = ts ? ts.businessId : activeBusinessId;
    if (!targetBusinessId) return;
    setActionLoadingId(id);
    try {
      await updateTimesheetStatus(targetBusinessId, id, "approved");
      setTimesheets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "approved" } : t)),
      );
      toast.success("Timesheet approved successfully.");
    } catch {
      toast.error("Failed to approve timesheet.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const ts = timesheets.find((t) => t.id === id);
    const targetBusinessId = ts ? ts.businessId : activeBusinessId;
    if (!targetBusinessId) return;
    setActionLoadingId(id);
    try {
      await updateTimesheetStatus(targetBusinessId, id, "rejected");
      setTimesheets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "rejected" } : t)),
      );
      toast.success("Timesheet rejected successfully.");
    } catch {
      toast.error("Failed to reject timesheet.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEditModal = (ts: Timesheet) => {
    setEditingTimesheet(ts);
    setEditWorkDate(ts.workDate);
    setEditStartTime(ts.startTime);
    setEditEndTime(ts.endTime);
    setEditUnpaidBreak(ts.unpaidBreak.toString());
    setEditNotes(ts.notes || "");
    setEditStaffId(ts.staffId);
    setEditLocationId(ts.locationId);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimesheet) return;
    const targetBusinessId = editingTimesheet.businessId || activeBusinessId;
    if (!targetBusinessId) return;
    setEditSubmitting(true);

    const hasChanged =
      editingTimesheet.locationId !== editLocationId ||
      editingTimesheet.staffId !== editStaffId ||
      editingTimesheet.workDate !== editWorkDate ||
      editingTimesheet.startTime !== editStartTime ||
      editingTimesheet.endTime !== editEndTime ||
      editingTimesheet.unpaidBreak !== (parseInt(editUnpaidBreak, 10) || 0) ||
      (editingTimesheet.notes || "") !== editNotes.trim();

    try {
      const updated = await updateTimesheet(
        targetBusinessId,
        editingTimesheet.id,
        {
          locationId: editLocationId,
          staffId: editStaffId,
          workDate: editWorkDate,
          startTime: editStartTime,
          endTime: editEndTime,
          unpaidBreak: parseInt(editUnpaidBreak, 10) || 0,
          notes: editNotes.trim() || undefined,
          status: hasChanged ? "edited" : editingTimesheet.status,
        },
      );
      setTimesheets((prev) =>
        prev.map((t) => (t.id === editingTimesheet.id ? updated : t)),
      );
      toast.success("Timesheet updated successfully.");
      setEditingTimesheet(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update timesheet.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setFilterBusiness("all");
    setFilterLocation("all");
    setFilterStaff("all");
    setFilterStatus("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setSelectedIds([]);
    toast.success("Filters cleared.");
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = (paginatedIds: string[]) => {
    const allSelected = paginatedIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        paginatedIds.forEach((id) => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const ts = timesheets.find((t) => t.id === id);
          const targetBusinessId = ts ? ts.businessId : activeBusinessId;
          if (!targetBusinessId) throw new Error("Missing business id");
          return updateTimesheetStatus(targetBusinessId, id, "approved");
        }),
      );
      setTimesheets((prev) =>
        prev.map((t) =>
          selectedIds.includes(t.id) ? { ...t, status: "approved" } : t,
        ),
      );
      setSelectedIds([]);
      toast.success("Selected timesheets approved successfully.");
    } catch {
      toast.error("Failed to approve selected timesheets.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const ts = timesheets.find((t) => t.id === id);
          const targetBusinessId = ts ? ts.businessId : activeBusinessId;
          if (!targetBusinessId) throw new Error("Missing business id");
          return updateTimesheetStatus(targetBusinessId, id, "rejected");
        }),
      );
      setTimesheets((prev) =>
        prev.map((t) =>
          selectedIds.includes(t.id) ? { ...t, status: "rejected" } : t,
        ),
      );
      setSelectedIds([]);
      toast.success("Selected timesheets rejected successfully.");
    } catch {
      toast.error("Failed to reject selected timesheets.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr}${ampm}`;
  };

  const formatDateToDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
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
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (filterBusiness !== "all" && ts.businessId !== filterBusiness) return false;
      if (filterLocation !== "all" && ts.locationId !== filterLocation) return false;
      if (filterStaff !== "all" && ts.staffId !== filterStaff) return false;
      if (filterStatus !== "all" && ts.status !== filterStatus) return false;
      if (startDate && ts.workDate < startDate) return false;
      if (endDate && ts.workDate > endDate) return false;
      if (
        searchQuery.trim() &&
        !ts.staffName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    timesheets,
    filterBusiness,
    filterLocation,
    filterStaff,
    filterStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  const paginatedTimesheets = useMemo(() => {
    return filteredTimesheets.slice(0, displayLimit);
  }, [filteredTimesheets, displayLimit]);

  useEffect(() => {
    setDisplayLimit(30);
  }, [
    filterBusiness,
    filterLocation,
    filterStaff,
    filterStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Business",
      "Location",
      "Date",
      "Start Time",
      "End Time",
      "Break (min)",
      "Project",
      "Total Hours",
      "Status",
    ];

    const rows = filteredTimesheets.map((ts) => [
      ts.staffName,
      businesses.find((b) => b.id === ts.businessId)?.name || "Unknown Business",
      ts.locationName,
      ts.workDate,
      ts.startTime,
      ts.endTime,
      ts.unpaidBreak,
      ts.project || "",
      ts.totalHours.toFixed(2),
      ts.status.toLowerCase() === "submitted"
        ? "Pending"
        : ts.status.toLowerCase() === "edited"
          ? "Resubmitted"
          : ts.status.charAt(0).toUpperCase() + ts.status.slice(1),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `timesheets_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully.");
  };

  const exportExcel = () => {
    const headers = [
      "Staff Name",
      "Business",
      "Location",
      "Date",
      "Start Time",
      "End Time",
      "Break (min)",
      "Project",
      "Total Hours",
      "Status",
    ];

    const rows = filteredTimesheets.map((ts) => [
      ts.staffName,
      businesses.find((b) => b.id === ts.businessId)?.name || "Unknown Business",
      ts.locationName,
      ts.workDate,
      ts.startTime,
      ts.endTime,
      ts.unpaidBreak,
      ts.project || "",
      ts.totalHours.toFixed(2),
      ts.status.toLowerCase() === "submitted"
        ? "Pending"
        : ts.status.toLowerCase() === "edited"
          ? "Resubmitted"
          : ts.status.charAt(0).toUpperCase() + ts.status.slice(1),
    ]);

    let content =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    content +=
      '<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Timesheet Review</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    content += "<body><table>";
    content +=
      "<tr>" +
      headers
        .map(
          (h) =>
            `<th style="background-color: #0A2924; color: white; font-weight: bold; border: 1px solid #ccc; padding: 5px;">${h}</th>`,
        )
        .join("") +
      "</tr>";
    rows.forEach((row) => {
      content +=
        "<tr>" +
        row
          .map(
            (cell) =>
              `<td style="border: 1px solid #ccc; padding: 5px;">${cell}</td>`,
          )
          .join("") +
        "</tr>";
    });
    content += "</table></body></html>";

    const blob = new Blob([content], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timesheet_review_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel report exported successfully.");
  };

  const exportXeroCSV = () => {
    const headers = [
      "EmployeeName",
      "Email",
      "Date",
      "TrackingCategory1",
      "TrackingCategory2",
      "NumberOfHours",
    ];

    const rows = filteredTimesheets.map((ts) => [
      ts.staffName,
      "",
      ts.workDate,
      ts.locationName || "",
      "",
      ts.totalHours.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `timesheet_xero_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xero payroll CSV exported successfully.");
  };

  const exportMYOBCSV = () => {
    const headers = [
      "Co/Last Name",
      "First Name",
      "Date",
      "Activity",
      "Hours",
      "Notes",
    ];

    const rows = filteredTimesheets.map((ts) => {
      const nameParts = ts.staffName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const finalFirstName = nameParts.length > 1 ? firstName : "";

      return [
        lastName,
        finalFirstName,
        ts.workDate,
        ts.locationName || "Regular Hours",
        ts.totalHours.toFixed(2),
        ts.notes || "",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `timesheet_myob_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("MYOB payroll CSV exported successfully.");
  };

  const handleExport = () => {
    const format = settings?.payroll_export_format || "CSV";
    switch (format) {
      case "Xero":
        exportXeroCSV();
        break;
      case "MYOB":
        exportMYOBCSV();
        break;
      case "Excel":
        exportExcel();
        break;
      case "CSV":
      default:
        exportCSV();
        break;
    }
  };

  const getWeekStartStr = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      d.setHours(0, 0, 0, 0);
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
      const currentDay = d.getDay();
      let diff = currentDay - targetIndex;
      if (diff < 0) {
        diff += 7;
      }
      d.setDate(d.getDate() - diff);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    [settings?.week_starts_on],
  );

  const weeklyHoursMap = useMemo(() => {
    const map: Record<string, number> = {};
    timesheets.forEach((ts) => {
      const weekStartStr = getWeekStartStr(ts.workDate);
      if (!weekStartStr) return;
      const key = `${ts.staffId}_${weekStartStr}`;
      map[key] = (map[key] || 0) + ts.totalHours;
    });
    return map;
  }, [timesheets, getWeekStartStr]);

  const isModalEditable = useMemo(() => {
    if (!editingTimesheet) return false;

    // 1. Payroll period lock check
    if (
      settings?.lock_timesheets_before_date &&
      settings?.lock_payroll_period_date &&
      editingTimesheet.workDate <= settings.lock_payroll_period_date
    ) {
      return false;
    }

    // 2. Approved lock check
    if (
      editingTimesheet.status === "approved" &&
      settings?.allow_managers_edit_approved === false
    ) {
      return false;
    }

    return true;
  }, [editingTimesheet, settings]);

  const editTotalHoursCalculated = useMemo(() => {
    if (!editStartTime || !editEndTime) return { text: "0h 00m" };
    const [startH, startM] = editStartTime.split(":").map(Number);
    const [endH, endM] = editEndTime.split(":").map(Number);
    let diffMins = endH * 60 + endM - (startH * 60 + startM);
    if (diffMins < 0) {
      diffMins += 24 * 60;
    }
    const breakMins = parseInt(editUnpaidBreak, 10) || 0;
    const netMins = Math.max(0, diffMins - breakMins);
    const h = Math.floor(netMins / 60);
    const m = netMins % 60;
    return {
      text: `${h}h ${m.toString().padStart(2, "0")}m`,
    };
  }, [editStartTime, editEndTime, editUnpaidBreak]);

  const selectableIds = useMemo(() => {
    return paginatedTimesheets
      .filter((ts) => {
        const isLocked = !!(
          settings?.lock_timesheets_before_date &&
          settings?.lock_payroll_period_date &&
          ts.workDate <= settings.lock_payroll_period_date
        );
        return !isLocked;
      })
      .map((t) => t.id);
  }, [paginatedTimesheets, settings]);

  if (authLoading || loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-zinc-900 animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing timesheet board...
        </span>
      </div>
    );
  }

  if (isStaff) {
    return null;
  }

  const isAllSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex flex-col bg-white h-auto md:h-[85vh] min-h-0 relative select-none pb-4">
      <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">
        <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
            Timesheet Review
          </h1>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export {settings?.payroll_export_format || "Excel"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Staffs"
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none transition shadow-2xs h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto relative">
            {/* Business Dropdown */}
            <div className="w-full sm:w-44">
              <Select value={filterBusiness} onValueChange={handleBusinessFilterChange}>
                <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50">
                  <SelectValue placeholder="All Businesses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56">
                  <SelectItem
                    value="all"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    All Businesses
                  </SelectItem>
                  {businesses.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Dropdown */}
            <div className="w-full sm:w-44">
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56">
                  <SelectItem
                    value="all"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    All Locations
                  </SelectItem>
                  {visibleLocations.map((l) => (
                    <SelectItem
                      key={l.id}
                      value={l.id}
                      className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                    >
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition cursor-pointer font-semibold text-xs text-neutral-900 hover:bg-neutral-50">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56">
                  <SelectItem
                    value="all"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    All Statuses
                  </SelectItem>
                  <SelectItem
                    value="submitted"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    Pending
                  </SelectItem>
                  <SelectItem
                    value="approved"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    Approved
                  </SelectItem>
                  <SelectItem
                    value="rejected"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    Rejected
                  </SelectItem>
                  <SelectItem
                    value="edited"
                    className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-50 hover:text-neutral-900 text-neutral-900 cursor-pointer"
                  >
                    Resubmitted
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DateRangePicker
              className="w-full sm:w-64"
              triggerClassName="!rounded-xl !border-neutral-200 !text-neutral-900 !font-semibold focus:!border-neutral-900 focus:!ring-4 focus:!ring-neutral-900/5 !h-10"
              startDate={startDate}
              endDate={endDate}
              onChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
            />

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-xl px-5 py-2 text-xs font-semibold transition-colors duration-200 cursor-pointer h-10 shadow-2xs w-full sm:w-auto"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        <div className="flex items-center gap-3 text-xs font-semibold text-neutral-600 px-1 py-0.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-neutral-900/5 cursor-pointer"
            checked={isAllSelected}
            onChange={() => handleToggleSelectAll(selectableIds)}
          />
          <span>{selectedIds.length} Selected</span>
          <span className="text-neutral-300">|</span>
          <button
            type="button"
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || batchActionLoading}
            className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-45 transition-colors font-bold cursor-pointer"
          >
            <Check className="h-4.5 w-4.5 text-emerald-600 stroke-[2.5px]" />
            Approve Selected
          </button>
          <button
            type="button"
            onClick={handleBatchReject}
            disabled={selectedIds.length === 0 || batchActionLoading}
            className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-45 transition-colors font-bold cursor-pointer"
          >
            <X className="h-4.5 w-4.5 text-red-500 stroke-[2.5px]" />
            Reject Selected
          </button>
          {batchActionLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
          )}
        </div>

        {/* Main Table Container */}
        <div className="bg-white border border-neutral-200 rounded-3xl shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
          <div
            className="overflow-auto flex-1 min-h-0"
            onScroll={(e) => {
              const container = e.currentTarget;
              if (
                container.scrollHeight - container.scrollTop <=
                container.clientHeight + 100
              ) {
                setDisplayLimit((prev) =>
                  Math.min(prev + 30, filteredTimesheets.length),
                );
              }
            }}
          >
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] uppercase font-semibold tracking-wider text-neutral-550 bg-white sticky top-0 z-10">
                  <th className="py-4 px-6 w-10">
                    {/* Checkbox spacer column */}
                  </th>
                  <th className="py-4 px-6 font-semibold">STAFF NAME</th>
                  <th className="py-4 px-6 font-semibold">DATE</th>
                  <th className="py-4 px-6 font-semibold">BUSINESS</th>
                  <th className="py-4 px-6 font-semibold">LOCATION</th>
                  <th className="py-4 px-6 font-semibold">START TIME</th>
                  <th className="py-4 px-6 font-semibold">END TIME</th>
                  <th className="py-4 px-6 font-semibold">BREAK</th>
                  <th className="py-4 px-6 font-semibold">TOTAL HOURS</th>
                  <th className="py-4 px-6 font-semibold">STATUS</th>
                  <th className="py-4 px-6 font-semibold text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800 bg-white">
                {paginatedTimesheets.map((ts) => {
                  const isRowSelected = selectedIds.includes(ts.id);
                  const isPending = ts.status === "submitted";
                  const isEdited = ts.status === "edited";
                  const isApproved = ts.status === "approved";
                  const isRejected = ts.status === "rejected";

                  const isLocked = !!(
                    settings?.lock_timesheets_before_date &&
                    settings?.lock_payroll_period_date &&
                    ts.workDate <= settings.lock_payroll_period_date
                  );

                  const weekStartStr = getWeekStartStr(ts.workDate);
                  const totalWeeklyHours =
                    weeklyHoursMap[`${ts.staffId}_${weekStartStr}`] || 0;

                  const hasDailyWarning = !!(
                    settings?.show_overtime_warnings &&
                    settings?.daily_hours_warning &&
                    settings.daily_hours_warning > 0 &&
                    ts.totalHours > settings.daily_hours_warning
                  );
                  const hasWeeklyWarning = !!(
                    settings?.show_overtime_warnings &&
                    settings?.weekly_hours_warning &&
                    settings.weekly_hours_warning > 0 &&
                    totalWeeklyHours > settings.weekly_hours_warning
                  );

                  return (
                    <tr
                      key={ts.id}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("input") ||
                          target.closest("label")
                        ) {
                          return;
                        }
                        handleOpenEditModal(ts);
                      }}
                      className={cn(
                        "hover:bg-neutral-50/50 transition-colors cursor-pointer",
                        isRowSelected && "bg-neutral-50/30",
                      )}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded-sm border-neutral-300 text-neutral-900 focus:ring-neutral-900/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelect(ts.id)}
                          disabled={isLocked}
                        />
                      </td>

                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {ts.staffName}
                      </td>

                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {formatDateToDDMMYYYY(ts.workDate)}
                      </td>

                      <td className="py-4 px-6 font-medium text-neutral-500">
                        {businesses.find((b) => b.id === ts.businessId)?.name ||
                          "—"}
                      </td>

                      <td className="py-4 px-6 font-medium text-neutral-500 max-w-[120px] whitespace-normal leading-tight">
                        {ts.locationName || "—"}
                      </td>

                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {formatTimeToAMPM(ts.startTime)}
                      </td>

                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {formatTimeToAMPM(ts.endTime)}
                      </td>

                      <td className="py-4 px-6 font-medium text-neutral-500">
                        {ts.unpaidBreak} min
                      </td>

                      <td className="py-4 px-6 font-bold text-neutral-900">
                        <div className="flex items-center gap-1.5">
                          <span>{Number(ts.totalHours.toFixed(2))}</span>
                          {settings?.show_overtime_warnings &&
                            (hasDailyWarning || hasWeeklyWarning) && (
                              <div className="relative group flex items-center">
                                <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse cursor-help shrink-0" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 hidden group-hover:block bg-neutral-900 border border-neutral-800 text-white text-[10px] rounded-lg p-2.5 shadow-xl z-50 leading-relaxed font-medium transition-all duration-200">
                                  <div className="font-bold text-amber-400 mb-1 uppercase tracking-wider text-[9px]">
                                    Overtime Warning
                                  </div>
                                  {hasDailyWarning && (
                                    <div>
                                      • Daily hours exceed warning limit (
                                      {settings.daily_hours_warning} hrs)
                                    </div>
                                  )}
                                  {hasWeeklyWarning && (
                                    <div>
                                      • Weekly hours exceed warning limit (
                                      {settings.weekly_hours_warning} hrs)
                                    </div>
                                  )}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
                                </div>
                              </div>
                            )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isApproved && (
                          <span className="font-bold text-neutral-900">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="font-bold text-neutral-900">
                            Rejected
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#D6D8F8] text-[#4F46E5]">
                            Pending
                          </span>
                        )}
                        {isEdited && (
                          <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FFE8A3] text-[#854D0E]">
                            Resubmitted
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end">
                          {actionLoadingId === ts.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
                          ) : isLocked ? (
                            <span className="text-neutral-400 font-bold text-[10px] uppercase tracking-wider bg-neutral-100 px-2 py-1 rounded">
                              Locked
                            </span>
                          ) : isPending ? (
                            <div
                              className="flex items-center gap-3.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleApprove(ts.id)}
                                className="text-green-600 hover:text-green-800 transition-colors cursor-pointer"
                                title="Approve"
                              >
                                <Check className="h-4.5 w-4.5 stroke-[2.5px]" />
                              </button>
                              <button
                                onClick={() => handleReject(ts.id)}
                                className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                title="Reject"
                              >
                                <X className="h-4.5 w-4.5 stroke-[2.5px]" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTimesheets.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="text-center py-12 text-xs text-neutral-400 font-semibold"
                    >
                      No timesheets found matching filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Container */}
          <div className="bg-neutral-50/50 border-t border-neutral-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-500 font-semibold sticky bottom-0 z-10">
            <span>
              Showing {Math.min(displayLimit, filteredTimesheets.length)} of{" "}
              {filteredTimesheets.length} timesheets
            </span>
          </div>
        </div>

        <div className="mt-2 border border-neutral-200 bg-white rounded-3xl p-4 flex flex-wrap items-center gap-6 shadow-3xs px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <span className="h-2 w-2 rounded-full bg-neutral-900 inline-block" />
            <span>Pending: Awaiting review</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <span className="h-2 w-2 rounded-full bg-neutral-300 inline-block" />
            <span>Approved: Timesheet approved</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-750">
            <span className="h-2 w-2 rounded-full bg-neutral-200 inline-block" />
            <span>Rejected: Timesheet rejected</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-750">
            <span className="h-2 w-2 rounded-full bg-neutral-400 inline-block" />
            <span>Edited: Timesheet has been edited</span>
          </div>
        </div>
      </div>

      {/* Edit Timesheet Modal */}
      {editingTimesheet && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-neutral-900" />
                <h3 className="text-base font-bold text-neutral-900">
                  {isModalEditable ? "Edit Timesheet" : "View Timesheet"}
                </h3>
              </div>
              <button
                onClick={() => setEditingTimesheet(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-705 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>{" "}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Staff Member
                  </label>
                  <Dropdown
                    value={editStaffId}
                    onChange={(val) => setEditStaffId(val)}
                    options={staffList.map((s) => ({
                      value: s.id,
                      label: s.name || s.email,
                    }))}
                    disabled={!isModalEditable}
                    className="w-full"
                    triggerClassName="rounded-xl py-2.5 px-3.5 border-neutral-200 font-semibold text-neutral-800 h-10 bg-white animate-fade-in"
                    optionClassName="font-semibold text-neutral-600"
                    placeholder="Select Staff"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Location
                  </label>
                  <Dropdown
                    value={editLocationId}
                    onChange={(val) => setEditLocationId(val)}
                    options={staffSpecificLocations.map((l) => ({
                      value: l.id,
                      label: l.name,
                    }))}
                    disabled={!isModalEditable}
                    className="w-full"
                    triggerClassName="rounded-xl py-2.5 px-3.5 border-neutral-200 font-semibold text-neutral-800 h-10 bg-white animate-fade-in"
                    optionClassName="font-semibold text-neutral-600"
                    placeholder="Select Location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center">
                    Work Date
                  </label>
                  <div className="relative flex items-center border border-neutral-200 rounded-xl bg-white px-3 py-2 focus-within:ring-4 focus-within:ring-neutral-900/5 focus-within:border-neutral-900 transition-all h-10 disabled:bg-neutral-50">
                    <Calendar className="h-4 w-4 text-neutral-400 mr-2" />
                    <span className="text-xs font-semibold text-neutral-800">
                      {formatDateToDisplay(editWorkDate) || "Select Work Date"}
                    </span>
                    <input
                      type="date"
                      value={editWorkDate}
                      onChange={(e) => setEditWorkDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      required
                      disabled={!isModalEditable}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                    Unpaid Break (mins)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editUnpaidBreak}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*$/.test(val)) {
                        setEditUnpaidBreak(val);
                      }
                    }}
                    className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-800 font-semibold focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition h-10 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
                    required
                    disabled={!isModalEditable}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center">
                    Start Time
                  </label>
                  <div className="relative flex items-center border border-neutral-200 rounded-xl bg-white px-3 py-2 focus-within:ring-4 focus-within:ring-neutral-900/5 focus-within:border-neutral-900 transition-all h-10">
                    <Clock className="h-4 w-4 text-neutral-400 mr-2" />
                    <span className="text-xs font-semibold text-neutral-850">
                      {formatTimeToAMPM(editStartTime) || "Select Start Time"}
                    </span>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      required
                      disabled={!isModalEditable}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center">
                    End Time
                  </label>
                  <div className="relative flex items-center border border-neutral-200 rounded-xl bg-white px-3 py-2 focus-within:ring-4 focus-within:ring-neutral-900/5 focus-within:border-neutral-900 transition-all h-10">
                    <Clock className="h-4 w-4 text-neutral-400 mr-2" />
                    <span className="text-xs font-semibold text-neutral-855">
                      {formatTimeToAMPM(editEndTime) || "Select End Time"}
                    </span>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                      required
                      disabled={!isModalEditable}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex justify-between items-center animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                  Calculated Hours
                </span>
                <span className="text-sm font-bold text-neutral-955">
                  {editTotalHoursCalculated.text}
                </span>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Notes..."
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-800 font-semibold focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition resize-none disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
                  disabled={!isModalEditable}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingTimesheet(null)}
                  disabled={editSubmitting}
                  className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-full px-5 py-2.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  {isModalEditable ? "Cancel" : "Close"}
                </button>
                {isModalEditable && (
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="bg-neutral-900 hover:bg-neutral-850 text-white rounded-full px-5 py-2.5 text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
