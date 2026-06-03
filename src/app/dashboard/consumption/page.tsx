/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useMemo } from "react";
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
  >("daily");

  const getTodayString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getTodayString();
  });

  const [dateRangeOption, setDateRangeOption] = useState<string>("Custom");
  const [startDate, setStartDate] = useState<string>(() => getTodayString());
  const [endDate, setEndDate] = useState<string>(() => getTodayString());

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
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
          {(["daily", "weekly", "monthly", "custom"] as const).map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#DCFCE7] text-[#16A34A]"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500">
                  Total Consumption
                </span>
                <div className="h-7 w-7 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-[#0F172A] mt-2">
                {analysisData?.summary.total_consumption.toLocaleString(
                  undefined,
                  { maximumFractionDigits: 1 },
                ) || "0"}
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">
                Base Units
              </p>
            </div>
            {renderSparkline("#16A34A", "spark-green")}
          </div>

          <div className="relative bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500">
                  Total Value
                </span>
                <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-[#0F172A] mt-2">
                $
                {analysisData?.summary.total_value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">
                Value Sum
              </p>
            </div>
            {renderSparkline("#3B82F6", "spark-blue")}
          </div>

          <div className="relative bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500">
                  Items Consumed
                </span>
                <div className="h-7 w-7 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                  <Boxes className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-[#0F172A] mt-2">
                {analysisData?.summary.items_consumed_count || "0"}
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">
                Unique Items
              </p>
            </div>
            {renderSparkline("#F97316", "spark-orange")}
          </div>

          <div className="relative bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500">
                  vs Yesterday
                </span>
                <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Percent className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <h3
                  className={`text-2xl font-extrabold ${
                    (analysisData?.summary.vs_yesterday_units || 0) >= 0
                      ? "text-[#16A34A]"
                      : "text-rose-600"
                  }`}
                >
                  {analysisData?.summary.vs_yesterday_pct
                    ? analysisData.summary.vs_yesterday_pct >= 0
                      ? "+"
                      : ""
                    : ""}
                  {analysisData?.summary.vs_yesterday_pct.toFixed(1) || "0.0"}%
                </h3>
                <span className="text-[10px] text-zinc-500 font-bold">
                  (
                  {analysisData?.summary.vs_yesterday_units
                    ? analysisData.summary.vs_yesterday_units >= 0
                      ? "+"
                      : ""
                    : ""}
                  {analysisData?.summary.vs_yesterday_units.toFixed(0) || "0"}{" "}
                  Base Units)
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">
                Period Comparison
              </p>
            </div>
            {renderSparkline("#8B5CF6", "spark-purple")}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Consumption Over Time
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                Dynamic timeline tracking values based on selected periods.
              </p>
            </div>

            {period === "daily" && (
              <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-2 py-1 shadow-3xs bg-white">
                <button
                  onClick={handlePrevDay}
                  className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 px-1.5 text-xs font-bold text-zinc-700">
                  <Calendar className="h-3.5 w-3.5 text-[#16A34A]" />
                  <span>{formattedDateHeader}</span>
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full h-[220px] select-none">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                <Loader2 className="h-6 w-6 text-[#16A34A] animate-spin mb-2" />
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                  Calculating graph...
                </span>
              </div>
            ) : svgChartPoints.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <TrendingUp className="h-8 w-8 text-zinc-300 mb-2" />
                <span className="text-[10px] font-extrabold text-zinc-400">
                  No timeline coordinates computed.
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex">
                <div className="w-12 h-[180px] flex flex-col justify-between text-[9px] font-bold text-zinc-400 text-right pr-2">
                  <span>
                    {maxChartValue >= 10
                      ? (maxChartValue * 0.9).toFixed(0)
                      : maxChartValue > 1
                        ? (maxChartValue * 0.9).toFixed(1)
                        : (maxChartValue * 0.9).toFixed(2)}
                  </span>
                  <span>
                    {maxChartValue >= 10
                      ? (maxChartValue * 0.6).toFixed(0)
                      : maxChartValue > 1
                        ? (maxChartValue * 0.6).toFixed(1)
                        : (maxChartValue * 0.6).toFixed(2)}
                  </span>
                  <span>
                    {maxChartValue >= 10
                      ? (maxChartValue * 0.3).toFixed(0)
                      : maxChartValue > 1
                        ? (maxChartValue * 0.3).toFixed(1)
                        : (maxChartValue * 0.3).toFixed(2)}
                  </span>
                  <span>0</span>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="relative flex-1 h-[180px] border-b border-l border-zinc-150">
                    <div className="absolute left-0 right-0 top-[30%] border-t border-zinc-100 border-dashed" />
                    <div className="absolute left-0 right-0 top-[60%] border-t border-zinc-100 border-dashed" />

                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 680 180"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="area-grad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#16A34A"
                            stopOpacity="0.25"
                          />
                          <stop
                            offset="100%"
                            stopColor="#16A34A"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>

                      <path d={svgAreaD} fill="url(#area-grad)" />
                      <path
                        d={svgPathD}
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="2.5"
                      />

                      {svgChartPoints.map((pt: any, i: number) => (
                        <g key={i} className="group/dot cursor-pointer">
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            fill="#16A34A"
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                            className="transition-all duration-150 hover:scale-125"
                          />
                          <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect
                              x={pt.x - 35}
                              y={pt.y - 32}
                              width="70"
                              height="22"
                              rx="6"
                              fill="#0F172A"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 18}
                              fill="#FFFFFF"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {pt.val.toFixed(0)} Units
                            </text>
                          </g>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="h-8 flex justify-between items-center text-[9px] font-bold text-zinc-400 pt-2 border-l border-zinc-100">
                    {svgChartPoints.map((pt: any, i: number) => (
                      <span
                        key={i}
                        className="text-center"
                        style={{
                          width: `${100 / svgChartPoints.length}%`,
                        }}
                      >
                        {pt.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

      <aside className="w-80 border-l border-zinc-200 bg-[#F8FAFC] p-5 shrink-0 hidden xl:flex flex-col justify-between sticky top-16 h-[calc(100vh-64px)] z-10 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4.5 w-4.5 text-[#16A34A]" />
              <h3 className="text-sm font-extrabold text-[#0F172A]">Filters</h3>
            </div>
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-extrabold uppercase tracking-wider text-[#16A34A] hover:text-[#15803D] cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                Date Range
              </label>
              <div className="relative">
                <select
                  value={dateRangeOption}
                  onChange={(e) => {
                    setDateRangeOption(e.target.value);
                    if (e.target.value !== "Custom") {
                      setPeriod("daily");
                    } else {
                      setPeriod("custom");
                    }
                  }}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="Custom">Custom</option>
                  <option value="Daily">Daily (Timeline switch)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {dateRangeOption === "Custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block">
                    From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-2.5 text-xs text-zinc-950 font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase block">
                    To
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-2.5 text-xs text-zinc-950 font-bold focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                Category
              </label>
              <div className="relative">
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                Stock Item
              </label>
              <div className="relative">
                <select
                  value={filterStockItemId}
                  onChange={(e) => setFilterStockItemId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="all">All Stock Items</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                Group By
              </label>
              <div className="relative">
                <select
                  value={filterGroupBy}
                  onChange={(e) => setFilterGroupBy(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">
                Show
              </label>
              <div className="relative">
                <select
                  value={filterShow}
                  onChange={(e) => setFilterShow(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="top_consumed">Top Consumed Items</option>
                  <option value="all">All Items</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-6 border-t border-zinc-200">
          <button
            onClick={handleApplyFilters}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-150 cursor-pointer"
          >
            Apply Filters
          </button>

          <button
            onClick={handleApplyFilters}
            className="w-full border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Save as Report</span>
          </button>

          <p className="text-[10px] text-zinc-400 font-bold text-center">
            All consumption is based on base units.
          </p>
        </div>
      </aside>

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
