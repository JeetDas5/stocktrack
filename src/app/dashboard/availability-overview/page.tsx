"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Download,
  AlertCircle,
  Eye,
  X,
  Sparkles,
  Info,
} from "lucide-react";

import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { useAvailabilityStore } from "@/store/availability-store";
import {
  AvailabilityOverviewItem,
  OverviewStaffMember,
} from "@/types/availability";

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

const formatDateHeading = (dateStr: string) => {
  const d = new Date(dateStr);
  const opt: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return d.toLocaleDateString("en-GB", opt);
};

export default function AvailabilityOverviewPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { overview, loading, fetchOverview } = useAvailabilityStore();

  const [periodType, setPeriodType] = useState<"weekly" | "fortnightly">(
    "weekly",
  );
  const [currentStartDate, setCurrentStartDate] = useState<Date>(
    getMonday(new Date()),
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [selectedShiftDetails, setSelectedShiftDetails] =
    useState<AvailabilityOverviewItem | null>(null);

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
      const endStr = formatDateYYYYMMDD(endDate);
      fetchOverview(activeBusinessId, startStr, endStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, currentStartDate, periodType, fetchOverview]);

  const handlePrevPeriod = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(
      currentStartDate.getDate() - (periodType === "weekly" ? 7 : 14),
    );
    setCurrentStartDate(newStart);
    setCurrentPage(1);
  };

  const handleNextPeriod = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(
      currentStartDate.getDate() + (periodType === "weekly" ? 7 : 14),
    );
    setCurrentStartDate(newStart);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedLocation("all");
    setSelectedShift("all");
    setCurrentPage(1);
    toast.success("Filters cleared");
  };

  const uniqueShifts = Array.from(new Set(overview.map((o) => o.shiftLabel)));

  const filteredOverview = overview.filter((item) => {
    const matchesLoc =
      selectedLocation === "all" || item.locationId === selectedLocation;
    const matchesShift =
      selectedShift === "all" || item.shiftLabel === selectedShift;
    return matchesLoc && matchesShift;
  });

  const groupedByDate: Record<string, AvailabilityOverviewItem[]> = {};
  filteredOverview.forEach((item) => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  const datesList = Object.keys(groupedByDate).sort();

  const itemsPerPage = 3;
  const totalPages = Math.ceil(datesList.length / itemsPerPage);
  const paginatedDates = datesList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleDayExpansion = (date: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const totalShiftSlots = filteredOverview.length;
  const slotsWithAvailability = filteredOverview.filter(
    (item) => item.availableStaffCount > 0,
  ).length;
  const coveragePercent =
    totalShiftSlots > 0
      ? ((slotsWithAvailability / totalShiftSlots) * 100).toFixed(1)
      : "0.0";

  const allAvailableStaff = new Set<string>();
  filteredOverview.forEach((item) => {
    item.staffMembers.forEach((s) => allAvailableStaff.add(s.id));
  });
  const staffAvailableCount = allAvailableStaff.size;

  const handleExport = () => {
    toast.success("Availability data exported successfully.");
  };

  return (
    <div className="max-w-(screen-2xl) mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#16A34A] uppercase tracking-wider">
            <span>Staff Operations</span>
            <span>/</span>
            <span>Availability Overview</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 mt-1">
            Availability Overview
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
            View staff availability for the selected period to plan the roster.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-extrabold text-zinc-700 hover:text-zinc-900 transition duration-200 cursor-pointer shadow-xs bg-white"
        >
          <Download className="h-3.5 w-3.5 text-zinc-500" />
          <span>Export</span>
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-500">
              View By
            </span>
            <select
              value={periodType}
              onChange={(e) => {
                setPeriodType(e.target.value as "weekly" | "fortnightly");
                setCurrentPage(1);
              }}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
            >
              <option value="weekly">Day</option>
              <option value="fortnightly">Fortnight</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-500">
              Location
            </span>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-zinc-500">Shift</span>
            <select
              value={selectedShift}
              onChange={(e) => {
                setSelectedShift(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:border-[#16A34A] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Shifts</option>
              {uniqueShifts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 text-xs font-bold transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[#16A34A] hover:text-[#15803d] text-xs font-extrabold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center gap-2">
              <span className="text-sm font-extrabold text-zinc-900">
                Availability by Day, Shift & Location
              </span>
              <Info className="h-4 w-4 text-zinc-400 cursor-pointer" />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#16A34A] mb-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Loading Overview...
                </span>
              </div>
            ) : filteredOverview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <AlertCircle className="h-10 w-10 text-zinc-300 mb-2" />
                <span className="text-xs font-semibold">
                  No availability submissions found for this period or filters.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {paginatedDates.map((dateStr) => {
                  const shifts = groupedByDate[dateStr];
                  const isExpanded = !!expandedDays[dateStr];
                  const visibleShifts = isExpanded
                    ? shifts
                    : shifts.slice(0, 3);
                  const remainingShifts = shifts.length - 3;

                  return (
                    <div key={dateStr} className="p-6 space-y-4">
                      <h3 className="text-sm font-extrabold text-zinc-900 bg-zinc-50 px-3 py-1.5 rounded-lg inline-block">
                        {formatDateHeading(dateStr)}
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-left">
                          <thead>
                            <tr className="text-[10px] font-extrabold uppercase text-[#64748B] tracking-wider">
                              <th className="py-2.5 pr-4">Location</th>
                              <th className="py-2.5 px-4">Shift / Time</th>
                              <th className="py-2.5 px-4 text-center">
                                Available Staff
                              </th>
                              <th className="py-2.5 px-4">Staff & Priority</th>
                              <th className="py-2.5 px-4">Already Assigned</th>
                              <th className="py-2.5 px-4 text-center">
                                Worked Prev Day
                              </th>
                              <th className="py-2.5 pl-4 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                            {visibleShifts.map((shiftItem, sIdx) => {
                              const topStaff = shiftItem.staffMembers.slice(
                                0,
                                5,
                              );
                              const extraStaffCount =
                                shiftItem.staffMembers.length - 5;
                              const firstStaff = shiftItem.staffMembers[0];

                              return (
                                <tr
                                  key={sIdx}
                                  className="hover:bg-zinc-50/40 transition-colors"
                                >
                                  <td className="py-3.5 pr-4 text-zinc-950 font-bold">
                                    {shiftItem.locationName}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                      <span>{shiftItem.shiftLabel}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-50 text-[#16A34A] border border-green-200">
                                      {shiftItem.availableStaffCount}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 max-w-xs truncate">
                                    {shiftItem.availableStaffCount > 0 ? (
                                      <span>
                                        {topStaff
                                          .map(
                                            (s) => `${s.name} (P${s.priority})`,
                                          )
                                          .join(", ")}
                                        {extraStaffCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSelectedShiftDetails(shiftItem)
                                            }
                                            className="text-[#16A34A] font-extrabold ml-1 hover:underline cursor-pointer"
                                          >
                                            +{extraStaffCount} more
                                          </button>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">
                                        None
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-zinc-650">
                                    {firstStaff
                                      ? `${firstStaff.alreadyAssigned.toFixed(1)} hrs`
                                      : "0.0 hrs"}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {firstStaff ? (
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                          firstStaff.workedPreviousDay === "Yes"
                                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                                            : "bg-green-50 text-green-600 border border-green-200"
                                        }`}
                                      >
                                        {firstStaff.workedPreviousDay}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 pl-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedShiftDetails(shiftItem)
                                      }
                                      className="inline-flex items-center gap-1 text-[#16A34A] hover:text-[#15803d] font-extrabold transition-colors cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>View Details</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {remainingShifts > 0 && !isExpanded && (
                        <button
                          type="button"
                          onClick={() => toggleDayExpansion(dateStr)}
                          className="flex items-center gap-1 text-[#16A34A] hover:text-[#15803d] text-xs font-extrabold hover:underline cursor-pointer mt-2"
                        >
                          <span>+ {remainingShifts} more shifts</span>
                          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                        </button>
                      )}

                      {isExpanded && shifts.length > 3 && (
                        <button
                          type="button"
                          onClick={() => toggleDayExpansion(dateStr)}
                          className="flex items-center gap-1 text-[#16A34A] hover:text-[#15803d] text-xs font-extrabold hover:underline cursor-pointer mt-2"
                        >
                          <span>Hide shifts</span>
                          <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50/50">
                <div className="text-xs font-semibold text-zinc-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, datesList.length)} of{" "}
                  {datesList.length} days
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((c) => c - 1)}
                    className="p-1.5 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`h-7 w-7 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        currentPage === idx + 1
                          ? "bg-[#16A34A] text-white"
                          : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((c) => c + 1)}
                    className="p-1.5 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6 shrink-0 lg:sticky lg:top-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-2">
            <h2 className="text-sm font-extrabold text-zinc-950 border-b border-zinc-100">
              Availability Summary
            </h2>

            <div className="text-zinc-500 text-[10px] font-extrabold uppercase tracking-wider">
              {formatDateRange(currentStartDate, endDate)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-zinc-150 rounded-xl p-4 text-center space-y-1">
                <div className="text-zinc-400 font-bold text-[10px] uppercase">
                  Total Slots
                </div>
                <div className="text-lg font-extrabold text-zinc-950">
                  {totalShiftSlots}
                </div>
              </div>
              <div className="border border-zinc-150 rounded-xl p-4 text-center space-y-1">
                <div className="text-zinc-400 font-bold text-[10px] uppercase">
                  Filled Slots
                </div>
                <div className="text-lg font-extrabold text-zinc-950">
                  {slotsWithAvailability}
                </div>
              </div>
              <div className="border border-zinc-150 rounded-xl p-4 text-center space-y-1">
                <div className="text-zinc-400 font-bold text-[10px] uppercase">
                  Coverage
                </div>
                <div className="text-lg font-extrabold text-zinc-950">
                  {coveragePercent}%
                </div>
              </div>
              <div className="border border-zinc-150 rounded-xl p-4 text-center space-y-1">
                <div className="text-zinc-400 font-bold text-[10px] uppercase">
                  Staff Avail.
                </div>
                <div className="text-lg font-extrabold text-zinc-950">
                  {staffAvailableCount}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <h4 className="text-xs font-extrabold text-zinc-900">Legend</h4>
              <div className="space-y-2 text-xs font-semibold text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>Yes - Staff worked previous day</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>No - Staff did not work previous day</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-350" />
                  <span>No data available</span>
                </div>
              </div>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-4 rounded-xl flex items-start gap-2.5 text-blue-900">
              <AlertCircle className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] font-semibold">
                <span className="font-extrabold block">Tip</span>
                <span className="mt-0.5 block leading-normal">
                  Use the filters above to view availability for specific days,
                  locations or shifts.
                </span>
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <h4 className="text-xs font-extrabold text-zinc-900">Actions</h4>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#16A34A] hover:bg-green-50 rounded-xl text-xs font-extrabold text-[#16A34A] transition duration-200 cursor-pointer shadow-2xs bg-white"
              >
                <Sparkles className="h-4 w-4" />
                <span>Go to Roster Builder</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-extrabold text-zinc-700 transition duration-200 cursor-pointer shadow-2xs bg-white"
              >
                <Download className="h-3.5 w-3.5 text-zinc-500" />
                <span>Export to Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedShiftDetails && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-sm">
                  Available Staff Details
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {selectedShiftDetails.locationName} —{" "}
                  {selectedShiftDetails.shiftLabel} on{" "}
                  {formatDateHeading(selectedShiftDetails.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftDetails(null)}
                className="p-1 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[400px]">
              {selectedShiftDetails.staffMembers.length === 0 ? (
                <div className="text-center py-10 text-xs font-semibold text-zinc-400">
                  No staff members available.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200 text-left">
                  <thead>
                    <tr className="text-[10px] font-extrabold uppercase text-[#64748B] tracking-wider">
                      <th className="py-2.5">Staff Name</th>
                      <th className="py-2.5 text-center">Priority</th>
                      <th className="py-2.5">Weekly Hours Assigned</th>
                      <th className="py-2.5 text-center">
                        Worked Previous Day
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                    {selectedShiftDetails.staffMembers.map(
                      (staff: OverviewStaffMember) => (
                        <tr key={staff.id} className="hover:bg-zinc-50/50">
                          <td className="py-3.5 text-zinc-900 font-bold">
                            {staff.name}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-extrabold">
                              P{staff.priority}
                            </span>
                          </td>
                          <td className="py-3.5 text-zinc-650">
                            {staff.alreadyAssigned.toFixed(1)} hrs
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                staff.workedPreviousDay === "Yes"
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : "bg-green-50 text-green-600 border border-green-200"
                              }`}
                            >
                              {staff.workedPreviousDay}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-150 flex items-center justify-end bg-zinc-50">
              <button
                type="button"
                onClick={() => setSelectedShiftDetails(null)}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-xl text-xs font-extrabold cursor-pointer transition duration-200 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
