/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Business } from "@/types/business";
import { useEffect, useState } from "react";
import AlertDialog from "@/components/alert-dialog";
import { useAuth } from "@/providers/auth-provider";
import { useBusinessStore } from "@/store/business-store";
import { getLocations } from "@/lib/repositories/location.repository";
import { getStockItems } from "@/lib/repositories/stock-item.repository";
import { getUserBusinesses } from "@/lib/repositories/business.repository";
import {
  getStockCounts,
  getStockCountDetail,
  createStockCount,
  updateStockCount,
  deleteStockCount,
} from "@/lib/repositories/stock-count.repository";
import { StockItem, Location, StockCountSession } from "@/types/inventory";
import {
  ClipboardList,
  Search,
  ChevronDown,
  Plus,
  Trash2,
  Loader2,
  HelpCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Barcode,
  Save,
  Check,
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
  const { activeBusinessId, setActiveBusiness } = useBusinessStore();
  const { profile } = useAuth();

  const [viewMode, setViewMode] = useState<"count" | "history" | "detail">(
    "count",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [historySessions, setHistorySessions] = useState<StockCountSession[]>(
    [],
  );
  const [selectedDetailSession, setSelectedDetailSession] =
    useState<StockCountSession | null>(null);

  const [activeSession, setActiveSession] = useState<StockCountSession | null>(
    null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [countType, setCountType] = useState("General Count");
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
  const [lastAutoSave, setLastAutoSave] = useState("");
  const [recentActivities, setRecentActivities] = useState<
    { user: string; text: string; time: string }[]
  >([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setCountDate(today);
  }, []);

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
    if (historySessions.length > 0) {
      const activities = historySessions.slice(0, 5).map((sess) => {
        const isCompleted = sess.status === "completed";
        let timeStr = sess.countDate;
        try {
          if (sess.createdAt) {
            timeStr = new Date(sess.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });
          }
        } catch (e) {
          console.log(e);
        }
        return {
          user: sess.countedByName || "User",
          text: isCompleted
            ? `Submitted ${sess.countType} (${sess.itemsCount || 0} items)`
            : `Saved ${sess.countType} draft`,
          time: timeStr,
        };
      });
      setRecentActivities(activities);
    } else {
      setRecentActivities([]);
    }
  }, [historySessions]);

  useEffect(() => {
    if (profile?.fullName) {
      setCountedByName(profile.fullName);
    }
  }, [profile]);

  async function loadInitialData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);
      const [locsList, itemsList, sessList] = await Promise.all([
        getLocations(activeBusinessId),
        getStockItems(activeBusinessId),
        getStockCounts(activeBusinessId),
      ]);

      setLocations(
        (locsList as Location[]).filter((l: Location) => l.isActive !== false),
      );
      setStockItems(
        (itemsList as StockItem[]).filter(
          (i: StockItem) => i.isActive !== false,
        ),
      );
      setHistorySessions(sessList);

      if (locsList.length > 0) {
        setSelectedLocationId(locsList[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load setup data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
    setSelectedLocationId(sess.locationId || "");
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
        locationId: selectedLocationId || undefined,
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
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save stock count.");
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
    if (!selectedLocationId) return true;
    return (item.locationRules || []).some(
      (rule) => rule.locationId === selectedLocationId,
    );
  });

  const filteredItems = locationFilteredItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const totalItemsCount = locationFilteredItems.length;
  const countedItemsList = locationFilteredItems.filter((item) => {
    const counts = itemCounts[item.id];
    return (
      counts && (counts.countedCartons !== "" || counts.countedPieces !== "")
    );
  });
  const countedItemsCount = countedItemsList.length;
  const remainingItemsCount = totalItemsCount - countedItemsCount;

  const totalCountedBaseQty = locationFilteredItems.reduce((acc, item) => {
    return acc + calculateTotalBaseQty(item.id, item);
  }, 0);

  const completionPercent =
    totalItemsCount > 0
      ? Math.round((countedItemsCount / totalItemsCount) * 100)
      : 0;

  return (
    <div
      className={`flex flex-col xl:flex-row gap-6 bg-white min-h-[85vh] relative select-none ${viewMode === "count" ? "pb-24" : ""}`}
    >
      <div className="flex-1 min-w-0 space-y-6 pr-0 xl:pr-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Business
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                    value={activeBusinessId || ""}
                    onChange={(e) => setActiveBusiness(e.target.value)}
                  >
                    {businesses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Location
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Count Type
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-3 pr-8 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] appearance-none cursor-pointer shadow-xs"
                    value={countType}
                    onChange={(e) => setCountType(e.target.value)}
                  >
                    <option value="General Count">General Count</option>
                    <option value="Daily Count">Daily Count</option>
                    <option value="Weekly Count">Weekly Count</option>
                    <option value="Monthly Count">Monthly Count</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Count Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] shadow-xs"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Counted By
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#16A34A] shadow-xs"
                    value={countedByName}
                    onChange={(e) => setCountedByName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-between items-center bg-zinc-50/50 p-3 rounded-2xl border border-zinc-200">
              <div className="flex items-center gap-3 w-full sm:max-w-md">
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="w-full bg-white border border-zinc-200 focus:border-[#16A34A] rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#16A34A] transition-all shadow-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button className="border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <Barcode className="h-4.5 w-4.5 text-zinc-400" />
                  Scan Barcode
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button className="border border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                  Filters
                </button>
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
                      <th className="py-4 px-6 w-64">Unit Info</th>
                      <th className="py-4 px-6 text-center w-80" colSpan={3}>
                        Counted Quantity
                      </th>
                      <th className="py-4 px-6">Total (Base Unit)</th>
                    </tr>
                    <tr className="border-b border-zinc-200 text-[9px] uppercase font-extrabold tracking-wider text-zinc-400 bg-zinc-50/20">
                      <th colSpan={3} />
                      <th className="py-2 px-1 text-center border-r border-zinc-100 w-32">
                        Base Qty
                      </th>
                      <th className="py-2 px-1 text-center border-r border-zinc-100 w-48">
                        1st Option
                      </th>
                      <th className="py-2 px-1 text-center w-48">2nd Option</th>
                      <th colSpan={1} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 px-6 text-center">
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
                            {!searchQuery && (
                              <a
                                href="/dashboard/stock-items"
                                className="mt-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer inline-block"
                              >
                                Manage Stock Items
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, index) => {
                        const counts = itemCounts[item.id] || {
                          countedCartons: "",
                          countedPieces: "",
                          selectedOptionId: item.countingOptions?.[0]?.id || "",
                          notes: "",
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
                            <td className="py-4 px-6 font-bold text-zinc-500">
                              {hasOptions ? (
                                <div className="flex flex-col gap-0.5">
                                  {item.countingOptions?.map((opt, idx) => (
                                    <span key={opt.id || idx}>
                                      1 {opt.displayName} ={" "}
                                      {opt.conversionToBaseQty} {item.baseUnit}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span>
                                  1 {item.baseUnit} = 1 {item.baseUnit}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center border-r border-zinc-100 w-32">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="0"
                                  className="w-20 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-0 text-center text-xs font-bold focus:outline-none"
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
                                <span className="text-[10px] text-zinc-400 font-bold">
                                  {item.baseUnit}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center border-r border-zinc-100 w-48">
                              {hasOptions && item.countingOptions?.[0] ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2 text-center text-xs font-bold focus:outline-none"
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
                                  <span className="text-[10px] text-zinc-400 font-bold">
                                    {item.countingOptions[0].displayName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-300 font-bold">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center w-48">
                              {hasOptions && item.countingOptions?.[1] ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-white border border-zinc-300 focus:border-[#16A34A] rounded-lg py-1.5 px-2 text-center text-xs font-bold focus:outline-none"
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
                                  <span className="text-[10px] text-zinc-400 font-bold">
                                    {item.countingOptions[1].displayName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-300 font-bold">
                                  -
                                </span>
                              )}
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
                                        setLoading(true);
                                        const detailed =
                                          await getStockCountDetail(
                                            activeBusinessId!,
                                            sess.id,
                                          );
                                        setSelectedDetailSession(detailed);
                                        setViewMode("detail");
                                      } catch (err) {
                                        toast.error("Failed to load details.");
                                      } finally {
                                        setLoading(false);
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
                      const decoded = decodeNotes(ci.notes);

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
                          <td className="py-4 px-6 text-zinc-500 font-semibold italic">
                            {decoded.userNotes || "--"}
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

      {viewMode === "count" && (
        <aside className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-zinc-200 pt-6 xl:pt-0 xl:pl-6 flex flex-col gap-6 shrink-0 relative">
          <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/50 space-y-4">
            <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-zinc-200 pb-2">
              Count Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-semibold text-zinc-600">
                <span>Total Items</span>
                <span className="font-extrabold text-[#0F172A]">
                  {totalItemsCount}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-600">
                <span>Counted Items</span>
                <span className="font-extrabold text-emerald-600">
                  {countedItemsCount}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-600">
                <span>Remaining Items</span>
                <span className="font-extrabold text-zinc-800">
                  {remainingItemsCount}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-600 border-t border-zinc-200 pt-2.5">
                <span>Total Qty (Base)</span>
                <span className="font-extrabold text-[#0F172A]">
                  {totalCountedBaseQty.toFixed(2)}
                </span>
              </div>
              {lastAutoSave && (
                <div className="flex justify-between font-semibold text-zinc-600 border-t border-zinc-200 pt-2.5">
                  <span>Last Auto-save</span>
                  <span className="font-bold text-zinc-500">
                    {lastAutoSave}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <h3 className="font-extrabold text-[#0F172A] uppercase tracking-wider">
                Progress
              </h3>
              <span className="font-extrabold text-[#16A34A]">
                {completionPercent}%
              </span>
            </div>

            <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#16A34A] h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <span className="text-[10px] font-bold text-zinc-400 block text-right mt-1">
              {countedItemsCount} of {totalItemsCount} items counted
            </span>
          </div>

          <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/50 space-y-4">
            <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-zinc-200 pb-2">
              Recent Activity
            </h3>

            {recentActivities.length === 0 ? (
              <p className="text-[10px] font-bold text-zinc-400 italic">
                No recent actions in this count session.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act, index) => (
                  <div
                    key={index}
                    className="flex gap-2.5 items-start text-xs border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="h-6 w-6 rounded-full bg-[#DCFCE7] text-[#16A34A] font-bold flex items-center justify-center text-[10px] shrink-0 uppercase">
                      {act.user.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#0F172A]">
                        {act.user}
                      </p>
                      <p className="text-[10px] font-semibold text-zinc-500 mt-0.5">
                        {act.text}
                      </p>
                      <span className="text-[9px] font-bold text-zinc-400 mt-0.5 block">
                        {act.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-zinc-200 rounded-2xl p-5 bg-zinc-50/50 space-y-3.5">
            <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-2 text-[#0F172A]">
              <HelpCircle className="h-4.5 w-4.5 text-zinc-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                Tips
              </h3>
            </div>
            <ul className="list-disc pl-4 text-[10px] font-bold text-zinc-500 space-y-2.5 leading-relaxed">
              <li>You can enter either cartons or pieces.</li>
              <li>Total quantity is calculated automatically.</li>
              <li>Use Scan Barcode for faster entry.</li>
            </ul>
          </div>
        </aside>
      )}

      {viewMode === "count" && (
        <div className="fixed bottom-0 left-0 right-0 h-auto min-h-20 bg-white border-t border-zinc-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 sm:py-0 z-[100]">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-save: Last saved {lastAutoSave || "just now"}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              disabled={saving}
            >
              Clear All
            </button>
            <button
              onClick={() => saveSession(false)}
              className="border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
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
                <Check className="h-4 w-4 stroke-[3px]" />
              )}
              Submit Count
            </button>
          </div>
        </div>
      )}

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
