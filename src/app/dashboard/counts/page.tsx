/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { toast } from "sonner";

import { useEffect, useState, useRef } from "react";
import AlertDialog from "@/components/alert-dialog";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import {
  getStockCounts,
  getStockCountDetail,
  createStockCount,
  updateStockCount,
  deleteStockCount,
} from "@/lib/repositories/stock-count.repository";
import { StockItem, StockCountSession } from "@/types/inventory";
import {
  ClipboardList,
  Search,
  ChevronDown,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  ArrowLeft,
  Save,
  Check,
  Send,
  Calendar,
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

const decodeNotes = (dbNotes: string | undefined) => {
  if (!dbNotes) return { opt1Id: "", qty1: "", opt2Id: "", qty2: "" };
  const match = dbNotes.match(
    /^\[opt1:([^,]*),qty1:([^,]*),opt2:([^,]*),qty2:([^\]]*)\]/,
  );
  if (match) {
    return {
      opt1Id: match[1],
      qty1: match[2],
      opt2Id: match[3],
      qty2: match[4],
    };
  }
  const oldMatch = dbNotes.match(/^\[opt:([^,]*),qty:([^\]]*)\]/);
  if (oldMatch) {
    return {
      opt1Id: oldMatch[1],
      qty1: oldMatch[2],
      opt2Id: "",
      qty2: "",
    };
  }
  return { opt1Id: "", qty1: "", opt2Id: "", qty2: "" };
};

