/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useMemo, useRef } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getCategories } from "@/lib/repositories/category.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
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
  X,
  Loader2,
  Download,
} from "lucide-react";
import DateRangePicker from "@/components/ui/date-range-picker";

export default function ConsumptionPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
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

  const [startDate, setStartDate] = useState<string>(() =>
    getDaysAgoString(30),
  );
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

  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(20);
  }, [analysisData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && analysisData?.items) {
          setVisibleCount((prev) =>
            Math.min(prev + 20, analysisData.items.length),
          );
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [analysisData?.items.length]);

  const visibleItems = useMemo(() => {
    if (!analysisData) return [];
    return analysisData.items.slice(0, visibleCount);
  }, [analysisData, visibleCount]);

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

  return (
    <div className="flex flex-col space-y-3 h-full w-full relative select-none pb-8">
      {/* Top Header Card matching /counts */}
      <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
            Consumption
          </h1>
          <p className="text-zinc-400 text-xs font-semibold mt-0.5">
            Track stock consumption over time to understand usage patterns and
            plan better.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-[250px] shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPeriod("custom");
              }}
              triggerClassName="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-3.5 py-2 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer whitespace-nowrap h-10 w-full"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="py-2.5 px-5 bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0 whitespace-nowrap h-10"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table Card matching /counts */}
      <div className="border border-zinc-200 rounded-3xl shadow-2xs overflow-hidden bg-white">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Top Consumed Items
            </h3>
            <p className="text-xs text-zinc-400 font-semibold mt-0.5">
              Itemized breakdown sorted by total consumption monetary value.
            </p>
          </div>

          <div className="text-[10px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-200/80 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs">
            <span className="inline-block h-2 w-2 rounded-full bg-zinc-950 animate-pulse" />
            Click any row for Opening + Deliveries − Closing formula detail.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 border-b border-zinc-100 bg-white">
                <th className="py-4 px-6">#</th>
                <th className="py-4 px-6">Stock Item</th>
                <th className="py-4 px-6">Base Unit</th>
                <th className="py-4 px-6">Opening Stock</th>
                <th className="py-4 px-6">Delivery</th>
                <th className="py-4 px-6">Closing Stock</th>
                <th className="py-4 px-6">Consumed Qty</th>
                <th className="py-4 px-6">Value</th>
                <th className="py-4 px-6">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs text-zinc-900 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto animate-pulse">
                      <Loader2 className="h-7 w-7 text-zinc-950 animate-spin mb-3" />
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Recomputing inventory timelines...
                      </h3>
                    </div>
                  </td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        No stock consumption found
                      </h3>
                      <p className="text-zinc-400 text-xs mt-1 font-semibold">
                        No consumption recorded for the selected date range.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item, index) => {
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemForFormula(item)}
                      className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-bold text-zinc-400">
                        {index + 1}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900">
                        <div>
                          <span className="font-bold text-zinc-900 group-hover:text-black transition-colors block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                            SKU: {item.sku || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-600">
                        {item.base_unit}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-700">
                        {item.opening_stock.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-700">
                        {item.deliveries.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-700">
                        {item.closing_stock.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-zinc-900">
                        {item.consumed_qty.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-zinc-950">
                        $
                        {item.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-800">
                        {item.pct_of_total.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border-t border-zinc-100 py-3.5 px-6 flex justify-between items-center text-xs text-zinc-500 font-semibold">
          <span>
            Showing {Math.min(visibleCount, analysisData?.items.length || 0)} of{" "}
            {analysisData?.items.length || 0} items
          </span>
        </div>

        {visibleCount < (analysisData?.items.length || 0) && (
          <div
            ref={loadMoreRef}
            className="py-4 border-t border-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-500 gap-2 bg-zinc-50/30"
          >
            <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
            <span>Loading more items...</span>
          </div>
        )}
      </div>

      {/* Side panel modal for formula details */}
      {selectedItemForFormula && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setSelectedItemForFormula(null)}
          />
          <div className="fixed top-0 right-0 h-full w-[460px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between z-50 animate-slide-in select-none">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-start border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                    Reconciliation Formula
                  </h3>
                  <p className="text-zinc-500 text-xs font-semibold mt-1">
                    Validating the active accounting for this stock item.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItemForFormula(null)}
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 shadow-2xs">
                  <h4 className="font-bold text-sm text-zinc-900">
                    {selectedItemForFormula.name}
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-bold mt-0.5 block">
                    Category: {selectedItemForFormula.category} | SKU:{" "}
                    {selectedItemForFormula.sku || "N/A"}
                  </span>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-zinc-950" />
                    Formula Breakdown
                  </h4>

                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center bg-white py-2.5 px-4 rounded-xl border border-zinc-200/60 shadow-2xs">
                      <span className="text-xs font-bold text-zinc-500 uppercase">
                        Opening Stock
                      </span>
                      <span className="text-sm font-extrabold text-zinc-800">
                        {selectedItemForFormula.opening_stock.toLocaleString()}{" "}
                        {selectedItemForFormula.base_unit}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-white py-2.5 px-4 rounded-xl border border-zinc-200/60 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-950 font-extrabold text-base">
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

                    <div className="flex justify-between items-center bg-white py-2.5 px-4 rounded-xl border border-zinc-200/60 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-950 font-extrabold text-base">
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

                    <div className="flex justify-between items-center bg-[#0a2924] py-3.5 px-4 rounded-xl shadow-xs text-white">
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
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
                    Financial Impact
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wide block">
                        Cost per unit
                      </span>
                      <span className="text-base font-extrabold text-zinc-900 mt-1 block">
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

                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wide block">
                        Total Value Consumed
                      </span>
                      <span className="text-base font-extrabold text-zinc-950 mt-1 block">
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

            <div className="border-t border-zinc-100 p-6 bg-zinc-50 flex items-center justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedItemForFormula(null)}
                className="bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs transition-colors cursor-pointer"
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
