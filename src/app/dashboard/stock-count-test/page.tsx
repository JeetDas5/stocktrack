/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";

import { useAuth } from "@/providers/auth-provider";
import AlertDialog from "@/components/alert-dialog";
import CustomCalendar from "@/components/ui/calendar";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import { getCategories } from "@/lib/repositories/category.repository";
import {
  createStockCount,
  updateStockCount,
} from "@/lib/repositories/stock-count.repository";
import { StockItem, Category } from "@/types/inventory";
import {
  Search,
  ChevronDown,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  ClipboardList,
} from "lucide-react";

const encodeNotes = (
  opt1Id: string,
  qty1: string,
  opt2Id: string,
  qty2: string,
) => {
  if (!opt1Id && !qty1 && !opt2Id && !qty2) return "";
  return `[opt1:${opt1Id || ""},qty1:${qty1 || ""},opt2:${opt2Id || ""},qty2:${qty2 || ""}]`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function StockCountTestPage() {
  const { profile } = useAuth();
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [countType] = useState("General Count");
  const [countDate, setCountDate] = useState("");
  const [countedByName, setCountedByName] = useState("");
  const [notes, setNotes] = useState("");

  const [itemCounts, setItemCounts] = useState<
    Record<
      string,
      {
        countedCartons: string;
        countedPieces: string;
        selectedOptionId: string;
        countedCartons2: string;
        selectedOptionId2: string;
      }
    >
  >({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [lastAutoSave, setLastAutoSave] = useState("");

  const calendarRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (profile?.fullName) {
      setCountedByName(profile.fullName);
    }
  }, [profile]);

  useEffect(() => {
    async function loadData() {
      if (!activeBusinessId) return;
      try {
        setLoading(true);
        setError(null);

        const [itemsList, categoriesList] = await Promise.all([
          getStockItems(activeBusinessId),
          getCategories(activeBusinessId),
        ]);

        const filteredList = (itemsList as StockItem[]).filter(
          (i: StockItem) => i.isActive !== false,
        );

        setStockItems(filteredList);
        setCategories(categoriesList);

        const initialItemCounts: typeof itemCounts = {};
        filteredList.forEach((item) => {
          initialItemCounts[item.id] = {
            countedCartons: "",
            countedPieces: "",
            selectedOptionId: item.countingOptions?.[0]?.id || "",
            countedCartons2: "",
            selectedOptionId2: item.countingOptions?.[1]?.id || "",
          };
        });

        const draftKey = `stocktrack_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            const mergedCounts = { ...initialItemCounts };
            if (parsed.itemCounts) {
              Object.keys(parsed.itemCounts).forEach((key) => {
                if (mergedCounts[key]) {
                  mergedCounts[key] = {
                    ...mergedCounts[key],
                    ...parsed.itemCounts[key],
                  };
                }
              });
            }
            setItemCounts(mergedCounts);
            if (parsed.countDate) setCountDate(parsed.countDate);
            if (parsed.notes) setNotes(parsed.notes);
            if (parsed.timestamp) {
              const dateObj = new Date(parsed.timestamp);
              setLastAutoSave(
                dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              );
            }
          } catch (e) {
            console.error("Failed to restore draft:", e);
            setItemCounts(initialItemCounts);
            setCountDate(new Date().toISOString().split("T")[0]);
          }
        } else {
          setItemCounts(initialItemCounts);
          setCountDate(new Date().toISOString().split("T")[0]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load setup data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeBusinessId, activeLocationId]);

  useEffect(() => {
    if (!activeBusinessId || loading) return;

    const hasData =
      Object.values(itemCounts).some(
        (c) =>
          c.countedCartons !== "" ||
          c.countedCartons2 !== "" ||
          c.countedPieces !== "",
      ) ||
      notes !== "" ||
      (countDate && countDate !== new Date().toISOString().split("T")[0]);

    if (!hasData) return;

    const draftKey = `stocktrack_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
    const draftData = {
      itemCounts,
      countDate,
      notes,
      timestamp: Date.now(),
    };

    localStorage.setItem(draftKey, JSON.stringify(draftData));

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLastAutoSave(timeString);
  }, [
    itemCounts,
    countDate,
    notes,
    activeBusinessId,
    activeLocationId,
    loading,
  ]);

  const getExpectedQty = (item: StockItem) => {
    return item.currentStock !== undefined ? item.currentStock : 0;
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    const cleared: typeof itemCounts = {};
    stockItems.forEach((item) => {
      cleared[item.id] = {
        countedCartons: "",
        countedPieces: "",
        selectedOptionId: item.countingOptions?.[0]?.id || "",
        countedCartons2: "",
        selectedOptionId2: item.countingOptions?.[1]?.id || "",
      };
    });
    setItemCounts(cleared);
    setNotes("");

    const draftKey = `stocktrack_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
    localStorage.removeItem(draftKey);
    setLastAutoSave("");

    setShowClearConfirm(false);
    toast.success("All counts cleared successfully!");
  };

  const saveSession = async (complete: boolean) => {
    if (!activeBusinessId) return;
    try {
      setSaving(true);
      setError(null);

      const itemsPayload = stockItems.map((item) => {
        const counts = itemCounts[item.id] || {
          countedCartons: "",
          countedPieces: "",
          selectedOptionId: "",
          countedCartons2: "",
          selectedOptionId2: "",
        };

        let cartonsVal: number | undefined = undefined;
        let piecesVal: number | undefined = undefined;

        if (counts.countedPieces !== "") {
          piecesVal = parseFloat(counts.countedPieces);
        }

        const totalCartonsBaseQty =
          (counts.countedCartons !== ""
            ? parseFloat(counts.countedCartons) *
              (item.countingOptions?.[0]?.conversionToBaseQty || 1)
            : 0) +
          (counts.countedCartons2 !== ""
            ? parseFloat(counts.countedCartons2) *
              (item.countingOptions?.[1]?.conversionToBaseQty || 1)
            : 0);

        if (counts.countedCartons !== "" || counts.countedCartons2 !== "") {
          const defaultOptConversion =
            item.countingOptions?.[0]?.conversionToBaseQty || 1;
          cartonsVal = totalCartonsBaseQty / defaultOptConversion;
        }

        const encodedNotes = encodeNotes(
          counts.selectedOptionId || item.countingOptions?.[0]?.id || "",
          counts.countedCartons,
          counts.selectedOptionId2 || item.countingOptions?.[1]?.id || "",
          counts.countedCartons2,
        );

        return {
          itemId: item.id,
          countedCartons: cartonsVal,
          countedPieces: piecesVal,
          notes: encodedNotes,
          expectedQty: getExpectedQty(item),
        };
      });

      const dataPayload = {
        businessId: activeBusinessId,
        locationId: activeLocationId || undefined,
        countType,
        countDate,
        countedByName,
        notes,
        items: itemsPayload,
      };

      const responseSession = await createStockCount(
        activeBusinessId,
        dataPayload,
      );
      if (complete) {
        await updateStockCount(
          activeBusinessId,
          responseSession.id,
          dataPayload,
          "completed",
        );
        toast.success(
          "Stock Count submitted successfully! Inventory stock levels updated.",
        );

        const draftKey = `stocktrack_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
        localStorage.removeItem(draftKey);
        setLastAutoSave("");

        const cleared: typeof itemCounts = {};
        stockItems.forEach((item) => {
          cleared[item.id] = {
            countedCartons: "",
            countedPieces: "",
            selectedOptionId: item.countingOptions?.[0]?.id || "",
            countedCartons2: "",
            selectedOptionId2: item.countingOptions?.[1]?.id || "",
          };
        });
        setItemCounts(cleared);
        setNotes("");
      }
    } catch (err) {
      console.error(err);
      setError(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Failed to submit stock count.",
      );
    } finally {
      setSaving(false);
    }
  };

  const locationFilteredItems = stockItems.filter((item) => {
    if (!activeLocationId) return true;
    return (item.locationRules || []).some(
      (rule) => rule.locationId === activeLocationId,
    );
  });

  const filteredItems = locationFilteredItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (
      selectedCategoryId !== "all" &&
      item.categoryId !== selectedCategoryId
    ) {
      return false;
    }
    return true;
  });

  const totalItemsCount = locationFilteredItems.length;
  const countedItemsList = locationFilteredItems.filter((item) => {
    const counts = itemCounts[item.id];
    return (
      counts &&
      (counts.countedCartons !== "" ||
        counts.countedCartons2 !== "" ||
        counts.countedPieces !== "")
    );
  });
  const countedItemsCount = countedItemsList.length;

  const completionPercent =
    totalItemsCount > 0
      ? Math.round((countedItemsCount / totalItemsCount) * 100)
      : 0;

  const activeCategoryName =
    selectedCategoryId === "all"
      ? "All Categories"
      : categories.find((c) => c.id === selectedCategoryId)?.name ||
        "All Categories";

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-88px)] overflow-hidden relative select-none">
      <div className="flex-1 min-w-0 flex flex-col space-y-3 min-h-0">
        <div className="border border-zinc-200 rounded-xl py-3 px-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Stock Counts
            </h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
              {countedItemsCount} of {totalItemsCount} items counted
            </span>
            <div className="w-full md:w-48 bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50 shrink-0">
              <div
                className="bg-zinc-950 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">
              ({completionPercent}%)
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center shrink-0">
          <div className="relative w-full sm:max-w-xs md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search inventory items"
              className="w-full bg-white border border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 rounded-full py-2.5 pl-10 pr-4 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 justify-end flex-wrap sm:flex-nowrap">
            <div className="relative font-bold" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>{activeCategoryName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-40 py-2">
                  <button
                    onClick={() => {
                      setSelectedCategoryId("all");
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                      selectedCategoryId === "all"
                        ? "bg-zinc-100 text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCategoryId(c.id);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                        selectedCategoryId === c.id
                          ? "bg-zinc-100 text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <CalendarIcon className="h-4.5 w-4.5 text-zinc-400" />
                <span>{formatDateDisplay(countDate)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </button>
              {isCalendarOpen && (
                <CustomCalendar
                  selectedDate={countDate}
                  onChange={(dateStr) => {
                    setCountDate(dateStr);
                    setIsCalendarOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-2xl p-3 text-center font-bold">
            {error}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-3xl shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 transition-all duration-300 flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 border-b border-zinc-100 bg-white sticky top-0 z-10">
                  <th className="py-5 px-8">Item Name</th>
                  <th className="py-5 px-6 text-center w-48">1st Option</th>
                  <th className="py-5 px-6 text-center w-48">2nd Option</th>
                  <th className="py-5 px-6 text-center w-44">Base Quantity</th>
                  <th className="py-5 px-8 text-center w-32">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-900 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto animate-pulse">
                        <Loader2 className="h-7 w-7 text-zinc-950 animate-spin mb-3" />
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          Loading stock items...
                        </h3>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="h-12 w-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
                          <ClipboardList className="h-5 w-5 text-zinc-400" />
                        </div>
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                          No stock items found
                        </h3>
                        <p className="text-zinc-400 text-xs mt-1 font-semibold">
                          {searchQuery
                            ? `No items match "${searchQuery}" in this category.`
                            : "There are no stock items assigned to this location."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const counts = itemCounts[item.id] || {
                      countedCartons: "",
                      countedPieces: "",
                      selectedOptionId: item.countingOptions?.[0]?.id || "",
                      countedCartons2: "",
                      selectedOptionId2: item.countingOptions?.[1]?.id || "",
                    };

                    const hasOptions =
                      item.countingOptions && item.countingOptions.length > 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-50/30 transition-colors"
                      >
                        {/* Item Name (including Category subtext) */}
                        <td className="py-2.5 px-8">
                          <div>
                            <p className="font-extrabold text-zinc-900 text-sm">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                              {item.categoryName || "Uncategorized"}
                            </p>
                          </div>
                        </td>
                        <td className="py-2 px-6 text-center border-l border-zinc-50/50">
                          {hasOptions && item.countingOptions?.[0] ? (
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                {item.countingOptions[0].displayName}
                              </span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-20 bg-white border border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 rounded-lg py-1.5 px-3 text-center text-xs font-bold focus:outline-none transition-all"
                                value={counts.countedCartons}
                                onChange={(e) =>
                                  setItemCounts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...counts,
                                      countedCartons: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <span className="text-zinc-300 font-bold">-</span>
                          )}
                        </td>

                        <td className="py-2 px-6 text-center border-l border-zinc-50/50">
                          {hasOptions && item.countingOptions?.[1] ? (
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                {item.countingOptions[1].displayName}
                              </span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-20 bg-white border border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 rounded-lg py-1.5 px-3 text-center text-xs font-bold focus:outline-none transition-all"
                                value={counts.countedCartons2}
                                onChange={(e) =>
                                  setItemCounts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...counts,
                                      countedCartons2: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <span className="text-zinc-300 font-bold">-</span>
                          )}
                        </td>

                        <td className="py-2 px-6 text-center border-l border-zinc-50/50">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                              Base Qty
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              className="w-20 bg-white border border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 rounded-lg py-1.5 px-3 text-center text-xs font-bold focus:outline-none transition-all"
                              value={counts.countedPieces}
                              onChange={(e) =>
                                setItemCounts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...counts,
                                    countedPieces: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </td>

                        <td className="py-2.5 px-8 text-center text-zinc-400 font-extrabold text-sm border-l border-zinc-50/50">
                          {item.baseUnit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 rounded-full px-3 py-1">
            {lastAutoSave ? (
              <>
                <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[3px]" />
                <span className="text-zinc-900">
                  Auto Saved at {lastAutoSave}
                </span>
              </>
            ) : (
              <span className="text-zinc-400">Ready</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              disabled={saving}
            >
              Clear All
            </button>
            <button
              onClick={() => saveSession(true)}
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit Count"
              )}
            </button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={showClearConfirm}
        title="Clear All Quantities"
        description="Are you sure you want to clear all quantities? This cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
