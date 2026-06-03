/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useMemo } from "react";
import { useBusinessStore } from "@/store/business-store";
import { useLocationStore } from "@/store/location-store";
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
  const [confirmPO, setConfirmPO] = useState<{ targetSupplierId?: string; summary: string } | null>(null);

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
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load refill planner data.");
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
      toast.error("All selected items have 0 quantity. Adjust quantities before creating a purchase order.");
      return;
    }

    const totalCost = selectedCount.reduce((sum, s) => {
      const key = `${s.stockItemId}-${s.locationId || "null"}`;
      const qty = quantities[key] !== undefined ? quantities[key] : s.toRefill;
      return sum + qty * s.costPerBaseUnit;
    }, 0);

    const itemsWithNoSupplier = selectedCount.filter((s) => !s.supplierId);
    if (itemsWithNoSupplier.length === selectedCount.length) {
      toast.error("None of the selected items have a supplier assigned. Assign suppliers before creating purchase orders.");
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
        toast.error("No items with valid suppliers and positive quantities selected.");
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

      toast.success(`Purchase order${poNumbers.length > 1 ? "s" : ""} created: ${poNumbers.join(", ")}`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create purchase orders.");
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
    <div className="flex bg-[#F8FAFC] min-h-[85vh] relative select-none font-sans antialiased text-[#0F172A]">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5 bg-white -mx-6 -mt-6 p-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Refill Planner
            </h1>
            <p className="text-[#64748B] text-xs font-bold mt-1">
              Plan refills based on current stock, capacity and reorder levels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {locationFilter === "all" && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                Select a location to create purchase orders
              </span>
            )}
            <button
              onClick={() => toast("Export feature coming soon!")}
              className="flex-1 sm:flex-initial bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4 text-zinc-500" />
              Export
            </button>
            <button
              onClick={() => requestCreatePurchaseOrders()}
              disabled={creatingPO || locationFilter === "all"}
              className="flex-1 sm:flex-initial bg-[#16A34A] hover:bg-[#15803D] disabled:bg-zinc-300 disabled:text-zinc-400 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {creatingPO ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Create Purchase Order
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-extrabold">
                Total Items
              </p>
              <h3 className="text-xl font-black text-[#0F172A] mt-0.5">
                {stats.totalItems}
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                Across all locations
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-extrabold">
                Total Capacity
              </p>
              <h3 className="text-xl font-black text-[#0F172A] mt-0.5">
                {stats.totalCapacity.toLocaleString()}
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                Base Units
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-extrabold">
                Total to Refill
              </p>
              <h3 className="text-xl font-black text-[#0F172A] mt-0.5">
                {stats.totalRefill.toLocaleString()}
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                Base Units
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-extrabold">
                Est. Purchase Cost
              </p>
              <h3 className="text-xl font-black text-[#0F172A] mt-0.5">
                $
                {stats.estCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold mt-0.5">AUD</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex flex-wrap gap-2 flex-1">
            <div className="relative min-w-[140px]">
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3.5 pr-8 text-xs font-bold text-zinc-700 shadow-xs appearance-none focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] cursor-pointer"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {groupedData.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl py-20 px-6 text-center flex flex-col items-center justify-center shadow-xs">
            <ClipboardList className="h-12 w-12 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              All items fully stocked!
            </h3>
            <p className="text-[#64748B] text-xs mt-1 font-semibold max-w-xs leading-relaxed">
              No active stock items require refilling at the moment. All current
              quantities meet or exceed the set reorder levels.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
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

              const isGroupSelected = group.items.every((item) => {
                const key = `${item.stockItemId}-${item.locationId || "null"}`;
                return selectedItems[key];
              });

              return (
                <div
                  key={group.name}
                  className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden"
                >
                  <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isGroupSelected}
                        onChange={(e) =>
                          handleGroupSelectAll(group.items, e.target.checked)
                        }
                        className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-extrabold text-[#0F172A] text-sm">
                          {group.name}
                        </span>
                        <span className="text-[#64748B] text-[10px] font-bold ml-2 bg-zinc-200/60 px-2 py-0.5 rounded-full uppercase">
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-zinc-700">
                        Est. Cost:{" "}
                        <span className="font-black text-[#0F172A]">
                          $
                          {groupEstCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </span>
                      {groupBy === "supplier" && group.id && (
                        <button
                          disabled={locationFilter === "all"}
                          onClick={() => requestCreatePurchaseOrders(group.id)}
                          className="bg-white disabled:bg-zinc-100 disabled:text-zinc-400 disabled:border-zinc-200 disabled:cursor-not-allowed border border-[#16A34A] hover:bg-emerald-50 text-[#16A34A] rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          Create PO
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] bg-zinc-50/20">
                          <th className="py-3 px-6 w-12">
                            <input
                              type="checkbox"
                              checked={isGroupSelected}
                              onChange={(e) =>
                                handleGroupSelectAll(
                                  group.items,
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-6">Stock Item</th>
                          <th className="py-3 px-6">Location</th>
                          {showColumns.currentStock && (
                            <th className="py-3 px-6">Current Stock</th>
                          )}
                          {showColumns.capacity && (
                            <th className="py-3 px-6">Capacity</th>
                          )}
                          {showColumns.reorderLevel && (
                            <th className="py-3 px-6">Reorder Level</th>
                          )}
                          {showColumns.toRefill && (
                            <th className="py-3 px-6 w-36">To Refill</th>
                          )}
                          {showColumns.estCost && (
                            <th className="py-3 px-6 text-right">Est. Cost</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-xs text-[#0F172A]">
                        {group.items.map((item) => {
                          const key = `${item.stockItemId}-${item.locationId || "null"}`;
                          const isSelected = selectedItems[key] || false;
                          const currentQty =
                            quantities[key] !== undefined
                              ? quantities[key]
                              : item.toRefill;
                          const estCost = currentQty * item.costPerBaseUnit;

                          return (
                            <tr
                              key={key}
                              className={`hover:bg-zinc-50/30 transition-colors ${isSelected ? "" : "opacity-60 bg-zinc-50/10"}`}
                            >
                              <td className="py-3.5 px-6">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) =>
                                    setSelectedItems((prev) => ({
                                      ...prev,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                  className="h-4 w-4 text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-6">
                                <div>
                                  <p className="font-extrabold text-[#0F172A]">
                                    {item.stockItemName}
                                  </p>
                                  {item.sku && (
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 tracking-wider">
                                      {item.sku}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-6 font-bold text-[#64748B]">
                                {item.locationName}
                              </td>
                              {showColumns.currentStock && (
                                <td className="py-3.5 px-6 font-extrabold text-[#64748B]">
                                  {item.currentStock.toLocaleString()}
                                </td>
                              )}
                              {showColumns.capacity && (
                                <td className="py-3.5 px-6 font-extrabold text-[#64748B]">
                                  {item.capacity.toLocaleString()}
                                </td>
                              )}
                              {showColumns.reorderLevel && (
                                <td className="py-3.5 px-6 font-extrabold text-[#64748B]">
                                  {item.reorderLevel.toLocaleString()}
                                </td>
                              )}
                              {showColumns.toRefill && (
                                <td className="py-3.5 px-6">
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
                                    className="w-24 bg-white border border-zinc-300 rounded-lg px-2 py-1 text-xs text-right text-zinc-900 font-extrabold focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                                  />
                                </td>
                              )}
                              {showColumns.estCost && (
                                <td className="py-3.5 px-6 font-extrabold text-right text-[#0F172A]">
                                  $
                                  {estCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmPO !== null}
        variant="info"
        title="Create Purchase Order"
        description={confirmPO ? `You are about to create purchase order(s) for ${confirmPO.summary}. This will create draft POs that you can review before sending to suppliers.` : ""}
        confirmLabel="Create PO"
        cancelLabel="Cancel"
        onConfirm={handleCreatePurchaseOrders}
        onCancel={() => setConfirmPO(null)}
      />
    </div>
  );
}
