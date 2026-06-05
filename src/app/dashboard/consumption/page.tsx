/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useMemo, useRef } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import { getCategories } from "@/lib/repositories/category.repository";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import {
  getConsumptionAnalysis,
  ConsumptionAnalysisResponse,
  ConsumptionItem,
} from "@/lib/repositories/consumption.repository";
import { Business } from "@/types/business";
import { Category, StockItem } from "@/types/inventory";
import {
  TrendingUp,
  ChevronDown,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Boxes,
  Percent,
} from "lucide-react";
import Image from "next/image";

export default function ConsumptionPage() {
  const { activeBusinessId } = useBusinessStore();
  const { locations, activeLocationId } = useLocationStore();
  const { profile } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);

  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "custom"
  >("custom");

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

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getTodayString();
  });

  const [dateRangeOption, setDateRangeOption] = useState<string>("Custom");
  const [startDate, setStartDate] = useState<string>(() =>
    getDaysAgoString(30),
  );
  const [endDate, setEndDate] = useState<string>(() => getTodayString());

  // Custom Calendar
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
      setPeriod("custom");
    } else {
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate("");
      } else {
        setEndDate(dateStr);
        setPeriod("custom");
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

  const [filterLocationId, setFilterLocationId] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterStockItemId, setFilterStockItemId] = useState<string>("all");
  const [filterGroupBy, setFilterGroupBy] = useState<string>("none");
  const [filterShow, setFilterShow] = useState<string>("top_consumed");

  useEffect(() => {
    if (activeLocationId) {
      setFilterLocationId(activeLocationId);
    } else {
      setFilterLocationId("all");
    }
  }, [activeLocationId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] =
    useState<ConsumptionAnalysisResponse | null>(null);
  const [selectedItemForFormula, setSelectedItemForFormula] =
    useState<ConsumptionItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;

    async function loadInitialData() {
      try {
        setLoading(true);
        const [bizList, catList, itemsList] = await Promise.all([
          getUserBusinesses([]),
          getCategories(businessId),
          getStockItems(businessId),
        ]);

        setBusinesses(bizList);
        const activeDoc = bizList.find((b) => b.id === businessId) || null;
        setActiveBusiness(activeDoc);

        setCategories(catList);
        setStockItems(itemsList);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load initial master data.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [activeBusinessId, profile]);

  const loadAnalysis = async () => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        period,
        location_id: filterLocationId === "all" ? undefined : filterLocationId,
        category_id: filterCategoryId === "all" ? undefined : filterCategoryId,
        stock_item_id:
          filterStockItemId === "all" ? undefined : filterStockItemId,
        group_by: filterGroupBy,
        show: filterShow,
      };

      if (period === "daily") {
        params.start_date = selectedDate;
        params.end_date = selectedDate;
      } else if (period === "weekly" || period === "monthly") {
        params.start_date = selectedDate;
      } else {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const res = await getConsumptionAnalysis(activeBusinessId, params);
      setAnalysisData(res);
    } catch (err: any) {
      console.error(err);
      setError(
        "Failed to fetch consumption data. Reconstructing stock levels failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusinessId) {
      loadAnalysis();
    }
  }, [
    activeBusinessId,
    period,
    selectedDate,
    startDate,
    endDate,
    filterLocationId,
    filterCategoryId,
    filterStockItemId,
  ]);

  const handleApplyFilters = () => {
    loadAnalysis();
  };

  const handleClearFilters = () => {
    setFilterLocationId("all");
    setFilterCategoryId("all");
    setFilterStockItemId("all");
    setFilterGroupBy("none");
    setFilterShow("top_consumed");
    setPeriod("daily");
    const today = getTodayString();
    setSelectedDate(today);
    setStartDate(today);
    setEndDate(today);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const newDateStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(newDateStr);
    setStartDate(newDateStr);
    setEndDate(newDateStr);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const newDateStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(newDateStr);
    setStartDate(newDateStr);
    setEndDate(newDateStr);
  };

  const formattedDateHeader = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return new Date(selectedDate).toLocaleDateString("en-US", options);
  }, [selectedDate]);

  const totalPages = Math.max(
    1,
    Math.ceil((analysisData?.items.length || 0) / itemsPerPage),
  );
  const paginatedItems = useMemo(() => {
    if (!analysisData) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return analysisData.items.slice(startIndex, startIndex + itemsPerPage);
  }, [analysisData, currentPage]);

  const sparklinePoints = [10, 15, 8, 20, 18, 25, 20, 30, 28, 35, 40];

  const renderSparkline = (strokeColor: string, fillGradientId: string) => {
    const maxVal = 40;
    const width = 120;
    const height = 30;
    const pointsStr = sparklinePoints
      .map((val, idx) => {
        const x = (idx / (sparklinePoints.length - 1)) * width;
        const y = height - (val / maxVal) * height;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg
        className="h-8 w-28 absolute bottom-0 right-0 overflow-visible opacity-70"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 0,${height} L ${pointsStr} L ${width},${height} Z`}
          fill={`url(#${fillGradientId})`}
        />
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={pointsStr}
        />
      </svg>
    );
  };

  const maxChartValue = useMemo(() => {
    if (!analysisData || analysisData.timeline.length === 0) return 10;
    const vals = analysisData.timeline.map((p) => p.consumed);
    const maxVal = Math.max(...vals);
    return maxVal > 0 ? maxVal * 1.15 : 10;
  }, [analysisData]);

  const svgChartPoints = useMemo(() => {
    if (!analysisData || analysisData.timeline.length === 0) return [];
    const width = 680;
    const height = 180;
    const len = analysisData.timeline.length;
    return analysisData.timeline.map((point, idx) => {
      const x = len > 1 ? (idx / (len - 1)) * width : width / 2;
      const y = height - (point.consumed / maxChartValue) * height;
      return { x, y, label: point.label, val: point.consumed };
    });
  }, [analysisData, maxChartValue]);

  const svgPathD = useMemo(() => {
    if (!svgChartPoints || svgChartPoints.length === 0) return "";
    let d = `M ${svgChartPoints[0].x},${svgChartPoints[0].y}`;
    for (let i = 1; i < svgChartPoints.length; i++) {
      const prev = svgChartPoints[i - 1];
      const curr = svgChartPoints[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (2 * (curr.x - prev.x)) / 3;
      const cpY2 = curr.y;
      d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${curr.x},${curr.y}`;
    }
    return d;
  }, [svgChartPoints]);

  const svgAreaD = useMemo(() => {
    if (!svgChartPoints || svgChartPoints.length === 0) return "";
    return `${svgPathD} L ${svgChartPoints[svgChartPoints.length - 1].x},180 L ${svgChartPoints[0].x},180 Z`;
  }, [svgPathD, svgChartPoints]);

  return (
    <div className="flex bg-white min-h-[82vh] relative select-none">
      <div className="flex-1 space-y-6 pr-0 xl:pr-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-150 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Consumption
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1">
              Track stock consumption over time to understand usage patterns and
              plan better.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
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

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Top Consumed Items
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                Itemized breakdown sorted by total consumption monetary value.
              </p>
            </div>

            <div className="text-[10px] font-extrabold text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-3xs">
              <span className="inline-block h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              Formula validation: Click any row to view exact Opening +
              Deliveries - Closing reconciliation.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                  <th className="py-4 px-6 font-extrabold">#</th>
                  <th className="py-4 px-6 font-extrabold">Stock Item</th>
                  <th className="py-4 px-6 font-extrabold">Category</th>
                  <th className="py-4 px-6 font-extrabold">Base Unit</th>
                  <th className="py-4 px-6 font-extrabold">
                    Consumed (Base Units)
                  </th>
                  <th className="py-4 px-6 font-extrabold">Value</th>
                  <th className="py-4 px-6 font-extrabold">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-zinc-400 font-semibold"
                    >
                      <Loader2 className="h-5 w-5 text-[#16A34A] animate-spin inline mr-2" />
                      Recomputing inventory timelines...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-zinc-400 font-semibold"
                    >
                      No stock consumption tracked for the selected range.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, index) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemForFormula(item)}
                        className="hover:bg-emerald-50/20 active:bg-emerald-50/40 transition-all cursor-pointer group"
                      >
                        <td className="py-4 px-6 font-extrabold text-[#64748B] group-hover:text-[#16A34A] transition-colors">
                          {rowNum}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-zinc-50 border border-zinc-200/50 flex items-center justify-center shrink-0 overflow-hidden shadow-3xs group-hover:border-emerald-200 group-hover:bg-emerald-50/20 transition-all">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt="item image"
                                  width={100}
                                  height={100}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-4.5 w-4.5 text-zinc-400 group-hover:text-[#16A34A] transition-colors" />
                              )}
                            </div>
                            <div>
                              <span className="font-extrabold text-[#0F172A] group-hover:text-[#16A34A] transition-colors block">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                                SKU: {item.sku || "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-500">
                          {item.category}
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-700">
                          {item.base_unit}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-zinc-800">
                          {item.consumed_qty.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-[#0F172A]">
                          $
                          {item.value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-zinc-800">
                          {item.pct_of_total.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-50/50 border-t border-zinc-200 py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#64748B] font-semibold">
            <span>
              Showing{" "}
              {Math.min(
                analysisData?.items.length || 0,
                (currentPage - 1) * itemsPerPage + 1,
              )}{" "}
              to{" "}
              {Math.min(
                analysisData?.items.length || 0,
                currentPage * itemsPerPage,
              )}{" "}
              of {analysisData?.items.length || 0} items
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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

      {selectedItemForFormula && (
        <>
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-xs z-90 animate-fade-in"
            onClick={() => setSelectedItemForFormula(null)}
          />
          <div className="fixed top-0 right-0 h-full w-[460px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-100 animate-slide-in select-none">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start border-b border-zinc-150 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">
                    Reconciliation Formula
                  </h3>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    Validating the active accounting for this stock item.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItemForFormula(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200/60 shadow-3xs">
                  <div className="h-12 w-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-3xs">
                    {selectedItemForFormula.image_url ? (
                      <Image
                        src={selectedItemForFormula.image_url}
                        alt="item image"
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5.5 w-5.5 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#0F172A]">
                      {selectedItemForFormula.name}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-extrabold mt-0.5 block">
                      Category: {selectedItemForFormula.category} | SKU:{" "}
                      {selectedItemForFormula.sku || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="bg-[#DCFCE7]/40 border border-[#16A34A]/25 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-[#16A34A] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Formula Breakdown
                  </h4>

                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center bg-white/70 py-2.5 px-4 rounded-xl border border-zinc-100 shadow-3xs">
                      <span className="text-xs font-bold text-zinc-500 uppercase">
                        Opening Stock
                      </span>
                      <span className="text-sm font-extrabold text-zinc-800">
                        {selectedItemForFormula.opening_stock.toLocaleString()}{" "}
                        {selectedItemForFormula.base_unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white/70 py-2.5 px-4 rounded-xl border border-zinc-100 shadow-3xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#16A34A] font-extrabold text-base">
                          +
                        </span>
                        <span className="text-xs font-bold text-zinc-500 uppercase">
                          Deliveries
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-zinc-800">
                        {selectedItemForFormula.deliveries.toLocaleString()}{" "}
                        {selectedItemForFormula.base_unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white/70 py-2.5 px-4 rounded-xl border border-zinc-100 shadow-3xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-600 font-extrabold text-base">
                          −
                        </span>
                        <span className="text-xs font-bold text-zinc-500 uppercase">
                          Closing Stock
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-zinc-800">
                        {selectedItemForFormula.closing_stock.toLocaleString()}{" "}
                        {selectedItemForFormula.base_unit}
                      </span>
                    </div>

                    <div className="h-px bg-zinc-200 my-1" />

                    <div className="flex justify-between items-center bg-[#16A34A] py-3.5 px-4 rounded-xl shadow-xs text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-base">=</span>
                        <span className="text-xs font-extrabold uppercase tracking-wide">
                          Consumed Qty
                        </span>
                      </div>
                      <span className="text-base font-extrabold">
                        {selectedItemForFormula.consumed_qty.toLocaleString()}{" "}
                        {selectedItemForFormula.base_unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider block">
                    Financial Impact
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/50 shadow-3xs">
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wide block">
                        Cost per unit
                      </span>
                      <span className="text-base font-extrabold text-[#0F172A] mt-1 block">
                        $
                        {(
                          selectedItemForFormula.value /
                            selectedItemForFormula.consumed_qty || 0
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/50 shadow-3xs">
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wide block">
                        Total Value Consumed
                      </span>
                      <span className="text-base font-extrabold text-primary-navy mt-1 block">
                        $
                        {selectedItemForFormula.value.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 p-6 bg-zinc-50 flex items-center justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedItemForFormula(null)}
                className="bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-3xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