export default function StockCountsPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId, setActiveLocation } = useLocationStore();
  const { profile } = useAuth();

  const [viewMode, setViewMode] = useState<"count" | "history" | "detail">(
    "count",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [historySessions, setHistorySessions] = useState<StockCountSession[]>(
    [],
  );
  const [selectedDetailSession, setSelectedDetailSession] =
    useState<StockCountSession | null>(null);

  const [activeSession, setActiveSession] = useState<StockCountSession | null>(
    null,
  );
  const [countType, setCountType] = useState("General Count");
  const [countDate, setCountDate] = useState("");
  const [countedByName, setCountedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "counted" | "not_counted"
  >("not_counted");
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDatePickerClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

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
  const [lastAutoSave, setLastAutoSave] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setCountDate(today);
  }, []);

  useEffect(() => {
    if (profile?.fullName) {
      setCountedByName(profile.fullName);
    }
  }, [profile]);

  useEffect(() => {
    async function loadInitialData() {
      if (!activeBusinessId) return;
      try {
        setLoading(true);
        setError(null);
        const [itemsList, sessList] = await Promise.all([
          getStockItems(activeBusinessId),
          getStockCounts(activeBusinessId),
        ]);

        setStockItems(
          (itemsList as StockItem[]).filter(
            (i: StockItem) => i.isActive !== false,
          ),
        );
        setHistorySessions(sessList);
      } catch (err) {
        console.error(err);
        setError("Failed to load setup data.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [activeBusinessId]);

  const getExpectedQty = (item: StockItem) => {
    return item.currentStock !== undefined ? item.currentStock : 0;
  };

  const calculateTotalBaseQty = (itemId: string, item: StockItem) => {
    const counts = itemCounts[itemId];
    if (!counts) return 0;

    const cartons = parseFloat(counts.countedCartons) || 0;
    const cartons2 = parseFloat(counts.countedCartons2) || 0;
    const pieces = parseFloat(counts.countedPieces) || 0;

    let total = pieces;

    if (item.countingOptions && item.countingOptions.length > 0) {
      const opt1 = item.countingOptions.find(
        (o) => o.id === counts.selectedOptionId,
      );
      const conversion1 = opt1 ? opt1.conversionToBaseQty || 1 : 1;
      total += cartons * conversion1;
    }

    if (item.countingOptions && item.countingOptions.length > 1) {
      const opt2 = item.countingOptions.find(
        (o) => o.id === counts.selectedOptionId2,
      );
      const conversion2 = opt2 ? opt2.conversionToBaseQty || 1 : 1;
      total += cartons2 * conversion2;
    }

    return total;
  };

  const startNewSession = () => {
    setActiveSession(null);
    setNotes("");

    const initialItemCounts: typeof itemCounts = {};
    stockItems.forEach((item) => {
      initialItemCounts[item.id] = {
        countedCartons: "",
        countedPieces: "",
        selectedOptionId: item.countingOptions?.[0]?.id || "",
        countedCartons2: "",
        selectedOptionId2: item.countingOptions?.[1]?.id || "",
      };
    });
    setItemCounts(initialItemCounts);
    setViewMode("count");
  };

  const loadInProgressSession = (sess: StockCountSession) => {
    setActiveSession(sess);
    if (sess.locationId) {
      setActiveLocation(sess.locationId);
    }
    setCountType(sess.countType);
    setCountDate(sess.countDate);
    setCountedByName(sess.countedByName);
    setNotes(sess.notes || "");

    const loadedCounts: typeof itemCounts = {};
    stockItems.forEach((item) => {
      const match = (sess.items || []).find((si) => si.itemId === item.id);
      const decoded = decodeNotes(match?.notes);
      loadedCounts[item.id] = {
        countedCartons: decoded.qty1 || "",
        countedPieces:
          match?.countedPieces !== undefined ? String(match.countedPieces) : "",
        selectedOptionId: decoded.opt1Id || item.countingOptions?.[0]?.id || "",
        countedCartons2: decoded.qty2 || "",
        selectedOptionId2:
          decoded.opt2Id || item.countingOptions?.[1]?.id || "",
      };
    });
    setItemCounts(loadedCounts);
    setViewMode("count");
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
        selectedOptionId:
          itemCounts[item.id]?.selectedOptionId ||
          item.countingOptions?.[0]?.id ||
          "",
        countedCartons2: "",
        selectedOptionId2:
          itemCounts[item.id]?.selectedOptionId2 ||
          item.countingOptions?.[1]?.id ||
          "",
      };
    });
    setItemCounts(cleared);
    setShowClearConfirm(false);
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

      let responseSession: StockCountSession;
      if (activeSession?.id) {
        responseSession = await updateStockCount(
          activeBusinessId,
          activeSession.id,
          dataPayload,
          complete ? "completed" : "in_progress",
        );
      } else {
        responseSession = await createStockCount(activeBusinessId, dataPayload);
        if (complete) {
          responseSession = await updateStockCount(
            activeBusinessId,
            responseSession.id,
            dataPayload,
            "completed",
          );
        }
      }

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastAutoSave(timestamp);

      if (complete) {
        toast.success(
          "Stock Count submitted successfully! Inventory stock levels updated.",
        );
        const refreshedList = await getStockCounts(activeBusinessId);
        setHistorySessions(refreshedList);
        setViewMode("history");
        setActiveSession(null);
      } else {
        setActiveSession(responseSession);
        const refreshedList = await getStockCounts(activeBusinessId);
        setHistorySessions(refreshedList);
      }
    } catch (err) {
      console.error(err);
      setError(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Failed to save stock count.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = (sessId: string) => {
    setDeleteTarget(sessId);
  };

  const handleConfirmDeleteSession = async () => {
    if (!activeBusinessId || !deleteTarget) return;
    try {
      await deleteStockCount(activeBusinessId, deleteTarget);
      toast.success("Count session deleted successfully!");
      const refreshedList = await getStockCounts(activeBusinessId);
      setHistorySessions(refreshedList);
      if (activeSession?.id === deleteTarget) {
        setActiveSession(null);
        startNewSession();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete count session.");
    } finally {
      setDeleteTarget(null);
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

    const counts = itemCounts[item.id];
    const isCounted =
      counts &&
      (counts.countedCartons !== "" ||
        counts.countedCartons2 !== "" ||
        counts.countedPieces !== "");

    if (filterStatus === "counted") {
      return isCounted || item.id === focusedItemId;
    }
    if (filterStatus === "not_counted") {
      return !isCounted || item.id === focusedItemId;
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
  const remainingItemsCount = totalItemsCount - countedItemsCount;

  const completionPercent =
    totalItemsCount > 0
      ? Math.round((countedItemsCount / totalItemsCount) * 100)
      : 0;

  return (
    <div className="flex flex-col bg-white min-h-[85vh] relative select-none">
      <div className="flex-1 min-w-0 space-y-6">
        {viewMode === "count" && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
              <div>
                <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Stock Count
                </h1>
                <p className="text-[#64748B] text-xs font-bold mt-1.5">
                  Count your stock items for accurate inventory tracking.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode("history")}
                  className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Clock className="h-4 w-4 text-zinc-400" />
                  View Stock Count History
                </button>
              </div>
            </div>

            <div className="border border-zinc-200 rounded-2xl p-4 bg-white shadow-xs space-y-2">
              <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                Count Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                <div className="text-center md:border-r border-zinc-100 last:border-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Total Items
                  </span>
                  <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                    {totalItemsCount}
                  </span>
                </div>
                <div className="text-center md:border-r border-zinc-100 last:border-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Counted Items
                  </span>
                  <span className="text-2xl font-black text-emerald-600 mt-1 block">
                    {countedItemsCount}
                  </span>
                </div>
                <div className="text-center md:border-r border-zinc-100 last:border-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Remaining Items
                  </span>
                  <span className="text-2xl font-black text-zinc-800 mt-1 block">
                    {remainingItemsCount}
                  </span>
                </div>
                <div className="py-2 flex flex-col justify-center px-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Progress
                    </span>
                    <span className="font-extrabold text-[#16A34A] text-sm">
                      {completionPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200/50">
                    <div
                      className="bg-[#16A34A] h-full rounded-full transition-all duration-300"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 block text-right mt-1.5">
                    {countedItemsCount} of {totalItemsCount} items counted
                  </span>
                </div>
              </div>
            </div>

            {/* SEARCH & FILTERS ROW */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative w-full sm:max-w-xs md:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2.5 pl-9 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 justify-end flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterStatus("all")}
                    className={`border rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === "all"
                        ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20 shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-2xs"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("counted")}
                    className={`border rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === "counted"
                        ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20 shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-2xs"
                    }`}
                  >
                    Counted
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("not_counted")}
                    className={`border rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === "not_counted"
                        ? "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20 shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-2xs"
                    }`}
                  >
                    Not Counted
                  </button>
                </div>

                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleDatePickerClick}
                    className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Calendar className="h-4.5 w-4.5 text-zinc-400" />
                    <span>{formatDate(countDate)}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl p-3 text-center font-bold">
                {error}
              </div>
            )}

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th className="py-4 px-6 w-12 text-center">#</th>
                      <th className="py-4 px-6">Item</th>
                      <th className="py-4 px-6 text-center w-80" colSpan={3}>
                        Counted Quantity
                      </th>
                      <th className="py-4 px-6">Total (Base Unit)</th>
                    </tr>
                    <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold tracking-wider text-zinc-400 bg-zinc-50/20">
                      <th colSpan={2} />
                      <th className="py-2 px-1 text-center border-r border-zinc-100 w-48">
                        1st Option
                      </th>
                      <th className="py-2 px-1 text-center border-r border-zinc-100 w-48">
                        2nd Option
                      </th>
                      <th className="py-2 px-1 text-center w-32">Base Qty</th>
                      <th colSpan={1} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-16 px-6 text-center">
                          <div className="flex flex-col items-center justify-center max-w-md mx-auto animate-pulse">
                            <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
                            <h3 className="text-sm font-extrabold text-[#0F172A]">
                              Loading stock items...
                            </h3>
                            <p className="text-zinc-500 text-xs mt-1 font-semibold leading-relaxed">
                              Please wait while we fetch the inventory list.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 px-6 text-center">
                          <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3 shadow-xs">
                              <ClipboardList className="h-6 w-6 text-zinc-400 stroke-[1.5]" />
                            </div>
                            <h3 className="text-sm font-extrabold text-[#0F172A]">
                              No stock items found
                            </h3>
                            <p className="text-zinc-500 text-xs mt-1 font-semibold leading-relaxed">
                              {searchQuery
                                ? `No items match "${searchQuery}" in this location.`
                                : "There are no stock items assigned to this location yet. Go to Stock Items to assign them."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, index) => {
                        const counts = itemCounts[item.id] || {
                          countedCartons: "",
                          countedPieces: "",
                          selectedOptionId: item.countingOptions?.[0]?.id || "",
                        };

                        const hasOptions =
                          item.countingOptions &&
                          item.countingOptions.length > 0;

                        const totalBaseQty = calculateTotalBaseQty(
                          item.id,
                          item,
                        );
                        const isCounted =
                          counts.countedCartons !== "" ||
                          counts.countedCartons2 !== "" ||
                          counts.countedPieces !== "";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-zinc-50/40 transition-colors"
                          >
                            <td className="py-4 px-6 text-center text-zinc-400 font-bold">
                              {index + 1}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden shadow-xs">
                                  {item.imageUrl ? (
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      width={100}
                                      height={100}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <ClipboardList className="h-5 w-5 text-zinc-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-extrabold text-[#0F172A]">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] text-[#64748B] font-bold mt-0.5 uppercase tracking-wider">
                                    {item.categoryName || "Beverages"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center border-r border-zinc-100 w-48">
                              {hasOptions && item.countingOptions?.[0] ? (
                                <div className="flex flex-col items-center gap-1 justify-center">
                                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                    {item.countingOptions[0].displayName}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2 text-center text-xs font-bold focus:outline-none"
                                    value={counts.countedCartons}
                                    onFocus={() => setFocusedItemId(item.id)}
                                    onBlur={() => setFocusedItemId(null)}
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
                                <span className="text-zinc-300 font-bold">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center border-r border-zinc-100 w-48">
                              {hasOptions && item.countingOptions?.[1] ? (
                                <div className="flex flex-col items-center gap-1 justify-center">
                                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                    {item.countingOptions[1].displayName}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2 text-center text-xs font-bold focus:outline-none"
                                    value={counts.countedCartons2}
                                    onFocus={() => setFocusedItemId(item.id)}
                                    onBlur={() => setFocusedItemId(null)}
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
                                <span className="text-zinc-300 font-bold">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center w-32">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                                  {item.baseUnit}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="0"
                                  className="w-20 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-0 text-center text-xs font-bold focus:outline-none"
                                  value={counts.countedPieces}
                                  onFocus={() => setFocusedItemId(item.id)}
                                  onBlur={() => setFocusedItemId(null)}
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
                            <td className="py-4 px-6">
                              {isCounted ? (
                                <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 py-1 px-2.5 rounded-lg font-extrabold text-xs">
                                  {totalBaseQty.toFixed(2)} {item.baseUnit}
                                </span>
                              ) : (
                                <span className="text-zinc-400 font-semibold">
                                  Not Counted
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 rounded-full px-3 py-1">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Auto-save: Last saved {lastAutoSave || "just now"}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearAll}
                  className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  disabled={saving}
                >
                  Clear All
                </button>
                <button
                  onClick={() => saveSession(false)}
                  className="border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Draft
                </button>
                <button
                  onClick={() => saveSession(true)}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 stroke-[3px]" />
                  )}
                  Submit Count
                </button>
              </div>
            </div>
          </>
        )}

        {viewMode === "history" && (
          <>
            <div className="flex justify-between items-center border-b border-zinc-200 pb-5">
              <div>
                <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Stock Count History
                </h1>
                <p className="text-[#64748B] text-xs font-bold mt-1.5">
                  View and manage all past and active physical inventory counts.
                </p>
              </div>

              <button
                onClick={startNewSession}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all duration-200"
              >
                <Plus className="h-4 w-4 stroke-[3px]" />
                Start New Count
              </button>
            </div>

            {historySessions.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-sm">
                <ClipboardList className="h-10 w-10 text-zinc-300 mb-3" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  No past count sessions
                </h3>
                <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
                  Start your first physical count audit to populate inventory
                  history records.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                        <th className="py-4 px-6">Count Date</th>
                        <th className="py-4 px-6">Location</th>
                        <th className="py-4 px-6">Count Type</th>
                        <th className="py-4 px-6">Counted By</th>
                        <th className="py-4 px-6">Items Counted</th>
                        <th className="py-4 px-6">Variance Cost</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                      {historySessions.map((sess) => {
                        const isCompleted = sess.status === "completed";
                        const varianceValue = sess.totalVariance || 0;

                        return (
                          <tr
                            key={sess.id}
                            className="hover:bg-zinc-50/40 transition-colors"
                          >
                            <td className="py-4 px-6 font-extrabold text-[#0F172A]">
                              {sess.countDate}
                            </td>
                            <td className="py-4 px-6 font-bold text-zinc-600">
                              {sess.locationName || "All Locations"}
                            </td>
                            <td className="py-4 px-6 font-semibold text-zinc-500">
                              {sess.countType}
                            </td>
                            <td className="py-4 px-6 font-bold text-zinc-700">
                              {sess.countedByName}
                            </td>
                            <td className="py-4 px-6 font-bold text-zinc-800">
                              {sess.itemsCount} items
                            </td>
                            <td className="py-4 px-6 font-extrabold">
                              {varianceValue < 0 ? (
                                <span className="text-rose-600">
                                  -${Math.abs(varianceValue).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-emerald-600">
                                  +${varianceValue.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isCompleted ? (
                                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-emerald-200">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 border border-amber-200 animate-pulse">
                                  <Clock className="h-3 w-3" />
                                  In Progress
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isCompleted ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const detailed =
                                          await getStockCountDetail(
                                            activeBusinessId!,
                                            sess.id,
                                          );
                                        setSelectedDetailSession(detailed);
                                        setViewMode("detail");
                                      } catch {
                                        toast.error("Failed to load details.");
                                      }
                                    }}
                                    className="border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-lg px-3 py-1.5 font-bold transition-all text-[11px] cursor-pointer"
                                  >
                                    View Summary
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => loadInProgressSession(sess)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 font-bold transition-all text-[11px] cursor-pointer"
                                  >
                                    Continue Count
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSession(sess.id)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-[#EF4444] hover:bg-rose-50 cursor-pointer"
                                  title="Delete Count"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === "detail" && selectedDetailSession && (
          <>
            <div className="flex items-center gap-3 border-b border-zinc-200 pb-5">
              <button
                onClick={() => setViewMode("history")}
                className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer text-zinc-600"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Stock Count Summary
                </h1>
                <p className="text-[#64748B] text-xs font-bold mt-1.5">
                  Detailed breakdown of physical inventory audit completed on{" "}
                  {selectedDetailSession.countDate}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">
                  Location Audited
                </span>
                <span className="text-lg font-extrabold text-[#0F172A] mt-1 block">
                  {selectedDetailSession.locationName || "All Locations"}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">
                  Auditor Name
                </span>
                <span className="text-lg font-extrabold text-[#0F172A] mt-1 block">
                  {selectedDetailSession.countedByName}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">
                  Total Items Audited
                </span>
                <span className="text-lg font-extrabold text-[#0F172A] mt-1 block">
                  {selectedDetailSession.itemsCount} items
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">
                  Total Variance Cost
                </span>
                <span
                  className={`text-lg font-extrabold mt-1 block ${
                    (selectedDetailSession.totalVariance || 0) < 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  ${(selectedDetailSession.totalVariance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/50">
                      <th className="py-4 px-6">Item</th>
                      <th className="py-4 px-6 text-center">Expected (Base)</th>
                      <th className="py-4 px-6 text-center">Counted (Base)</th>
                      <th className="py-4 px-6 text-center">Variance Qty</th>
                      <th className="py-4 px-6 text-center">Cost Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {(selectedDetailSession.items || []).map((ci) => {
                      const v = ci.variance || 0;
                      const cv = ci.costVariance || 0;

                      return (
                        <tr
                          key={ci.id}
                          className="hover:bg-zinc-50/40 transition-colors"
                        >
                          <td className="py-4 px-6 font-extrabold text-[#0F172A]">
                            {ci.itemName}
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-zinc-700">
                            {ci.expectedQty} {ci.baseUnit}
                          </td>
                          <td className="py-4 px-6 text-center font-extrabold text-zinc-800">
                            {ci.countedQty !== undefined
                              ? `${ci.countedQty} ${ci.baseUnit}`
                              : "Not Counted"}
                          </td>
                          <td className="py-4 px-6 text-center font-bold">
                            {v === 0 ? (
                              <span className="text-zinc-500">0</span>
                            ) : v < 0 ? (
                              <span className="text-rose-600">
                                {v.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-emerald-600">
                                +{v.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center font-extrabold">
                            {cv === 0 ? (
                              <span className="text-zinc-500">$0.00</span>
                            ) : cv < 0 ? (
                              <span className="text-rose-600">
                                -${Math.abs(cv).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-emerald-600">
                                +${cv.toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
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

      <AlertDialog
        open={deleteTarget !== null}
        title="Delete Count Session"
        description="Are you sure you want to delete this count session? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteSession}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
