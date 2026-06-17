/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";

import {
  Calendar,
  Clock,
  ChevronDown,
  X,
  Check,
  Edit2,
  Download,
  Loader2,
  Eye,
  Search,
} from "lucide-react";

import { Staff } from "@/types/staff";
import { Business } from "@/types/business";
import { Timesheet } from "@/types/timesheet";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getStaffMembers } from "@/lib/repositories/staff.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getTimesheets,
  updateTimesheet,
  updateTimesheetStatus,
} from "@/lib/repositories/timesheet.repository";
import DateRangePicker from "@/components/ui/date-range-picker";

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

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);

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

  const statusRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<HTMLDivElement>(null);

  const isStaff = profile?.role === "staff";

  useEffect(() => {
    if (!authLoading && profile && isStaff) {
      router.push("/dashboard");
    }
  }, [profile, authLoading, isStaff, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        pageSizeRef.current &&
        !pageSizeRef.current.contains(event.target as Node)
      ) {
        setShowPageSizeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!activeBusinessId || isStaff) return;
    try {
      setLoading(true);
      const [bizList, tsList, sList] = await Promise.all([
        getUserBusinesses(),
        getTimesheets(activeBusinessId),
        getStaffMembers(activeBusinessId),
      ]);
      setBusinesses(bizList);
      setTimesheets(tsList);
      setStaffList(sList);
      await fetchLocations(activeBusinessId);
    } catch {
      toast.error("Failed to load timesheet review data.");
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, isStaff, fetchLocations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id: string) => {
    if (!activeBusinessId) return;
    setActionLoadingId(id);
    try {
      await updateTimesheetStatus(activeBusinessId, id, "approved");
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
    if (!activeBusinessId) return;
    setActionLoadingId(id);
    try {
      await updateTimesheetStatus(activeBusinessId, id, "rejected");
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
    if (!activeBusinessId || !editingTimesheet) return;
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
        activeBusinessId,
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
    if (selectedIds.length === 0 || !activeBusinessId) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateTimesheetStatus(activeBusinessId, id, "approved"),
        ),
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
    if (selectedIds.length === 0 || !activeBusinessId) return;
    setBatchActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateTimesheetStatus(activeBusinessId, id, "rejected"),
        ),
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


  const selectedStatusName = useMemo(() => {
    switch (filterStatus) {
      case "all":
        return "All Statuses";
      case "submitted":
        return "Pending";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "edited":
        return "Resubmitted";
      default:
        return filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1);
    }
  }, [filterStatus]);

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (activeBusinessId && ts.businessId !== activeBusinessId) return false;
      if (activeLocationId && ts.locationId !== activeLocationId) return false;
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
    activeBusinessId,
    activeLocationId,
    filterStaff,
    filterStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  const paginatedTimesheets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTimesheets.slice(startIndex, startIndex + pageSize);
  }, [filteredTimesheets, currentPage, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTimesheets.length / pageSize),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeBusinessId,
    activeLocationId,
    filterStaff,
    filterStatus,
    startDate,
    endDate,
    pageSize,
    searchQuery,
  ]);

  const handleExport = () => {
    const headers = [
      "Staff Name",
      "Date",
      "Business",
      "Location",
      "Start Time",
      "End Time",
      "Break (min)",
      "Total Hours",
      "Status",
    ];
    const rows = filteredTimesheets.map((ts) => [
      ts.staffName,
      ts.workDate,
      businesses.find((b) => b.id === ts.businessId)?.name ||
        "Unknown Business",
      ts.locationName,
      ts.startTime,
      ts.endTime,
      ts.unpaidBreak,
      ts.totalHours.toFixed(2),
      ts.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
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
    toast.success("Timesheets exported successfully.");
  };

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

  const paginatedIds = paginatedTimesheets.map((t) => t.id);
  const isAllSelected =
    paginatedIds.length > 0 &&
    paginatedIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-120px)] md:h-[85vh] min-h-0 relative select-none">
      <div className="flex-1 min-h-0 flex flex-col space-y-4 pr-0 lg:pr-4">

        <div className="bg-white border border-[#E2E8F0] rounded-2xl py-4 px-5 md:py-3 md:px-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Timesheet Review
          </h1>
          <button
            onClick={handleExport}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-full px-6 py-2.5 text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-zinc-400 stroke-[2.5px]" />
            Export
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Staffs"
              className="w-full bg-white border border-zinc-200 focus:border-zinc-950 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950/20 transition-all shadow-xs h-[42px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto sm:ml-auto justify-end">
            <div className="relative w-full sm:w-44" ref={statusRef}>
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center justify-between w-full border border-zinc-200 rounded-2xl bg-white px-3.5 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-zinc-950/20 focus:border-zinc-950 transition-all cursor-pointer text-xs font-bold text-zinc-800 h-[42px]"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                  <span className="truncate">{selectedStatusName}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1" />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-2xl shadow-lg z-30 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setShowStatusDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                  >
                    All Statuses
                  </button>
                  {[
                    { value: "submitted", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "edited", label: "Resubmitted" },
                  ].map((statusOption) => (
                    <button
                      type="button"
                      key={statusOption.value}
                      onClick={() => {
                        setFilterStatus(statusOption.value);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                    >
                      {statusOption.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Picker */}
            <DateRangePicker
              className="w-full sm:w-64"
              triggerClassName="rounded-2xl"
              focusClassName="focus:ring-zinc-950/20 focus:border-zinc-950"
              startDate={startDate}
              endDate={endDate}
              onChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
            />

            {/* Clear Button */}
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-2xl px-5 py-2.5 cursor-pointer transition-colors h-[42px] flex items-center justify-center shadow-xs w-full sm:w-auto"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-600 px-1 py-0.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded-sm border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
            checked={isAllSelected}
            onChange={() => handleToggleSelectAll(paginatedIds)}
          />
          <span>{selectedIds.length} Selected</span>
          <span className="text-zinc-350">|</span>
          <button
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || batchActionLoading}
            className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-950 disabled:opacity-45 transition-colors font-bold cursor-pointer"
          >
            <Check className="h-4.5 w-4.5 text-[#16A34A] stroke-[2.5px]" />
            Approve Selected
          </button>
          <button
            onClick={handleBatchReject}
            disabled={selectedIds.length === 0 || batchActionLoading}
            className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-950 disabled:opacity-45 transition-colors font-bold cursor-pointer"
          >
            <X className="h-4.5 w-4.5 text-[#EF4444] stroke-[2.5px]" />
            Reject Selected
          </button>
          {batchActionLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          )}
        </div>

        {/* Main Table Container */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50 sticky top-0 z-10">
                  <th className="py-4 px-6 w-10">
                    {/* Checkbox spacer column */}
                  </th>
                  <th className="py-4 px-6 font-extrabold">STAFF NAME</th>
                  <th className="py-4 px-6 font-extrabold">DATE</th>
                  <th className="py-4 px-6 font-extrabold">BUSINESS</th>
                  <th className="py-4 px-6 font-extrabold">LOCATION</th>
                  <th className="py-4 px-6 font-extrabold">START TIME</th>
                  <th className="py-4 px-6 font-extrabold">END TIME</th>
                  <th className="py-4 px-6 font-extrabold">BREAK</th>
                  <th className="py-4 px-6 font-extrabold">TOTAL HOURS</th>
                  <th className="py-4 px-6 font-extrabold">STATUS</th>
                  <th className="py-4 px-6 font-extrabold text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                {paginatedTimesheets.map((ts) => {
                  const isRowSelected = selectedIds.includes(ts.id);
                  const isPending = ts.status === "submitted";
                  const isEdited = ts.status === "edited";
                  const isApproved = ts.status === "approved";
                  const isRejected = ts.status === "rejected";

                  return (
                    <tr
                      key={ts.id}
                      className={`hover:bg-zinc-50/40 transition-colors ${
                        isRowSelected ? "bg-zinc-50/50" : ""
                      }`}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded-sm border-zinc-350 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                          checked={isRowSelected}
                          onChange={() => handleToggleSelect(ts.id)}
                        />
                      </td>

                      <td className="py-4 px-6 font-bold text-zinc-900">
                        {ts.staffName}
                      </td>

                      <td className="py-4 px-6 font-semibold">
                        {formatDateToDDMMYYYY(ts.workDate)}
                      </td>

                      <td className="py-4 px-6 font-semibold text-zinc-450">
                        {businesses.find((b) => b.id === ts.businessId)?.name ||
                          "—"}
                      </td>

                      <td className="py-4 px-6 font-semibold text-zinc-500">
                        {ts.locationName || "—"}
                      </td>

                      <td className="py-4 px-6 font-semibold">
                        {formatTimeToAMPM(ts.startTime)}
                      </td>

                      <td className="py-4 px-6 font-semibold">
                        {formatTimeToAMPM(ts.endTime)}
                      </td>

                      <td className="py-4 px-6 font-semibold">
                        {ts.unpaidBreak} mis
                      </td>

                      <td className="py-4 px-6 font-bold text-zinc-800">
                        {Number(ts.totalHours.toFixed(2))}
                      </td>

                      <td className="py-4 px-6">
                        {isApproved && (
                          <span className="font-bold text-zinc-900">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="font-bold text-zinc-900">
                            Rejected
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#D6D8F8] text-[#4F46E5]">
                            Pending
                          </span>
                        )}
                        {isEdited && (
                          <span className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FFE8A3] text-[#854D0E]">
                            Resubmitted
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end">
                          {actionLoadingId === ts.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                          ) : isPending ? (
                            <div className="flex items-center gap-3.5">
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
                              <button
                                onClick={() => handleOpenEditModal(ts)}
                                className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                                title="View/Edit"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3.5">
                              <button
                                onClick={() => handleOpenEditModal(ts)}
                                className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                                title="View/Edit"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTimesheets.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="text-center py-12 text-xs text-zinc-400 font-semibold"
                    >
                      No timesheets found matching filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Container */}
          <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold sticky bottom-0 z-10">
            <span>
              Showing{" "}
              {filteredTimesheets.length > 0
                ? (currentPage - 1) * pageSize + 1
                : 0}{" "}
              to {Math.min(currentPage * pageSize, filteredTimesheets.length)}{" "}
              of {filteredTimesheets.length} timesheets
            </span>

            <div className="flex items-center gap-5">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 rounded-lg font-bold text-xs cursor-pointer transition-all duration-150 ${
                          currentPage === page
                            ? "bg-zinc-950 text-white shadow-xs"
                            : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              )}

              <div className="relative" ref={pageSizeRef}>
                <button
                  onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                  className="flex items-center gap-1.5 border border-zinc-200 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-zinc-805 transition-all cursor-pointer"
                >
                  {pageSize} / page
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                {showPageSizeDropdown && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 overflow-hidden w-28 animate-scale-in">
                    {[5, 10, 20, 50].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setShowPageSizeDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                      >
                        {size} / page
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="mt-2 border border-zinc-200 bg-white rounded-2xl p-4 flex flex-wrap items-center gap-6 shadow-3xs">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-zinc-950 inline-block" />
            <span>Submitted: Awaiting review</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-750">
            <span className="h-2 w-2 rounded-full bg-zinc-300 inline-block" />
            <span>Approved: Timesheet approved</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-750">
            <span className="h-2 w-2 rounded-full bg-zinc-200 inline-block" />
            <span>Rejected: Timesheet rejected</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-750">
            <span className="h-2 w-2 rounded-full bg-zinc-400 inline-block" />
            <span>Edited: Timesheet has been edited</span>
          </div>
        </div>
      </div>

      {/* Edit Timesheet Modal */}
      {editingTimesheet && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-zinc-900" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  Edit Timesheet
                </h3>
              </div>
              <button
                onClick={() => setEditingTimesheet(null)}
                className="p-1 rounded-lg hover:bg-zinc-200/50 text-zinc-400 hover:text-zinc-650 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-750 uppercase tracking-wider">
                    Staff Member
                  </label>
                  <select
                    value={editStaffId}
                    onChange={(e) => setEditStaffId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all cursor-pointer"
                    required
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider">
                    Location
                  </label>
                  <select
                    value={editLocationId}
                    onChange={(e) => setEditLocationId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all cursor-pointer"
                    required
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider flex items-center">
                    Work Date
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-zinc-950 focus-within:border-zinc-950 transition-all">
                    <Calendar className="h-4 w-4 text-zinc-450 mr-2" />
                    <span className="text-xs font-extrabold text-zinc-800">
                      {formatDateToDisplay(editWorkDate) || "Select Work Date"}
                    </span>
                    <input
                      type="date"
                      value={editWorkDate}
                      onChange={(e) => setEditWorkDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider">
                    Unpaid Break (mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editUnpaidBreak}
                    onChange={(e) => setEditUnpaidBreak(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider flex items-center">
                    Start Time
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-zinc-950 focus-within:border-zinc-950 transition-all">
                    <Clock className="h-4 w-4 text-zinc-450 mr-2" />
                    <span className="text-xs font-extrabold text-zinc-805">
                      {formatTimeToAMPM(editStartTime) || "Select Start Time"}
                    </span>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider flex items-center">
                    End Time
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-zinc-950 focus-within:border-zinc-950 transition-all">
                    <Clock className="h-4 w-4 text-zinc-450 mr-2" />
                    <span className="text-xs font-extrabold text-zinc-805">
                      {formatTimeToAMPM(editEndTime) || "Select End Time"}
                    </span>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex justify-between items-center animate-fade-in">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  Calculated Hours
                </span>
                <span className="text-sm font-extrabold text-zinc-950">
                  {editTotalHoursCalculated.text}
                </span>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Notes..."
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setEditingTimesheet(null)}
                  disabled={editSubmitting}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-zinc-950 hover:bg-black text-white rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
