/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { useLocationStore } from "@/stores/location-store";
import { getRefillSuggestions } from "@/lib/repositories/refill.repository";
import { createPurchaseOrder } from "@/lib/repositories/purchase-order.repository";
import { getSuppliers } from "@/lib/repositories/supplier.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import { getCategories } from "@/lib/repositories/category.repository";
import {
  Supplier,
  Location,
  Category,
  RefillSuggestion,
} from "@/types/inventory";
import {
  ClipboardList,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingDown,
  Download,
  Upload,
  Calendar,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import AlertDialog from "@/components/alert-dialog";

export default function RefillPlannerPage() {
  const { activeBusinessId } = useBusinessStore();
  const { activeLocationId } = useLocationStore();
  const { profile } = useAuth();

  const [suggestions, setSuggestions] = useState<RefillSuggestion[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState(
    activeLocationId || "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<
    "supplier" | "category" | "location" | "none"
  >("supplier");

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [creatingPO, setCreatingPO] = useState(false);
  const [confirmPO, setConfirmPO] = useState<{
    targetSupplierId?: string;
    summary: string;
  } | null>(null);

  const [showColumns, setShowColumns] = useState({
    currentStock: true,
    capacity: true,
    reorderLevel: true,
    toRefill: true,
    estCost: true,
  });

  const loadData = async () => {
    if (!activeBusinessId) return;
    try {
      setLoading(true);

      const [sugList, supList, locList, catList] = await Promise.all([
        getRefillSuggestions(activeBusinessId),
        getSuppliers(activeBusinessId),
        getLocations(activeBusinessId),
        getCategories(activeBusinessId),
      ]);

      setSuggestions(sugList);
      setSuppliers(supList);
      setLocations(locList);
      setCategories(catList);

      const initialSelected: Record<string, boolean> = {};
      const initialQuantities: Record<string, number> = {};

      sugList.forEach((s) => {
        const key = `${s.stockItemId}-${s.locationId || "null"}`;
        initialSelected[key] = true;
        initialQuantities[key] = s.toRefill;
      });

      setSelectedItems(initialSelected);
      setQuantities(initialQuantities);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to load refill planner data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusinessId, profile]);

  useEffect(() => {
    if (activeLocationId) {
      setLocationFilter(activeLocationId);
    } else {
      setLocationFilter("all");
    }
  }, [activeLocationId]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesSearch =
        s.stockItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.sku || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSupplier =
        supplierFilter === "all" || s.supplierId === supplierFilter;
      const matchesLocation =
        locationFilter === "all" || s.locationId === locationFilter;
      const matchesCategory =
        categoryFilter === "all" || s.categoryName === categoryFilter;
      return (
        matchesSearch && matchesSupplier && matchesLocation && matchesCategory
      );
    });
  }, [
    suggestions,
    searchQuery,
    supplierFilter,
    locationFilter,
    categoryFilter,
  ]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let totalCapacity = 0;
    let totalRefill = 0;
    let estCost = 0;

    filteredSuggestions.forEach((s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      if (selectedItems[key]) {
        totalItems += 1;
        totalCapacity += s.capacity;
        const qty =
          quantities[key] !== undefined ? quantities[key] : s.toRefill;
        totalRefill += qty;
        estCost += qty * s.costPerBaseUnit;
      }
    });

    return { totalItems, totalCapacity, totalRefill, estCost };
  }, [filteredSuggestions, selectedItems, quantities]);

  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      { name: string; id?: string; items: RefillSuggestion[] }
    > = {};

    filteredSuggestions.forEach((s) => {
      let groupKey = "";
      let groupName = "";
      let groupId = "";

      if (groupBy === "supplier") {
        groupKey = s.supplierId || "no-supplier";
        groupName = s.supplierName || "No Supplier";
        groupId = s.supplierId || "";
      } else if (groupBy === "location") {
        groupKey = s.locationId || "no-location";
        groupName = s.locationName || "No Location";
        groupId = s.locationId || "";
      } else if (groupBy === "category") {
        groupKey = s.categoryName || "others";
        groupName = s.categoryName || "Others";
      } else {
        groupKey = "all";
        groupName = "All Suggestions";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupName, id: groupId, items: [] };
      }
      groups[groupKey].items.push(s);
    });

    return Object.values(groups);
  }, [filteredSuggestions, groupBy]);

  const itemsBelowReorder = useMemo(() => {
    return suggestions.filter((s) => s.currentStock < s.reorderLevel).length;
  }, [suggestions]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const uniqueSuppliersCount = useMemo(() => {
    const supplierIds = new Set(
      filteredSuggestions.map((s) => s.supplierId).filter(Boolean),
    );
    return supplierIds.size;
  }, [filteredSuggestions]);

  const handleSelectAll = (checked: boolean) => {
    const updated = { ...selectedItems };
    filteredSuggestions.forEach((s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      updated[key] = checked;
    });
    setSelectedItems(updated);
  };

  const handleGroupSelectAll = (
    items: RefillSuggestion[],
    checked: boolean,
  ) => {
    const updated = { ...selectedItems };
    items.forEach((s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      updated[key] = checked;
    });
    setSelectedItems(updated);
  };

  const handleQuantityChange = (key: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const requestCreatePurchaseOrders = (targetSupplierId?: string) => {
    if (!activeBusinessId) return;

    // Compute what would be ordered
    const selectedCount = filteredSuggestions.filter((s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      if (!selectedItems[key]) return false;
      if (targetSupplierId && s.supplierId !== targetSupplierId) return false;
      return true;
    });

    if (selectedCount.length === 0) {
      toast.error("No items selected. Please select at least one item.");
      return;
    }

    const totalQty = selectedCount.reduce((sum, s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      const qty = quantities[key] !== undefined ? quantities[key] : s.toRefill;
      return sum + qty;
    }, 0);

    if (totalQty <= 0) {
      toast.error(
        "All selected items have 0 quantity. Adjust quantities before creating a purchase order.",
      );
      return;
    }

    const totalCost = selectedCount.reduce((sum, s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      const qty = quantities[key] !== undefined ? quantities[key] : s.toRefill;
      return sum + qty * s.costPerBaseUnit;
    }, 0);

    const itemsWithNoSupplier = selectedCount.filter((s) => !s.supplierId);
    if (itemsWithNoSupplier.length === selectedCount.length) {
      toast.error(
        "None of the selected items have a supplier assigned. Assign suppliers before creating purchase orders.",
      );
      return;
    }

    const summary = `${selectedCount.length} item${selectedCount.length !== 1 ? "s" : ""} · Est. $${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD`;
    setConfirmPO({ targetSupplierId, summary });
  };

  const handleCreatePurchaseOrders = async () => {
    if (!activeBusinessId || !confirmPO) return;
    const targetSupplierId = confirmPO.targetSupplierId;
    setConfirmPO(null);

    try {
      setCreatingPO(true);

      const itemsToOrder: Record<
        string,
        { stockItemId: string; quantity: number; unitCost: number }[]
      > = {};

      filteredSuggestions.forEach((s) => {
        const key = `${s.stockItemId}-${s.locationId || "null"}`;
        if (selectedItems[key]) {
          const qty =
            quantities[key] !== undefined ? quantities[key] : s.toRefill;
          if (qty > 0 && s.supplierId) {
            if (targetSupplierId && s.supplierId !== targetSupplierId) return;

            if (!itemsToOrder[s.supplierId]) {
              itemsToOrder[s.supplierId] = [];
            }
            itemsToOrder[s.supplierId].push({
              stockItemId: s.stockItemId,
              quantity: qty,
              unitCost: s.costPerBaseUnit,
            });
          }
        }
      });

      const supplierIds = Object.keys(itemsToOrder);
      if (supplierIds.length === 0) {
        toast.error(
          "No items with valid suppliers and positive quantities selected.",
        );
        return;
      }

      const poNumbers: string[] = [];

      for (const supId of supplierIds) {
        const res = await createPurchaseOrder(activeBusinessId, {
          supplierId: supId,
          locationId: locationFilter !== "all" ? locationFilter : undefined,
          notes: "Generated from Refill Planner",
          items: itemsToOrder[supId],
        });
        poNumbers.push(res.poNumber);
      }

      toast.success(
        `Purchase order${poNumbers.length > 1 ? "s" : ""} created: ${poNumbers.join(", ")}`,
      );
      await loadData();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create purchase orders.");
      }
    } finally {
      setCreatingPO(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-white text-[#0F172A]">
        <Loader2 className="h-7 w-7 text-[#16A34A] animate-spin mb-3" />
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">
          Analyzing inventory refill levels...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-[calc(100vh-88px)] overflow-hidden relative select-none font-sans antialiased text-[#0F172A]">
      <div className="flex-1 min-w-0 flex flex-col space-y-3 min-h-0 p-2">
        <div className="border border-zinc-200 rounded-xl py-3 px-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-extrabold text-[#101010] tracking-tight">
              Restock Planner
            </h1>
            {itemsBelowReorder > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-action-neutral-yellow/15 border border-action-neutral-yellow/25 text-[#854d0e] rounded-full text-xs font-bold">
                <AlertCircle className="h-4 w-4 text-[#b45309]" />
                <span>
                  {itemsBelowReorder}{" "}
                  {itemsBelowReorder === 1 ? "item" : "items"} below reorder
                  level
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {locationFilter === "all" && (
              <span className="text-[10px] font-bold text-[#b45309] bg-action-neutral-yellow/10 border border-action-neutral-yellow/20 rounded-lg px-2.5 py-1.5 whitespace-nowrap animate-fade-in">
                Select a location to create purchase orders
              </span>
            )}
            <button
              onClick={() => toast("Export feature coming soon!")}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#101010] rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload className="h-4 w-4 text-zinc-500" />
              Export
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-zinc-700 shadow-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative min-w-[160px]">
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-4 pr-10 text-xs font-bold text-zinc-700 shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 cursor-pointer"
              >
                <option value="all">All Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl py-2.5 px-4 text-xs font-bold text-zinc-700 shadow-xs flex items-center gap-2 select-none shrink-0">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {groupedData.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs flex-1">
            <ClipboardList className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#101010]">
              All items fully stocked!
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No active stock items require refilling at the moment. All current
              quantities meet or exceed the set reorder levels.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 transition-all duration-300 flex-1 min-h-0">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="border-b border-zinc-200/80 text-[10px] uppercase font-extrabold tracking-wider text-[#6e6e6e] bg-white sticky top-0 z-10">
                    <th className="py-4 px-6 bg-white">Stock Item</th>
                    <th className="py-4 px-6 bg-white">Capacity</th>
                    <th className="py-4 px-6 bg-white">Reorder Level</th>
                    <th className="py-4 px-6 bg-white text-center">
                      Current Stock
                    </th>
                    <th className="py-4 px-6 bg-white">Restock Qty</th>
                    <th className="py-4 px-6 text-right bg-white">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/40 text-xs text-[#101010] bg-white">
                  {groupedData.map((group) => {
                    const groupEstCost = group.items.reduce((sum, item) => {
                      const key = `${item.stockItemId}-${item.locationId || "null"}`;
                      if (selectedItems[key]) {
                        const qty =
                          quantities[key] !== undefined
                            ? quantities[key]
                            : item.toRefill;
                        return sum + qty * item.costPerBaseUnit;
                      }
                      return sum;
                    }, 0);

                    return (
                      <Fragment key={group.name}>
                        <tr className="bg-white">
                          <td
                            colSpan={6}
                            className="p-3 bg-white border-b border-zinc-200/40"
                          >
                            <div className="bg-[#e9ebed] rounded-xl px-5 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#101010] text-sm">
                                  {group.name}
                                </span>
                                <span className="bg-zinc-300/60 text-[#6e6e6e] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-2">
                                  {group.items.length}{" "}
                                  {group.items.length === 1 ? "ITEM" : "ITEMS"}
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-zinc-700">
                                  Supplier Total:{" "}
                                  <span className="font-black text-[#101010]">
                                    $
                                    {groupEstCost.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </span>
                                <button
                                  disabled={
                                    creatingPO || locationFilter === "all"
                                  }
                                  onClick={() =>
                                    requestCreatePurchaseOrders(group.id)
                                  }
                                  className="bg-[#101010] hover:bg-black disabled:bg-zinc-300 disabled:text-zinc-400 disabled:cursor-not-allowed text-white rounded-full px-5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  CREATE PO
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {group.items.map((item) => {
                          const key = `${item.stockItemId}-${item.locationId || "null"}`;
                          const isSelected = selectedItems[key] || false;
                          const currentQty =
                            quantities[key] !== undefined
                              ? quantities[key]
                              : item.toRefill;
                          const estCost = currentQty * item.costPerBaseUnit;

                          const isLow = item.currentStock < item.reorderLevel;
                          const targetQty = isLow
                            ? item.reorderLevel
                            : item.currentStock > item.reorderLevel
                              ? item.capacity
                              : item.reorderLevel;
                          const progressPercent = Math.min(
                            100,
                            (item.currentStock / targetQty) * 100,
                          );
                          const textColorClass = isLow
                            ? "text-action-critical"
                            : "text-action-success";
                          const barColorClass = isLow
                            ? "bg-action-critical"
                            : "bg-action-success";

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-zinc-50/20 bg-white transition-colors ${isSelected ? "" : "opacity-60 bg-zinc-50/10"}`}
                            >
                              <td className="py-4 px-6 bg-white">
                                <div>
                                  <p className="font-extrabold text-[#101010]">
                                    {item.stockItemName}
                                  </p>
                                  {item.sku && (
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 tracking-wider">
                                      {item.sku}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 font-extrabold text-[#6e6e6e] bg-white">
                                {item.capacity.toLocaleString()}
                              </td>
                              <td className="py-4 px-6 font-extrabold text-[#6e6e6e] bg-white">
                                {item.reorderLevel.toLocaleString()}
                              </td>
                              <td className="py-4 px-6 bg-white">
                                <div className="flex flex-col items-center justify-center w-full max-w-[150px] mx-auto">
                                  <div className="flex items-center gap-2 w-full justify-between">
                                    <span
                                      className={`font-bold text-xs ${textColorClass}`}
                                    >
                                      {item.currentStock}
                                    </span>
                                    <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden shrink-0 border border-zinc-200/50">
                                      <div
                                        className={`${barColorClass} h-full rounded-full transition-all duration-500`}
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-xs text-[#6e6e6e]">
                                      {targetQty}
                                    </span>
                                  </div>
                                  {isLow && (
                                    <div className="mt-1 flex justify-center w-full">
                                      <span className="bg-rose-100/70 border border-rose-200/30 text-action-critical text-[9px] font-extrabold px-6 py-0.5 rounded-full uppercase tracking-wider">
                                        LOW
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 bg-white">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentQty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      key,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-16 bg-white border border-[#dddddd] rounded-lg px-2 py-1.5 text-xs text-center text-[#101010] font-extrabold focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                                />
                              </td>
                              <td className="py-4 px-6 font-extrabold text-right text-[#6e6e6e] bg-white">
                                $
                                {estCost.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t border-dashed border-[#4949ce]/30 pt-4 mt-2 shrink-0">
          <div className="text-xs text-[#6e6e6e] font-bold">
            <span className="font-extrabold text-[#101010]">
              {stats.totalItems}
            </span>{" "}
            item{stats.totalItems !== 1 ? "s" : ""} across{" "}
            <span className="font-extrabold text-[#101010]">
              {uniqueSuppliersCount}
            </span>{" "}
            supplier{uniqueSuppliersCount !== 1 ? "s" : ""} — total est. cost{" "}
            <span className="font-black text-[#4949ce]">
              $
              {stats.estCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmPO !== null}
        variant="info"
        title="Create Purchase Order"
        description={
          confirmPO
            ? `You are about to create purchase order(s) for ${confirmPO.summary}. This will create draft POs that you can review before sending to suppliers.`
            : ""
        }
        confirmLabel="Create PO"
        cancelLabel="Cancel"
        onConfirm={handleCreatePurchaseOrders}
        onCancel={() => setConfirmPO(null)}
      />
    </div>
  );
}
