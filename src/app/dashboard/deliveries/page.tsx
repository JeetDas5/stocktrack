"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useBusinessStore } from "@/stores/business-store";
import { getSuppliers } from "@/lib/repositories/supplier.repository";
import { getLocations } from "@/lib/repositories/location.repository";
import { getPurchaseOrders } from "@/lib/repositories/purchase-order.repository";
import {
  getDeliveries,
  getDelivery,
  createDelivery,
} from "@/lib/repositories/delivery.repository";
import { Supplier, PurchaseOrder, Delivery, Location } from "@/types/inventory";
import {
  PackageOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  X,
  FileText,
  Download,
  Check,
  MoreVertical,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

export default function DeliveriesPage() {
  const { activeBusinessId } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setError] = useState<string | null>(null);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"new" | "view">("new");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [notes, setNotes] = useState("");

  const [deliveryItemsInput, setDeliveryItemsInput] = useState<
    {
      stockItemId: string;
      stockItemName: string;
      sku: string;
      orderedQuantity: number;
      receivedQuantity: number;
      unitCost: number;
    }[]
  >([]);

  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  async function loadData() {
    if (!activeBusinessId) return;
    try {
      setLoading(true);
      setError(null);

      const [dList, poList, sList, locsList] = await Promise.all([
        getDeliveries(activeBusinessId),
        getPurchaseOrders(activeBusinessId),
        getSuppliers(activeBusinessId),
        getLocations(activeBusinessId),
      ]);

      setDeliveries(dList);
      setPurchaseOrders(poList);
      setSuppliers(sList.filter((s) => s.isActive !== false));
      setLocations(locsList.filter((l) => l.isActive !== false));
    } catch (err) {
      console.error(err);
      setError("Failed to load deliveries data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeBusinessId]);

  const activeSupplierPOs = purchaseOrders.filter((po) => {
    const belongsToSupplier = po.supplierId === selectedSupplierId;
    const belongsToLocation =
      !selectedLocationId || po.locationId === selectedLocationId;
    const isSent = po.status === "sent";
    const notYetReceived = !deliveries.some((d) => d.purchaseOrderId === po.id);
    return belongsToSupplier && belongsToLocation && isSent && notYetReceived;
  });

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    if (!poId) {
      setDeliveryItemsInput([]);
      return;
    }

    const selectedPO = purchaseOrders.find((p) => p.id === poId);
    if (!selectedPO) return;

    const mappedItems = selectedPO.items.map((item) => ({
      stockItemId: item.stockItemId,
      stockItemName: item.stockItemName || "Unknown Item",
      sku: item.sku || "",
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      unitCost: item.unitCost,
    }));

    setDeliveryItemsInput(mappedItems);
  };

  const handleReceivedQtyChange = (index: number, val: string) => {
    const parsedVal = val === "" ? 0 : Math.max(0, parseFloat(val) || 0);
    setDeliveryItemsInput((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQuantity: parsedVal,
      };
      return updated;
    });
  };

  const handleToggleReceivedAll = (index: number, isChecked: boolean) => {
    setDeliveryItemsInput((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQuantity: isChecked ? updated[index].orderedQuantity : 0,
      };
      return updated;
    });
  };

  const handleViewDelivery = async (dId: string) => {
    try {
      setViewingDelivery(null);
      setPanelMode("view");
      setIsPanelOpen(true);
      setOpenActionId(null);
      if (!activeBusinessId) return;
      const detail = await getDelivery(activeBusinessId, dId);
      setViewingDelivery(detail);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load delivery details.");
      setIsPanelOpen(false);
    }
  };

  const handleConfirmAndReceive = async () => {
    if (!activeBusinessId || !selectedPOId) return;
    try {
      setSaving(true);
      setError(null);

      const itemsPayload = deliveryItemsInput.map((item) => ({
        stockItemId: item.stockItemId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        unitCost: item.unitCost,
      }));

      await createDelivery(activeBusinessId, {
        purchaseOrderId: selectedPOId,
        notes: notes.trim() || undefined,
        items: itemsPayload,
      });

      toast.success(
        "Delivery confirmed and inventory levels updated successfully!",
      );
      setIsPanelOpen(false);

      setSelectedSupplierId("");
      setSelectedLocationId("");
      setSelectedPOId("");
      setNotes("");
      setDeliveryItemsInput([]);

      await loadData();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || "Failed to confirm and receive delivery.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openNewDeliveryPanel = () => {
    setPanelMode("new");
    setSelectedSupplierId("");
    setSelectedLocationId("");
    setSelectedPOId("");
    setNotes("");
    setDeliveryItemsInput([]);
    setIsPanelOpen(true);
  };

  const getWeekRange = (offset: number) => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMon));
    monday.setDate(monday.getDate() + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const handlePrevWeek = () => {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    const { monday, sunday } = getWeekRange(newOffset);
    setStartDateFilter(monday.toISOString().split("T")[0]);
    setEndDateFilter(sunday.toISOString().split("T")[0]);
  };

  const handleNextWeek = () => {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    const { monday, sunday } = getWeekRange(newOffset);
    setStartDateFilter(monday.toISOString().split("T")[0]);
    setEndDateFilter(sunday.toISOString().split("T")[0]);
  };

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        d.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSupplier =
        selectedSupplierFilter === "all" ||
        d.supplierId === selectedSupplierFilter;

      let matchesStatus = true;
      if (selectedStatusFilter !== "all") {
        const s = d.status.toLowerCase();
        const f = selectedStatusFilter.toLowerCase();
        if (f === "received" || f === "delivered") {
          matchesStatus = s === "received" || s === "delivered";
        } else if (f === "partially received" || f === "in transit") {
          matchesStatus = s === "partially received" || s === "in transit";
        } else if (f === "pending") {
          matchesStatus = s === "pending";
        } else if (f === "missing" || f === "cancelled") {
          matchesStatus = s === "missing" || s === "cancelled";
        } else {
          matchesStatus = s === f;
        }
      }

      let matchesDate = true;
      if (startDateFilter || endDateFilter) {
        const dDate = new Date(d.deliveryDate);
        if (startDateFilter) {
          const start = new Date(startDateFilter);
          start.setHours(0, 0, 0, 0);
          if (dDate < start) matchesDate = false;
        }
        if (endDateFilter) {
          const end = new Date(endDateFilter);
          end.setHours(23, 59, 59, 999);
          if (dDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesSupplier && matchesStatus && matchesDate;
    });
  }, [
    deliveries,
    searchQuery,
    selectedSupplierFilter,
    selectedStatusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchQuery,
    selectedSupplierFilter,
    selectedStatusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + 20, filteredDeliveries.length),
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
  }, [filteredDeliveries.length]);

  const visibleDeliveries = useMemo(() => {
    return filteredDeliveries.slice(0, visibleCount);
  }, [filteredDeliveries, visibleCount]);

  const selectedPO = purchaseOrders.find((p) => p.id === selectedPOId);

  const calculatedSummary = useMemo(() => {
    return deliveryItemsInput.reduce(
      (acc, item) => {
        const totalOrdered = acc.totalOrdered + item.orderedQuantity;
        const totalReceived = acc.totalReceived + item.receivedQuantity;
        const totalValue =
          acc.totalValue + item.receivedQuantity * item.unitCost;
        const variance = totalReceived - totalOrdered;
        return { totalOrdered, totalReceived, totalValue, variance };
      },
      { totalOrdered: 0, totalReceived: 0, totalValue: 0, variance: 0 },
    );
  }, [deliveryItemsInput]);

  const handleExportExcel = () => {
    if (filteredDeliveries.length === 0) {
      toast.error("No delivery records available to export.");
      return;
    }
    const headers = [
      "Supplier",
      "PO No.",
      "Delivery No.",
      "Delivery Date",
      "Items",
      "Total Value ($)",
      "Status",
    ];

    const rows = filteredDeliveries.map((d) => {
      const formattedDate = new Date(d.deliveryDate).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      );
      return [
        `"${d.supplierName.replace(/"/g, '""')}"`,
        `"${d.poNumber}"`,
        `"${d.deliveryNumber}"`,
        `"${formattedDate}"`,
        `"${d.itemsCount} items"`,
        `"${d.totalAmount.toFixed(2)}"`,
        `"${d.status}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `deliveries_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Deliveries exported successfully!");
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "received" || s === "delivered") {
      return {
        label: "DELIVERED",
        badgeStyle: "bg-emerald-100/70 text-emerald-800 border-emerald-200/60",
      };
    }
    if (s === "partially received" || s === "in transit") {
      return {
        label: "IN TRANSIT",
        badgeStyle: "bg-purple-100/70 text-purple-700 border-purple-200/60",
      };
    }
    if (s === "pending") {
      return {
        label: "PENDING",
        badgeStyle: "bg-amber-100/80 text-amber-800 border-amber-200/60",
      };
    }
    if (s === "missing" || s === "cancelled") {
      return {
        label: "CANCELLED",
        badgeStyle: "bg-rose-100/70 text-rose-700 border-rose-200/60",
      };
    }
    return {
      label: status.toUpperCase(),
      badgeStyle: "bg-neutral-100 text-neutral-700 border-neutral-200",
    };
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-white text-neutral-900">
        <Loader2 className="h-7 w-7 text-neutral-900 animate-spin mb-3" />
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">
          Loading delivery records...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-white min-h-0 w-full pb-8">
      <div className="w-full space-y-4">
        {/* Header Card */}
        <div className="bg-white border border-neutral-200 rounded-[18px] py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">
            Deliveries
          </h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openNewDeliveryPanel}
              className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Receive Delivery
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search Supplier input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search Supplier"
              className="w-full bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition shadow-2xs h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full sm:w-44">
            <Select
              value={selectedStatusFilter}
              onValueChange={(val) => setSelectedStatusFilter(val)}
            >
              <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                <SelectItem
                  value="all"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  All Statuses
                </SelectItem>
                <SelectItem
                  value="Received"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Delivered
                </SelectItem>
                <SelectItem
                  value="Partially Received"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  In Transit
                </SelectItem>
                <SelectItem
                  value="Pending"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Pending
                </SelectItem>
                <SelectItem
                  value="Missing"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Dropdown */}
          <div className="w-full sm:w-48">
            <Select
              value={selectedSupplierFilter}
              onValueChange={(val) => setSelectedSupplierFilter(val)}
            >
              <SelectTrigger className="w-full h-10 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                <SelectItem
                  value="all"
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  All Suppliers
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker / Range Trigger */}
          <div className="flex items-center justify-between gap-1 bg-white border border-neutral-200 rounded-full h-10 px-3 shadow-2xs select-none hover:bg-neutral-50/50 cursor-pointer">
            <DateRangePicker
              startDate={startDateFilter}
              endDate={endDateFilter}
              onChange={({ startDate, endDate }) => {
                setStartDateFilter(startDate);
                setEndDateFilter(endDate);
              }}
              triggerClassName="border-none shadow-none bg-transparent hover:bg-transparent h-full py-0 px-1 font-semibold text-xs text-neutral-700"
            />
            <div className="w-px h-4 bg-neutral-200 mx-1" />
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer"
                title="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition cursor-pointer"
                title="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Deliveries Table Card - Infinite Scroll */}
        <div className="bg-white border border-neutral-200 rounded-[18px] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-white">
                  <th className="py-4 px-6">Supplier</th>
                  <th className="py-4 px-6">PO No.</th>
                  <th className="py-4 px-6">Delivery No.</th>
                  <th className="py-4 px-6">Delivery Date</th>
                  <th className="py-4 px-6">Items</th>
                  <th className="py-4 px-6">Total Value</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs text-neutral-900 bg-white">
                {visibleDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 px-6 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="h-12 w-12 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-3 shadow-2xs">
                          <PackageOpen className="h-6 w-6 text-neutral-400 stroke-[1.5]" />
                        </div>
                        <h3 className="text-sm font-bold text-neutral-900">
                          No delivery records found
                        </h3>
                        <p className="text-neutral-500 text-xs mt-1 font-medium leading-relaxed">
                          {searchQuery ||
                          selectedSupplierFilter !== "all" ||
                          selectedStatusFilter !== "all" ||
                          startDateFilter ||
                          endDateFilter
                            ? "No deliveries match your active search and filter settings."
                            : "There are no confirmed deliveries recorded yet."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleDeliveries.map((d) => {
                    const badge = getStatusBadge(d.status);

                    const formattedDate = new Date(
                      d.deliveryDate,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="py-4 px-6 font-semibold text-xs text-neutral-900">
                          {d.supplierName}
                        </td>
                        <td className="py-4 px-6 font-medium text-xs text-neutral-500 uppercase">
                          {d.poNumber}
                        </td>
                        <td className="py-4 px-6 font-medium text-xs text-neutral-500 uppercase">
                          {d.deliveryNumber}
                        </td>
                        <td className="py-4 px-6 font-bold text-xs text-neutral-900">
                          {formattedDate}
                        </td>
                        <td className="py-4 px-6 font-bold text-xs text-neutral-900">
                          {d.itemsCount} {d.itemsCount === 1 ? "item" : "items"}
                        </td>
                        <td className="py-4 px-6 font-bold text-xs text-neutral-900">
                          $
                          {d.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border",
                              badge.badgeStyle,
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center relative">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionId(
                                  openActionId === d.id ? null : d.id,
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openActionId === d.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-xl shadow-lg p-1 z-50 animate-scale-in">
                                <button
                                  type="button"
                                  onClick={() => handleViewDelivery(d.id)}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 rounded-lg flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Infinite Scroll Loader Sentinel */}
          {visibleCount < filteredDeliveries.length && (
            <div
              ref={loadMoreRef}
              className="py-4 border-t border-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-400 gap-2 bg-neutral-50/30"
            >
              <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
              <span>Loading more deliveries...</span>
            </div>
          )}
        </div>
      </div>

      {/* Slide-Over Drawer Overlay Sidebar for Receive & View Delivery (Matches /stock-items drawer) */}
      {isPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setIsPanelOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[500px] max-w-[95vw] bg-white border-l border-neutral-200 shadow-2xl flex flex-col justify-between z-50 animate-slide-in">
            <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  {panelMode === "new"
                    ? "Receive Delivery"
                    : `View Delivery - ${viewingDelivery?.deliveryNumber || "..."}`}
                </h2>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  {panelMode === "new"
                    ? "Receive items against a purchase order."
                    : "Detailed record of received delivery."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {panelMode === "new" ? (
                <>
                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <span className="h-5 w-5 rounded-full bg-[#0A2924] text-white font-bold text-[10px] flex items-center justify-center">
                        1
                      </span>
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Select Purchase Order
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                          Supplier *
                        </label>
                        <Select
                          value={selectedSupplierId}
                          onValueChange={(val) => {
                            setSelectedSupplierId(val);
                            setSelectedPOId("");
                            setDeliveryItemsInput([]);
                          }}
                        >
                          <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 cursor-pointer">
                            <SelectValue placeholder="Select a Supplier" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                            {suppliers.map((s) => (
                              <SelectItem
                                key={s.id}
                                value={s.id}
                                className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedSupplierId && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            Location
                          </label>
                          <Select
                            value={selectedLocationId}
                            onValueChange={(val) => {
                              setSelectedLocationId(val);
                              setSelectedPOId("");
                              setDeliveryItemsInput([]);
                            }}
                          >
                            <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 cursor-pointer">
                              <SelectValue placeholder="All Locations / None" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                              <SelectItem
                                value=""
                                className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                              >
                                All Locations / None
                              </SelectItem>
                              {locations.map((loc) => (
                                <SelectItem
                                  key={loc.id}
                                  value={loc.id}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                >
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedSupplierId && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                            Purchase Order *
                          </label>
                          <Select
                            value={selectedPOId}
                            onValueChange={handlePOSelect}
                          >
                            <SelectTrigger className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 cursor-pointer">
                              <SelectValue placeholder="Select a Purchase Order" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-neutral-200 bg-white p-1 max-h-56 z-50">
                              {activeSupplierPOs.map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={p.id}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                                >
                                  {p.poNumber}{" "}
                                  {p.locationName ? `(${p.locationName})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedPO && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[11px] font-medium text-neutral-500 space-y-1">
                          <div className="flex justify-between">
                            <span>PO Date:</span>
                            <span className="text-neutral-800 font-bold">
                              {new Date(
                                selectedPO.createdAt,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Expected:</span>
                            <span className="text-neutral-800 font-bold">
                              {new Date(
                                new Date(selectedPO.createdAt).getTime() +
                                  86400000,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-neutral-200/60 pt-1 mt-1 text-xs font-bold">
                            <span>PO Total:</span>
                            <span className="text-[#0A2924]">
                              $
                              {selectedPO.totalAmount.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {deliveryItemsInput.length > 0 && (
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                      <div className="flex justify-between items-center pb-2.5 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-[#0A2924] text-white font-bold text-[10px] flex items-center justify-center">
                            2
                          </span>
                          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                            PO Items
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-neutral-500">
                          {deliveryItemsInput.length} items • $
                          {selectedPO?.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="border border-neutral-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-neutral-50/50">
                              <th className="py-2.5 px-3 w-8 text-center">#</th>
                              <th className="py-2.5 px-2">Item</th>
                              <th className="py-2.5 px-2 text-center">
                                Ordered
                              </th>
                              <th className="py-2.5 px-2 text-center w-20">
                                Received
                              </th>
                              <th className="py-2.5 px-2 text-right">
                                Unit Price
                              </th>
                              <th className="py-2.5 px-2 text-right">Total</th>
                              <th className="py-2.5 px-3 text-center w-12">
                                Recv (All)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700 bg-white">
                            {deliveryItemsInput.map((item, idx) => {
                              const totalVal =
                                item.receivedQuantity * item.unitCost;
                              const isAllReceived =
                                item.receivedQuantity === item.orderedQuantity;

                              return (
                                <tr
                                  key={item.stockItemId}
                                  className="hover:bg-neutral-50/40 transition-colors"
                                >
                                  <td className="py-3 px-3 text-center text-neutral-400 font-bold text-xs">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-2">
                                    <p className="font-bold text-neutral-900 leading-tight truncate max-w-[100px]">
                                      {item.stockItemName}
                                    </p>
                                    <p className="text-[9px] text-neutral-400 font-medium uppercase tracking-wider mt-0.5">
                                      {item.sku || "NO SKU"}
                                    </p>
                                  </td>
                                  <td className="py-3 px-2 text-center font-semibold text-neutral-500">
                                    {item.orderedQuantity}
                                  </td>
                                  <td className="py-2 px-1 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      className={`w-16 bg-white border rounded-lg py-1 px-1.5 text-center text-xs font-bold focus:outline-none focus:ring-2 ${
                                        isAllReceived
                                          ? "border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900/10"
                                          : "border-[#0A2924] text-[#0A2924] focus:border-[#0A2924] focus:ring-[#0A2924]/10"
                                      }`}
                                      value={
                                        item.receivedQuantity === 0 &&
                                        item.orderedQuantity !== 0
                                          ? ""
                                          : item.receivedQuantity
                                      }
                                      placeholder="0"
                                      onChange={(e) =>
                                        handleReceivedQtyChange(
                                          idx,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="py-3 px-2 text-right text-neutral-500 font-medium">
                                    ${item.unitCost.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-2 text-right font-bold text-neutral-900">
                                    ${totalVal.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleReceivedAll(
                                          idx,
                                          !isAllReceived,
                                        )
                                      }
                                      className={`h-4.5 w-4.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                                        isAllReceived
                                          ? "bg-[#0A2924] text-white border border-[#0A2924]"
                                          : "bg-white border border-neutral-300 hover:border-neutral-400 text-transparent"
                                      }`}
                                    >
                                      <Check className="h-3 w-3 stroke-[3px]" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {deliveryItemsInput.length > 0 && (
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                        <span className="h-5 w-5 rounded-full bg-[#0A2924] text-white font-bold text-[10px] flex items-center justify-center">
                          3
                        </span>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Summary
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                            Total Ordered
                          </p>
                          <h4 className="text-sm font-bold text-neutral-900 mt-1">
                            {calculatedSummary.totalOrdered}
                          </h4>
                          <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                            Base Units
                          </p>
                        </div>

                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                            Total Received
                          </p>
                          <h4 className="text-sm font-bold text-neutral-900 mt-1">
                            {calculatedSummary.totalReceived}
                          </h4>
                          <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                            Base Units
                          </p>
                        </div>

                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                            Total Value
                          </p>
                          <h4 className="text-sm font-bold text-emerald-700 mt-1">
                            ${calculatedSummary.totalValue.toFixed(2)}
                          </h4>
                          <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                            AUD
                          </p>
                        </div>

                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                            Variance
                          </p>
                          <h4
                            className={`text-sm font-bold mt-1 ${
                              calculatedSummary.variance < 0
                                ? "text-rose-600"
                                : calculatedSummary.variance > 0
                                  ? "text-emerald-600"
                                  : "text-neutral-600"
                            }`}
                          >
                            {calculatedSummary.variance > 0 ? "+" : ""}
                            {calculatedSummary.variance}
                          </h4>
                          <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                            Base Units
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          <span>Notes (Optional)</span>
                          <span className="text-[9px] font-medium text-neutral-400">
                            {notes.length}/250
                          </span>
                        </div>
                        <textarea
                          maxLength={250}
                          placeholder="Enter notes..."
                          className="w-full bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl p-3 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 transition min-h-[70px] resize-none"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : viewingDelivery ? (
                <>
                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
                      <FileText className="h-4.5 w-4.5 text-neutral-400" />
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Delivery Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 text-xs font-medium text-neutral-500">
                      <div>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Supplier
                        </p>
                        <p className="text-neutral-900 font-semibold mt-0.5">
                          {viewingDelivery.supplierName}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          PO Number
                        </p>
                        <p className="text-neutral-900 font-semibold mt-0.5 uppercase">
                          {viewingDelivery.poNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Delivery Date
                        </p>
                        <p className="text-neutral-900 font-semibold mt-0.5">
                          {new Date(
                            viewingDelivery.deliveryDate,
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Fulfillment Status
                        </p>
                        {(() => {
                          const badge = getStatusBadge(viewingDelivery.status);
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border mt-1",
                                badge.badgeStyle,
                              )}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center pb-2.5 border-b border-neutral-100">
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Received Items
                      </h3>
                      <span className="text-xs font-semibold text-neutral-400">
                        {viewingDelivery.items.length} items
                      </span>
                    </div>

                    <div className="border border-neutral-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-neutral-50/50">
                            <th className="py-2.5 px-3 w-8 text-center">#</th>
                            <th className="py-2.5 px-2">Item</th>
                            <th className="py-2.5 px-2 text-center">Ordered</th>
                            <th className="py-2.5 px-2 text-center">
                              Received
                            </th>
                            <th className="py-2.5 px-2 text-right">
                              Unit Price
                            </th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700 bg-white">
                          {viewingDelivery.items.map((item, idx) => {
                            const isFullyReceived =
                              item.receivedQuantity === item.orderedQuantity;

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-neutral-50/30 transition-colors"
                              >
                                <td className="py-3 px-3 text-center text-neutral-400 font-bold">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-2">
                                  <p className="font-bold text-neutral-900 leading-tight">
                                    {item.stockItemName}
                                  </p>
                                  <p className="text-[9px] text-neutral-400 font-medium uppercase tracking-wider mt-0.5">
                                    {item.sku || "NO SKU"}
                                  </p>
                                </td>
                                <td className="py-3 px-2 text-center font-semibold text-neutral-500">
                                  {item.orderedQuantity}
                                </td>
                                <td
                                  className={`py-3 px-2 text-center font-bold ${
                                    isFullyReceived
                                      ? "text-neutral-700"
                                      : "text-emerald-700"
                                  }`}
                                >
                                  {item.receivedQuantity}
                                </td>
                                <td className="py-3 px-2 text-right text-neutral-500 font-medium">
                                  ${item.unitCost.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-neutral-900">
                                  ${item.totalCost.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
                      Fulfillment Summary
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Total Ordered
                        </p>
                        <h4 className="text-sm font-bold text-neutral-900 mt-1">
                          {viewingDelivery.items.reduce(
                            (sum, item) => sum + item.orderedQuantity,
                            0,
                          )}
                        </h4>
                        <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Total Received
                        </p>
                        <h4 className="text-sm font-bold text-neutral-900 mt-1">
                          {viewingDelivery.items.reduce(
                            (sum, item) => sum + item.receivedQuantity,
                            0,
                          )}
                        </h4>
                        <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Total Value
                        </p>
                        <h4 className="text-sm font-bold text-emerald-700 mt-1">
                          ${viewingDelivery.totalAmount.toFixed(2)}
                        </h4>
                        <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                          AUD
                        </p>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-center">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Variance
                        </p>
                        {(() => {
                          const ordered = viewingDelivery.items.reduce(
                            (sum, item) => sum + item.orderedQuantity,
                            0,
                          );
                          const received = viewingDelivery.items.reduce(
                            (sum, item) => sum + item.receivedQuantity,
                            0,
                          );
                          const diff = received - ordered;

                          return (
                            <h4
                              className={`text-sm font-bold mt-1 ${
                                diff < 0
                                  ? "text-rose-600"
                                  : diff > 0
                                    ? "text-emerald-600"
                                    : "text-neutral-600"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </h4>
                          );
                        })()}
                        <p className="text-[8px] font-medium text-neutral-400 uppercase tracking-wider mt-0.5">
                          Base Units
                        </p>
                      </div>
                    </div>

                    {viewingDelivery.notes && (
                      <div className="bg-neutral-50/50 border border-neutral-200 rounded-xl p-3.5 space-y-1">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Delivery Notes
                        </p>
                        <p className="text-xs font-medium text-neutral-700 leading-relaxed italic">
                          &quot;{viewingDelivery.notes}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="min-h-[30vh] flex flex-col items-center justify-center text-neutral-400">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-900 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">
                    Loading details...
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-neutral-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              {panelMode === "new" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(false)}
                    className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndReceive}
                    disabled={
                      saving || !selectedPOId || deliveryItemsInput.length === 0
                    }
                    className="inline-flex items-center gap-2 bg-[#0A2924] hover:bg-[#0A2924]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Receiving...</span>
                      </>
                    ) : (
                      <span>Confirm & Receive</span>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-5 py-2.5 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
