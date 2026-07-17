"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import { Calendar, MapPin, Download, Loader2, Search } from "lucide-react";

import { Location } from "@/types/inventory";
import { Business } from "@/types/business";
import { Dropdown } from "@/components/ui/dropdown";
import { useBusinessStore } from "@/stores/business-store";
import { TimesheetReport } from "@/types/timesheet-report";
import DateRangePicker from "@/components/ui/date-range-picker";
import { getLocations } from "@/lib/repositories/location.repository";
import { useTimesheetReportStore } from "@/stores/timesheet-report-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getTimesheetSettings,
  TimesheetSettings,
} from "@/lib/repositories/timesheet-settings.repository";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "edited", label: "Resubmitted" },
  { value: "rejected", label: "Rejected" },
] as const;

export default function TimesheetReportsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { reports, loading, filters, setFilters, fetchReports, clearFilters } =
    useTimesheetReportStore();

  const [settings, setSettings] = useState<TimesheetSettings | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  const [displayLimit, setDisplayLimit] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof TimesheetReport | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);

  useEffect(() => {
    setFilters({
      businessId: "all",
      locationId: "all",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayLimit(30);
  }, [setFilters]);

  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      try {
        const bizList = await getUserBusinesses();
        setBusinesses(bizList);

        const locationResults = await Promise.all(
          bizList.map((b) => getLocations(b.id).catch(() => []))
        );
        setAllLocations(locationResults.flat());

        const targetSettingsBizId = activeBusinessId || (bizList.length > 0 ? bizList[0].id : null);
        if (targetSettingsBizId) {
          const settingsData = await getTimesheetSettings(targetSettingsBizId).catch(() => null);
          setSettings(settingsData);
        }

        // Fetch reports for all businesses initially
        await fetchReports("all");
      } catch (err) {
        console.error("Failed to load init data in reports:", err);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [activeBusinessId, fetchReports]);

  useEffect(() => {
    if (!initLoading) {
      fetchReports(filters.businessId);
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
  ]);

  const handleBusinessFilterChange = (val: string) => {
    const updates: Partial<typeof filters> = { businessId: val };
    if (val !== "all" && filters.locationId !== "all") {
      const loc = allLocations.find((l) => l.id === filters.locationId);
      if (!loc || loc.businessId !== val) {
        updates.locationId = "all";
      }
    }
    setFilters(updates);
    setDisplayLimit(30);
  };

  const visibleLocations = useMemo(() => {
    if (filters.businessId === "all") {
      return allLocations;
    }
    return allLocations.filter((l) => l.businessId === filters.businessId);
  }, [allLocations, filters.businessId]);

  const handleClear = () => {
    clearFilters("all");
    setFilters({
      businessId: "all",
      locationId: "all",
      staffId: "all",
      status: "all",
    });
    setSearchQuery("");
    setDisplayLimit(30);
    toast.success("Filters cleared.");
  };

  const handleSort = (field: keyof TimesheetReport) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const searchedReports = useMemo(() => {
    let data = reports.filter((r) => r.totalHours > 0 && !(r.startTime === "00:00" && r.endTime === "00:00"));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (r) =>
          r.staffName.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          r.businessName.toLowerCase().includes(q) ||
          (r.project && r.project.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q)),
      );
    }
    return data;
  }, [reports, searchQuery]);

  const sortedReports = useMemo(() => {
    const data = [...searchedReports];
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
  }, [searchedReports, sortField, sortDirection]);

  const paginatedReports = useMemo(() => {
    return sortedReports.slice(0, displayLimit);
  }, [sortedReports, displayLimit]);

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

  const totalHoursDecimal = useMemo(() => {
    return searchedReports.reduce((sum, r) => sum + r.totalHours, 0);
  }, [searchedReports]);

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

    const rows = sortedReports.map((r) => [
      r.staffName,
      r.businessName,
      r.locationName,
      r.workDate,
      r.startTime,
      r.endTime,
      r.unpaidBreak,
      r.project || "",
      r.totalHours.toFixed(2),
      r.status.toLowerCase() === "submitted"
        ? "Pending"
        : r.status.toLowerCase() === "edited"
          ? "Resubmitted"
          : r.status.charAt(0).toUpperCase() + r.status.slice(1),
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
      `NexBrix_timesheet_report_${new Date().toISOString().slice(0, 10)}.csv`,
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

    const rows = sortedReports.map((r) => [
      r.staffName,
      r.businessName,
      r.locationName,
      r.workDate,
      r.startTime,
      r.endTime,
      r.unpaidBreak,
      r.project || "",
      r.totalHours.toFixed(2),
      r.status.toLowerCase() === "submitted"
        ? "Pending"
        : r.status.toLowerCase() === "edited"
          ? "Resubmitted"
          : r.status.charAt(0).toUpperCase() + r.status.slice(1),
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
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-black">
        <Loader2 className="h-7 w-7 text-[#0A2924] animate-spin mb-3" />
        <span className="text-black/50 text-xs font-bold uppercase tracking-wider">
          Preparing reports dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="pb-6 bg-white min-h-[85vh] relative">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
              Timesheet Reports
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportPayroll}
              className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 border border-[#0A2924] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export {settings?.payroll_export_format || "Excel"}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-450">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search Timesheet"
                className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none transition shadow-2xs h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(30);
                }}
              />
            </div>

            {/* Business Dropdown */}
            <div className="w-full sm:w-44">
              <Select value={filters.businessId} onValueChange={handleBusinessFilterChange}>
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
              <Select value={filters.locationId} onValueChange={(val) => {
                setFilters({ locationId: val });
                setDisplayLimit(30);
              }}>
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
              <Dropdown
                value={filters.status}
                onChange={(val) => {
                  setFilters({ status: val });
                  setDisplayLimit(30);
                }}
                options={STATUS_OPTIONS}
                triggerClassName="rounded-xl px-3.5 py-2.5 h-10 border-neutral-200 font-semibold text-neutral-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Date Range Picker */}
            <div className="w-full sm:w-64">
              <DateRangePicker
                startDate={filters.startDate}
                endDate={filters.endDate}
                onChange={(range) => {
                  setFilters(range);
                  setDisplayLimit(30);
                }}
                focusClassName="focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5"
                weekStartsOn={settings?.week_starts_on}
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={handleClear}
              className="inline-flex items-center bg-white text-neutral-700 px-5 py-2.5 rounded-full text-xs font-semibold border border-neutral-200 hover:border-neutral-300 transition-colors duration-200 cursor-pointer shadow-xs h-10 shrink-0"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table Container Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-2xs flex flex-col">
          <div
            className="overflow-auto max-h-[600px]"
            onScroll={(e) => {
              const container = e.currentTarget;
              if (
                container.scrollHeight - container.scrollTop <=
                container.clientHeight + 100
              ) {
                setDisplayLimit((prev) =>
                  Math.min(prev + 30, sortedReports.length),
                );
              }
            }}
          >
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 text-[#0A2924] animate-spin mb-3" />
                <span className="text-xs text-neutral-450 font-bold uppercase tracking-wider">
                  Loading timesheet report data...
                </span>
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Calendar className="h-10 w-10 text-neutral-300 mb-3" />
                <h3 className="text-sm font-bold text-neutral-900">
                  No reports available
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  No records match your active filters. Try adjusting your
                  parameters.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] uppercase font-semibold tracking-wider text-neutral-500 bg-white sticky top-0 z-10 text-center">
                    <th
                      onClick={() => handleSort("staffName")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-left"
                    >
                      Staff Name
                    </th>
                    <th
                      onClick={() => handleSort("businessName")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-left"
                    >
                      Business
                    </th>
                    <th
                      onClick={() => handleSort("locationName")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-left"
                    >
                      Location
                    </th>
                    <th
                      onClick={() => handleSort("workDate")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-left"
                    >
                      Date
                    </th>
                    <th
                      onClick={() => handleSort("startTime")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-center"
                    >
                      Shift Time
                    </th>
                    <th
                      onClick={() => handleSort("unpaidBreak")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-center"
                    >
                      Break
                    </th>
                    <th
                      onClick={() => handleSort("project")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-left"
                    >
                      Project
                    </th>
                    <th
                      onClick={() => handleSort("totalHours")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-center"
                    >
                      Total Hours
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="py-4 px-6 font-semibold cursor-pointer hover:bg-neutral-50/80 transition duration-150 select-none text-center"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800 bg-white">
                  {paginatedReports.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50/30 transition-colors text-center"
                    >
                      <td className="py-4 px-6 whitespace-nowrap text-left font-semibold text-neutral-900">
                        {r.staffName}
                      </td>
                      <td className="py-4 px-6 text-neutral-550 font-semibold text-left">
                        {r.businessName}
                      </td>
                      <td className="py-4 px-6 text-neutral-550 font-medium text-left">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-neutral-450" />
                          {r.locationName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-neutral-550 font-medium text-left whitespace-nowrap">
                        {formatDateToDisplay(r.workDate)}
                      </td>
                      <td className="py-4 px-6 text-neutral-700 font-semibold text-center whitespace-nowrap">
                        {formatTimeToAMPM(r.startTime)} -{" "}
                        {formatTimeToAMPM(r.endTime)}
                      </td>
                      <td className="py-4 px-6 text-neutral-700 font-semibold text-center whitespace-nowrap">
                        {r.unpaidBreak} min
                      </td>
                      <td className="py-4 px-6 text-neutral-550 font-semibold text-left whitespace-nowrap">
                        {r.project || "—"}
                      </td>
                      <td className="py-4 px-6 font-bold text-neutral-900 text-center whitespace-nowrap">
                        {formatHours(r.totalHours)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-[10px] uppercase font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 border shadow-3xs leading-none w-fit ${getStatusBadgeClass(r.status)}`}
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
                          {r.status.toLowerCase() === "submitted"
                            ? "Pending"
                            : r.status.toLowerCase() === "edited"
                              ? "Resubmitted"
                              : r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && sortedReports.length > 0 && (
            <div className="bg-neutral-50/10 border-t border-neutral-200 py-3.5 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-500 font-semibold">
              <span>
                Showing {Math.min(displayLimit, sortedReports.length)} of{" "}
                {sortedReports.length} entries
              </span>
            </div>
          )}
        </div>

        {/* Total Hours Summary */}
        {!loading && sortedReports.length > 0 && (
          <div className="text-[#0F172A] font-bold text-lg mt-6 pl-4 select-none">
            Total Hours: {totalHoursDecimal.toFixed(2).replace(".00", "")}
          </div>
        )}
      </div>
    </div>
  );
}
