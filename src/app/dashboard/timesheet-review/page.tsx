/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";

import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Edit2,
  Download,
  Filter,
  Loader2,
  User,
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

  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
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

  const staffRef = useRef<HTMLDivElement>(null);
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
        staffRef.current &&
        !staffRef.current.contains(event.target as Node)
      ) {
        setShowStaffDropdown(false);
      }
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
    toast.success("Filters cleared.");
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
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-amber-100 text-amber-700 border-amber-200",
    ];
    return colors[hash % colors.length];
  };

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr} ${ampm}`;
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

  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()];
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "edited":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const selectedStaffName = useMemo(() => {
    if (filterStaff === "all") return "All Staff";
    return staffList.find((s) => s.id === filterStaff)?.name || "All Staff";
  }, [filterStaff, staffList]);

  const selectedStatusName = useMemo(() => {
    if (filterStatus === "all") return "All Statuses";
    return filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1);
  }, [filterStatus]);

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((ts) => {
      if (activeBusinessId && ts.businessId !== activeBusinessId) return false;
      if (activeLocationId && ts.locationId !== activeLocationId) return false;
      if (filterStaff !== "all" && ts.staffId !== filterStaff) return false;
      if (filterStatus !== "all" && ts.status !== filterStatus) return false;
      if (startDate && ts.workDate < startDate) return false;
      if (endDate && ts.workDate > endDate) return false;
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
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing timesheet board...
        </span>
      </div>
    );
  }

  if (isStaff) {
    return null;
  }

  return (
    <div className="p-6 bg-zinc-50/30 min-h-[85vh] relative select-none">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A] mb-3 uppercase tracking-wider">
          <span>Timesheet Review</span>
          <ChevronRight className="h-3 w-3 text-zinc-400" />
          <span className="text-zinc-500">Review Entries</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Timesheet Review
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Review, approve or reject submitted timesheets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Download className="h-4 w-4 text-zinc-400" />
              Export
            </button>
            <button
              onClick={() => toast.info("Filter sidebar option coming soon.")}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Filter className="h-4 w-4 text-zinc-400" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative" ref={staffRef}>
            <button
              type="button"
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="flex items-center gap-2 border border-zinc-200 rounded-xl bg-white px-3.5 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all cursor-pointer text-xs font-bold text-zinc-800"
            >
              <User className="h-3.5 w-3.5 text-zinc-400" />
              {selectedStaffName}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-1" />
            </button>
            {showStaffDropdown && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStaff("all");
                    setShowStaffDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                >
                  All Staff
                </button>
                {staffList.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setFilterStaff(s.id);
                      setShowStaffDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 border border-zinc-200 rounded-xl bg-white px-3.5 py-2 text-left focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all cursor-pointer text-xs font-bold text-zinc-800"
            >
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              {selectedStatusName}
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-1" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("all");
                    setShowStatusDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                >
                  All Statuses
                </button>
                {["submitted", "approved", "rejected", "edited"].map(
                  (statusOption) => (
                    <button
                      type="button"
                      key={statusOption}
                      onClick={() => {
                        setFilterStatus(statusOption);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-50 transition-colors text-xs font-semibold text-zinc-700"
                    >
                      {statusOption.charAt(0).toUpperCase() +
                        statusOption.slice(1)}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <DateRangePicker
            className="sm:w-64"
            startDate={startDate}
            endDate={endDate}
            onChange={(range) => {
              setStartDate(range.startDate);
              setEndDate(range.endDate);
            }}
          />

          <button
            onClick={handleClearFilters}
            className="text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-200/50 hover:bg-zinc-200 rounded-xl px-4 py-2 cursor-pointer transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-4">Staff Name</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Start Time</th>
                  <th className="px-6 py-4">End Time</th>
                  <th className="px-6 py-4">Break (min)</th>
                  <th className="px-6 py-4">Total Hours</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {paginatedTimesheets.map((ts) => (
                  <tr
                    key={ts.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center font-extrabold text-[10px] border shrink-0 ${getAvatarColor(ts.staffName)}`}
                        >
                          {getInitials(ts.staffName)}
                        </div>
                        <span className="text-xs font-bold text-[#0F172A]">
                          {ts.staffName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {formatDateToDisplay(ts.workDate)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          {getDayName(ts.workDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-650">
                      {businesses.find((b) => b.id === ts.businessId)?.name ||
                        "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-650">
                      {ts.locationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-650">
                      {formatTimeToAMPM(ts.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-650">
                      {formatTimeToAMPM(ts.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-650">
                      {ts.unpaidBreak}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-extrabold text-zinc-800">
                      {Math.floor(ts.totalHours)}h{" "}
                      {Math.round((ts.totalHours % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                      m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(ts.status)}`}
                      >
                        {ts.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoadingId === ts.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#16A34A]" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprove(ts.id)}
                              disabled={ts.status === "approved"}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                ts.status === "approved"
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-300 cursor-not-allowed"
                                  : "bg-[#ECFDF5] border-[#A7F3D0]/60 text-[#16A34A] hover:bg-[#D1FAE5]"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(ts)}
                              className="p-1.5 rounded-lg border bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleReject(ts.id)}
                              disabled={ts.status === "rejected"}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                ts.status === "rejected"
                                  ? "bg-zinc-50 border-zinc-200 text-zinc-300 cursor-not-allowed"
                                  : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                              }`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTimesheets.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-10 text-xs text-zinc-400 font-semibold"
                    >
                      No timesheets found matching filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-50/50 px-6 py-4 border-t border-zinc-200 flex items-center justify-between flex-wrap gap-4">
            <span className="text-xs text-zinc-500 font-bold">
              Showing{" "}
              {filteredTimesheets.length > 0
                ? (currentPage - 1) * pageSize + 1
                : 0}{" "}
              to {Math.min(currentPage * pageSize, filteredTimesheets.length)}{" "}
              of {filteredTimesheets.length} timesheets
            </span>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer text-xs font-bold"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isSelected = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#16A34A] text-white"
                          : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer text-xs font-bold"
                >
                  &gt;
                </button>
              </div>

              <div className="relative" ref={pageSizeRef}>
                <button
                  onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                  className="flex items-center gap-1.5 border border-zinc-200 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 transition-all cursor-pointer"
                >
                  {pageSize} / page
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                {showPageSizeDropdown && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 overflow-hidden w-28">
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

        <div className="mt-6 border border-zinc-200 bg-white rounded-2xl p-4 flex flex-wrap items-center gap-6 shadow-3xs">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
            <span>Submitted: Awaiting review</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>Approved: Timesheet approved</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
            <span>Rejected: Timesheet rejected</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            <span>Edited: Timesheet has been edited</span>
          </div>
        </div>
      </div>

      {editingTimesheet && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4.5 w-4.5 text-[#16A34A]" />
                <h3 className="text-base font-extrabold text-[#0F172A]">
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Staff Member
                  </label>
                  <select
                    value={editStaffId}
                    onChange={(e) => setEditStaffId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-all cursor-pointer"
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Location
                  </label>
                  <select
                    value={editLocationId}
                    onChange={(e) => setEditLocationId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-all cursor-pointer"
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                    Work Date
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[#16A34A] focus-within:border-[#16A34A] transition-all">
                    <Calendar className="h-4 w-4 text-zinc-400 mr-2" />
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Unpaid Break (mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editUnpaidBreak}
                    onChange={(e) => setEditUnpaidBreak(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-bold placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                    Start Time
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[#16A34A] focus-within:border-[#16A34A] transition-all">
                    <Clock className="h-4 w-4 text-zinc-400 mr-2" />
                    <span className="text-xs font-extrabold text-zinc-800">
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
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center">
                    End Time
                  </label>
                  <div className="relative flex items-center border border-zinc-200 rounded-xl bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[#16A34A] focus-within:border-[#16A34A] transition-all">
                    <Clock className="h-4 w-4 text-zinc-400 mr-2" />
                    <span className="text-xs font-extrabold text-zinc-800">
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

              <div className="bg-[#ECFDF5] border border-[#A7F3D0]/60 rounded-xl p-3 flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  Calculated Hours
                </span>
                <span className="text-sm font-extrabold text-emerald-950">
                  {editTotalHoursCalculated.text}
                </span>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Notes..."
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-all resize-none"
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
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
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
