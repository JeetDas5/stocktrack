"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Loader2,
  Users,
  Clock,
  Coffee,
} from "lucide-react";

import { Staff } from "@/types/staff";
import { TimesheetReport } from "@/types/timesheet-report";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import DateRangePicker from "@/components/ui/date-range-picker";
import { useTimesheetReportStore } from "@/stores/timesheet-report-store";
import { getStaffMembers } from "@/lib/repositories/staff.repository";
import {
  getTimesheetSettings,
  TimesheetSettings,
} from "@/lib/repositories/timesheet-settings.repository";


export default function TimesheetReportsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const { reports, loading, filters, setFilters, fetchReports, clearFilters } =
    useTimesheetReportStore();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<TimesheetSettings | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof TimesheetReport | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setFilters({
      businessId: activeBusinessId || "all",
      locationId: activeLocationId || "all",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeBusinessId, activeLocationId, setFilters]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!activeBusinessId) {
        setStaffList([]);
        return;
      }
      try {
        const staff = await getStaffMembers(activeBusinessId);
        setStaffList(staff);
      } catch {
        toast.error("Failed to load staff list.");
      }
    };
    loadStaff();
  }, [activeBusinessId]);

  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      if (activeBusinessId) {
        try {
          const [_, settingsData] = await Promise.all([
            fetchReports(activeBusinessId),
            getTimesheetSettings(activeBusinessId).catch(() => null),
          ]);
          setSettings(settingsData);
        } catch (err) {
          console.error("Failed to load settings in reports:", err);
        }
      }
      setInitLoading(false);
    };
    init();
  }, [activeBusinessId, fetchReports]);

  useEffect(() => {
    if (!initLoading && activeBusinessId) {
      fetchReports(activeBusinessId);
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.businessId,
    filters.locationId,
    filters.staffId,
    filters.status,
    initLoading,
    fetchReports,
    activeBusinessId,
  ]);

  const handleClear = () => {
    clearFilters(activeBusinessId || "all");
    setFilters({
      locationId: activeLocationId || "all",
      staffId: "all",
      status: "all",
    });
    setCurrentPage(1);
    toast.success("Filters cleared.");
  };

  const handleRefresh = () => {
    if (activeBusinessId) {
      fetchReports(activeBusinessId);
      toast.success("Reports refreshed.");
    }
  };

  const handleSort = (field: keyof TimesheetReport) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedReports = useMemo(() => {
    const data = [...reports];
    if (!sortField) return data;

    return data.sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
  }, [reports, sortField, sortDirection]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedReports.slice(start, start + pageSize);
  }, [sortedReports, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedReports.length / pageSize) || 1;

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-orange-100 text-orange-700 border-orange-200",
    ];
    return colors[charCode % colors.length];
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20";
      case "rejected":
        return "bg-red-50 text-red-600 border-red-100";
      case "edited":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const formatDateToDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
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
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[d.getDay()];
    return `${day} ${month} ${year} (${dayName})`;
  };

  const formatTimeToAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    const clean = timeStr.trim();
    if (
      clean.toUpperCase().includes("AM") ||
      clean.toUpperCase().includes("PM")
    ) {
      return clean;
    }
    const [hourStr, minStr] = clean.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const zeroPaddedHour = formattedHour.toString().padStart(2, "0");
    return `${zeroPaddedHour}:${minStr} ${ampm}`;
  };

  const formatHours = (hours: number) => {
    const totalMins = Math.round(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const metrics = useMemo(() => {
    const uniqueStaff = new Set(reports.map((r) => r.staffId)).size;
    const totalHours = reports.reduce((sum, r) => sum + r.totalHours, 0);

    const uniqueDates = new Set(reports.map((r) => r.workDate));
    const avgHours = uniqueDates.size > 0 ? totalHours / uniqueDates.size : 0;

    let daysInRange = 0;
    if (filters.startDate && filters.endDate) {
      const s = new Date(filters.startDate + "T00:00:00");
      const e = new Date(filters.endDate + "T00:00:00");
      const diffTime = Math.abs(e.getTime() - s.getTime());
      daysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      totalStaff: uniqueStaff,
      totalHours: formatHours(totalHours),
      avgHours: formatHours(avgHours),
      daysInRange: isNaN(daysInRange) ? 0 : daysInRange,
    };
  }, [reports, filters.startDate, filters.endDate]);

  const exportCSV = () => {
    const headers = [
      "Staff Name",
      "Business",
      "Location",
      "Date",
      "Start Time",
      "End Time",
      "Break (min)",
      "Total Hours",
      "Status",
    ];

    const rows = sortedReports.map((r) => [
      r.staffName,
      r.businessName,
      r.locationName,
      r.workDate,
      r.startTime,
      r.endTime,
      r.unpaidBreak,
      r.totalHours.toFixed(2),
      r.status,
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
      `timesheet_report_${new Date().toISOString().slice(0, 10)}.csv`,
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
      "Total Hours",
      "Status",
    ];

    const rows = sortedReports.map((r) => [
      r.staffName,
      r.businessName,
      r.locationName,
      r.workDate,
      r.startTime,
      r.endTime,
      r.unpaidBreak,
      r.totalHours.toFixed(2),
      r.status,
    ]);

    let content =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    content +=
      '<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Timesheet Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
    content += "<body><table>";
    content +=
      "<tr>" +
      headers
        .map(
          (h) =>
            `<th style="background-color: #16A34A; color: white; font-weight: bold; border: 1px solid #ccc; padding: 5px;">${h}</th>`,
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
    link.download = `timesheet_report_${new Date().toISOString().slice(0, 10)}.xls`;
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

    const rows = sortedReports.map((r) => [
      r.staffName,
      "",
      r.workDate,
      r.locationName || "",
      "",
      r.totalHours.toFixed(2),
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

    const rows = sortedReports.map((r) => {
      const nameParts = r.staffName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || firstName;
      const finalFirstName = nameParts.length > 1 ? firstName : "";

      return [
        lastName,
        finalFirstName,
        r.workDate,
        r.locationName || "Regular Hours",
        r.totalHours.toFixed(2),
        r.notes || "",
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

  const handleExportPayroll = () => {
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

  if (initLoading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Preparing reports dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-50/30 min-h-[85vh] relative select-none">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Timesheet Reports
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              View and download timesheet reports for payroll and analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportPayroll}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Export Payroll ({settings?.payroll_export_format || "CSV"})
            </button>
            
            <div className="flex gap-2">
              {settings?.payroll_export_format !== "CSV" && (
                <button
                  onClick={exportCSV}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs cursor-pointer transition-all duration-200"
                >
                  CSV
                </button>
              )}
              {settings?.payroll_export_format !== "Excel" && (
                <button
                  onClick={exportExcel}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs cursor-pointer transition-all duration-200"
                >
                  Excel
                </button>
              )}
              {settings?.payroll_export_format !== "Xero" && (
                <button
                  onClick={exportXeroCSV}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs cursor-pointer transition-all duration-200"
                >
                  Xero
                </button>
              )}
              {settings?.payroll_export_format !== "MYOB" && (
                <button
                  onClick={exportMYOBCSV}
                  className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-2xs cursor-pointer transition-all duration-200"
                >
                  MYOB
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs mb-8">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5">
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
              Filters
            </h3>
            <button
              onClick={handleClear}
              className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl px-4 py-2 cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Date Range
              </label>
              <DateRangePicker
                startDate={filters.startDate}
                endDate={filters.endDate}
                onChange={(range) => {
                  setFilters(range);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Staff Member
              </label>
              <div className="relative">
                <select
                  value={filters.staffId}
                  onChange={(e) => {
                    setFilters({ staffId: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none appearance-none cursor-pointer font-bold pr-8 h-[42px]"
                >
                  <option value="all">All Staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Status
              </label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ status: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] rounded-xl py-2.5 px-3 text-xs text-zinc-950 focus:outline-none appearance-none cursor-pointer font-bold pr-8 h-[42px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="edited">Edited</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs mb-8">
          <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                Timesheet Report
              </h2>
              <span className="bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/10 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {reports.length} records
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-2xs flex items-center gap-2 cursor-pointer transition-all duration-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-zinc-400 ${loading ? "animate-spin text-[#16A34A]" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Loading timesheet report data...
                </span>
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Calendar className="h-10 w-10 text-zinc-300 mb-3" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  No reports available
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  No records match your active filters. Try adjusting your
                  parameters.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th
                      onClick={() => handleSort("staffName")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Staff Name
                    </th>
                    <th
                      onClick={() => handleSort("businessName")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Business
                    </th>
                    <th
                      onClick={() => handleSort("locationName")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Location
                    </th>
                    <th
                      onClick={() => handleSort("workDate")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Date
                    </th>
                    <th
                      onClick={() => handleSort("startTime")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Start Time
                    </th>
                    <th
                      onClick={() => handleSort("endTime")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      End Time
                    </th>
                    <th
                      onClick={() => handleSort("unpaidBreak")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Break
                    </th>
                    <th
                      onClick={() => handleSort("totalHours")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Total Hours
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="py-4 px-6 font-extrabold cursor-pointer hover:bg-zinc-100 transition duration-150 select-none"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                  {paginatedReports.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-zinc-50/40 transition-colors"
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-extrabold text-xs border shadow-3xs shrink-0 ${getAvatarBg(r.staffName)}`}
                          >
                            {getInitials(r.staffName)}
                          </div>
                          <span className="font-extrabold text-[#0F172A]">
                            {r.staffName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#64748B] font-bold">
                        {r.businessName}
                      </td>
                      <td className="py-4 px-6 text-zinc-700 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          {r.locationName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#64748B] font-medium whitespace-nowrap">
                        {formatDateToDisplay(r.workDate)}
                      </td>
                      <td className="py-4 px-6 text-zinc-700 font-semibold">
                        {formatTimeToAMPM(r.startTime)}
                      </td>
                      <td className="py-4 px-6 text-zinc-700 font-semibold">
                        {formatTimeToAMPM(r.endTime)}
                      </td>
                      <td className="py-4 px-6 text-zinc-700 font-semibold">
                        {r.unpaidBreak} min
                      </td>
                      <td className="py-4 px-6 font-extrabold text-[#0F172A]">
                        {formatHours(r.totalHours)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-3xs leading-none w-fit ${getStatusBadgeClass(r.status)}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              r.status.toLowerCase() === "approved"
                                ? "bg-[#16A34A]"
                                : r.status.toLowerCase() === "rejected"
                                  ? "bg-red-500"
                                  : r.status.toLowerCase() === "edited"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                            }`}
                          />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && sortedReports.length > 0 && (
            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing{" "}
                {Math.min(
                  (currentPage - 1) * pageSize + 1,
                  sortedReports.length,
                )}{" "}
                to {Math.min(currentPage * pageSize, sortedReports.length)} of{" "}
                {sortedReports.length} entries
              </span>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold">Show</span>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-zinc-200 rounded-lg pl-2 pr-6 py-1 text-[11px] font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer appearance-none"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-45 transition-colors cursor-pointer"
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="h-8 w-8 bg-[#16A34A] text-white flex items-center justify-center rounded-lg font-bold">
                    {currentPage}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-400 disabled:opacity-45 transition-colors cursor-pointer"
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition-all duration-200">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#16A34A] shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Staff
              </p>
              <h4 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
                {metrics.totalStaff}
              </h4>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition-all duration-200">
            <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Hours
              </p>
              <h4 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
                {metrics.totalHours}
              </h4>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition-all duration-200">
            <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Coffee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Average Hours / Day
              </p>
              <h4 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
                {metrics.avgHours}
              </h4>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition-all duration-200">
            <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Days in Range
              </p>
              <h4 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
                {metrics.daysInRange}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
