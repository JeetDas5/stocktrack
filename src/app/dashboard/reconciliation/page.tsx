/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useMemo, useRef } from "react";

import { Business } from "@/types/business";
import AlertDialog from "@/components/ui/alert-dialog";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { useCategoryStore } from "@/stores/category-store";
import { useSupplierStore } from "@/stores/supplier-store";
import { Reconciliation } from "@/types/reconciliation";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getReconciliations,
  getReconciliationDetail,
  runReconciliation,
  getReconciliationPreview,
  deleteReconciliation,
} from "@/lib/repositories/reconciliation.repository";
import {
  RefreshCw,
  Download,
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowLeft,
} from "lucide-react";

export default function ReconciliationPage() {
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();
  const { locations, activeLocationId, fetchLocations } = useLocationStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { suppliers, fetchSuppliers } = useSupplierStore();

  const [businesses, setBusinesses] = useState<Business[]>([]);

  const getTodayString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDaysAgoString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState<string>(() =>
    getDaysAgoString(30),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayString());

  const date = useMemo(() => endDate || startDate, [startDate, endDate]);

  // Custom Calendar State and Logic
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const prevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    );
  };

  const formatLocalDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatLocalDate(date);

    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate("");
    } else {
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate("");
      } else {
        setEndDate(dateStr);
        setIsCalendarOpen(false);
      }
    }
  };

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = dayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarMonth]);

  const formattedDateRange = useMemo(() => {
    if (!startDate) return "Select Date Range";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const startFormatted = new Date(startDate).toLocaleDateString(
      "en-US",
      options,
    );
    if (!endDate) return `${startFormatted} to ...`;
    const endFormatted = new Date(endDate).toLocaleDateString("en-US", options);
    return `${startFormatted} — ${endFormatted}`;
  }, [startDate, endDate]);

  const [compareWith, setCompareWith] = useState("System (Expected)");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "matched" | "variance">(
    "all",
  );
  const [sidebarFiltersOpen, setSidebarFiltersOpen] = useState(false);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterVariance, setFilterVariance] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [appliedCategory, setAppliedCategory] = useState("all");
  const [appliedSupplier, setAppliedSupplier] = useState("all");
  const [appliedVariance, setAppliedVariance] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRuns, setHistoryRuns] = useState<Reconciliation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingSavedRunId, setViewingSavedRunId] = useState<string | null>(
    null,
  );

  const [visibleColumns, setVisibleColumns] = useState({
    itemName: true,
    category: true,
    uom: true,
    expectedQty: true,
    actualQty: true,
    varianceQty: true,
    variancePercent: true,
    varianceValue: true,
    status: true,
  });
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const list = await getUserBusinesses([]);
        setBusinesses(list);
      } catch (err) {
        console.error(err);
      }
    }
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (activeBusinessId) {
      fetchLocations(activeBusinessId);
      fetchCategories(activeBusinessId);
      fetchSuppliers(activeBusinessId);
    }
  }, [activeBusinessId, fetchLocations, fetchCategories, fetchSuppliers]);

  useEffect(() => {
    if (activeLocationId) {
      setSelectedLocationId(activeLocationId);
    } else {
      setSelectedLocationId("");
    }
  }, [activeLocationId]);

  const loadReconciliationData = async (
    locationId: string,
    targetDate: string,
    comparison: string,
  ) => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);
      setViewingSavedRunId(null);
      const data = await getReconciliationPreview(activeBusinessId, {
        locationId: locationId || undefined,
        date: targetDate,
        compareWith: comparison,
      });
      setReconciliation(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reconciliation preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusinessId && selectedLocationId) {
      loadReconciliationData(selectedLocationId, date, compareWith);
    }
  }, [activeBusinessId, selectedLocationId, date, compareWith]);

  const handleRunReconciliation = async () => {
    if (!activeBusinessId) return;
    try {
      setRunning(true);
      setError(null);
      const saved = await runReconciliation(activeBusinessId, {
        locationId: selectedLocationId || undefined,
        reconciliationDate: date,
        compareWith: compareWith,
      });
      setReconciliation(saved);
      setViewingSavedRunId(saved.id || null);
      toast.success("Reconciliation run completed and saved successfully!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to run reconciliation.");
    } finally {
      setRunning(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!activeBusinessId) return;
    try {
      setHistoryLoading(true);
      setShowHistoryModal(true);
      const list = await getReconciliations(activeBusinessId);
      setHistoryRuns(list);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load reconciliation history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectHistoryRun = async (id: string) => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await getReconciliationDetail(activeBusinessId, id);
      setReconciliation(detail);
      setViewingSavedRunId(id);
      if (detail.locationId) {
        setSelectedLocationId(detail.locationId);
      }
      if (detail.reconciliationDate) {
        setStartDate(detail.reconciliationDate);
        setEndDate(detail.reconciliationDate);
      }
      if (detail.compareWith) {
        setCompareWith(detail.compareWith);
      }
      setShowHistoryModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reconciliation details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryRun = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const handleConfirmDeleteRun = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteReconciliation(activeBusinessId, deleteTarget);
      toast.success("Reconciliation run deleted successfully!");
      setHistoryRuns(historyRuns.filter((r) => r.id !== deleteTarget));
      if (viewingSavedRunId === deleteTarget) {
        setViewingSavedRunId(null);
        if (selectedLocationId) {
          loadReconciliationData(selectedLocationId, date, compareWith);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete reconciliation run.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleApplySidebarFilters = () => {
    setAppliedCategory(filterCategory);
    setAppliedSupplier(filterSupplier);
    setAppliedVariance(filterVariance);
    setAppliedStatus(filterStatus);
    setCurrentPage(1);
  };

  const handleClearSidebarFilters = () => {
    setFilterCategory("all");
    setFilterSupplier("all");
    setFilterVariance("all");
    setFilterStatus("all");
    setAppliedCategory("all");
    setAppliedSupplier("all");
    setAppliedVariance("all");
    setAppliedStatus("all");
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    if (!reconciliation || !reconciliation.items) return [];

    return reconciliation.items.filter((item) => {
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.itemSku || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "matched" && item.status === "Matched") ||
        (activeTab === "variance" && item.status === "Variance");

      const matchesCategory =
        appliedCategory === "all" || item.categoryName === appliedCategory;

      const matchesVariance =
        appliedVariance === "all" ||
        (appliedVariance === "positive" && item.varianceQty > 0) ||
        (appliedVariance === "negative" && item.varianceQty < 0) ||
        (appliedVariance === "none" && item.varianceQty === 0);

      const matchesStatus =
        appliedStatus === "all" || item.status === appliedStatus;

      return (
        matchesSearch &&
        matchesTab &&
        matchesCategory &&
        matchesVariance &&
        matchesStatus
      );
    });
  }, [
    reconciliation,
    searchQuery,
    activeTab,
    appliedCategory,
    appliedVariance,
    appliedStatus,
  ]);

  const matchedItemsCount = useMemo(() => {
    if (!reconciliation || !reconciliation.items) return 0;
    return reconciliation.items.filter((i) => i.status === "Matched").length;
  }, [reconciliation]);

  const varianceItemsCount = useMemo(() => {
    if (!reconciliation || !reconciliation.items) return 0;
    return reconciliation.items.filter((i) => i.status === "Variance").length;
  }, [reconciliation]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / itemsPerPage),
  );

  const formatCurrency = (val: number) => {
    const sign = val < 0 ? "-" : "";
    return `${sign}$${Math.abs(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercent = (val: number) => {
    return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
  };

  const donutData = useMemo(() => {
    if (!reconciliation) return { posVal: 0, negVal: 0, posPct: 0, negPct: 0 };
    const pos = reconciliation.positiveVarianceUsd || 0;
    const neg = Math.abs(reconciliation.negativeVarianceUsd || 0);
    const total = pos + neg;
    if (total === 0) {
      return { posVal: pos, negVal: -neg, posPct: 0, negPct: 0 };
    }
    return {
      posVal: pos,
      negVal: -neg,
      posPct: (pos / total) * 100,
      negPct: (neg / total) * 100,
    };
  }, [reconciliation]);

  const handleDownloadCSV = () => {
    if (!reconciliation || !reconciliation.items) return;
    let csv =
      "Item Name,Category,UOM,Expected Qty,Actual Qty,Variance Qty,Variance %,Variance Value,Status\n";
    reconciliation.items.forEach((item) => {
      csv += `"${item.itemName}","${item.categoryName}","${item.baseUnit}",${item.expectedQty},${item.actualQty},${item.varianceQty},${item.variancePercent}%,${item.varianceValue},"${item.status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reconciliation_${date}_${selectedLocationId || "all"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Syncing reconciliation workspace...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A] p-6 text-center">
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 max-w-md shadow-xs space-y-4">
          <div className="h-12 w-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-zinc-950">
            Permission Denied
          </h2>
          <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
            {error.includes("permission") ||
            error.includes("authorized") ||
            error.includes("403")
              ? "You do not have the required permissions to view stock reconciliation. Please contact your system administrator."
              : error}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (selectedLocationId) {
                  loadReconciliationData(selectedLocationId, date, compareWith);
                } else if (activeBusinessId) {
                  loadReconciliationData("", date, compareWith);
                } else {
                  setError(null);
                }
              }}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition duration-150 cursor-pointer shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[85vh] select-none space-y-6 relative">
      {viewingSavedRunId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3 flex items-center justify-between font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              Viewing saved reconciliation run from{" "}
              {reconciliation?.createdAt
                ? new Date(reconciliation.createdAt).toLocaleDateString()
                : date}
            </span>
          </div>
          <button
            onClick={() => {
              if (selectedLocationId) {
                loadReconciliationData(selectedLocationId, date, compareWith);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100/50 rounded-lg text-[10px] uppercase font-extrabold text-amber-800 transition-colors shadow-3xs cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Live Preview
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Reconciliation
          </h1>
          <p className="text-[#64748B] text-xs font-bold mt-1.5">
            Compare expected stock vs actual stock.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto relative">
          {/* Custom Date Range Popover */}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 shadow-2xs transition duration-200 cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-[#16A34A]" />
              <span>{formattedDateRange}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${isCalendarOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCalendarOpen && (
              <div className="absolute right-0 mt-2 p-4 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 w-[300px] animate-fade-in select-none">
                {/* Calendar header with Prev / Next month */}
                <div className="flex justify-between items-center mb-3">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-extrabold text-zinc-800">
                    {calendarMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-zinc-400 mb-1">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dateStr = formatLocalDate(day.date);
                    const isStart = dateStr === startDate;
                    const isEnd = dateStr === endDate;
                    const isBetween =
                      startDate &&
                      endDate &&
                      dateStr > startDate &&
                      dateStr < endDate;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDateClick(day.date)}
                        className={`h-8 w-8 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                          isStart || isEnd
                            ? "bg-[#16A34A] text-white"
                            : isBetween
                              ? "bg-emerald-50 text-[#16A34A]"
                              : day.isCurrentMonth
                                ? "text-zinc-700 hover:bg-zinc-100"
                                : "text-zinc-300 hover:bg-zinc-50/50"
                        }`}
                      >
                        {day.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="w-full md:w-auto bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer"
            >
              Export
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden z-20">
                <button
                  onClick={() => {
                    handleDownloadCSV();
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleRunReconciliation}
            disabled={running}
            className="flex-1 md:flex-initial bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#16A34A]/70 text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Running..." : "Run Reconciliation"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className={`${sidebarFiltersOpen || reconciliation ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"} space-y-4`}
        >
          <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setCurrentPage(1);
                }}
                className={`py-2 text-xs font-bold transition-all relative cursor-pointer ${
                  activeTab === "all"
                    ? "text-[#16A34A]"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                All Items ({reconciliation?.totalItems || 0})
                {activeTab === "all" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#16A34A]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("matched");
                  setCurrentPage(1);
                }}
                className={`py-2 text-xs font-bold transition-all relative cursor-pointer ${
                  activeTab === "matched"
                    ? "text-[#16A34A]"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Matched ({matchedItemsCount})
                {activeTab === "matched" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#16A34A]" />
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("variance");
                  setCurrentPage(1);
                }}
                className={`py-2 text-xs font-bold transition-all relative cursor-pointer ${
                  activeTab === "variance"
                    ? "text-[#16A34A]"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Variance ({varianceItemsCount})
                {activeTab === "variance" && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#16A34A]" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-1.5 pl-9 pr-3 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none w-48 shadow-3xs"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                  className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold shadow-3xs flex items-center gap-1 cursor-pointer"
                >
                  Columns
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {showColumnsDropdown && (
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 space-y-2 z-20">
                    {Object.keys(visibleColumns).map((col) => (
                      <label
                        key={col}
                        className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(visibleColumns as any)[col]}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              [col]: !(visibleColumns as any)[col],
                            })
                          }
                          className="rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A]"
                        />
                        {col === "itemName" && "Item Name"}
                        {col === "category" && "Category"}
                        {col === "uom" && "UOM"}
                        {col === "expectedQty" && "Expected Qty"}
                        {col === "actualQty" && "Actual Qty"}
                        {col === "varianceQty" && "Variance Qty"}
                        {col === "variancePercent" && "Variance %"}
                        {col === "varianceValue" && "Variance Value"}
                        {col === "status" && "Status"}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadCSV}
                className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold shadow-3xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-zinc-400" />
                Download
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                    <th className="py-3.5 px-4 w-10 text-center font-extrabold">
                      #
                    </th>
                    {visibleColumns.itemName && (
                      <th className="py-3.5 px-4 font-extrabold">Item Name</th>
                    )}
                    {visibleColumns.category && (
                      <th className="py-3.5 px-4 font-extrabold">Category</th>
                    )}
                    {visibleColumns.uom && (
                      <th className="py-3.5 px-4 font-extrabold">UOM</th>
                    )}
                    {visibleColumns.expectedQty && (
                      <th className="py-3.5 px-4 text-right font-extrabold">
                        Expected Qty
                      </th>
                    )}
                    {visibleColumns.actualQty && (
                      <th className="py-3.5 px-4 text-right font-extrabold">
                        Actual Qty
                      </th>
                    )}
                    {visibleColumns.varianceQty && (
                      <th className="py-3.5 px-4 text-right font-extrabold">
                        Variance Qty
                      </th>
                    )}
                    {visibleColumns.variancePercent && (
                      <th className="py-3.5 px-4 text-right font-extrabold">
                        Variance %
                      </th>
                    )}
                    {visibleColumns.varianceValue && (
                      <th className="py-3.5 px-4 text-right font-extrabold">
                        Variance Value
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="py-3.5 px-4 text-center font-extrabold">
                        Status
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-[#0F172A]">
                  {paginatedItems.map((item, idx) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isPos = item.varianceQty > 0;
                    const isNeg = item.varianceQty < 0;
                    const varianceColor = isPos
                      ? "text-emerald-600 font-bold"
                      : isNeg
                        ? "text-rose-600 font-bold"
                        : "text-zinc-500";
                    return (
                      <tr
                        key={item.id || item.itemId}
                        className="hover:bg-zinc-50/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-zinc-400">
                          {rowNum}
                        </td>
                        {visibleColumns.itemName && (
                          <td className="py-3.5 px-4 font-extrabold">
                            {item.itemName}
                          </td>
                        )}
                        {visibleColumns.category && (
                          <td className="py-3.5 px-4 font-semibold text-zinc-500">
                            {item.categoryName}
                          </td>
                        )}
                        {visibleColumns.uom && (
                          <td className="py-3.5 px-4 font-bold text-zinc-400">
                            {item.baseUnit}
                          </td>
                        )}
                        {visibleColumns.expectedQty && (
                          <td className="py-3.5 px-4 text-right font-bold">
                            {item.expectedQty.toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.actualQty && (
                          <td className="py-3.5 px-4 text-right font-bold">
                            {item.actualQty.toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.varianceQty && (
                          <td
                            className={`py-3.5 px-4 text-right ${varianceColor}`}
                          >
                            {item.varianceQty === 0
                              ? "0.00"
                              : item.varianceQty.toFixed(2)}
                          </td>
                        )}
                        {visibleColumns.variancePercent && (
                          <td
                            className={`py-3.5 px-4 text-right ${varianceColor}`}
                          >
                            {item.varianceQty === 0
                              ? "0.00%"
                              : formatPercent(item.variancePercent)}
                          </td>
                        )}
                        {visibleColumns.varianceValue && (
                          <td
                            className={`py-3.5 px-4 text-right ${varianceColor}`}
                          >
                            {formatCurrency(item.varianceValue)}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                item.status === "Matched"
                                  ? "bg-emerald-50 text-[#16A34A]"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${item.status === "Matched" ? "bg-[#16A34A]" : "bg-rose-600"}`}
                              />
                              {item.status}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-10 text-center text-[#64748B] font-bold"
                      >
                        No stock items match the active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
              <span>
                Showing{" "}
                {Math.min(
                  filteredItems.length,
                  (currentPage - 1) * itemsPerPage + 1,
                )}{" "}
                to {Math.min(filteredItems.length, currentPage * itemsPerPage)}{" "}
                of {filteredItems.length} items
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 rounded-lg font-bold text-xs cursor-pointer transition-all duration-150 ${
                          currentPage === page
                            ? "bg-[#16A34A] text-white shadow-xs"
                            : "border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed"
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-6 ${sidebarFiltersOpen ? "lg:col-span-4 xl:col-span-3" : "hidden lg:block lg:col-span-3"}`}
        >
          {reconciliation && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-3xs">
              <span className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider block border-b border-zinc-150 pb-2.5">
                Reconciliation Summary
              </span>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>Total Items</span>
                  <span className="text-zinc-800">
                    {reconciliation.totalItems}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>Total Value (Expected)</span>
                  <span className="text-zinc-800">
                    {formatCurrency(reconciliation.totalValueExpected)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>Total Value (Actual)</span>
                  <span className="text-zinc-800">
                    {formatCurrency(reconciliation.totalValueActual)}
                  </span>
                </div>
                <div className="border-t border-zinc-100 my-1 pt-2 flex justify-between font-bold text-zinc-500">
                  <span>Total Variance (USD)</span>
                  <span
                    className={
                      reconciliation.totalVarianceUsd < 0
                        ? "text-rose-600"
                        : reconciliation.totalVarianceUsd > 0
                          ? "text-emerald-600"
                          : "text-zinc-800"
                    }
                  >
                    {formatCurrency(reconciliation.totalVarianceUsd)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>Total Variance (%)</span>
                  <span
                    className={
                      reconciliation.totalVarianceUsd < 0
                        ? "text-rose-600"
                        : reconciliation.totalVarianceUsd > 0
                          ? "text-emerald-600"
                          : "text-zinc-800"
                    }
                  >
                    {reconciliation.totalValueExpected
                      ? (
                          (reconciliation.totalVarianceUsd /
                            reconciliation.totalValueExpected) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}

          {reconciliation && (donutData.posVal > 0 || donutData.negVal < 0) && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-3xs">
              <span className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider block border-b border-zinc-150 pb-2.5">
                Variance Analysis (By Value)
              </span>

              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#F4F4F5"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    {donutData.posPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#10B981"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={251.327}
                        strokeDashoffset={
                          251.327 - (251.327 * donutData.posPct) / 100
                        }
                      />
                    )}
                    {donutData.negPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#EF4444"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={251.327}
                        strokeDashoffset={
                          251.327 - (251.327 * donutData.negPct) / 100
                        }
                        className="origin-center transform rotate-180"
                        style={{
                          transform: `rotate(${(donutData.posPct / 100) * 360 - 90}deg)`,
                        }}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest leading-none">
                      Net
                    </span>
                    <span
                      className={`text-xs font-extrabold mt-0.5 ${reconciliation.totalVarianceUsd < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {reconciliation.totalVarianceUsd < 0 ? "-" : ""}
                      {(
                        (Math.abs(reconciliation.totalVarianceUsd) /
                          (reconciliation.totalValueExpected || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-start gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-zinc-700">
                        Positive Variance
                      </p>
                      <p className="font-extrabold text-emerald-600">
                        {formatCurrency(donutData.posVal)} (
                        {donutData.posPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-zinc-700">
                        Negative Variance
                      </p>
                      <p className="font-extrabold text-rose-600">
                        {formatCurrency(donutData.negVal)} (
                        {donutData.negPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleOpenHistory}
            className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider shadow-3xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-zinc-400" />
            View Reconciliation History
          </button>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 shadow-3xs">
            <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                Inventory variances will impact your stock accuracy. Review and
                take action as needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showHistoryModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-90 animate-fade-in"
            onClick={() => setShowHistoryModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-zinc-200 rounded-2xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col z-100 overflow-hidden animate-zoom-in">
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A]">
                  Reconciliation History
                </h3>
                <p className="text-zinc-500 text-xs font-semibold mt-0.5">
                  Select a past run to view details.
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {historyLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin" />
                </div>
              ) : historyRuns.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 font-semibold text-xs">
                  No saved reconciliation runs found.
                </div>
              ) : (
                historyRuns.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => handleSelectHistoryRun(run.id!)}
                    className="flex justify-between items-center border border-zinc-150 hover:border-[#16A34A] bg-white rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-3xs hover:shadow-2xs group"
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0F172A]">
                        Run on{" "}
                        {run.createdAt
                          ? new Date(run.createdAt).toLocaleString()
                          : run.reconciliationDate}
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-500 mt-1">
                        Location:{" "}
                        <span className="text-zinc-800">
                          {run.locationName || "All Locations"}
                        </span>{" "}
                        • Date:{" "}
                        <span className="text-zinc-800">
                          {run.reconciliationDate}
                        </span>
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
                        Matched:{" "}
                        <span className="text-emerald-600">
                          {run.matchedItems}
                        </span>{" "}
                        • Variance:{" "}
                        <span className="text-rose-600">
                          {run.varianceItems}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs font-extrabold ${run.totalVarianceUsd < 0 ? "text-rose-600" : run.totalVarianceUsd > 0 ? "text-emerald-600" : "text-zinc-700"}`}
                      >
                        {formatCurrency(run.totalVarianceUsd)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryRun(e, run.id!)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Reconciliation Run"
        description="Are you sure you want to delete this reconciliation run from history? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteRun}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
