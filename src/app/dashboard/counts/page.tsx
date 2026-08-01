/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";

import { useAuth } from "@/providers/auth-provider";
import AlertDialog from "@/components/ui/alert-dialog";
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
  X,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getOptionLabel = (option: any, baseUnit: string) => {
  if (!option) return "";
  const name = option.displayName || "";
  const conv = option.conversionToBaseQty;
  if (conv && conv !== 1) {
    const hasConvInName = name
      .toLowerCase()
      .includes(String(conv).toLowerCase());
    if (!hasConvInName) {
      return `${name} (${conv}${baseUnit || ""})`;
    }
  }
  return name;
};

export default function StockCountsPage() {
  const { profile } = useAuth();
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [notes, setNotes] = useState("");
  const [countType] = useState("General Count");
  const [countDate, setCountDate] = useState("");
  const [countedByName, setCountedByName] = useState("");

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

  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    countDate: string;
    countedByName: string;
    items: Array<{
      id: string;
      name: string;
      categoryName?: string;
      baseUnit: string;
      countedCartons: string;
      opt1Label?: string;
      countedCartons2: string;
      opt2Label?: string;
      countedPieces: string;
      totalBaseQty: number;
    }>;
  } | null>(null);

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

        const draftKey = `nexbrix_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
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
        toast.error("Failed to load setup data.");
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

    const draftKey = `nexbrix_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
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

  const calculateTotal = (itemId: string, item: StockItem) => {
    const counts = itemCounts[itemId];
    if (!counts) return 0;
    const val1 =
      counts.countedCartons !== "" ? parseFloat(counts.countedCartons) : 0;
    const val2 =
      counts.countedCartons2 !== "" ? parseFloat(counts.countedCartons2) : 0;
    const val3 =
      counts.countedPieces !== "" ? parseFloat(counts.countedPieces) : 0;

    const conv1 = item.countingOptions?.[0]?.conversionToBaseQty || 1;
    const conv2 = item.countingOptions?.[1]?.conversionToBaseQty || 1;

    const total = val1 * conv1 + val2 * conv2 + val3;
    // Format to 2 decimal places to avoid floating point issues if necessary, but keep as number
    return Math.round(total * 100) / 100;
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

    const draftKey = `nexbrix_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
    localStorage.removeItem(draftKey);
    setLastAutoSave("");

    setShowClearConfirm(false);
    toast.success("All counts cleared successfully!");
  };

  const saveSession = async (complete: boolean) => {
    if (!activeBusinessId) return;
    try {
      setSaving(true);

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

        const submittedList = stockItems
          .map((item) => {
            const counts = itemCounts[item.id] || {
              countedCartons: "",
              countedPieces: "",
              selectedOptionId: item.countingOptions?.[0]?.id || "",
              countedCartons2: "",
              selectedOptionId2: item.countingOptions?.[1]?.id || "",
            };
            const hasVal =
              counts.countedCartons !== "" ||
              counts.countedCartons2 !== "" ||
              counts.countedPieces !== "";
            if (!hasVal) return null;

            const opt1Label = item.countingOptions?.[0]
              ? getOptionLabel(item.countingOptions[0], item.baseUnit)
              : undefined;
            const opt2Label = item.countingOptions?.[1]
              ? getOptionLabel(item.countingOptions[1], item.baseUnit)
              : undefined;

            return {
              id: item.id,
              name: item.name,
              categoryName: item.categoryName,
              baseUnit: item.baseUnit,
              countedCartons: counts.countedCartons,
              opt1Label,
              countedCartons2: counts.countedCartons2,
              opt2Label,
              countedPieces: counts.countedPieces,
              totalBaseQty: calculateTotal(item.id, item),
            };
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        setSubmittedData({
          countDate,
          countedByName,
          items: submittedList,
        });
        setShowSubmittedModal(true);

        const draftKey = `nexbrix_stock_count_draft_${activeBusinessId}_${activeLocationId}`;
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
      toast.error(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Failed to submit stock count."
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
    <div className="flex flex-col bg-[#F5F5F5] md:bg-white h-full w-full relative select-none">
      <div className="flex-1 min-w-0 flex flex-col space-y-3 min-h-0 w-full max-w-full">
        <div className="bg-white border border-neutral-200 rounded-3xl py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
            Stock Counts
          </h1>

          <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-4">
            <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
              {countedItemsCount} of {totalItemsCount} items counted
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 md:w-48 bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50 shrink-0">
                <div
                  className="bg-[#16A34A] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-zinc-400 whitespace-nowrap">
                ({completionPercent}%)
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-2.5 md:items-center w-full max-w-full shrink-0 justify-between">
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="inventory items"
              className="w-full bg-white border border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 rounded-full py-2.5 pl-9 pr-4 text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-center overflow-x-auto md:overflow-visible no-scrollbar py-0.5 md:ml-auto">
            <div
              className="relative font-bold shrink-0 hidden md:block"
              ref={categoryDropdownRef}
            >
              <button
                type="button"
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>{activeCategoryName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-40 py-2 animate-scale-in">
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

            <div
              className="relative shrink-0 hidden md:block"
              ref={calendarRef}
            >
              <button
                type="button"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <CalendarIcon className="h-4 w-4 text-zinc-400" />
                <span>{formatDateDisplay(countDate)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              </button>
              {isCalendarOpen && (
                <div className="absolute right-0 mt-1.5 z-40 animate-scale-in">
                  <CustomCalendar
                    selectedDate={countDate}
                    onChange={(dateStr) => {
                      setCountDate(dateStr);
                      setIsCalendarOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="flex-1 min-h-0 flex flex-col bg-[#F5F5F5] md:bg-white overflow-hidden">
          <div className="hidden md:block border border-zinc-200 rounded-3xl shadow-2xs flex-1 min-h-0 overflow-y-auto">
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
                    const hasValue =
                      counts &&
                      (counts.countedCartons !== "" ||
                        counts.countedCartons2 !== "" ||
                        counts.countedPieces !== "");

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          hasValue
                            ? "bg-emerald-50/70 hover:bg-emerald-100/50"
                            : "hover:bg-zinc-50/30"
                        }`}
                      >
                        <td className="py-2.5 px-8">
                          <div>
                            <p className="font-semibold text-zinc-900 text-sm">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider mt-0.5">
                              {item.categoryName || "Uncategorized"}
                            </p>
                          </div>
                        </td>
                        <td className="py-2 px-6 text-center border-l border-zinc-50/50">
                          {hasOptions && item.countingOptions?.[0] ? (
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                {getOptionLabel(
                                  item.countingOptions[0],
                                  item.baseUnit,
                                )}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
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
                                {getOptionLabel(
                                  item.countingOptions[1],
                                  item.baseUnit,
                                )}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
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
                              inputMode="decimal"
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

          <div className="block md:hidden flex-1 overflow-y-auto min-h-0 space-y-2.5">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="h-7 w-7 text-zinc-950 animate-spin mb-3" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Loading stock items...
                </h3>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-3">
                  <ClipboardList className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  No stock items found
                </h3>
                <p className="text-zinc-400 text-xs mt-1 font-semibold px-4">
                  {searchQuery
                    ? `No items match "${searchQuery}" in this category.`
                    : "There are no stock items assigned to this location."}
                </p>
              </div>
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
                const totalBaseQty = calculateTotal(item.id, item);
                const hasValue =
                  counts &&
                  (counts.countedCartons !== "" ||
                    counts.countedCartons2 !== "" ||
                    counts.countedPieces !== "");

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl px-4 py-4 shadow-sm border space-y-3 transition-colors ${
                      hasValue
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-white border-zinc-100"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <h3 className="text-[15px] font-bold text-zinc-900 truncate">
                        {item.name}
                      </h3>
                      <span className="bg-[#E8F5E2] text-[#2D6A2D] text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">
                        Total:{" "}
                        <span className="font-extrabold">
                          {totalBaseQty} {item.baseUnit}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight truncate block">
                          {hasOptions && item.countingOptions?.[0]
                            ? getOptionLabel(
                                item.countingOptions[0],
                                item.baseUnit,
                              )
                            : "-"}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          placeholder="0"
                          disabled={!(hasOptions && item.countingOptions?.[0])}
                          className="w-full bg-[#F5F5F5] border border-zinc-200 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 rounded-xl py-2.5 px-1 text-center text-sm font-bold focus:outline-none transition-all disabled:opacity-40"
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

                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight truncate block">
                          {hasOptions && item.countingOptions?.[1]
                            ? getOptionLabel(
                                item.countingOptions[1],
                                item.baseUnit,
                              )
                            : "-"}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          placeholder="0"
                          disabled={!(hasOptions && item.countingOptions?.[1])}
                          className="w-full bg-[#F5F5F5] border border-zinc-200 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 rounded-xl py-2.5 px-1 text-center text-sm font-bold focus:outline-none transition-all disabled:opacity-40"
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

                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight truncate block">
                          {item.baseUnit
                            ? item.baseUnit.toUpperCase()
                            : "BASE QTY"}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder="0"
                          className="w-full bg-[#F5F5F5] border border-zinc-200 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 rounded-xl py-2.5 px-1 text-center text-sm font-bold focus:outline-none transition-all"
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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-row items-center justify-between gap-4 py-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500 rounded-full px-3 py-1">
            {lastAutoSave ? (
              <>
                <Check className="h-4 w-4 text-emerald-600 shrink-0 stroke-[3px]" />
                <span className="font-medium">
                  Draft Saved at {lastAutoSave}
                </span>
              </>
            ) : (
              <span className="text-zinc-400">Ready</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              disabled={saving}
            >
              Clear All
            </button>
            <button
              onClick={() => saveSession(true)}
              className="bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
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

        <div className="flex md:hidden flex-col gap-2.5 pt-3 pb-2 bg-[#F5F5F5] shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold px-1">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[3px]" />
            <span>{lastAutoSave ? `Saved ${lastAutoSave}` : "Ready"}</span>
          </div>
          <div className="flex items-center gap-12">
            <button
              onClick={handleClearAll}
              className="flex-1 py-3.5 border border-zinc-300 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-zinc-100 text-zinc-700 bg-white transition-colors cursor-pointer"
              disabled={saving}
            >
              Clear All
            </button>
            <button
              onClick={() => saveSession(true)}
              className="flex-1 py-3.5 bg-[#0a2924] hover:bg-[#071d1a] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

      {showSubmittedModal && submittedData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowSubmittedModal(false)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in border border-zinc-100 z-10">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="h-5 w-5 stroke-[3px]" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                    Submitted Stock Counts
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {formatDateDisplay(submittedData.countDate)} • Counted by{" "}
                    <span className="font-bold text-zinc-700">
                      {submittedData.countedByName || "User"}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmittedModal(false)}
                className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">
                  Total Items Submitted:
                </span>
                <span className="text-sm font-extrabold text-emerald-700 bg-white px-3 py-1 rounded-full shadow-2xs border border-emerald-200">
                  {submittedData.items.length}{" "}
                  {submittedData.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {submittedData.items.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-8 font-medium">
                  No counts were entered in this session.
                </p>
              ) : (
                <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                  <div className="bg-zinc-50 px-4 py-3 text-[10px] uppercase font-extrabold text-zinc-400 grid grid-cols-12 gap-2">
                    <span className="col-span-5">Item</span>
                    <span className="col-span-4 text-center">
                      Submitted Quantities
                    </span>
                    <span className="col-span-3 text-right">
                      Total Base Qty
                    </span>
                  </div>
                  {submittedData.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-zinc-50/50"
                    >
                      <div className="col-span-5 min-w-0">
                        <p className="font-bold text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {item.categoryName || "Uncategorized"}
                        </p>
                      </div>
                      <div className="col-span-4 text-center text-zinc-600 text-[11px] font-medium space-y-0.5">
                        {item.countedCartons !== "" && (
                          <div>
                            <span className="font-bold text-zinc-900">
                              {item.countedCartons}
                            </span>{" "}
                            <span className="text-zinc-500">
                              {item.opt1Label || "Opt 1"}
                            </span>
                          </div>
                        )}
                        {item.countedCartons2 !== "" && (
                          <div>
                            <span className="font-bold text-zinc-900">
                              {item.countedCartons2}
                            </span>{" "}
                            <span className="text-zinc-500">
                              {item.opt2Label || "Opt 2"}
                            </span>
                          </div>
                        )}
                        {item.countedPieces !== "" && (
                          <div>
                            <span className="font-bold text-zinc-900">
                              {item.countedPieces}
                            </span>{" "}
                            <span className="text-zinc-500">
                              {item.baseUnit}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="bg-emerald-100/80 text-emerald-800 text-xs font-extrabold px-2.5 py-1 rounded-full inline-block">
                          {item.totalBaseQty} {item.baseUnit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
              <button
                onClick={() => setShowSubmittedModal(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
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
